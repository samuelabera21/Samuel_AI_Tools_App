import os
import re
import threading
import hashlib
from pathlib import Path
from typing import Iterable

# Set before langchain loader imports so request headers are available early.
os.environ.setdefault("USER_AGENT", "ai-tools-app-rag/1.0")

from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader, WebBaseLoader
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
KNOWLEDGE_DIR = DATA_DIR / "knowledge"
UPLOADS_DIR = DATA_DIR / "uploads"
VECTOR_DIR = DATA_DIR / "vector_store"
LOCK = threading.Lock()

DEFAULT_CHAT_MODEL = os.getenv("NVIDIA_CHAT_MODEL", "qwen/qwen3.5-397b-a17b")
DEFAULT_HOME_CHAT_MODEL = os.getenv("NVIDIA_HOME_CHAT_MODEL", "nvidia/nemotron-3-nano-30b-a3b")
DEFAULT_EMBEDDING_MODEL = os.getenv("NVIDIA_EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5")
DEFAULT_NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
DEFAULT_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "900"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))


def _chat_model_candidates(preferred_model: str | None = None) -> list[str]:
    candidates = [
        preferred_model,
        DEFAULT_CHAT_MODEL,
        DEFAULT_HOME_CHAT_MODEL,
        os.getenv("NVIDIA_FALLBACK_CHAT_MODEL", "").strip() or None,
    ]

    seen: set[str] = set()
    ordered: list[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        normalized = candidate.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)

    return ordered


def _is_retryable_chat_error(error: Exception) -> bool:
    message = str(error).lower()
    return (
        "degraded" in message
        or "cannot be invoked" in message
        or "authorization failed" in message
        or "forbidden" in message
        or "status: 400" in message
        or "status: 401" in message
        or "status: 403" in message
    )


def _create_chat_completion_with_fallback(
    chat_client: OpenAI,
    preferred_model: str | None,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
):
    last_error: Exception | None = None
    for model_name in _chat_model_candidates(preferred_model):
        try:
            return chat_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                top_p=0.95,
                max_tokens=max_tokens,
            )
        except Exception as exc:
            last_error = exc
            if _is_retryable_chat_error(exc):
                continue
            raise RuntimeError(f"NVIDIA chat request failed: {exc}") from exc

    if last_error:
        raise RuntimeError(f"NVIDIA chat request failed: {last_error}") from last_error
    raise RuntimeError("NVIDIA chat request failed: no valid chat model candidate configured.")


def _build_retrieval_only_answer(question: str, sources: list[dict]) -> str:
    snippets = [
        (source.get("snippet") or "").strip()
        for source in sources
        if (source.get("snippet") or "").strip()
    ]
    if not snippets:
        return "I could not find relevant indexed content to answer this question yet. Please index more sources."

    short_context = " ".join(snippets[:3])
    return (
        f"I could not use the AI chat model right now, so this is a retrieval-based reply from indexed sources: {short_context}"
    )


def _sanitize_ssl_env_vars() -> None:
    """Drop invalid certificate env vars that can break httpx SSL setup."""
    for env_name in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
        value = os.getenv(env_name)
        if value and not Path(value).exists():
            os.environ.pop(env_name, None)


def get_uploads_dir() -> Path:
    return UPLOADS_DIR


def _require_nvidia_embedding_api_key() -> str:
    # Prefer dedicated embedding key, but allow fallback for simpler deployments.
    api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_CHAT_API_KEY")
    if not api_key:
        raise RuntimeError("Server is missing NVIDIA_API_KEY (or NVIDIA_CHAT_API_KEY fallback) configuration.")
    return api_key


def _require_nvidia_chat_api_key() -> str:
    # Keep fallback for backward compatibility, but prefer a dedicated chat key.
    api_key = os.getenv("NVIDIA_CHAT_API_KEY") or os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError("Server is missing NVIDIA_CHAT_API_KEY configuration.")
    return api_key


def _build_nvidia_embedding_client() -> OpenAI:
    _sanitize_ssl_env_vars()
    api_key = _require_nvidia_embedding_api_key()
    return OpenAI(base_url=DEFAULT_NVIDIA_BASE_URL, api_key=api_key)


def _build_nvidia_chat_client() -> OpenAI:
    _sanitize_ssl_env_vars()
    api_key = _require_nvidia_chat_api_key()
    return OpenAI(base_url=DEFAULT_NVIDIA_BASE_URL, api_key=api_key)


class NVIDIAEmbeddings(Embeddings):
    def __init__(self, client: OpenAI, model: str):
        self.client = client
        self.model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts,
                extra_body={"input_type": "passage"},
            )
            return [item.embedding for item in response.data]
        except Exception:
            return _local_hash_embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text,
                extra_body={"input_type": "query"},
            )
            return response.data[0].embedding
        except Exception:
            return _local_hash_embed_query(text)


def _local_hash_embed_query(text: str, dim: int = 384) -> list[float]:
    return _local_hash_embed_documents([text], dim=dim)[0]


def _local_hash_embed_documents(texts: list[str], dim: int = 384) -> list[list[float]]:
    vectors: list[list[float]] = []
    for text in texts:
        vector = [0.0] * dim
        tokens = re.findall(r"[a-zA-Z0-9_\u1200-\u137F]+", (text or "").lower())
        if not tokens:
            vectors.append(vector)
            continue

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], byteorder="big", signed=False) % dim
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign

        norm = sum(v * v for v in vector) ** 0.5
        if norm > 0:
            vector = [v / norm for v in vector]
        vectors.append(vector)

    return vectors


def _split_documents(documents: Iterable[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=DEFAULT_CHUNK_SIZE,
        chunk_overlap=DEFAULT_CHUNK_OVERLAP,
    )
    return splitter.split_documents(list(documents))


def _load_file_documents(file_paths: Iterable[Path]) -> list[Document]:
    docs: list[Document] = []

    for file_path in file_paths:
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            loader_docs = PyPDFLoader(str(file_path)).load()
        elif suffix in {".txt", ".md"}:
            loader_docs = TextLoader(str(file_path), encoding="utf-8").load()
        else:
            continue

        for document in loader_docs:
            source_name = file_path.name
            document.metadata["source"] = source_name
            document.metadata["source_type"] = "file"

        docs.extend(loader_docs)

    return docs


def _load_web_documents(urls: Iterable[str]) -> list[Document]:
    url_list = [url for url in urls if url]
    if not url_list:
        return []

    docs: list[Document] = []
    failed_urls: list[str] = []

    for url in url_list:
        try:
            loader = WebBaseLoader([url])
            loaded_docs = loader.load()
            docs.extend(loaded_docs)
        except Exception:
            failed_urls.append(url)

    if not docs and failed_urls:
        raise ValueError(
            "Failed to fetch the provided URL(s). Some websites block automated reads. "
            f"Failed: {', '.join(failed_urls)}"
        )

    for document in docs:
        source_value = document.metadata.get("source", "web")
        document.metadata["source"] = str(source_value)
        document.metadata["source_type"] = "web"

    return docs


def _load_bundled_knowledge_documents() -> list[Document]:
    if not KNOWLEDGE_DIR.exists():
        return []

    docs: list[Document] = []
    for path in sorted(KNOWLEDGE_DIR.glob("*")):
        if path.suffix.lower() not in {".txt", ".md"}:
            continue

        loaded_docs = TextLoader(str(path), encoding="utf-8").load()
        for document in loaded_docs:
            document.metadata["source"] = f"knowledge/{path.name}"
            document.metadata["source_type"] = "bundled"
        docs.extend(loaded_docs)

    return docs


def _load_vector_store(embeddings: Embeddings) -> FAISS:
    index_faiss = VECTOR_DIR / "index.faiss"
    index_pkl = VECTOR_DIR / "index.pkl"

    if not (index_faiss.exists() and index_pkl.exists()):
        raise ValueError("Knowledge base is empty. Ingest documents first.")

    return FAISS.load_local(
        folder_path=str(VECTOR_DIR),
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )


def _clear_vector_store_files() -> None:
    for file_name in ("index.faiss", "index.pkl"):
        file_path = VECTOR_DIR / file_name
        if file_path.exists():
            file_path.unlink()


def _index_documents(documents: list[Document], replace_existing: bool = False) -> int:
    if not documents:
        return 0

    chunks = _split_documents(documents)
    if not chunks:
        return 0

    VECTOR_DIR.mkdir(parents=True, exist_ok=True)
    embeddings = NVIDIAEmbeddings(
        client=_build_nvidia_embedding_client(),
        model=DEFAULT_EMBEDDING_MODEL,
    )

    with LOCK:
        if replace_existing:
            _clear_vector_store_files()

        index_faiss = VECTOR_DIR / "index.faiss"
        index_pkl = VECTOR_DIR / "index.pkl"
        store_ready = index_faiss.exists() and index_pkl.exists()

        if store_ready:
            vector_store = _load_vector_store(embeddings)
            vector_store.add_documents(chunks)
        else:
            for stale_path in (index_faiss, index_pkl):
                if stale_path.exists():
                    stale_path.unlink()
            vector_store = FAISS.from_documents(chunks, embeddings)

        vector_store.save_local(str(VECTOR_DIR))

    return len(chunks)


def _ensure_bundled_knowledge_index() -> None:
    index_faiss = VECTOR_DIR / "index.faiss"
    index_pkl = VECTOR_DIR / "index.pkl"
    if index_faiss.exists() and index_pkl.exists():
        return

    bundled_docs = _load_bundled_knowledge_documents()
    if not bundled_docs:
        return

    _index_documents(bundled_docs, replace_existing=True)


def _clean_answer_text(text: str) -> str:
    """Normalize model output so UI shows concise, readable plain text."""
    cleaned = text or ""
    cleaned = cleaned.replace("**", "")
    cleaned = cleaned.replace("\r\n", "\n")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)

    # Remove common trailing json-like wrappers if model returns fenced text.
    cleaned = cleaned.strip().strip("`")
    return cleaned.strip()


def ingest_knowledge(file_paths: list[Path], urls: list[str], replace_existing: bool = True) -> dict:
    file_docs = _load_file_documents(file_paths)
    web_docs = _load_web_documents(urls)
    bundled_docs = _load_bundled_knowledge_documents()
    all_docs = bundled_docs + file_docs + web_docs

    if not (file_docs or web_docs or bundled_docs):
        raise ValueError("No readable content found in the provided files or URLs.")

    chunks_indexed = _index_documents(all_docs, replace_existing=replace_existing)
    if chunks_indexed == 0:
        raise ValueError("Could not split content into chunks.")

    return {
        "message": "Knowledge base updated successfully.",
        "documentsLoaded": len(file_docs) + len(web_docs),
        "bundledDocumentsLoaded": len(bundled_docs),
        "chunksIndexed": chunks_indexed,
        "filesProcessed": len(file_paths),
        "urlsProcessed": len(urls),
    }


def ask_knowledge_question(
    question: str,
    top_k: int = 3,
    model: str | None = None,
    temperature: float = 0.6,
    max_tokens: int = 16384,
) -> dict:
    chat_client = _build_nvidia_chat_client()
    embedding_client = _build_nvidia_embedding_client()
    embeddings = NVIDIAEmbeddings(client=embedding_client, model=DEFAULT_EMBEDDING_MODEL)

    # Check if vector index exists and contains ONLY user-uploaded docs (not bundled knowledge)
    index_faiss = VECTOR_DIR / "index.faiss"
    index_pkl = VECTOR_DIR / "index.pkl"
    if not (index_faiss.exists() and index_pkl.exists()):
        raise ValueError("Knowledge base is empty. Please ingest PDF or URL first.")

    # Check if index was built from only bundled docs (no user files/urls)
    # If so, treat as empty for knowledge assistant
    user_uploads_dir = UPLOADS_DIR
    has_user_uploads = user_uploads_dir.exists() and any(user_uploads_dir.iterdir())
    # Optionally, check for web ingested URLs (could track in a file or metadata)
    # For now, if no uploads, treat as empty
    if not has_user_uploads:
        raise ValueError("Knowledge base is empty. Please ingest PDF or URL first.")

    retrieved_docs: list[Document] = []
    sources = []

    with LOCK:
        vector_store = _load_vector_store(embeddings)
        retrieved_docs = vector_store.similarity_search(question, k=top_k)

    # Only answer if retrieved_docs are non-empty and all sources are user-uploaded or user-provided URLs
    context_blocks = []
    for index, doc in enumerate(retrieved_docs, start=1):
        source = str(doc.metadata.get("source", "Unknown source"))
        source_type = doc.metadata.get("source_type", "")
        cleaned_snippet = " ".join(doc.page_content.split())
        short_snippet = cleaned_snippet[:360]
        context_blocks.append(f"[{index}] Source: {source}\nContent: {cleaned_snippet}")
        sources.append({"source": source, "snippet": short_snippet, "source_type": source_type})

    # If no docs or all docs are bundled, return error
    if not sources or all(s.get("source_type") == "bundled" for s in sources):
        raise ValueError("No data available. Please ingest PDF or URL.")

    # Build prompt as before, but only for user sources
    system_prompt = (
        "You are an Ethiopian Knowledge Assistant. Answer ONLY using the provided context from user-uploaded files or URLs. "
        "If context is missing, do not answer. Respond in plain natural prose, no markdown, no JSON, no bullet symbols, and keep answers concise and readable."
    )

    user_prompt = (
        f"User Question: {question}\n\n"
        f"Retrieved Context:\n{chr(10).join(context_blocks)}"
    )

    try:
        completion = _create_chat_completion_with_fallback(
            chat_client=chat_client,
            preferred_model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        answer_text = completion.choices[0].message.content or "No answer generated."
        answer_text = _clean_answer_text(answer_text)
    except RuntimeError:
        answer_text = _build_retrieval_only_answer(question=question, sources=sources)

    return {
        "answer": answer_text.strip(),
        "sources": sources,
    }


def _load_home_chat_knowledge_text() -> str:
    """Load bundled platform docs used by the floating site-wide chat."""
    if not KNOWLEDGE_DIR.exists():
        return ""

    preferred_files = ["developer.txt", "platform.txt", "tools.txt"]
    sections: list[str] = []

    for file_name in preferred_files:
        path = KNOWLEDGE_DIR / file_name
        if not path.exists():
            continue

        try:
            content = path.read_text(encoding="utf-8").strip()
        except OSError:
            continue

        if content:
            sections.append(f"[{file_name}]\n{content}")

    return "\n\n".join(sections)


def _load_knowledge_file_text(file_name: str) -> str:
    path = KNOWLEDGE_DIR / file_name
    if not path.exists():
        return ""

    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def _tokenize_for_match(text: str) -> set[str]:
    # Simple lexical matching keeps home chat fast and independent from vector ingest state.
    return {
        token
        for token in re.findall(r"[a-zA-Z0-9_\u1200-\u137F]+", (text or "").lower())
        if len(token) > 2
    }


def _build_home_chat_context(question: str, max_blocks: int = 6) -> str:
    knowledge_text = _load_home_chat_knowledge_text()
    if not knowledge_text:
        return ""

    blocks = [block.strip() for block in re.split(r"\n\s*\n", knowledge_text) if block.strip()]
    if not blocks:
        return ""

    question_tokens = _tokenize_for_match(question)
    scored: list[tuple[int, str]] = []

    for block in blocks:
        block_tokens = _tokenize_for_match(block)
        overlap = len(question_tokens & block_tokens)
        scored.append((overlap, block))

    scored.sort(key=lambda item: item[0], reverse=True)
    picked_blocks = [block for _, block in scored[:max_blocks]]
    return "\n\n".join(picked_blocks)


def _is_developer_profile_question(question: str) -> bool:
    normalized = (question or "").strip().lower()
    if not normalized:
        return False

    direct_phrases = (
        "who is the developer",
        "who developed",
        "who built",
        "who made",
        "who is the creator",
        "who is the founder",
        "about the developer",
        "developer of this app",
        "about me",
        "who am i",
    )
    if any(phrase in normalized for phrase in direct_phrases):
        return True

    keyword_hits = sum(
        1
        for keyword in ("developer", "creator", "founder", "owner", "built", "made")
        if keyword in normalized
    )
    return keyword_hits >= 1


def _is_app_name_question(question: str) -> bool:
    normalized = (question or "").strip().lower()
    if not normalized:
        return False

    direct_phrases = (
        "name of this app",
        "what is the app name",
        "what is this app called",
        "app name",
        "platform name",
        "what is the name of this platform",
    )

    if any(phrase in normalized for phrase in direct_phrases):
        return True

    has_name_term = any(term in normalized for term in ("name", "called", "title"))
    has_target_term = any(term in normalized for term in ("app", "platform", "website", "site"))
    return has_name_term and has_target_term


def ask_home_chat_question(
    question: str,
    model: str | None = None,
    temperature: float = 0.4,
    max_tokens: int = 420,
) -> dict:
    """Answer from bundled platform/developer docs and still support general chat."""
    if _is_app_name_question(question):
        return {"answer": "ፍኖት Ethiopian AI HUB"}

    if _is_developer_profile_question(question):
        developer_profile = _load_knowledge_file_text("developer.txt")
        if developer_profile:
            return {"answer": _clean_answer_text(developer_profile)}

    chat_client = _build_nvidia_chat_client()
    context_text = _build_home_chat_context(question)

    system_prompt = (
        "You are the site-wide assistant for ፍኖት Ethiopian AI HUB. "
        "When a question is about the platform or developer, treat the provided context as the source of truth. "
        "If the question is general and not covered by context, answer normally in a concise and friendly way. "
        "Never claim missing PDF/URL ingestion because that applies only to a different tool."
    )

    user_prompt = (
        f"Question: {question}\n\n"
        "Platform Context (use when relevant):\n"
        f"{context_text or 'No platform context available.'}"
    )

    completion = _create_chat_completion_with_fallback(
        chat_client=chat_client,
        preferred_model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )

    answer_text = completion.choices[0].message.content or "No answer generated."
    answer_text = _clean_answer_text(answer_text)

    return {"answer": answer_text.strip()}

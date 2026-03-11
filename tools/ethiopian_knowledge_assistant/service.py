import os
import re
import threading
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
DEFAULT_EMBEDDING_MODEL = os.getenv("NVIDIA_EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5")
DEFAULT_NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
DEFAULT_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "900"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))


def _sanitize_ssl_env_vars() -> None:
    """Drop invalid certificate env vars that can break httpx SSL setup."""
    for env_name in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
        value = os.getenv(env_name)
        if value and not Path(value).exists():
            os.environ.pop(env_name, None)


def get_uploads_dir() -> Path:
    return UPLOADS_DIR


def _require_nvidia_embedding_api_key() -> str:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError("Server is missing NVIDIA_API_KEY configuration.")
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
        except Exception as exc:
            raise RuntimeError(f"NVIDIA embedding request failed: {exc}") from exc

    def embed_query(self, text: str) -> list[float]:
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text,
                extra_body={"input_type": "query"},
            )
            return response.data[0].embedding
        except Exception as exc:
            raise RuntimeError(f"NVIDIA query embedding failed: {exc}") from exc


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
    _ensure_bundled_knowledge_index()
    chat_client = _build_nvidia_chat_client()
    embedding_client = _build_nvidia_embedding_client()
    embeddings = NVIDIAEmbeddings(client=embedding_client, model=DEFAULT_EMBEDDING_MODEL)

    retrieved_docs: list[Document] = []
    sources = []

    try:
        with LOCK:
            vector_store = _load_vector_store(embeddings)
            retrieved_docs = vector_store.similarity_search(question, k=top_k)
    except ValueError:
        # Allow general assistant behavior even if no vector index exists yet.
        retrieved_docs = []

    context_blocks = []

    for index, doc in enumerate(retrieved_docs, start=1):
        source = str(doc.metadata.get("source", "Unknown source"))
        cleaned_snippet = " ".join(doc.page_content.split())
        short_snippet = cleaned_snippet[:360]

        context_blocks.append(f"[{index}] Source: {source}\nContent: {cleaned_snippet}")
        sources.append({"source": source, "snippet": short_snippet})

    system_prompt = (
        "You are an AI assistant for an Ethiopian AI platform. "
        "You can answer any question clearly and helpfully. "
        "You also know information about the platform and its developer. "
        "Developer: Samuel Abera. Samuel Abera is a software engineering student "
        "from Ethiopia building AI tools. "
        "If the user asks about the developer or platform, prioritize provided context when available. "
        "If retrieved context is empty, still answer normally using general knowledge. "
        "Style rules: respond in plain natural prose, no markdown, no JSON, no bullet symbols, "
        "and keep answers concise and readable."
    )

    lower_question = question.lower()
    is_identity_question = any(
        keyword in lower_question
        for keyword in (
            "who built",
            "who is the developer",
            "developer",
            "who created",
            "about samuel",
            "about the platform",
        )
    )

    if context_blocks:
        answer_instruction = (
            "Answer clearly. If context contains relevant platform details, use it."
        )
        if is_identity_question:
            answer_instruction = (
                "Answer in 3 to 5 sentences using the context, and include name, background, "
                "AI focus, and what the platform provides."
            )

        user_prompt = (
            f"User Question: {question}\n\n"
            f"Retrieved Context:\n{chr(10).join(context_blocks)}\n\n"
            f"{answer_instruction}"
        )
    else:
        user_prompt = f"User Question: {question}\n\nAnswer clearly."

    try:
        completion = chat_client.chat.completions.create(
            model=model or DEFAULT_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            top_p=0.95,
            max_tokens=max_tokens,
        )
    except Exception as exc:
        raise RuntimeError(f"NVIDIA chat request failed: {exc}") from exc

    answer_text = completion.choices[0].message.content or "No answer generated."
    answer_text = _clean_answer_text(answer_text)

    return {
        "answer": answer_text.strip(),
        "sources": sources,
    }

import os
import threading
from pathlib import Path
from typing import Iterable

from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader, WebBaseLoader
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
VECTOR_DIR = DATA_DIR / "vector_store"
LOCK = threading.Lock()

DEFAULT_CHAT_MODEL = os.getenv("NVIDIA_CHAT_MODEL", "nvidia/nemotron-3-nano-30b-a3b")
DEFAULT_EMBEDDING_MODEL = os.getenv("NVIDIA_EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5")
DEFAULT_NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
DEFAULT_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "900"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))

# WebBaseLoader warns if USER_AGENT is missing; set a safe default.
os.environ.setdefault("USER_AGENT", "ai-tools-app-rag/1.0")


def get_uploads_dir() -> Path:
    return UPLOADS_DIR


def _require_nvidia_api_key() -> str:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError("Server is missing NVIDIA_API_KEY configuration.")
    return api_key


def _build_nvidia_client() -> OpenAI:
    api_key = _require_nvidia_api_key()
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


def _load_vector_store(embeddings: Embeddings) -> FAISS:
    if not (VECTOR_DIR / "index.faiss").exists():
        raise ValueError("Knowledge base is empty. Ingest documents first.")

    return FAISS.load_local(
        folder_path=str(VECTOR_DIR),
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )


def ingest_knowledge(file_paths: list[Path], urls: list[str]) -> dict:
    file_docs = _load_file_documents(file_paths)
    web_docs = _load_web_documents(urls)
    all_docs = file_docs + web_docs

    if not all_docs:
        raise ValueError("No readable content found in the provided files or URLs.")

    chunks = _split_documents(all_docs)
    if not chunks:
        raise ValueError("Could not split content into chunks.")

    VECTOR_DIR.mkdir(parents=True, exist_ok=True)
    client = _build_nvidia_client()
    embeddings = NVIDIAEmbeddings(client=client, model=DEFAULT_EMBEDDING_MODEL)

    with LOCK:
        if (VECTOR_DIR / "index.faiss").exists():
            vector_store = _load_vector_store(embeddings)
            vector_store.add_documents(chunks)
        else:
            vector_store = FAISS.from_documents(chunks, embeddings)

        vector_store.save_local(str(VECTOR_DIR))

    return {
        "message": "Knowledge base updated successfully.",
        "documentsLoaded": len(all_docs),
        "chunksIndexed": len(chunks),
        "filesProcessed": len(file_paths),
        "urlsProcessed": len(urls),
    }


def ask_knowledge_question(question: str, top_k: int = 3) -> dict:
    client = _build_nvidia_client()
    embeddings = NVIDIAEmbeddings(client=client, model=DEFAULT_EMBEDDING_MODEL)

    with LOCK:
        vector_store = _load_vector_store(embeddings)
        retrieved_docs = vector_store.similarity_search(question, k=top_k)

    if not retrieved_docs:
        return {
            "answer": "I could not find relevant information in the current knowledge base.",
            "sources": [],
        }

    context_blocks = []
    sources = []

    for index, doc in enumerate(retrieved_docs, start=1):
        source = str(doc.metadata.get("source", "Unknown source"))
        cleaned_snippet = " ".join(doc.page_content.split())
        short_snippet = cleaned_snippet[:360]

        context_blocks.append(f"[{index}] Source: {source}\nContent: {cleaned_snippet}")
        sources.append({"source": source, "snippet": short_snippet})

    system_prompt = (
        "You are Ethiopian Knowledge AI Assistant. "
        "Answer using only the provided context. "
        "If the answer is not in context, say you do not know."
    )
    user_prompt = f"Question: {question}\n\nRetrieved Context:\n{chr(10).join(context_blocks)}"

    try:
        completion = client.chat.completions.create(
            model=DEFAULT_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            top_p=1,
            max_tokens=1500,
        )
    except Exception as exc:
        raise RuntimeError(f"NVIDIA chat request failed: {exc}") from exc

    answer_text = completion.choices[0].message.content or "No answer generated."

    return {
        "answer": answer_text.strip(),
        "sources": sources,
    }

# Ethiopian Knowledge AI Assistant

A Retrieval-Augmented Generation (RAG) tool in this project that lets you:

- ingest Ethiopian-focused documents and web pages,
- build a local FAISS vector index,
- ask questions, and
- get grounded answers with source snippets.

This module powers the page:

- `/Resources/Ethiopian_Knowledge_AI_Assistant`

and APIs:

- `POST /api/ethiopian-knowledge/ingest`
- `POST /api/ethiopian-knowledge/ask`

## How It Works

1. You upload files (`.pdf`, `.txt`, `.md`) and/or provide URLs.
2. Content is loaded and split into chunks.
3. Chunks are embedded with NVIDIA embedding models.
4. Embeddings are stored in a local FAISS index.
5. For each question, the app retrieves top matches and sends context to an NVIDIA chat model.
6. The answer is returned with source snippets.

## Supported Inputs

- Files: `.pdf`, `.txt`, `.md`
- URLs: `http://` or `https://` links (one per line in the form)

## Required Environment Variables

Add these to your `.env` file at project root.

- `NVIDIA_API_KEY` (required)

Optional configuration:

- `NVIDIA_BASE_URL` (default: `https://integrate.api.nvidia.com/v1`)
- `NVIDIA_CHAT_MODEL` (default: `nvidia/nemotron-3-nano-30b-a3b`)
- `NVIDIA_EMBEDDING_MODEL` (default: `nvidia/nv-embedqa-e5-v5`)
- `RAG_CHUNK_SIZE` (default: `900`)
- `RAG_CHUNK_OVERLAP` (default: `150`)

Example `.env`:

```env
NVIDIA_API_KEY=your_api_key_here
NVIDIA_CHAT_MODEL=nvidia/nemotron-3-nano-30b-a3b
NVIDIA_EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5
RAG_CHUNK_SIZE=900
RAG_CHUNK_OVERLAP=150
```

## Data Storage

The module stores data here:

- `tools/ethiopian_knowledge_assistant/data/uploads/` for uploaded source files
- `tools/ethiopian_knowledge_assistant/data/vector_store/index.faiss`
- `tools/ethiopian_knowledge_assistant/data/vector_store/index.pkl`

## API Reference

### 1) Ingest Knowledge

`POST /api/ethiopian-knowledge/ingest`

Request type: `multipart/form-data`

Fields:

- `files`: one or more files (`.pdf`, `.txt`, `.md`)
- `urls`: optional multi-line string of URLs
- `replaceExisting`: optional boolean-like string (`true` by default)

Behavior of `replaceExisting`:

- `true` (default): clears old vector index and rebuilds from this request
- `false`: appends to existing index

Success response example:

```json
{
  "message": "Knowledge base updated successfully.",
  "documentsLoaded": 4,
  "chunksIndexed": 63,
  "filesProcessed": 2,
  "urlsProcessed": 2
}
```

Common errors:

- `400`: invalid file type, no inputs, unreadable content
- `500`: missing API key or unexpected server issue

### 2) Ask a Question

`POST /api/ethiopian-knowledge/ask`

Request body:

```json
{
  "question": "What is the Ethiopian calendar?"
}
```

Success response example:

```json
{
  "answer": "The Ethiopian calendar has 13 months...",
  "sources": [
    {
      "source": "ethiopian_calendar.pdf",
      "snippet": "The Ethiopian calendar consists of 12 months of 30 days..."
    }
  ]
}
```

Common errors:

- `400`: question is empty, or no index exists yet
- `500`: model/API configuration error

## Quick Local Test (curl)

### Ingest files + URL

```bash
curl -X POST http://127.0.0.1:5000/api/ethiopian-knowledge/ingest \
  -F "files=@./sample_data/ethiopia_notes.pdf" \
  -F "urls=https://en.wikipedia.org/wiki/Ethiopian_calendar" \
  -F "replaceExisting=true"
```

### Ask

```bash
curl -X POST http://127.0.0.1:5000/api/ethiopian-knowledge/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Explain Ethiopian coffee ceremony"}'
```

## Troubleshooting

- Error: `Server is missing NVIDIA_API_KEY configuration.`
  - Fix: add `NVIDIA_API_KEY` in `.env`, then restart app.

- Error: `Knowledge base is empty. Ingest documents first.`
  - Fix: call ingest API first.

- URL ingestion fails for some websites.
  - Some sites block automated readers; use PDFs/text files or different sources.

- SSL/certificate environment issues.
  - The service auto-removes invalid cert env paths (`SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`, `CURL_CA_BUNDLE`) before API calls.

## Main Module Files

- `tools/ethiopian_knowledge_assistant/service.py`: ingestion, embedding, retrieval, answering
- `app.py`: Flask routes for page + APIs
- `templates/ethiopian_knowledge_ai_assistant.html`: UI page
- `static/js/ethiopian_knowledge_ai_assistant.js`: frontend API calls

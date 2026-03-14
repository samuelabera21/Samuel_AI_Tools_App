# Guidance README

This guide explains:
- how to run the app locally
- which environments you need
- how many libraries are used
- what each library is used for

No application code changes are required to follow this guide.

## 1) Project Type

This repository is primarily a Python Flask web app with server-rendered HTML templates and static JS/CSS assets.

Primary entry point:
- `app.py`

## 2) Required Environments

## Core runtime (required)
- Python: `3.10+` (recommended: `3.11.x`)
- pip: latest available version
- OS: Windows, Linux, or macOS

## Optional environment manager (recommended)
Use one of the following:
- `venv` (built into Python)
- `conda`

## System dependency (required for OCR feature)
- Tesseract OCR binary installed on your system
- Amharic language data (`amh.traineddata`) available in Tesseract data path

Without Tesseract, the OCR route can fail even if Python packages are installed.

## Optional (not required to run backend)
- Node.js + npm (only needed if you plan to manage JS dependencies in `package.json`)

## 3) Environment Variables

Create a `.env` file at project root (or set variables in your shell).

Required for AI features:
- `NVIDIA_API_KEY`
  - Used by image generation, keyboard AI polish, and knowledge assistant embedding/chat fallback.

Common optional variables:
- `NVIDIA_CHAT_API_KEY`
  - Optional separate key for chat calls.
- `NVIDIA_BASE_URL` (default: `https://integrate.api.nvidia.com/v1`)
  - Base URL for OpenAI-compatible NVIDIA endpoints.
- `NVIDIA_CHAT_MODEL` (default from code)
  - Model used by knowledge assistant and keyboard AI chat calls.
- `NVIDIA_HOME_CHAT_MODEL` (default from code)
  - Faster model used by home widget chat endpoint.
- `NVIDIA_EMBEDDING_MODEL` (default from code)
  - Embedding model for RAG indexing/retrieval.
- `NVIDIA_IMAGE_API_URL` (default from code)
  - Endpoint for text-to-image generation.
- `SHORT_LINK_PUBLIC_BASE_URL`
  - Public base URL for generated short links.
- `FRONTEND_ORIGINS` (default: `*`)
  - CORS allow-list for `/api/*` routes.
- `RAG_CHUNK_SIZE` (default: `900`)
  - Text splitting size for knowledge ingestion.
- `RAG_CHUNK_OVERLAP` (default: `150`)
  - Overlap between text chunks for retrieval quality.

Example `.env`:

```env
NVIDIA_API_KEY=your_real_key_here
NVIDIA_CHAT_API_KEY=optional_chat_key
FRONTEND_ORIGINS=http://127.0.0.1:5000,http://localhost:5000
SHORT_LINK_PUBLIC_BASE_URL=http://127.0.0.1:5000
```

## 4) Setup and Run

## Option A: venv (recommended)

Windows PowerShell:

```powershell
cd s:\Project\ai_tools_app
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

## Option B: conda

```powershell
cd s:\Project\ai_tools_app
conda create -n ai_tools_app python=3.11 -y
conda activate ai_tools_app
pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Open in browser:
- `http://127.0.0.1:5000/`

## 5) Library Count and Purpose

## Python third-party libraries (`requirements.txt`)
Count: `16`

1. `flask`
   - Web framework for routes, templates, request/response handling.
2. `flask-cors`
   - Enables configurable CORS for `/api/*` endpoints.
3. `opencv-python`
   - Image processing utilities used in OCR workflows.
4. `numpy`
   - Numeric array operations, often used with image bytes/matrices.
5. `pytesseract`
   - Python wrapper to call Tesseract OCR engine.
6. `gTTS`
   - Google Text-to-Speech for MP3 generation (Amharic number speech route).
7. `edge-tts`
   - Additional speech synthesis backend for text-to-speech tooling.
8. `langchain`
   - Core orchestration for LLM and retrieval pipelines.
9. `langchain-community`
   - Community integrations/loaders/vector helpers used by RAG features.
10. `faiss-cpu`
   - Vector index/search engine for fast semantic retrieval.
11. `pypdf`
   - PDF parsing for knowledge document ingestion.
12. `beautifulsoup4`
   - HTML parsing/cleaning, useful for URL/content ingestion.
13. `tiktoken`
   - Token counting/splitting support for chunking and model limits.
14. `openai`
   - OpenAI-compatible client used with NVIDIA-hosted endpoints.
15. `python-dotenv`
   - Loads variables from `.env` at app startup.
16. `gunicorn`
   - Production WSGI server (mainly for Render deployment).

## JavaScript dependencies (`package.json`)
Count: `1`

1. `libphonenumber-js`
   - Phone number parsing/validation utilities for phone-related features.

## Total third-party libraries declared in repo manifests
- `17` (`16` Python + `1` JavaScript)

## 6) Quick Health Checks

Run these from project root after install:

```powershell
python -c "import flask, dotenv, gtts; print('core imports OK')"
python -c "import cv2, pytesseract, numpy; print('ocr imports OK')"
python -c "import langchain, faiss, openai; print('ai imports OK')"
```

If one fails, reinstall dependencies in the same active interpreter:

```powershell
pip install -r requirements.txt
```

## 7) Common Issues

- `Import ... could not be resolved` in VS Code:
  - Usually means selected interpreter is not the one where packages were installed.
- OCR not working:
  - Tesseract binary or Amharic trained data missing at OS level.
- AI routes failing with config errors:
  - Missing `NVIDIA_API_KEY` (or chat key where applicable).

## 8) Deployment Notes (summary)

- Render backend is configured via `render.yaml` with `gunicorn app:app`.
- Vercel can be used as a frontend/proxy via `vercel.json` rewrite.
- For production, set all secrets in host environment variables, not in source files.

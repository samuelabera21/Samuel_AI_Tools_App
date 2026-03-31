# Deployment Guide: Backend on Render + Frontend on Vercel

This project is now prepared for a simple two-platform deployment:

- Render hosts the Flask backend.
- Vercel hosts a proxy frontend domain that forwards all routes to Render.

With this setup, users open the Vercel URL, and all pages and APIs are served through it.

## What Was Added

- Render blueprint config: render.yaml
- Vercel routing config: vercel.json
- Production server dependency: gunicorn in requirements.txt
- API CORS support for split-domain use in app.py

## Important Before Deploying

The configs now use env-based placeholders with safe fallbacks:

1. In vercel.json, set `RENDER_BACKEND_URL` to your real Render URL.
   - Default placeholder: `https://your-render-backend.onrender.com`

2. In render.yaml, `FRONTEND_ORIGINS` defaults to `*`.
   - Fallback behavior: APIs remain callable from any origin until you lock this down.
   - For production, set it to your Vercel domain (or comma-separated list).

3. In render.yaml, `SHORT_LINK_PUBLIC_BASE_URL` defaults to empty string.
   - Fallback behavior: short links automatically use the current request host.

## Step-by-Step Flow

## 1) Deploy Backend on Render

1. Push your latest code to GitHub.
2. In Render, create a new Blueprint service from your repo.
3. Render reads render.yaml automatically.
4. Add one secret when prompted:
   - NVIDIA_API_KEY
5. Deploy.

After success, copy your Render URL, for example:
- https://ai-tools-backend.onrender.com

## 2) Point Vercel to Render

1. Open vercel.json.
2. Set `RENDER_BACKEND_URL` to your real Render URL.
3. Commit and push.

## 3) Deploy Frontend on Vercel

1. Import the same repo in Vercel.
2. Vercel uses vercel.json and creates a proxy deployment.
3. Copy your Vercel domain, for example:
- https://ai-tools-app.vercel.app

## 4) Lock CORS to Your Vercel Domain

1. Open render.yaml.
2. Set `FRONTEND_ORIGINS` to your real Vercel domain.
3. Commit and push, then redeploy Render.

This allows browser API calls only from your Vercel frontend.

## Why API Key Must Be Set Manually in Render

Short answer: security.

If you do not set it in Render secret environment variables, the only alternative is committing the key to your repository, which is unsafe and can expose billing and account access.

There is no safe zero-step way for a cloud host to know your private NVIDIA key automatically.

The good news:

- It is a one-time action.
- After setting it once, future deployments use it automatically.
- You do not need to re-enter it on every deploy.

## If You Want Near Zero Ongoing Work

Use this pattern:

1. Set NVIDIA_API_KEY once in Render dashboard.
2. Keep render.yaml and vercel.json in repo.
3. Future updates: just git push.

That is the minimum secure process.

## Verification Checklist

After both deployments:

1. Open Vercel URL and confirm home page loads.
2. Open Knowledge Assistant page.
3. Ingest one file or URL.
4. Ask a question.
5. Confirm answer and sources are returned.

## Persistence Note (Knowledge Assistant Data)

The assistant stores vector index and uploads under:
- tools/ethiopian_knowledge_assistant/data

render.yaml mounts a persistent disk there, so indexed knowledge survives restarts/redeploys.

## Persistence Note (Generated Audio)

Generated music files are configured for production persistence:

- Storage directory is controlled by `AUDIO_STORAGE_DIR`.
- Render blueprint mounts a dedicated persistent disk at that path.
- Files are served from `/media/audio/<filename>`.
- Automatic cleanup is controlled by `AUDIO_RETENTION_HOURS` (default 168 hours = 7 days).

This means generated audio survives restarts and redeploys, while old files are cleaned automatically.

## Lightweight Production Profile Toggle

The backend now supports a lightweight profile for free deployments:

- `APP_PROFILE=production-lite`
- `ENABLE_MUSIC_GENERATION=false`
- `MUSIC_DISABLED_MESSAGE=...`

Fallback behavior:

- Music page still loads.
- Generation endpoint returns a clear 503 message.
- Other tools remain fully functional.

When you want full music support again, set:

- `ENABLE_MUSIC_GENERATION=true`

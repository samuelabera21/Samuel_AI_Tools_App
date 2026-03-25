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

You only need to edit 2 placeholders one time:

1. In vercel.json, replace:
   - https://YOUR_RENDER_BACKEND.onrender.com
   with your real Render backend URL after first Render deploy.

2. In render.yaml, replace:
   - https://YOUR_VERCEL_DOMAIN.vercel.app
   with your real Vercel domain.

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
2. Replace destination placeholder with your real Render URL.
3. Commit and push.

## 3) Deploy Frontend on Vercel

1. Import the same repo in Vercel.
2. Vercel uses vercel.json and creates a proxy deployment.
3. Copy your Vercel domain, for example:
- https://ai-tools-app.vercel.app

## 4) Lock CORS to Your Vercel Domain

1. Open render.yaml.
2. Set FRONTEND_ORIGINS to your real Vercel domain.
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

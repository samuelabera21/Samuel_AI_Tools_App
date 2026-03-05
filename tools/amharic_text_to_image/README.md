# Amharic AI Prompt to Image Generator

Tool path: `tools/amharic_text_to_image/`

## Overview
This tool generates a new AI image from an Amharic prompt (semantic generation), not text rendering.

User flow:
1. User enters an Amharic prompt in the web page.
2. Frontend calls backend endpoint `/api/amharic-ai-image`.
3. Backend validates payload and calls tool logic in `generator.py`.
4. Tool prepares prompt (Amharic-aware normalization + constraints).
5. NVIDIA FLUX endpoint returns generated image bytes (base64).
6. Frontend displays image and provides download button.

## What Makes It Amharic-Aware
The generator includes an Amharic-aware prompt pipeline:
- Detects Ethiopic script (`\u1200` to `\u137F`).
- Translates Amharic to English using MyMemory API (`am|en`) for stronger model understanding.
- Builds a bilingual prompt including:
  - translated English prompt
  - original Amharic prompt
- Adds constraints to reduce semantic drift, e.g. avoid humans unless explicitly requested.
- Adds subject locks for some key terms (e.g. lion/tiger/elephant).

## Files and Responsibilities
- `tools/amharic_text_to_image/generator.py`
  - Core generation logic.
  - Prompt preparation and translation helper functions.
  - HTTP call to NVIDIA FLUX endpoint.
  - Response parsing and normalization to browser-safe data URL.

- `templates/amharic_ai_image_generator.html`
  - UI for prompt input, generate action, loading state, error display, preview, and download.

- `app.py`
  - Route: `GET /Tools/Amharic_to_Image`
  - Alias: `GET /Tools/Amharic_AI_Prompt_to_Image_Generator`
  - API endpoint: `POST /api/amharic-ai-image`

## Current API Contract
Endpoint:
- `POST /api/amharic-ai-image`

Request JSON:
```json
{
  "prompt": "በጫካ ውስጥ ያለ ትልቅ አንበሳ",
  "size": "1024x1024",
  "style": "photorealistic"
}
```

Validation rules:
- `prompt` is required and non-empty.
- `size` currently supports only `1024x1024`.

Success response:
```json
{
  "imageUrl": "data:image/jpeg;base64,..."
}
```

Error response examples:
```json
{ "error": "Prompt is required." }
```
```json
{ "error": "Currently supported image size is 1024x1024." }
```
```json
{ "error": "Image generation API error: ..." }
```

## External Services
1. NVIDIA image generation endpoint
- Default URL:
  - `https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev`
- Method: `POST`
- Headers:
  - `Authorization: Bearer <NVIDIA_API_KEY>`
  - `Content-Type: application/json`
  - `Accept: application/json`

2. MyMemory translation endpoint
- URL:
  - `https://api.mymemory.translated.net/get?q=<text>&langpair=am|en`
- Used to translate Amharic prompts to English for better image alignment.

## Environment Variables
Supported:
- `NVIDIA_API_KEY`
- `NVIDIA_IMAGE_API_URL` (optional override)

Current implementation note:
- `generator.py` currently includes `DEFAULT_NVIDIA_API_KEY` fallback.
- Recommended for production: remove fallback and use environment variable only.

## Local Run
From project root:
```bash
python app.py
```

Open:
- `http://127.0.0.1:5000/Tools/Amharic_to_Image`

## Quick cURL Test
```bash
curl -X POST http://127.0.0.1:5000/api/amharic-ai-image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"በጫካ ውስጥ ያለ ትልቅ አንበሳ","size":"1024x1024"}'
```

Expected: JSON containing `imageUrl` data URL.

## Tuning Parameters (in `generator.py`)
Payload defaults used for FLUX:
- `width: 1024`
- `height: 1024`
- `cfg_scale: 5`
- `mode: base`
- `samples: 1`
- `seed: 0`
- `steps: 30`

You can tune these in code for quality/speed behavior.

## Known Limitations
- Size currently fixed to `1024x1024` at API level.
- Translation relies on external service availability.
- Even with constraints, image generation can still occasionally drift from intent.

## Troubleshooting
1. `Prompt is required.`
- Ensure non-empty prompt text is sent.

2. `Currently supported image size is 1024x1024.`
- Send only `1024x1024` for now.

3. `Image generation API error: 401/403`
- Check NVIDIA key validity/permissions.

4. `Could not reach image generation service.`
- Check internet access and endpoint availability.

5. Wrong subject appears in output
- Make prompt more specific.
- Use explicit negatives in style text (e.g. `no humans`).
- Add more subject-lock rules in `build_generation_prompt`.

## Suggested Next Improvements
- Replace translation API with a controlled internal translator service.
- Add optional debug mode to display:
  - translated prompt
  - final prompt sent to model
- Add multiple model support (FLUX variants, SDXL, etc.).
- Add selectable aspect ratios once endpoint constraints are verified.
- Remove hardcoded key fallback and enforce env-only secrets.

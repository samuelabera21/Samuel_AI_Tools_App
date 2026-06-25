# Ethiopian AI HUB - AI Tools App
ethipopian sa
Flask-based web application for Ethiopian and Amharic-focused AI tools, language utilities, productivity tools, and mini games.

## Live Links
Netlify (Frontend URL): https://majestic-gumdrop-e713f7.netlify.app/
- Vercel (public frontend URL): https://samuel-ai-tools-app.vercel.app
- Render (backend + full app): https://samuel-ai-tools-app.onrender.com
- GitHub repository: https://github.com/samuelabera21/Samuel_AI_Tools_App

## Project Snapshot
- Backend framework: Flask
- UI rendering: Flask templates (Jinja2)
- API style: JSON APIs + server-rendered pages
- Total user-facing tools/features: 12
- Total game pages: 2
- Music generation: optional (can be disabled in production-lite profile)

## Tool Inventory (Current)

### Core tools (11 under /Tools)
1. Amharic AI Prompt to Image Generator
   - Page: `/Tools/Amharic_AI_Prompt_to_Image_Generator` (alias: `/Tools/Amharic_to_Image`)
   - API: `/api/amharic-ai-image`
2. Free Amharic Keyboard + AI polish
   - Page: `/Tools/Free_Amharic_Keyboard` (alias: `/Tools/Amharic_Keyboard`)
   - API: `/api/amharic-keyboard/ai-polish`
3. Amharic Text to Speech
   - Page: `/Tools/Amharic_Text_To_Speech` (alias: `/Tools/Amharic_Text_to_Speech`)
   - API: `/api/amharic-text-to-speech`
4. Random Amharic Words Generator
   - Page: `/Tools/Amharic_Words_Generator` (alias: `/Tools/Random_Amharic_Words_Generator`)
   - API: `/api/amharic-words-generator`
5. Ethiopian Name Generator
   - Page: `/Tools/Ethiopian_Name_Generator`
   - APIs:
     - `/api/ethiopian-name-generator`
     - `/api/ethiopian-name-generator/audio`
6. Amharic Link Shortener
   - Page: `/Tools/Amharic_Link_Shortner` (alias: `/Tools/Amharic_Link_Shortener`)
   - API: `/api/amharic-link-shortner`
7. Ethiopian Date Converter and Calculator
   - Page: `/Tools/Ethiopian_Date_Converter`
   - APIs:
     - `/api/ethiopian-date/meta`
     - `/api/ethiopian-date/to-gregorian`
     - `/api/ethiopian-date/to-ethiopian`
     - `/api/ethiopian-date/calculate`
8. Amharic OCR
   - Page/API form route: `/Tools/Amharic_OCR`
   - Download route: `/download`
9. Amharic Numbers to Words Converter
   - Page: `/Tools/Numbers_to_Amharic_Words_Converter` (alias: `/Tools/Amharic_Numbers_Converter`)
   - Speech API: `/Tools/Numbers_to_Amharic_Words_Converter/speak`
10. Geez Numbers Converter
   - Page: `/Tools/Geez_Numbers_Converter`
11. Ethiopian Phone Number Validator
   - Page: `/Tools/Ethiopia_Phone_Numbers`

### Knowledge assistant feature (resource page)
12. Ethiopian Knowledge AI Assistant
- Page: `/Resources/Ethiopian_Knowledge_AI_Assistant`
- APIs:
  - `/api/ethiopian-knowledge/ingest`
  - `/api/ethiopian-knowledge/ask`

### Global assistant (home floating chat)
- APIs:
  - `/api/home-chat/ask`
  - `/api/home-chat/health`

### Optional music feature
- Page/API route: `/generate-music`
- Audio route: `/media/audio/<path:filename>`
- Can be disabled with environment profile for lightweight deployment.

## Game Pages
1. Amharic Fidel Sliding Puzzle
   - `/Games/Amharic_Fidel_Sliding_Puzzle_Game`
2. Amharic Typing Game
   - `/Games/Amharic_Typing_Game`

## Libraries and Dependencies

### Python dependencies (requirements.txt)
- flask: Web framework and routing
- flask-cors: Cross-origin configuration for `/api/*`
- opencv-python: OCR image preprocessing utilities
- numpy: Numeric/image array operations
- pytesseract: Python wrapper for Tesseract OCR
- gTTS: Google text-to-speech generation
- click: CLI compatibility pin (stability)
- edge-tts: Neural TTS support/fallback path
- langchain: LLM orchestration primitives
- langchain-community: Community integrations
- faiss-cpu: Vector index for retrieval
- pypdf: PDF extraction for knowledge ingest
- beautifulsoup4: HTML parsing for URL ingestion
- tiktoken: Token counting/splitting support
- openai: OpenAI-compatible client for NVIDIA APIs
- python-dotenv: Environment variable loading
- gunicorn: Production WSGI server

### Optional Python dependencies (requirements-music.txt)
- torch
- audiocraft

These are isolated so core deployment can stay lightweight.

### Node/package ecosystem (package.json)
- libphonenumber-js: Phone number parsing/validation support

### Bundled vendor script
- static/vendor/libphonenumber-max.js

### System-level dependency
- Tesseract OCR binary (required for full OCR extraction in server environments)
- Amharic language data for Tesseract (`amh.traineddata`) for best results

## Environment Variables

### Required for AI features
- NVIDIA_API_KEY

### Recommended
- NVIDIA_CHAT_API_KEY
- NVIDIA_BASE_URL (default: `https://integrate.api.nvidia.com/v1`)
- NVIDIA_CHAT_MODEL
- NVIDIA_HOME_CHAT_MODEL
- NVIDIA_EMBEDDING_MODEL
- USER_AGENT

### Deployment behavior
- APP_PROFILE (`full` or `production-lite`)
- ENABLE_MUSIC_GENERATION (`true`/`false`)
- MUSIC_DISABLED_MESSAGE
- FRONTEND_ORIGINS
- SHORT_LINK_PUBLIC_BASE_URL

### Vercel proxy
- RENDER_BACKEND_URL

## Architecture and Folder Structure

```text
ai_tools_app/
|- app.py
|- README.md
|- DEPLOYMENT.md
|- requirements.txt
|- requirements-music.txt
|- render.yaml
|- vercel.json
|- templates/
|- static/
|- public/
|- tools/
|  |- amharic_keyboard/
|  |- amharic_music_generator/
|  |- amharic_numbers_converter/
|  |- amharic_text_to_image/
|  |- amharic_text_to_speech/
|  |- ethiopian_baby_name_generator/
|  |- ethiopian_date_converter/
|  |- ethiopian_knowledge_assistant/
|  |- ethiopic_links/
|  |- geez_numbers_converter/
|  |- ocr/
|  |- random_amharic_words_generator/
|- games/
|  |- amharic_fidel_sliding_puzzle/
|  |- amharic_typing_game/
```

## Local Development

### Prerequisites
1. Python 3.11+ recommended
2. pip
3. Internet access for AI and some speech features
4. Tesseract installed locally if using OCR

### Install
```bash
pip install -r requirements.txt
```

### Run
```bash
python app.py
```

Open:
- http://127.0.0.1:5000/

## Deployment Summary

### Render (backend)
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Recommended profile: `APP_PROFILE=production-lite` for free-tier stability

### Vercel (frontend URL/proxy)
- Uses rewrite/proxy to Render backend
- Public share URL: `https://samuel-ai-tools-app.vercel.app`

## Health and Operations Checklist
1. Confirm `/api/home-chat/health` returns `status: ok`
2. Test image, keyboard, knowledge ingest/ask APIs
3. Test OCR upload behavior (and ensure Tesseract availability where needed)
4. Confirm short-link redirect routes (`/<short_code>` and `/ethio_links/<short_code>`)
5. Verify CORS (`FRONTEND_ORIGINS`) after domain changes

## Notes
- Music generation is intentionally optional to keep free-tier deployments stable.
- OCR extraction quality and availability depend on server-level Tesseract installation.
- Keep secrets in environment variables only; do not commit real keys .

## License
ISC

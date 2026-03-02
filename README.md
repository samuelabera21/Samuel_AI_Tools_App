# AI Tools App (MetaAppz-Style)

Flask-based web app for Ethiopian/Amharic tools and games.

## Live tools
- Amharic OCR
- Amharic Numbers Converter (number words + currency + sound)
- Geez Numerals Converter (Arabic ↔ Geez, copy, tabs, validation, clickable reference table)

---

## 1) Dependencies and Why They Are Used

### Python packages (`requirements.txt`)
- `flask`
  - Web framework (routes, forms, templates, JSON responses, file streaming).
- `opencv-python`
  - OCR image preprocessing.
- `numpy`
  - Byte-array image decoding for OCR.
- `pytesseract`
  - Python bridge to Tesseract OCR.
- `gTTS`
  - Generates MP3 speech for Amharic Numbers Converter.

### System dependency
- Tesseract OCR binary (OS install)
  - Required for OCR feature because `pytesseract` is only a wrapper.

### Standard library modules currently used
- `io` (`BytesIO`) for in-memory file/audio streaming.
- `base64` for OCR uploaded-image preview data URL.
- `decimal` (`Decimal`, `InvalidOperation`, `ROUND_HALF_UP`) for precise currency + santim logic.

### Frontend built-ins (no package install)
- `fetch` for API-style requests from browser.
- `Audio` for MP3 playback.
- `speechSynthesis` as browser fallback.
- `navigator.clipboard` for copy buttons.

---

## 2) Project Structure and Responsibility

```text
ai_tools_app/
├── app.py
├── README.md
├── requirements.txt
├── static/
├── templates/
│   ├── home.html
│   ├── ocr.html
│   ├── amharic_numbers.html
│   ├── geez_numbers.html
│   ├── game_hangman.html
│   ├── translator.html
│   └── index.html
├── tools/
│   ├── ocr/
│   │   ├── ocr.py
│   │   └── test_ocr.py
│   ├── amharic_numbers_converter/
│   │   └── converter.py
│   ├── geez_numbers_converter/
│   │   └── converter.py
│   └── ...other tool folders...
└── games/
    └── ...game folders...
```

### Directory responsibilities
- `tools/`: pure business logic for each tool.
- `templates/`: Flask-rendered UI pages.
- `static/`: shared CSS/JS/assets (recommended for future refactor).
- `games/`: game-specific logic/assets.

---

## 3) File-by-File Responsibility (Current Implemented Features)

### Core app
- `app.py`
  - Main Flask app entry point.
  - Hosts all page routes and POST handlers.
  - Connects templates to tool logic in `tools/`.

### Amharic Numbers Converter
- `tools/amharic_numbers_converter/converter.py`
  - `number_to_amharic(n)` for integer-to-Amharic words.
  - `number_to_currency(value)` for birr/santim formatting.
- `templates/amharic_numbers.html`
  - Number/currency mode UI.
  - Copy and sound trigger buttons.
  - Browser fallback speech logic.

### Geez Numerals Converter
- `tools/geez_numbers_converter/converter.py`
  - `arabic_to_geez(num)`
  - `geez_to_arabic(text)`
  - Validation for unsupported/invalid input.
- `templates/geez_numbers.html`
  - Tabbed modes: Convert to Geez / Convert from Geez.
  - Result card + copy button.
  - Clickable Geez reference table that inserts symbols into input.

### OCR feature
- `tools/ocr/ocr.py`
  - OCR preprocess + extraction functions.
- `templates/ocr.html`
  - Upload and OCR interaction UI.

### Navigation pages
- `templates/home.html`
  - Landing page and links to tools.
- `templates/game_hangman.html`
  - Current game placeholder route.

---

## 4) Feature Behavior (What Works Now)

## Amharic Numbers Converter
- Number → Amharic words.
- Currency mode with birr + santim.
- Sound generation from backend (`gTTS`) + browser fallback.

## Geez Numerals Converter
- Arabic → Geez
  - Example: `30 -> ፴`
  - Example: `251 -> ፪፻፶፩`
- Geez → Arabic
  - Example: `፻ -> 100`
  - Example: `፴ -> 30`
- Tabs for mode switching.
- Input validation.
- Copy result button.
- Optional reference table with clickable symbols.

---

## 5) Current Routes

- `GET /`
- `GET, POST /Tools/Amharic_OCR`
- `GET, POST /Tools/Numbers_to_Amharic_Words_Converter`
- `GET, POST /Tools/Amharic_Numbers_Converter` (alias)
- `POST /Tools/Numbers_to_Amharic_Words_Converter/speak`
- `GET, POST /Tools/Geez_Numbers_Converter`
- `GET /Games/Amharic_Hangman_Game`
- `POST /download`

---

## 6) Local Setup and Run

## Prerequisites
1. Python 3.10+
2. Internet access (for `gTTS`)
3. For OCR only: Tesseract installed with `amh.traineddata`

## Install
```bash
pip install -r requirements.txt
```

Conda example:
```bash
conda activate ai_tools_app
pip install -r requirements.txt
```

## Run
```bash
python app.py
```

Open:
- `http://127.0.0.1:5000/`

---

## 7) Deployment-Ready Development Guidelines (Render + Vercel Friendly)

Use these rules while adding new features so deployment is easy later:

1. Keep business logic in `tools/<tool_name>/converter.py` (or equivalent), not in route handlers.
2. Keep route handlers thin (parse input → call logic → render template/JSON).
3. Avoid hardcoded localhost URLs; use relative paths in frontend (`/Tools/...`).
4. Avoid writing temp files to disk when possible; prefer `BytesIO` (already used for audio/download).
5. Put future secrets/keys in environment variables, never in source code.
6. Keep imports deterministic and package-based (`from tools... import ...`).
7. Add graceful error messages for invalid input/network failure.

---

## 8) Render Deployment Plan (Backend)

Recommended for this current Flask monolith (templates + routes).

### Minimum Render settings
- Runtime: Python
- Build command:
  - `pip install -r requirements.txt`
- Start command (recommended):
  - `gunicorn app:app`

### Notes
- Add `gunicorn` to `requirements.txt` before deploying to Render.
- If OCR is enabled in production, Render image/service must include Tesseract binary and `amh.traineddata`.

---

## 9) Vercel Deployment Notes (Future)

For Python on Vercel, Flask runs as serverless functions with platform constraints.

### Practical recommendation
- Keep Flask backend on Render.
- Use Vercel for frontend projects (or static/UI shell) that call backend APIs.

### If you still deploy Flask to Vercel
- Add a `vercel.json` mapping Python handler.
- Verify timeouts and binary dependencies (OCR/Tesseract is harder on serverless).

---

## 10) Suggested Next Files for Easier Deployment

When you are ready, add:

1. `Procfile`
   - `web: gunicorn app:app`
2. `.gitignore`
   - include `__pycache__/`, `*.pyc`, `.env`
3. `runtime.txt` (optional)
   - pin Python version for consistent deploy runtime
4. `vercel.json` (only if deploying Flask on Vercel)

---

## 11) Troubleshooting

### Push/deployment mismatch
- Make sure local `main` is synced (`git pull --rebase`) before pushing.

### Converter sound not playing
- `gTTS` needs internet.
- Browser may block autoplay; user interaction (button click) is required.

### Geez conversion input errors
- Use Geez numeral symbols only (`፩..፱`, `፲..፺`, `፻`, `፼`) in from-Geez mode.

### OCR not working in deployed environment
- Tesseract binary/language data missing on server environment.

---

## 12) Current Status

- ✅ Amharic OCR working locally
- ✅ Amharic Numbers Converter working (logic + currency + sound + fallback)
- ✅ Geez Numerals Converter working (2-way conversion + tabs + copy + clickable table)
- 🚧 Remaining tools/games are scaffolded for next implementation

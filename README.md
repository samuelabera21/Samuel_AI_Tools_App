# AI Tools App (MetaAppz-Style)

This is a Flask-based platform for Ethiopian/Amharic-focused tools.

## Current live tools
- Amharic OCR
- Amharic Numbers Converter (number words + currency mode + sound)

---

## 1) Full Dependency List

### Python packages (`requirements.txt`)
- `flask`
  - Web server, routes, form handling, template rendering, and file/audio responses.
- `opencv-python`
  - OCR image preprocessing.
- `numpy`
  - Byte-array image decoding for OCR pipeline.
- `pytesseract`
  - Python wrapper for Tesseract OCR.
- `gTTS`
  - Generates MP3 speech for Amharic number converter (online service).

### External system dependency
- Tesseract OCR engine (installed on OS)
  - Required for OCR extraction because `pytesseract` is only a Python wrapper.

### Standard library modules used by the numbers converter flow
- `decimal` (`Decimal`, `InvalidOperation`, `ROUND_HALF_UP`)
  - Accurate currency parsing and santim rounding.
- `io` (`BytesIO`)
  - In-memory audio streaming (MP3) and OCR text download buffer.
- `base64`
  - Image preview data URL generation in OCR page.

---

## 2) Why Each Dependency Is Used (Numbers Converter)

This section is specific to **Amharic Numbers Converter**.

- `flask`
  - Serves converter page route.
  - Accepts form POST for conversion.
  - Exposes `/Tools/Numbers_to_Amharic_Words_Converter/speak` for audio.
  - Returns generated MP3 with `send_file`.
- `gTTS`
  - Converts converted Amharic text into playable audio (`audio/mpeg`).
  - Language option `lang="am"` targets Amharic speech.
- `decimal`
  - Prevents float precision issues in currency (`birr` + `santim`).
  - Enables consistent 2-decimal rounding.
- Browser built-ins (no install needed)
  - `fetch`: calls backend speech endpoint.
  - `Audio`: plays MP3 blob from backend.
  - `speechSynthesis`: fallback if gTTS request fails.

Important note:
- `gTTS` requires internet connection.
- If internet/backend speech fails, page falls back to browser TTS.

---

## 3) Project Structure (High-Level)

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
│   ├── game_hangman.html
│   ├── translator.html
│   └── index.html
├── tools/
│   ├── amharic_numbers_converter/
│   │   └── converter.py
│   ├── ocr/
│   │   ├── ocr.py
│   │   └── test_ocr.py
│   └── ... other tool folders ...
└── games/
    └── ... game folders ...
```

### Directory responsibilities
- `tools/`
  - Business logic / AI logic for each tool.
  - Each tool should keep its own Python module(s).
- `games/`
  - Future game implementations and assets.
- `templates/`
  - UI pages rendered by Flask.
- `static/`
  - Shared CSS/JS/images/fonts (recommended for scaling UI cleanly).

---

## 4) File Responsibilities (Amharic Numbers Converter)

### `tools/amharic_numbers_converter/converter.py`
- Contains pure conversion logic.
- `number_to_amharic(n)`:
  - Converts integer numbers to Amharic words.
  - Supports ones, tens, hundreds, thousands, millions, billions.
- `number_to_currency(value)`:
  - Converts numeric input to currency text.
  - Splits into birr + santim.
  - Uses decimal-safe rounding.

### `app.py`
- Route: `/Tools/Numbers_to_Amharic_Words_Converter` (and alias `/Tools/Amharic_Numbers_Converter`)
  - Handles GET + POST for converter UI.
  - Applies mode logic (`normal` vs `currency`).
  - Validates inputs (integer for normal, decimal allowed for currency).
- Route: `/Tools/Numbers_to_Amharic_Words_Converter/speak`
  - Accepts JSON `{ "text": "..." }`.
  - Uses `gTTS` to generate MP3 in memory.
  - Streams `audio/mpeg` back to browser.

### `templates/amharic_numbers.html`
- Converter user interface.
- Inputs:
  - Number field
  - Mode radios (Numeral/Currency)
  - Submit button
- Output:
  - Converted Amharic text card
  - Copy button
- Sound behavior:
  - Calls backend `/speak` endpoint.
  - Plays returned MP3.
  - Falls back to browser `speechSynthesis` on failure.

### `requirements.txt`
- Declares all installable Python dependencies needed by tools, including `gTTS`.

### `templates/home.html` and `templates/ocr.html`
- Provide navigation links to the converter page from dropdown/cards.

---

## 5) End-to-End Request Flow (Numbers Converter)

### A) Number conversion flow
1. User opens converter page.
2. User enters value and selects mode.
3. Form POST goes to converter route in `app.py`.
4. `app.py` chooses:
   - `number_to_amharic` for numeral mode.
   - `number_to_currency` for currency mode.
5. Result is returned to template and displayed in result card.

### B) Sound flow
1. User clicks speaker button.
2. Frontend chooses text (result text first, otherwise current input fallback).
3. Frontend calls `/Tools/Numbers_to_Amharic_Words_Converter/speak` with JSON.
4. Backend creates MP3 using `gTTS` and streams it.
5. Browser plays MP3 using `Audio`.
6. If request/playback fails, browser uses `speechSynthesis` fallback.

---

## 6) Setup Guide

## Prerequisites
1. Python 3.10+
2. (For OCR tool) Tesseract OCR installed with `amh.traineddata`
3. Internet access for `gTTS` online speech generation

## Install
From project root:

```bash
pip install -r requirements.txt
```

Conda example:

```bash
conda activate ai_tools_app
pip install -r requirements.txt
```

---

## 7) Run

```bash
python app.py
```

Open:
- `http://127.0.0.1:5000/`

---

## 8) Current Routes

- `GET /`
- `GET, POST /Tools/Amharic_OCR`
- `GET, POST /Tools/Numbers_to_Amharic_Words_Converter`
- `GET, POST /Tools/Amharic_Numbers_Converter` (alias)
- `POST /Tools/Numbers_to_Amharic_Words_Converter/speak`
- `GET /Games/Amharic_Hangman_Game`
- `POST /download`

---

## 9) Troubleshooting

### Converter sound not playing
- Check internet connection (`gTTS` needs internet).
- Check browser autoplay/audio permissions.
- If backend fails, browser fallback should still attempt speech.

### `ModuleNotFoundError`
- Activate the correct environment.
- Re-run `pip install -r requirements.txt`.

### OCR issues
- Verify Tesseract installation path.
- Verify `amh.traineddata` exists.

---

## 10) Status

- ✅ Amharic OCR: working
- ✅ Amharic Numbers Converter: working (number words, currency birr/santim, sound + fallback)
- 🚧 Remaining tools and games: scaffolded for next implementation steps

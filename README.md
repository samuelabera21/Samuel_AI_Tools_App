# AI Tools App (MetaAppz-Style)

This project is a Flask-based platform for building many Ethiopian/Amharic-focused tools step by step.

Current completed tool:
- **Amharic OCR** (image upload → extract Amharic text → copy/download)

Current landing flow:
- `/` → Home page (tools + games cards and dropdown navigation)
- `/Tools/Amharic_OCR` → OCR page
- `/Games/Amharic_Hangman_Game` → Hangman placeholder page

---

## 1) Tech Stack

### Backend
- **Python 3.10+**
  - Core language for API and tool logic.
- **Flask**
  - Lightweight web framework for routes, forms, and templates.

### OCR / AI Processing
- **OpenCV (`opencv-python`)**
  - Image loading + preprocessing (grayscale, median blur, thresholding).
- **NumPy**
  - Converts uploaded bytes into arrays for OpenCV decoding.
- **pytesseract**
  - Python bridge to Tesseract OCR engine.
- **Tesseract OCR (system app)**
  - Actual OCR engine used by `pytesseract`.
  - Required with **Amharic language data** (`amh.traineddata`).

### Frontend
- **HTML + CSS + Vanilla JavaScript**
  - Server-rendered Jinja templates.
  - Drag/drop upload UX, copy-to-clipboard, dropdown menus.

---

## 2) Dependencies and Why They Are Needed

- `flask`
  - Create web server, endpoints, template rendering, and file download responses.
- `opencv-python`
  - Improve OCR quality through image preprocessing steps.
- `numpy`
  - Decode in-memory uploaded image bytes into OpenCV images.
- `pytesseract`
  - Send processed image to Tesseract and get extracted text.

External dependency:
- **Tesseract OCR installed on your machine**
  - Needed because `pytesseract` is only a wrapper, not the OCR engine itself.

---

## 3) Project Structure and Responsibility of Each Directory

```
ai_tools_app/
├── app.py
├── README.md
├── requirements.txt
├── static/
├── templates/
│   ├── home.html
│   ├── ocr.html
│   ├── game_hangman.html
│   ├── translator.html
│   └── index.html
├── tools/
│   ├── ocr/
│   │   ├── ocr.py
│   │   └── test_ocr.py
│   ├── translator/
│   │   └── translate.py
│   ├── summarizer/
│   │   └── summarize.py
│   ├── amharic_numbers_converter/
│   ├── geez_numbers_converter/
│   ├── amharic_text_sorter/
│   ├── amharic_keyboard/
│   ├── amharic_text_to_image/
│   ├── amharic_spelling_checker/
│   ├── random_amharic_words_generator/
│   ├── amharic_speech_recognition/
│   ├── amharic_to_phonetics/
│   ├── ethiopic_links/
│   ├── ethiopian_date_converter/
│   ├── amharic_ascii_art/
│   ├── amharic_text_to_speech/
│   ├── ethiopian_baby_name_generator/
│   ├── ethiopic_password_generator/
│   ├── ethiopian_phone_number_validator/
│   └── ethiopia_overtime_pay_calculator/
└── games/
    ├── hangman_in_amharic/
    ├── amharic_riddles/
    ├── amharic_typing_game/
    └── amharic_word_search/
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

## 4) File Responsibilities

### Core backend
- `app.py`
  - Main Flask app and route controller.
  - Handles navigation pages and OCR form submission.
  - Converts OCR output to downloadable `.txt` file.

### OCR logic
- `tools/ocr/ocr.py`
  - Image preprocessing and OCR extraction functions.
  - Supports image-path OCR and in-memory byte OCR.

- `tools/ocr/test_ocr.py`
  - Local script for direct OCR function testing.

### Templates
- `templates/home.html`
  - Landing page with Tools/Games sections and dropdown menus.
- `templates/ocr.html`
  - OCR UI page (upload, preview, extract, copy, download).
- `templates/game_hangman.html`
  - Placeholder page for Hangman game route.
- `templates/translator.html`
  - Placeholder translator page.
- `templates/index.html`
  - Legacy OCR template (kept for reference; current OCR route uses `ocr.html`).

---

## 5) Setup Guide (Step by Step)

## Prerequisites
1. Install **Python 3.10+**.
2. Install **Tesseract OCR** on Windows.
3. Ensure Amharic language model is available in Tesseract (`amh.traineddata`).

## Installation
From project root (`ai_tools_app`):

```bash
pip install -r requirements.txt
```

If you use Conda:

```bash
conda activate ai_tools_app
pip install -r requirements.txt
```

## Tesseract Path
In `tools/ocr/ocr.py`, this is currently set to:

```python
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

Update this path if your Tesseract installation location is different.

---

## 6) How to Run

From project root:

```bash
python app.py
```

Open in browser:
- `http://127.0.0.1:5000/`

---

## 7) Current Routes

- `GET /`
  - Landing page (`home.html`).
- `GET, POST /Tools/Amharic_OCR`
  - OCR upload page and extraction handling.
- `GET /Games/Amharic_Hangman_Game`
  - Hangman placeholder page.
- `POST /download`
  - Download OCR text as `ocr_result.txt`.

---

## 8) OCR Processing Pipeline

Inside `tools/ocr/ocr.py`:
1. Decode image (from bytes or path).
2. Convert BGR image to grayscale.
3. Apply median blur (noise reduction).
4. Apply binary threshold.
5. OCR via Tesseract with `lang="amh"`.
6. Post-process text (`replace("|", "")`, `strip()`).

---

## 9) How to Add the Next Tool (Recommended Pattern)

For each new tool:
1. Create logic file under `tools/<tool_name>/`.
2. Create template page in `templates/`.
3. Add route in `app.py`.
4. Add link in dropdown and/or home cards.
5. Start with placeholder implementation, then improve step by step.

Example naming style:
- Route: `/Tools/Amharic_Text_Sorter`
- Template: `templates/amharic_text_sorter.html`
- Logic: `tools/amharic_text_sorter/sorter.py`

---

## 10) Troubleshooting

### `ModuleNotFoundError`
Run from project root and keep imports package-based (`tools...`).

### `pytesseract` errors
- Check Tesseract installation path.
- Verify Tesseract executable is accessible.

### OCR quality is weak
- Improve image quality (higher resolution, less blur).
- Tune preprocessing in `ocr.py` (threshold/blur settings).

### Amharic text not recognized
- Ensure `amh.traineddata` is installed in Tesseract `tessdata` folder.

---

## 11) Notes for Future Maintainability

- Move inline CSS/JS from templates into `static/` as project grows.
- Add `requirements-lock` approach later for reproducible deployment.
- Add unit tests for each tool logic module.
- Add centralized base template to avoid repeating navbar code.

---

## 12) Current Status

- ✅ Project scaffold for many tools and games is ready.
- ✅ OCR tool is functional end-to-end.
- ✅ Home page is landing page with dropdown navigation.
- 🚧 Other tools are scaffolded as empty directories and placeholders for step-by-step build.

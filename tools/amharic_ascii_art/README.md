# Amharic ASCII Art

Tool path: `tools/amharic_ascii_art/`

## Overview
This tool converts a short Amharic word/text into banner-like ASCII art made from the same Ethiopic characters.

Implemented flow:
- Input text
- Submit
- Generate style 1 and style 2 output
- Copy each style with one click
- Optional simple Amharic keyboard toggle (latin key mapping)

## Files
- `tools/amharic_ascii_art/service.py`
  - Validation and ASCII art style generation logic.
- `templates/amharic_ascii_art.html`
  - Tool page structure.
- `static/js/amharic_ascii_art.js`
  - API calls, keyboard toggle behavior, copy actions.
- `static/css/amharic_ascii_art.css`
  - Tool styles.
- `app.py`
  - Page route and API endpoint.

## Routes
Page route:
- `GET /Tools/Amharic_To_ASCII_Art`

API route:
- `POST /api/amharic-ascii-art`

## API Contract
Request JSON:
```json
{
  "text": "ሰላም"
}
```

Success response:
```json
{
  "input": "ሰላም",
  "style1": "...multi-line ascii art...",
  "style2": "...multi-line ascii art..."
}
```

Validation:
- text is required
- max input length is 24 characters

## Local Run
From project root:
```bash
python app.py
```

Open:
- `http://127.0.0.1:5000/Tools/Amharic_To_ASCII_Art`

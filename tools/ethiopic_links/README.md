# Ethiopic Links (Amharic Link Shortner)

Tool path: `tools/ethiopic_links/`

## Overview
This tool shortens long URLs into short links that use Ethiopic/Amharic characters.

Example output format:
- `https://መ.com/ሮዳፒጴ`

The app uses JSON file storage (no SQL/NoSQL database).

## Features
- Accepts a long URL from user input.
- Generates a random Ethiopic short code.
- Short code length is between `3` and `6` characters.
- Reuses an existing code for the same long URL.
- Redirects short code to the original URL.
- Tracks click count in JSON.

## Files
- `tools/ethiopic_links/service.py`
  - Core logic for code generation, JSON read/write, and URL resolution.

- `tools/ethiopic_links/data/links.json`
  - Persistent JSON storage.

- `templates/amharic_link_shortner.html`
  - Tool page UI.

- `static/js/amharic_link_shortner.js`
  - Frontend API call and copy action.

- `static/css/amharic_link_shortner.css`
  - Page styles.

- `app.py`
  - Page route, API route, and redirect route.

## Routes
Page route:
- `GET /Tools/Amharic_Link_Shortner`
- `GET /Tools/Amharic_Link_Shortener` (alias)

API route:
- `POST /api/amharic-link-shortner`

Redirect route:
- `GET /<short_code>`

## API Contract
Request JSON:
```json
{
  "longUrl": "https://www.youtube.com/watch?v=VbxaiU6JJKA"
}
```

Success response:
```json
{
  "longUrl": "https://www.youtube.com/watch?v=VbxaiU6JJKA",
  "code": "ሮዳፒጴ",
  "shortUrl": "https://መ.com/ሮዳፒጴ"
}
```

Error response example:
```json
{
  "error": "Please enter a valid URL that starts with http:// or https://"
}
```

## Environment Configuration
Short URL domain is controlled by environment variable:
- `SHORT_LINK_PUBLIC_BASE_URL`

Default value in `app.py`:
- `https://መ.com`

If this variable is not set, the default is used.

## Data Storage Schema
`tools/ethiopic_links/data/links.json`

```json
{
  "links": {
    "ሮዳፒጴ": {
      "url": "https://www.youtube.com/watch?v=VbxaiU6JJKA",
      "created_at": "2026-03-06T17:27:08.648190+00:00",
      "clicks": 1
    }
  },
  "reverse": {
    "https://www.youtube.com/watch?v=VbxaiU6JJKA": "ሮዳፒጴ"
  }
}
```

Field notes:
- `links`: short code to metadata mapping.
- `reverse`: long URL to short code mapping (prevents duplicate short codes for same URL).
- `clicks`: incremented when short link is opened.

## Behavior Notes
- Same long URL returns the same short code while reverse mapping exists.
- Different URLs generate different random Ethiopic codes.
- The generator uses a predefined Ethiopic character set.

## Local Run
From project root:
```bash
python app.py
```

Open page:
- `http://127.0.0.1:5000/Tools/Amharic_Link_Shortner`

## Quick Test (cURL)
```bash
curl -X POST http://127.0.0.1:5000/api/amharic-link-shortner \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://www.youtube.com/watch?v=VbxaiU6JJKA"}'
```

## Troubleshooting
1. Output still shows `127.0.0.1`
- Ensure `app.py` uses `SHORT_LINK_PUBLIC_BASE_URL` in `amharic_link_shortner_api`.
- Restart the Flask app after code/config changes.

2. URL validation error
- Input must include `http://` or `https://`.

3. Want a new code for same URL
- Current logic intentionally reuses existing mapping via `reverse`.
- Remove or change reverse mapping behavior in `service.py` if needed.

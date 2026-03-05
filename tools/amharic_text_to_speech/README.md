# Amharic Text-to-Speech Tool

Tool folder: `tools/amharic_text_to_speech/`

## Objective
Convert Amharic text input to playable/downloadable speech with two voice options:
- Male: Ameha
- Female: Mekdes

## Files
- `tools/amharic_text_to_speech/service.py`
  - Voice mapping
  - Runtime loading of `edge_tts`
  - Speech synthesis function returning MP3 bytes buffer

- `templates/amharic_text_to_speech.html`
  - Tool UI page (textarea, voice dropdown, generate button, audio player)

- `static/js/amharic_text_to_speech.js`
  - Client-side API call and audio playback/download handling

- `static/css/amharic_text_to_speech.css`
  - Page styling

- `app.py`
  - Page routes and API endpoint wiring

## Routes
Page routes:
- `GET /Tools/Amharic_Text_To_Speech`
- `GET /Tools/Amharic_Text_to_Speech` (alias)

API route:
- `POST /api/amharic-text-to-speech`

## API Contract
Request JSON:
```json
{
  "text": "ሰላም እንዴት ነህ",
  "voice": "male"
}
```

Allowed voice values:
- `male`
- `female`

Success:
- Returns `audio/mpeg` binary stream

Error JSON example:
```json
{ "error": "Text is required." }
```

## Voice Mapping
In `service.py`:
- `male` -> `am-ET-AmehaNeural`
- `female` -> `am-ET-MekdesNeural`

## Dependency
Required package:
- `edge-tts`

Installed via:
```bash
pip install edge-tts
```

(also listed in root `requirements.txt`)

## Frontend Behavior
1. User enters Amharic text.
2. User selects male/female voice.
3. `Generate` sends POST request to `/api/amharic-text-to-speech`.
4. Browser receives audio blob and creates object URL.
5. Audio controls appear for playback.
6. Download button saves the generated MP3.

## Notes
- This tool is text-to-speech only.
- It is separate from the keyboard canvas tool and AI image tool.
- If "Enable Amharic Keyboard" is checked, page redirects to keyboard tool route.

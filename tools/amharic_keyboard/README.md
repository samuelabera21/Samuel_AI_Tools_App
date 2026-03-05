# Free Amharic Keyboard Tool

Tool folder: `tools/amharic_keyboard/`

## 1) Objective
This tool provides a browser-based Amharic typing experience with:
- Amharic text input (Ge'ez script)
- Copy typed text
- Convert typed text to an image using HTML5 Canvas (non-AI)
- Download rendered image as PNG
- Speech-to-text input from microphone (`am-ET`)
- Optional AI text improvement for spelling/punctuation polishing

Important:
- Image conversion in this tool is canvas rendering only.
- It does not generate semantic AI images.

## 2) Where the Tool Lives

Backend logic:
- `tools/amharic_keyboard/assistant.py`

Frontend page:
- `templates/amharic_keyboard.html`

Frontend behavior:
- `static/js/amharic_keyboard.js`

Styling:
- `static/css/amharic_keyboard.css`

Flask route wiring:
- `app.py`

## 3) Routes

Page routes:
- `GET /Tools/Free_Amharic_Keyboard`
- `GET /Tools/Amharic_Keyboard` (alias)

AI helper route:
- `POST /api/amharic-keyboard/ai-polish`

## 4) Feature Flow

Typing and copy:
1. User types Amharic text in textarea.
2. `Copy Text` uses `navigator.clipboard.writeText`.

Convert to image:
1. User clicks `Convert to Image`.
2. JS renders text into an off-screen canvas.
3. Canvas is exported as PNG data URL.
4. Preview image is shown on page.
5. `Download Image` saves the rendered PNG.

Speech-to-text:
1. User clicks `Speech-to-Text`.
2. Browser SpeechRecognition starts with language `am-ET`.
3. Final recognized chunks are appended to textarea.
4. Button toggles to stop state while listening.

AI Improve Text (optional):
1. User clicks `AI Improve Text`.
2. Frontend calls `/api/amharic-keyboard/ai-polish` with current text.
3. Backend calls NVIDIA chat model via `assistant.py`.
4. Polished Amharic text replaces textarea content.

## 5) Canvas Rendering Notes

The renderer is tuned to keep Amharic glyphs visible and avoid clipping:
- Uses measured glyph metrics (`actualBoundingBoxAscent`, `actualBoundingBoxDescent`).
- Draws with alphabetic baseline for safer Ethiopic glyph placement.
- Calculates line height from measured ascent/descent plus small gap.
- Uses dynamic canvas sizing based on content width and number of lines.

If text appears clipped on a specific machine/font setup, increase canvas padding in:
- `static/js/amharic_keyboard.js` inside `renderTextToImage()`.

## 6) AI Helper Module (`assistant.py`)

Purpose:
- Improve existing Amharic text quality (spelling/punctuation style cleanup).

Function:
- `polish_amharic_text(text: str) -> str`

Behavior:
- Sends text to NVIDIA chat completion API.
- Requests Amharic-only edited output.
- Includes safety fallback checks for garbled output.

Environment/config values used:
- `NVIDIA_CHAT_API_URL` (default: `https://integrate.api.nvidia.com/v1/chat/completions`)
- `NVIDIA_CHAT_MODEL` (default: `meta/llama-3.1-70b-instruct`)
- `NVIDIA_API_KEY` (preferred)

## 7) API Contract: `/api/amharic-keyboard/ai-polish`

Request:
```json
{
	"text": "እኔ አማርኛ እየጻፍኩ ነው"
}
```

Success response:
```json
{
	"text": "እኔ አማርኛ እየጻፍኩ ነኝ።"
}
```

Error response examples:
```json
{ "error": "Text is required." }
```
```json
{ "error": "Server is missing NVIDIA_API_KEY configuration." }
```
```json
{ "error": "AI edit API error: ..." }
```

## 8) Browser Compatibility Notes

Speech-to-text relies on browser Web Speech API:
- `window.SpeechRecognition` or `window.webkitSpeechRecognition`
- Requires microphone permission
- Availability varies by browser/version

If unsupported, UI shows message:
- `Speech recognition is not supported in this browser.`

## 9) Troubleshooting

Issue: `Convert to Image` gives empty output
- Ensure textarea has non-empty text.

Issue: Glyphs clipped in generated image
- Increase `padding` and/or `lineGap` in `renderTextToImage()`.

Issue: Speech-to-text not capturing text
- Check browser mic permission.
- Check HTTPS/localhost permission rules.
- Verify browser supports Web Speech API.

Issue: AI polish returns no useful text
- Check NVIDIA key and API availability.
- Keep input in Amharic for best results.

## 10) Suggested Next Improvements

- Add transliteration mode (Latin -> Ge'ez typing assistance).
- Add font family selector for rendered image preview.
- Add text color/background color controls for canvas export.
- Add "copy image" button using Clipboard API for PNG blobs.
- Add keyboard shortcuts (`Ctrl+Enter` to convert).

## 11) Quick Local Check

1. Run app:
```bash
python app.py
```

2. Open:
- `http://127.0.0.1:5000/Tools/Free_Amharic_Keyboard`

3. Test:
- Type Amharic text
- Click `Convert to Image`
- Confirm preview and download
- Optionally test `Speech-to-Text` and `AI Improve Text`

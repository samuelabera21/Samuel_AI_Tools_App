# Ethiopian Baby Name Generator Tool

Tool folder: `tools/ethiopian_baby_name_generator/`

## Objective
Build a real Ethiopian baby name generator with:
- Boy / Girl filter
- Random Ethiopian names
- Amharic + English spelling output
- Audio pronunciation
- Copy button
- Generate again flow

## Files
- `tools/ethiopian_baby_name_generator/service.py`
  - dataset loader
  - random name generation by gender
  - pronunciation audio generation

- `tools/ethiopian_baby_name_generator/data/names.json`
  - real Ethiopian names dataset (boy/girl)
  - each item has `am` and `en`

- `templates/ethiopian_name_generator.html`
  - page layout and controls

- `static/css/ethiopian_name_generator.css`
  - UI styling

- `static/js/ethiopian_name_generator.js`
  - generate, render, audio binding, copy action

## Routes
Page route:
- `GET /Tools/Ethiopian_Name_Generator`

API route:
- `POST /api/ethiopian-name-generator`

## API Contract
Request JSON:
```json
{
  "gender": "girl"
}
```

Success response:
```json
{
  "name": {
    "gender": "girl",
    "amharic": "ማህሌት",
    "english": "Mahlet"
  }
}
```

Audio endpoint request:
```json
{
  "nameAmharic": "ማህሌት"
}
```

Audio endpoint success response:
```json
{
  "audioDataUrl": "data:audio/mpeg;base64,..."
}
```

## Notes
- Supported genders: `boy`, `girl`
- Dataset is loaded from `data/names.json` and cached in memory.
- Audio uses `gTTS` with Amharic language (`lang="am"`).
- Audio endpoint: `POST /api/ethiopian-name-generator/audio`

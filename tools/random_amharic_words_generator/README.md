# Random Amharic Words Generator Tool

Tool folder: `tools/random_amharic_words_generator/`

## Objective
Generate random Amharic words with:
- configurable word count
- starting-letter family filter
- multiple output styles (bulleted, numbered, paragraph, table)

## Files
- `tools/random_amharic_words_generator/service.py`
  - dataset loader and random generation logic
  - prefix family options

- `tools/random_amharic_words_generator/data/amharic_words.txt`
  - real Amharic/Ethiopic words dataset (one word per line)

- `templates/amharic_words_generator.html`
  - page UI (controls + result area)

- `static/js/amharic_words_generator.js`
  - API call and result rendering by style

- `static/css/amharic_words_generator.css`
  - page styling

## Routes
Page routes:
- `GET /Tools/Amharic_Words_Generator`
- `GET /Tools/Random_Amharic_Words_Generator` (alias)

API route:
- `POST /api/amharic-words-generator`

## API Contract
Request JSON:
```json
{
  "count": 10,
  "prefix": "any"
}
```

Success response:
```json
{
  "words": ["ሰላም", "ቤት", "ጊዜ", "..."]
}
```

## Notes
- Supported counts: `1, 5, 10, 20, 50, 100, 200`
- Prefix key `any` uses full word pool.
- Words are loaded from `data/amharic_words.txt` at runtime and cached in memory.
- Generator now returns only words from the dataset (no synthetic/fake fallback words).
- For very small prefix pools, duplicates can appear when requested count exceeds available unique words.

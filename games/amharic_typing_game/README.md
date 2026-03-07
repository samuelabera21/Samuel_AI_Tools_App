# Amharic Typing Game

Game folder: `games/amharic_typing_game/`

## Objective
Timed Amharic typing game with level-based phrase challenges.

Players type each Amharic phrase exactly and progress through all levels before time runs out.

## Files
- `templates/amharic_typing_game.html`
  - game page UI, timer bar, keyboard toggle, and result modal

- `static/js/amharic_typing_game.js`
  - game logic (levels, typing validation, timer, progress, modal result flow)

- `static/css/amharic_typing_game.css`
  - visual styling for target text, animated underlines, and responsive layout

- `app.py`
  - Flask route for the game page

## Route
Page route:
- `GET /Games/Amharic_Typing_Game`

## Gameplay Features
- 10 phrase-based levels
- Live level indicator (`Level X of 10`)
- 180-second countdown timer
- Progress bar with color thresholds:
  - green: above 60s
  - yellow: 31-60s
  - red: 30s or less
- Word-by-word validation
- Correct words turn green
- Leftmost incorrect word gets animated underline
- Space milestone markers shown between words and at end
- Game-over modal when timer reaches zero
- Congratulations modal when all levels are completed
- Restart button reloads the game state

## Input Rules
- Paste, dragover, and drop are disabled for fairness
- Timer starts on first typed character
- Matching is exact against current level phrase

## Amharic Keyboard Toggle
- `Enable Amharic Keyboard` switch controls transliteration mode
- When enabled, latin key sequences are converted to fidel in real-time
- Examples:
  - `ya` -> `ያ`
  - `ye` -> `የ`
  - `we` -> `ወ`
  - `shi` -> `ሺ`
  - `cha` -> `ቻ`
- Keyboard helper hints are shown under the input

## Dependencies
- No additional Python package is required for this feature.
- Transliteration is implemented directly in frontend JavaScript (`static/js/amharic_typing_game.js`).

## Local Run
From project root:
```bash
python app.py
```

Open:
- `http://127.0.0.1:5000/Games/Amharic_Typing_Game`

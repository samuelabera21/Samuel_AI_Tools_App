# Amharic Fidel Sliding Puzzle Game

Game folder: `games/amharic_fidel_sliding_puzzle/`

## Objective
A 3x3 sliding puzzle game for Amharic fidel and Geez numerals.

The player must reorder 8 shuffled tiles into correct sequence before the move counter reaches zero.

## Files
- `templates/amharic_fidel_sliding_puzzle_game.html`
  - page UI, board markup, and game status elements

- `static/js/amharic_fidel_sliding_puzzle.js`
  - puzzle engine (tile movement, shuffle, level progression, move tracking)

- `static/css/amharic_fidel_sliding_puzzle.css`
  - board, tiles, responsive layout, and status text styling

- `app.py`
  - Flask route binding for the game page

## Route
Page route:
- `GET /Games/Amharic_Fidel_Sliding_Puzzle_Game`

## Core Gameplay Rules
- Board is a 3x3 grid with 8 visible tiles and 1 empty slot.
- Only tiles adjacent to the empty slot can move.
- Each level starts with `30` moves.
- If moves run out, game shows `GAME OVER!` and resets to level `1`.
- On solve:
  - level increments
  - moves reset to `30`
  - a new symbol set is loaded and reshuffled
- At max level (`40`), completion message appears and game resets.

## Symbol Sets
The game uses 30 symbol groups:
- Amharic fidel families (8 characters each)
- Geez numeral groups:
  - `፩፪፫፬፭፮፯፰`
  - `፲፳፴፵፶፷፸፹`

## Visual/UX Behavior
- Correct-position tiles are blue.
- Misplaced tiles are red (for early levels, matching original behavior).
- Progress message shows star count for completed level progression.
- Board is responsive and remains playable on mobile screens.

## Important DOM IDs Used by JS
These IDs/classes must remain consistent unless JS is updated:
- `#levelComplete`
- `#currentLevel`
- `#movesLeft`
- `#boxContainer`
- tile elements: `#1` to `#8` with class `.tile`

## Local Run
From project root:
```bash
python app.py
```

Open:
- `http://127.0.0.1:5000/Games/Amharic_Fidel_Sliding_Puzzle_Game`

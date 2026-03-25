# Amharic Music Generator

This module provides local AI music generation for the Flask route `/generate-music`.

## Model

- Meta MusicGen (`facebook/musicgen-small`)

## Install dependencies

```bash
pip install torch torchaudio audiocraft transformers soundfile sentencepiece
```

## Notes

- The model is cached globally in memory after the first load.
- Generated files are saved to `static/audio/`.
- On Windows, make sure FFmpeg `bin` is in PATH, then restart the terminal/server process so Flask sees the updated PATH.

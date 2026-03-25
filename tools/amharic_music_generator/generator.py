import re
import threading
import uuid
import importlib
import os
import shutil
import numpy as np
from pathlib import Path
from typing import Dict, Tuple

# Keep one shared model instance for all requests.
# This avoids reloading MusicGen on every generation call.
_MODEL = None
_PROCESSOR = None
_BACKEND = None
_MODEL_LOCK = threading.Lock()

# Supported style labels from the UI and their richer text descriptions.
_STYLE_PROMPTS = {
    "traditional_ethiopian": "traditional Ethiopian instrumental music featuring krar, masinko, and kebero rhythms",
    "jazz": "smooth Ethiopian jazz instrumental with gentle piano, saxophone, and warm bass",
    "hip_hop": "modern Ethiopian hip hop instrumental beat with deep drums and melodic synth lines",
    "gospel": "uplifting Ethiopian gospel instrumental with piano, organ textures, and hopeful harmony",
}

# Lightweight keyword mapping for common Amharic ideas.
_AMHARIC_KEYWORD_MAP = {
    "ፍቅር": "emotional Ethiopian love",
    "ዘፈን": "instrumental music",
    "ደስታ": "joyful mood",
    "ሐዘን": "melancholic mood",
    "ባህላዊ": "traditional Ethiopian",
    "ፈጣን": "upbeat tempo",
    "ዝግ": "slow tempo",
    "ጸጥ": "calm ambient",
    "ቤተክርስቲያን": "spiritual gospel tone",
}


class MusicGenerationError(RuntimeError):
    """Raised when music generation fails in a user-facing way."""


def _describe_dependency_issue(error: Exception) -> str:
    """Create a stable, user-facing dependency message from an import/init error."""
    if isinstance(error, ModuleNotFoundError):
        missing_module = getattr(error, "name", None) or "unknown module"
        return (
            f"Missing Python package: {missing_module}. "
            "Install music dependencies with: "
            "pip install torch torchaudio audiocraft transformers soundfile sentencepiece"
        )

    error_text = str(error)
    if "ffmpeg" in error_text.lower() or "av" in error_text.lower():
        ffmpeg_in_path = shutil.which("ffmpeg")
        ffmpeg_env = os.environ.get("FFMPEG_BINARY")
        if ffmpeg_in_path or ffmpeg_env:
            return (
                "Audio backend could not initialize (ffmpeg/av issue). "
                "FFmpeg appears configured, so restart the server/terminal and try again."
            )
        return (
            "Audio backend needs FFmpeg in PATH. "
            "On Windows, add your ffmpeg bin directory to PATH, restart terminal/server, then retry."
        )

    return f"Music backend initialization failed: {error_text or error.__class__.__name__}"


def _contains_amharic(text: str) -> bool:
    # Ethiopic Unicode block range.
    return bool(re.search(r"[\u1200-\u137F]", text))


def _enhance_prompt(user_prompt: str, style_key: str) -> str:
    style_text = _STYLE_PROMPTS.get(style_key, _STYLE_PROMPTS["traditional_ethiopian"])

    if _contains_amharic(user_prompt):
        matched_concepts = [
            english_text
            for amharic_word, english_text in _AMHARIC_KEYWORD_MAP.items()
            if amharic_word in user_prompt
        ]

        if matched_concepts:
            concept_text = ", ".join(dict.fromkeys(matched_concepts))
            base_prompt = f"{concept_text}"
        else:
            # Friendly fallback when we cannot map specific words.
            base_prompt = "emotional Ethiopian instrumental music"
    else:
        base_prompt = user_prompt

    return (
        f"{base_prompt}. {style_text}. "
        "Instrumental only, no vocals, high-quality studio recording."
    )


def _load_music_model():
    global _MODEL, _PROCESSOR, _BACKEND

    if _MODEL is not None and _BACKEND is not None:
        return _BACKEND, _MODEL, _PROCESSOR

    with _MODEL_LOCK:
        if _MODEL is not None and _BACKEND is not None:
            return _BACKEND, _MODEL, _PROCESSOR

        audiocraft_error = None
        transformers_error = None

        try:
            # Import lazily so the Flask app can still start even if dependency
            # installation is still pending.
            musicgen_module = importlib.import_module("audiocraft.models")
            MusicGen = getattr(musicgen_module, "MusicGen")
            _MODEL = MusicGen.get_pretrained("facebook/musicgen-small")
            _PROCESSOR = None
            _BACKEND = "audiocraft"
            return _BACKEND, _MODEL, _PROCESSOR
        except Exception as exc:
            audiocraft_error = exc
            # Windows environments often fail to load audiocraft because of
            # native AV/FFmpeg dependencies. Fall back to transformers model.
            pass

        try:
            transformers_module = importlib.import_module("transformers")
            AutoProcessor = getattr(transformers_module, "AutoProcessor")
            MusicgenForConditionalGeneration = getattr(
                transformers_module,
                "MusicgenForConditionalGeneration",
            )
            _PROCESSOR = AutoProcessor.from_pretrained("facebook/musicgen-small")
            _MODEL = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
            _BACKEND = "transformers"
            return _BACKEND, _MODEL, _PROCESSOR
        except Exception as exc:
            transformers_error = exc

        dependency_errors = [
            _describe_dependency_issue(err)
            for err in (audiocraft_error, transformers_error)
            if err is not None
        ]

        unique_errors = list(dict.fromkeys(dependency_errors))
        if not unique_errors:
            unique_errors = [
                "Music backend could not initialize."
            ]

        raise MusicGenerationError(" | ".join(unique_errors))

    return _BACKEND, _MODEL, _PROCESSOR


def _generate_with_transformers(model, processor, prompt_text: str, duration_seconds: int):
    token_map = {5: 256, 10: 512, 20: 1024}
    max_new_tokens = token_map.get(duration_seconds, 512)

    inputs = processor(text=[prompt_text], padding=True, return_tensors="pt")
    generated = model.generate(
        **inputs,
        do_sample=True,
        guidance_scale=3.0,
        max_new_tokens=max_new_tokens,
    )

    sample_rate = int(model.config.audio_encoder.sampling_rate)
    audio_tensor = generated[0].detach().cpu().unsqueeze(0)
    return audio_tensor, sample_rate


def _save_audio_file(output_path: Path, audio_tensor, sample_rate: int) -> None:
    """Save generated audio as a WAV file without relying on torchcodec."""
    soundfile = importlib.import_module("soundfile")

    waveform = audio_tensor.detach().cpu().float().numpy()

    # Remove leading batch dimensions when present, e.g. [1, 1, time].
    while waveform.ndim > 2 and waveform.shape[0] == 1:
        waveform = waveform[0]

    # Convert [channels, time] to [time, channels] for soundfile.write.
    if waveform.ndim == 2:
        waveform = np.transpose(waveform, (1, 0))
    elif waveform.ndim == 1:
        pass
    else:
        raise ValueError("Unexpected audio tensor shape for saving.")

    soundfile.write(str(output_path), waveform, samplerate=sample_rate, format="WAV")


def generate_music(prompt: str, style_key: str = "traditional_ethiopian", duration_seconds: int = 10) -> Dict[str, str]:
    """Generate instrumental music from text and save it as a WAV file.

    Returns a dictionary containing the final prompt used, output filename,
    and browser-friendly audio URL.
    """
    cleaned_prompt = (prompt or "").strip()
    if not cleaned_prompt:
        raise ValueError("Please enter a music idea before generating.")

    if duration_seconds not in {5, 10, 20}:
        raise ValueError("Duration must be one of: 5, 10, or 20 seconds.")

    enhanced_prompt = _enhance_prompt(cleaned_prompt, style_key)

    backend, model, processor = _load_music_model()

    try:
        if backend == "audiocraft":
            model.set_generation_params(duration=duration_seconds)
            generated_wav = model.generate([enhanced_prompt])
            audio_tensor = generated_wav[0].detach().cpu()
            sample_rate = int(model.sample_rate)
        else:
            audio_tensor, sample_rate = _generate_with_transformers(
                model=model,
                processor=processor,
                prompt_text=enhanced_prompt,
                duration_seconds=duration_seconds,
            )
    except Exception as exc:
        raise MusicGenerationError(
            "Music generation is taking longer than expected or failed. "
            "Please try again with a shorter prompt."
        ) from exc

    # Save under static/audio so Flask can serve it directly.
    output_dir = Path("static") / "audio"
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = f"output_{uuid.uuid4().hex}.wav"
    output_path = output_dir / filename

    try:
        _save_audio_file(output_path=output_path, audio_tensor=audio_tensor, sample_rate=sample_rate)
    except Exception as exc:
        raise MusicGenerationError("Failed to save generated audio file.") from exc

    return {
        "enhancedPrompt": enhanced_prompt,
        "filename": filename,
        "audioUrl": f"/static/audio/{filename}",
    }

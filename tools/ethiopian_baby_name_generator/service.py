import json
import random
from pathlib import Path
import io

from gtts import gTTS

DATA_FILE_PATH = Path(__file__).resolve().parent / "data" / "names.json"
VALID_GENDERS = {"boy", "girl"}

_CACHED_NAMES = None


def _load_names_dataset():
    global _CACHED_NAMES

    if _CACHED_NAMES is not None:
        return _CACHED_NAMES

    if not DATA_FILE_PATH.exists():
        raise FileNotFoundError(f"Names dataset not found: {DATA_FILE_PATH}")

    with DATA_FILE_PATH.open("r", encoding="utf-8") as handle:
        raw_data = json.load(handle)

    dataset = {"boy": [], "girl": []}
    for gender in ("boy", "girl"):
        items = raw_data.get(gender, [])
        if not isinstance(items, list):
            continue

        unique = set()
        for item in items:
            if not isinstance(item, dict):
                continue

            am_name = str(item.get("am", "")).strip()
            en_name = str(item.get("en", "")).strip()
            if not am_name or not en_name:
                continue

            key = (am_name, en_name)
            if key in unique:
                continue
            unique.add(key)
            dataset[gender].append({"am": am_name, "en": en_name})

    if not dataset["boy"] or not dataset["girl"]:
        raise ValueError("Names dataset must include both boy and girl names.")

    _CACHED_NAMES = dataset
    return _CACHED_NAMES


def generate_random_ethiopian_name(gender: str):
    normalized_gender = str(gender).strip().lower()
    if normalized_gender not in VALID_GENDERS:
        raise ValueError("Gender must be either 'boy' or 'girl'.")

    dataset = _load_names_dataset()
    selected = random.choice(dataset[normalized_gender])
    return {
        "gender": normalized_gender,
        "amharic": selected["am"],
        "english": selected["en"],
    }


def synthesize_name_pronunciation(name_text: str):
    text = str(name_text).strip()
    if not text:
        raise ValueError("Name text is required for pronunciation.")

    audio_buffer = io.BytesIO()
    gTTS(text=text, lang="am").write_to_fp(audio_buffer)
    audio_buffer.seek(0)
    return audio_buffer

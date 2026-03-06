import json
import random
import secrets
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Optional
from urllib.parse import urlparse

# A compact Ethiopic alphabet set used to generate readable short codes.
AMHARIC_CODE_CHARS = tuple(
    "ሀለሐመሠረሰሸቀበተቸኀነኘአከወዐዘዠየደጀገጠጨጰጸፀፈፐ"
)
MIN_CODE_LENGTH = 3
MAX_CODE_LENGTH = 6

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_FILE = DATA_DIR / "links.json"

_FILE_LOCK = Lock()


def _default_store() -> dict:
    return {
        "links": {},
        "reverse": {},
    }


def _ensure_data_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(json.dumps(_default_store(), ensure_ascii=False, indent=2), encoding="utf-8")


def _load_store() -> dict:
    _ensure_data_file()
    raw = DATA_FILE.read_text(encoding="utf-8").strip()
    if not raw:
        return _default_store()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return _default_store()

    if not isinstance(parsed, dict):
        return _default_store()

    links = parsed.get("links") if isinstance(parsed.get("links"), dict) else {}
    reverse = parsed.get("reverse") if isinstance(parsed.get("reverse"), dict) else {}
    return {"links": links, "reverse": reverse}


def _save_store(store: dict) -> None:
    _ensure_data_file()
    temp_file = DATA_FILE.with_suffix(".tmp")
    temp_file.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    temp_file.replace(DATA_FILE)


def _is_valid_long_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _is_valid_short_code(value: str) -> bool:
    if not isinstance(value, str):
        return False
    if not (MIN_CODE_LENGTH <= len(value) <= MAX_CODE_LENGTH):
        return False
    return all(char in AMHARIC_CODE_CHARS for char in value)


def _random_amharic_code() -> str:
    length = random.randint(MIN_CODE_LENGTH, MAX_CODE_LENGTH)
    return "".join(secrets.choice(AMHARIC_CODE_CHARS) for _ in range(length))


def create_amharic_short_link(long_url: str, base_url: str) -> dict:
    normalized_url = str(long_url or "").strip()
    if not normalized_url:
        raise ValueError("Long URL is required.")

    if not _is_valid_long_url(normalized_url):
        raise ValueError("Please enter a valid URL that starts with http:// or https://")

    normalized_base = str(base_url or "").strip().rstrip("/")
    if not normalized_base:
        raise ValueError("Invalid base URL.")

    with _FILE_LOCK:
        store = _load_store()

        existing_code = store["reverse"].get(normalized_url)
        if existing_code and existing_code in store["links"]:
            return {
                "code": existing_code,
                "long_url": normalized_url,
                "short_url": f"{normalized_base}/{existing_code}",
            }

        code = None
        for _ in range(250):
            candidate = _random_amharic_code()
            if candidate not in store["links"]:
                code = candidate
                break

        if not code:
            raise RuntimeError("Could not create a unique short code. Please try again.")

        created_at = datetime.now(timezone.utc).isoformat()
        store["links"][code] = {
            "url": normalized_url,
            "created_at": created_at,
            "clicks": 0,
        }
        store["reverse"][normalized_url] = code
        _save_store(store)

    return {
        "code": code,
        "long_url": normalized_url,
        "short_url": f"{normalized_base}/{code}",
    }


def resolve_amharic_short_link(short_code: str) -> Optional[str]:
    code = str(short_code or "").strip()
    if not _is_valid_short_code(code):
        return None

    with _FILE_LOCK:
        store = _load_store()
        item = store["links"].get(code)
        if not isinstance(item, dict):
            return None

        long_url = str(item.get("url", "")).strip()
        if not long_url:
            return None

        clicks = item.get("clicks", 0)
        item["clicks"] = int(clicks) + 1 if isinstance(clicks, int) else 1
        store["links"][code] = item
        _save_store(store)

    return long_url

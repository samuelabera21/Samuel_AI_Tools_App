import json
import os
from urllib import error as url_error
from urllib import request as url_request

NVIDIA_CHAT_API_URL = os.getenv("NVIDIA_CHAT_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
DEFAULT_NVIDIA_API_KEY = "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"
NVIDIA_CHAT_MODEL = os.getenv("NVIDIA_CHAT_MODEL", "meta/llama-3.1-70b-instruct")


def _looks_like_valid_amharic(text: str):
    if not text:
        return False

    ethiopic_count = 0
    question_mark_count = 0
    for ch in text:
        if "\u1200" <= ch <= "\u137F":
            ethiopic_count += 1
        if ch == "?":
            question_mark_count += 1

    if question_mark_count >= max(4, len(text) // 4):
        return False
    return ethiopic_count > 0


def polish_amharic_text(text: str):
    """Light AI cleanup for Amharic text while preserving meaning and language."""
    api_key = os.getenv("NVIDIA_API_KEY", DEFAULT_NVIDIA_API_KEY).strip()
    if not api_key:
        raise RuntimeError("NVIDIA_API_KEY is missing")

    payload = {
        "model": NVIDIA_CHAT_MODEL,
        "temperature": 0.2,
        "max_tokens": 220,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an Amharic text editor. Improve spelling and punctuation, "
                    "keep the same meaning, keep output in Amharic only."
                ),
            },
            {
                "role": "user",
                "content": text,
            },
        ],
    }

    api_request = url_request.Request(
        NVIDIA_CHAT_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with url_request.urlopen(api_request, timeout=60) as response:
            parsed = json.loads(response.read().decode("utf-8"))
    except url_error.HTTPError as exc:
        error_text = exc.read().decode("utf-8", errors="ignore")
        raise ValueError(f"AI edit API error: {error_text or str(exc)}") from exc
    except url_error.URLError as exc:
        raise ValueError("Could not reach AI edit service.") from exc

    choices = parsed.get("choices") or []
    if not choices:
        raise ValueError("AI edit service returned no choices.")

    content = (choices[0].get("message") or {}).get("content", "").strip()
    if not content:
        raise ValueError("AI edit service returned empty text.")

    # Fallback to original when model output is garbled/non-Amharic.
    if not _looks_like_valid_amharic(content):
        return text

    return content

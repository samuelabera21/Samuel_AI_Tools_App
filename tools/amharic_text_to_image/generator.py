import json
import os
from urllib import error as url_error
from urllib import parse as url_parse
from urllib import request as url_request

NVIDIA_IMAGE_API_URL = os.getenv("NVIDIA_IMAGE_API_URL", "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev")
DEFAULT_NVIDIA_API_KEY = "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"
MYMEMORY_TRANSLATE_URL = "https://api.mymemory.translated.net/get"


def parse_size(size: str):
    """Parse size string like 1024x1024 into integer width/height."""
    try:
        width_str, height_str = size.lower().split("x", maxsplit=1)
        width = int(width_str)
        height = int(height_str)
        return width, height
    except Exception as exc:
        raise ValueError("Invalid image size format. Use WIDTHxHEIGHT.") from exc


def contains_ethiopic_text(value: str):
    for ch in value:
        if "\u1200" <= ch <= "\u137F":
            return True
    return False


def translate_amharic_to_english(text: str):
    """Translate Amharic text to English with a lightweight public translation API."""
    query = url_parse.urlencode({"q": text, "langpair": "am|en"})
    translate_request = url_request.Request(f"{MYMEMORY_TRANSLATE_URL}?{query}", method="GET")

    try:
        with url_request.urlopen(translate_request, timeout=20) as response:
            parsed = json.loads(response.read().decode("utf-8"))
        translated = (parsed.get("responseData") or {}).get("translatedText", "").strip()
        return translated or text
    except Exception:
        # Keep generation available even if translation API is temporarily unavailable.
        return text


def mentions_people(prompt_text: str):
    normalized = prompt_text.lower()
    people_markers = [
        "person", "people", "human", "man", "woman", "boy", "girl", "family",
        "ሰው", "ሰዎች", "ወንድ", "ሴት", "ልጅ",
    ]
    return any(token in normalized for token in people_markers)


def build_generation_prompt(prompt: str, style: str | None = None):
    """Create a bilingual prompt with constraints to reduce semantic drift."""
    english_prompt = translate_amharic_to_english(prompt) if contains_ethiopic_text(prompt) else prompt

    prompt_parts = [
        "Generate a photorealistic, semantically accurate image that follows the user's prompt exactly.",
        f"Primary prompt in English: {english_prompt}",
        f"Original user prompt: {prompt}",
    ]

    subject_text = f"{prompt} {english_prompt}".lower()
    if "አንበሳ" in prompt or "lion" in subject_text:
        prompt_parts.append("The main subject must be one large lion in a forest setting.")
        prompt_parts.append("Do not generate humans, crowds, or city scenes.")
    elif "ነብር" in prompt or "tiger" in subject_text:
        prompt_parts.append("The main subject must be one tiger as the focal point.")
    elif "ዝሆን" in prompt or "elephant" in subject_text:
        prompt_parts.append("The main subject must be one elephant as the focal point.")

    if not mentions_people(f"{prompt} {english_prompt}"):
        prompt_parts.append("Do not include people, faces, or human figures unless explicitly requested.")

    if style:
        prompt_parts.append(f"Visual style: {style}")

    return " ".join(prompt_parts)


def generate_image_from_prompt(prompt: str, size: str = "1024x1024", style: str | None = None):
    """Call NVIDIA's OpenAI-compatible image endpoint and return image URL/base64."""
    # Prefer environment variable, but keep local fallback key for this workspace setup.
    api_key = os.getenv("NVIDIA_API_KEY", DEFAULT_NVIDIA_API_KEY).strip()
    if not api_key:
        raise RuntimeError("NVIDIA_API_KEY is missing")

    width, height = parse_size(size)
    full_prompt = build_generation_prompt(prompt=prompt, style=style)

    payload = {
        "prompt": full_prompt,
        "width": width,
        "height": height,
        "cfg_scale": 5,
        "mode": "base",
        "samples": 1,
        "seed": 0,
        "steps": 30,
    }

    api_request = url_request.Request(
        NVIDIA_IMAGE_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )

    try:
        with url_request.urlopen(api_request, timeout=120) as response:
            parsed = json.loads(response.read().decode("utf-8"))
    except url_error.HTTPError as exc:
        error_text = exc.read().decode("utf-8", errors="ignore")
        try:
            error_json = json.loads(error_text)
            message = error_json.get("error", {}).get("message") or error_text
        except json.JSONDecodeError:
            message = error_text or str(exc)
        raise ValueError(f"Image generation API error: {message}") from exc
    except url_error.URLError as exc:
        raise ValueError("Could not reach image generation service.") from exc

    artifacts = parsed.get("artifacts") or []
    if artifacts and artifacts[0].get("base64"):
        return {"image_url": f"data:image/jpeg;base64,{artifacts[0]['base64']}"}

    image_data = (parsed.get("data") or [{}])[0]
    if image_data.get("url"):
        return {"image_url": image_data["url"]}
    if image_data.get("b64_json"):
        return {"image_url": f"data:image/png;base64,{image_data['b64_json']}"}

    raise ValueError("Image generation API did not return image content.")

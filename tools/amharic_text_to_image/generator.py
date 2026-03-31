import json
import os
from urllib import error as url_error
from urllib import parse as url_parse
from urllib import request as url_request

NVIDIA_IMAGE_API_URL = os.getenv("NVIDIA_IMAGE_API_URL", "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev")
MYMEMORY_TRANSLATE_URL = "https://api.mymemory.translated.net/get"
PUBLIC_IMAGE_FALLBACK_URL = "https://image.pollinations.ai/prompt"


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


def build_generation_prompt(
    prompt: str,
    style: str | None = None,
    english_prompt: str | None = None,
    include_original_prompt: bool = True,
):
    """Create a generation prompt with constraints to reduce semantic drift."""
    english_prompt = english_prompt or (
        translate_amharic_to_english(prompt) if contains_ethiopic_text(prompt) else prompt
    )

    prompt_parts = [
        "Generate a photorealistic, semantically accurate image that follows the user's prompt exactly.",
        f"Primary prompt in English: {english_prompt}",
    ]

    if include_original_prompt:
        prompt_parts.append(f"Original user prompt: {prompt}")

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


def request_image_generation(full_prompt: str, width: int, height: int, api_key: str):
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

    with url_request.urlopen(api_request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_error_message(exc: url_error.HTTPError):
    error_text = exc.read().decode("utf-8", errors="ignore")
    try:
        error_json = json.loads(error_text)
        return error_json.get("error", {}).get("message") or error_text or str(exc)
    except json.JSONDecodeError:
        return error_text or str(exc)


def extract_image_url(parsed: dict):
    artifacts = parsed.get("artifacts") or []
    if artifacts and artifacts[0].get("base64"):
        return f"data:image/jpeg;base64,{artifacts[0]['base64']}"

    image_data = (parsed.get("data") or [{}])[0]
    if image_data.get("url"):
        return image_data["url"]
    if image_data.get("b64_json"):
        return f"data:image/png;base64,{image_data['b64_json']}"

    raise ValueError("Image generation API did not return image content.")


def build_public_fallback_image_url(prompt: str, width: int, height: int):
    encoded_prompt = url_parse.quote(prompt.strip())
    return f"{PUBLIC_IMAGE_FALLBACK_URL}/{encoded_prompt}?width={width}&height={height}&nologo=true"


def generate_image_from_prompt(prompt: str, size: str = "1024x1024", style: str | None = None):
    """Call NVIDIA's OpenAI-compatible image endpoint and return image URL/base64."""
    api_key = (os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_CHAT_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("NVIDIA_API_KEY (or NVIDIA_CHAT_API_KEY fallback) is missing")

    width, height = parse_size(size)
    has_ethiopic_text = contains_ethiopic_text(prompt)
    english_prompt = translate_amharic_to_english(prompt) if has_ethiopic_text else prompt
    prompt_variants = [
        build_generation_prompt(
            prompt=prompt,
            style=style,
            english_prompt=english_prompt,
            include_original_prompt=True,
        )
    ]
    if has_ethiopic_text and english_prompt.strip() and english_prompt.strip() != prompt.strip():
        prompt_variants.append(
            build_generation_prompt(
                prompt=prompt,
                style=style,
                english_prompt=english_prompt,
                include_original_prompt=False,
            )
        )

    try:
        last_http_error_message = None
        for index, full_prompt in enumerate(prompt_variants):
            try:
                parsed = request_image_generation(
                    full_prompt=full_prompt,
                    width=width,
                    height=height,
                    api_key=api_key,
                )
                return {
                    "image_url": extract_image_url(parsed),
                    "provider": "nvidia",
                    "warning": "",
                }
            except url_error.HTTPError as exc:
                if exc.code in {401, 403}:
                    # Keep tool usable when NVIDIA image model access is restricted.
                    return {
                        "image_url": build_public_fallback_image_url(
                            prompt=full_prompt,
                            width=width,
                            height=height,
                        ),
                        "provider": "public-fallback",
                        "warning": "NVIDIA image access is restricted for the current key/model. A public fallback provider generated this image, so prompt accuracy may vary.",
                    }
                last_http_error_message = parse_error_message(exc)
                should_retry = (
                    exc.code >= 500
                    and index < len(prompt_variants) - 1
                )
                if should_retry:
                    continue
                raise ValueError(f"Image generation API error: {last_http_error_message}") from exc
    except url_error.HTTPError as exc:
        message = parse_error_message(exc)
        raise ValueError(f"Image generation API error: {message}") from exc
    except url_error.URLError as exc:
        raise ValueError("Could not reach image generation service.") from exc
    except ValueError:
        raise

    if last_http_error_message:
        raise ValueError(f"Image generation API error: {last_http_error_message}")

    raise ValueError("Image generation API did not return image content.")

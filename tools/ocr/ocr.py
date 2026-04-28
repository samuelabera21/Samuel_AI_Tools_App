# import cv2
# import pytesseract

# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# def extract_amharic_text(image_path):
#     img = cv2.imread(image_path)
#     if img is None:
#         raise FileNotFoundError(f"Image file not found or unreadable: {image_path}")
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
#     text = pytesseract.image_to_string(gray, lang="amh")
    
#     return text



import os
import shutil

import cv2
import numpy as np
import pytesseract


def _configure_tesseract_binary() -> None:
    """Use explicit env override first; only apply Windows default path when it exists."""
    configured_path = os.getenv("TESSERACT_CMD", "").strip()
    if configured_path:
        pytesseract.pytesseract.tesseract_cmd = configured_path
        return

    windows_default = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.name == "nt" and os.path.exists(windows_default):
        pytesseract.pytesseract.tesseract_cmd = windows_default
        return

    linux_default = "/usr/bin/tesseract"
    if os.path.exists(linux_default):
        pytesseract.pytesseract.tesseract_cmd = linux_default


def _configure_tessdata_prefix() -> None:
    if os.getenv("TESSDATA_PREFIX", "").strip():
        return

    common_paths = [
        "/usr/share/tesseract-ocr/5/tessdata",
        "/usr/share/tesseract-ocr/4.00/tessdata",
        "/usr/share/tessdata",
    ]
    for path in common_paths:
        if os.path.isdir(path):
            os.environ["TESSDATA_PREFIX"] = path
            return


def _ensure_tesseract_available() -> None:
    binary_name = os.path.basename(getattr(pytesseract.pytesseract, "tesseract_cmd", "tesseract") or "tesseract")
    configured_path = getattr(pytesseract.pytesseract, "tesseract_cmd", "")

    # On Linux hosts (like Render), this ensures the system package exists.
    if configured_path and os.path.isabs(configured_path) and os.path.exists(configured_path):
        return
    if shutil.which(configured_path or binary_name):
        return

    raise RuntimeError(
        "OCR is unavailable because the Tesseract binary is not installed on this server. "
        "Install Tesseract OCR and the Amharic language data."
    )


_configure_tesseract_binary()
_configure_tessdata_prefix()


def _ensure_language_available(lang: str) -> None:
    try:
        installed_languages = set(pytesseract.get_languages(config=""))
    except Exception:
        installed_languages = set()

    if lang not in installed_languages:
        raise RuntimeError(
            f"OCR language '{lang}' is not installed on this server. "
            "Install the matching Tesseract language data package."
        )


def _score_text(text: str) -> int:
    amharic_chars = sum(1 for ch in text if 0x1200 <= ord(ch) <= 0x137F)
    total_text_chars = sum(1 for ch in text if ch.isalpha() or ch.isdigit())
    return (amharic_chars * 6) + total_text_chars


def _extract_text_from_image(img, lang):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)

    _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    adaptive = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )

    tesseract_config = "--oem 1 --psm 6"
    candidates = []
    for processed in (otsu, adaptive, denoised):
        text = pytesseract.image_to_string(processed, lang=lang, config=tesseract_config)
        cleaned = text.replace("|", "").strip()
        candidates.append(cleaned)

    return max(candidates, key=_score_text, default="")


def get_ocr_health() -> dict:
    tesseract_cmd = getattr(pytesseract.pytesseract, "tesseract_cmd", "tesseract")

    tesseract_available = False
    if tesseract_cmd and os.path.isabs(tesseract_cmd) and os.path.exists(tesseract_cmd):
        tesseract_available = True
    elif shutil.which(tesseract_cmd or "tesseract"):
        tesseract_available = True

    try:
        languages = sorted(pytesseract.get_languages(config=""))
    except Exception:
        languages = []

    return {
        "status": "ok" if (tesseract_available and "amh" in languages) else "degraded",
        "tesseractAvailable": tesseract_available,
        "tesseractCmd": tesseract_cmd,
        "tessdataPrefix": os.getenv("TESSDATA_PREFIX", ""),
        "installedLanguages": languages,
        "amharicLanguageAvailable": "amh" in languages,
    }


def extract_amharic_text(image_path, lang="amh"):
    _ensure_tesseract_available()
    _ensure_language_available(lang)
    # 1. Read image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image file not found or unreadable: {image_path}")

    return _extract_text_from_image(img, lang)


def extract_amharic_text_from_bytes(image_bytes, lang="amh"):
    _ensure_tesseract_available()
    _ensure_language_available(lang)
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Uploaded image is invalid or unsupported")

    return _extract_text_from_image(img, lang)
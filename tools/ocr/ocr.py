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


def _extract_text_from_image(img, lang):
    # 2. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 3. Noise removal (IMPORTANT)
    gray = cv2.medianBlur(gray, 3)

    # 4. Thresholding (make text clearer)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

    # 5. OCR
    text = pytesseract.image_to_string(thresh, lang=lang)

    # 6. Clean output text
    text = text.replace("|", "")
    text = text.strip()

    return text


def extract_amharic_text(image_path, lang="amh"):
    _ensure_tesseract_available()
    # 1. Read image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image file not found or unreadable: {image_path}")

    return _extract_text_from_image(img, lang)


def extract_amharic_text_from_bytes(image_bytes, lang="amh"):
    _ensure_tesseract_available()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Uploaded image is invalid or unsupported")

    return _extract_text_from_image(img, lang)
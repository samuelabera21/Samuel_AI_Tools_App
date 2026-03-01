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



import cv2
import numpy as np
import pytesseract

# Path to Tesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


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
    # 1. Read image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image file not found or unreadable: {image_path}")

    return _extract_text_from_image(img, lang)


def extract_amharic_text_from_bytes(image_bytes, lang="amh"):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Uploaded image is invalid or unsupported")

    return _extract_text_from_image(img, lang)
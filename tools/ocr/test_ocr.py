from pathlib import Path
import sys

try:
	from tools.ocr.ocr import extract_amharic_text
except ModuleNotFoundError:
	from ocr import extract_amharic_text


default_image = Path(__file__).with_name("test.png")
image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_image

if not image_path.exists():
	print(f"Image not found: {image_path}")
	print("Usage: python test_ocr.py <image_path>")
	print(f"Tip: put 'test.png' next to this file ({default_image.parent}) or pass a full path.")
	raise SystemExit(1)

result = extract_amharic_text(str(image_path))
print(result)
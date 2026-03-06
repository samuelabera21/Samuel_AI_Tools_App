from typing import Dict

MAX_INPUT_LENGTH = 24


def _validate_text(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError("Please enter an Amharic word or short text.")
    if len(text) > MAX_INPUT_LENGTH:
        raise ValueError(f"Text is too long. Maximum length is {MAX_INPUT_LENGTH} characters.")
    return text


def _compose_style(text: str, pattern: list[str], scale_x: int, gap: int) -> str:
    lines = [""] * len(pattern)

    for char in text:
        if char.isspace():
            for index in range(len(lines)):
                lines[index] += " " * (gap + scale_x)
            continue

        for index, row in enumerate(pattern):
            filled = "".join((char * scale_x) if bit == "1" else (" " * scale_x) for bit in row)
            lines[index] += filled + (" " * gap)

    return "\n".join(line.rstrip() for line in lines)


def generate_amharic_ascii_art(text: str) -> Dict[str, str]:
    normalized = _validate_text(text)

    # Style 1: box-heavy banner style.
    style1_pattern = [
        "01111110",
        "11000011",
        "11000000",
        "11111100",
        "11000000",
        "11000011",
        "01111110",
    ]

    # Style 2: slimmer geometric style.
    style2_pattern = [
        "00111100",
        "01100110",
        "11000011",
        "11111111",
        "11000011",
        "11000011",
        "11000011",
    ]

    style1 = _compose_style(normalized, style1_pattern, scale_x=1, gap=2)
    style2 = _compose_style(normalized, style2_pattern, scale_x=1, gap=2)

    return {
        "input": normalized,
        "style1": style1,
        "style2": style2,
    }

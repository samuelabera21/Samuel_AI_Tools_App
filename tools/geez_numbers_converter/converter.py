UNITS = {
    1: "፩", 2: "፪", 3: "፫", 4: "፬", 5: "፭",
    6: "፮", 7: "፯", 8: "፰", 9: "፱",
}

TENS = {
    10: "፲", 20: "፳", 30: "፴", 40: "፵",
    50: "፶", 60: "፷", 70: "፸", 80: "፹", 90: "፺",
}

GEEZ_TO_ARABIC = {
    "፩": 1, "፪": 2, "፫": 3, "፬": 4, "፭": 5,
    "፮": 6, "፯": 7, "፰": 8, "፱": 9,
    "፲": 10, "፳": 20, "፴": 30, "፵": 40,
    "፶": 50, "፷": 60, "፸": 70, "፹": 80, "፺": 90,
}

HUNDRED = "፻"
TEN_THOUSAND = "፼"
VALID_GEEZ_CHARS = set(GEEZ_TO_ARABIC) | {HUNDRED, TEN_THOUSAND}


def arabic_to_geez(num):
    if not isinstance(num, int):
        raise ValueError("Input must be an integer.")

    if num <= 0:
        raise ValueError("Number must be greater than 0.")

    return _arabic_to_geez_recursive(num)


def _arabic_to_geez_recursive(num):
    if num == 0:
        return ""

    result = ""

    if num >= 10000:
        ten_thousands = num // 10000
        result += _arabic_to_geez_recursive(ten_thousands) + TEN_THOUSAND
        num %= 10000

    if num >= 100:
        hundreds = num // 100
        if hundreds > 1:
            result += _arabic_to_geez_recursive(hundreds)
        result += HUNDRED
        num %= 100

    if num >= 10:
        tens = (num // 10) * 10
        result += TENS[tens]
        num %= 10

    if num > 0:
        result += UNITS[num]

    return result


def geez_to_arabic(text):
    if not isinstance(text, str):
        raise ValueError("Input must be Geez text.")

    cleaned = "".join(text.split())
    if not cleaned:
        raise ValueError("Geez numeral is required.")

    invalid_chars = [char for char in cleaned if char not in VALID_GEEZ_CHARS]
    if invalid_chars:
        raise ValueError("Invalid Geez numeral characters found.")

    total = 0
    current = 0

    for char in cleaned:
        if char == TEN_THOUSAND:
            total += (current if current else 1) * 10000
            current = 0
        elif char == HUNDRED:
            total += (current if current else 1) * 100
            current = 0
        else:
            current += GEEZ_TO_ARABIC[char]

    return total + current

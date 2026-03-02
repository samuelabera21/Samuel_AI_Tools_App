from decimal import Decimal, ROUND_HALF_UP


def number_to_amharic(n):
    ones = {
        0: "ዜሮ",
        1: "አንድ",
        2: "ሁለት",
        3: "ሶስት",
        4: "አራት",
        5: "አምስት",
        6: "ስድስት",
        7: "ሰባት",
        8: "ስምንት",
        9: "ዘጠኝ",
    }

    tens = {
        10: "አስር",
        20: "ሀያ",
        30: "ሰላሳ",
        40: "አርባ",
        50: "ሀምሳ",
        60: "ስልሳ",
        70: "ሰባ",
        80: "ሰማንያ",
        90: "ዘጠና",
    }

    if n < 0:
        return "አሉታዊ ቁጥር አይደገፍም"

    if n < 10:
        return ones[n]

    if n < 100:
        if n in tens:
            return tens[n]
        return tens[(n // 10) * 10] + " " + ones[n % 10]

    if n < 1000:
        if n == 100:
            return "መቶ"

        hundreds = n // 100
        remainder = n % 100

        if hundreds == 1:
            prefix = "መቶ"
        else:
            prefix = ones[hundreds] + " መቶ"

        if remainder == 0:
            return prefix

        return prefix + " " + number_to_amharic(remainder)

    scales = [
        (1_000_000_000, "ቢሊዮን"),
        (1_000_000, "ሚሊዮን"),
        (1000, "ሺ"),
    ]

    for scale_value, scale_name in scales:
        if n >= scale_value:
            leading = n // scale_value
            remainder = n % scale_value

            prefix = number_to_amharic(leading) + " " + scale_name
            if remainder == 0:
                return prefix

            return prefix + " " + number_to_amharic(remainder)

    return "ቁጥሩ ትልቅ ነው"


def number_to_currency(value):
    amount = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if amount < 0:
        return "አሉታዊ ቁጥር አይደገፍም"

    birr = int(amount)
    santim = int((amount - Decimal(birr)) * 100)

    if birr == 0 and santim == 0:
        return "ዜሮ ብር"

    parts = []
    if birr > 0:
        parts.append(number_to_amharic(birr) + " ብር")
    if santim > 0:
        parts.append(number_to_amharic(santim) + " ሳንቲም")

    if len(parts) == 2:
        return parts[0] + " ከ " + parts[1]

    return parts[0]

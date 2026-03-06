from dataclasses import dataclass
from datetime import date
from typing import Dict

# Correct Ethiopic epoch used by the converter formulas.
ETHIOPIAN_EPOCH = 1724221

ETHIOPIAN_MONTHS = [
    ("መስከረም", "Meskerem"),
    ("ጥቅምት", "Tikimit"),
    ("ኅዳር", "Hedar"),
    ("ታህሳስ", "Tahassas"),
    ("ጥር", "Tir"),
    ("የካቲት", "Yekatit"),
    ("መጋቢት", "Megabit"),
    ("ሚያዝያ", "Miyazia"),
    ("ግንቦት", "Ginbot"),
    ("ሰኔ", "Sene"),
    ("ሐምሌ", "Hamle"),
    ("ነሐሴ", "Nehase"),
    ("ጳጉሜ", "Puagme"),
]

GREGORIAN_MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

AMHARIC_WEEKDAYS = [
    "ሰኞ",
    "ማክሰኞ",
    "ረቡዕ",
    "ሐሙስ",
    "ዓርብ",
    "ቅዳሜ",
    "እሑድ",
]


@dataclass(frozen=True)
class EthiopianDate:
    year: int
    month: int
    day: int


def is_ethiopian_leap_year(year: int) -> bool:
    return year % 4 == 3


def max_ethiopian_day(year: int, month: int) -> int:
    if month < 1 or month > 13:
        raise ValueError("Ethiopian month must be between 1 and 13.")

    if month <= 12:
        return 30

    return 6 if is_ethiopian_leap_year(year) else 5


def validate_ethiopian_date(year: int, month: int, day: int) -> None:
    if year < 1:
        raise ValueError("Ethiopian year must be a positive number.")

    max_day = max_ethiopian_day(year, month)
    if day < 1 or day > max_day:
        raise ValueError("Invalid Ethiopian day for the selected month/year.")


def gregorian_to_jdn(year: int, month: int, day: int) -> int:
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    return day + ((153 * m + 2) // 5) + 365 * y + (y // 4) - (y // 100) + (y // 400) - 32045


def jdn_to_gregorian(jdn: int) -> date:
    a = jdn + 32044
    b = (4 * a + 3) // 146097
    c = a - (146097 * b) // 4
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153

    day = e - (153 * m + 2) // 5 + 1
    month = m + 3 - 12 * (m // 10)
    year = 100 * b + d - 4800 + (m // 10)
    return date(year, month, day)


def ethiopian_to_jdn(year: int, month: int, day: int) -> int:
    validate_ethiopian_date(year, month, day)
    return ETHIOPIAN_EPOCH + (365 * (year - 1)) + (year // 4) + (30 * month) + day - 31


def jdn_to_ethiopian(jdn: int) -> EthiopianDate:
    r = (jdn - ETHIOPIAN_EPOCH) % 1461
    n = (r % 365) + 365 * (r // 1460)

    year = 4 * ((jdn - ETHIOPIAN_EPOCH) // 1461) + (r // 365) - (r // 1460) + 1
    month = n // 30 + 1
    day = n % 30 + 1

    return EthiopianDate(year=year, month=month, day=day)


def ethiopian_to_gregorian(year: int, month: int, day: int) -> date:
    jdn = ethiopian_to_jdn(year, month, day)
    return jdn_to_gregorian(jdn)


def gregorian_to_ethiopian(year: int, month: int, day: int) -> EthiopianDate:
    jdn = gregorian_to_jdn(year, month, day)
    return jdn_to_ethiopian(jdn)


def add_months_ethiopian(base_date: EthiopianDate, delta_months: int) -> EthiopianDate:
    month_index = (base_date.year - 1) * 13 + (base_date.month - 1)
    next_index = month_index + delta_months

    if next_index < 0:
        raise ValueError("Resulting Ethiopian date is out of supported range.")

    next_year = next_index // 13 + 1
    next_month = next_index % 13 + 1
    next_day = min(base_date.day, max_ethiopian_day(next_year, next_month))

    return EthiopianDate(year=next_year, month=next_month, day=next_day)


def calculate_ethiopian_date(
    year: int,
    month: int,
    day: int,
    operation: str,
    days: int,
    months: int,
) -> EthiopianDate:
    validate_ethiopian_date(year, month, day)

    if days < 0 or months < 0:
        raise ValueError("Days and months must be zero or greater.")

    op = operation.strip().lower()
    if op not in {"add", "subtract"}:
        raise ValueError("Operation must be add or subtract.")

    sign = 1 if op == "add" else -1

    current = EthiopianDate(year=year, month=month, day=day)
    if months:
        current = add_months_ethiopian(current, sign * months)

    if days:
        shifted_jdn = ethiopian_to_jdn(current.year, current.month, current.day) + sign * days
        if shifted_jdn <= 0:
            raise ValueError("Resulting Ethiopian date is out of supported range.")
        current = jdn_to_ethiopian(shifted_jdn)

    return current


def format_ethiopian_date_display(year: int, month: int, day: int) -> str:
    name_am, _ = ETHIOPIAN_MONTHS[month - 1]
    return f"{name_am} {day} {year}"


def format_ethiopian_date_speech(year: int, month: int, day: int) -> str:
    greg_date = ethiopian_to_gregorian(year, month, day)
    weekday_am = AMHARIC_WEEKDAYS[greg_date.weekday()]
    name_am, _ = ETHIOPIAN_MONTHS[month - 1]
    return f"{weekday_am}, {name_am} {day} {year}"


def format_gregorian_date_display(value: date) -> str:
    return value.strftime("%A, %B %d, %Y")


def to_gregorian_payload(year: int, month: int, day: int) -> Dict[str, object]:
    result = ethiopian_to_gregorian(year, month, day)
    return {
        "gregorian": {
            "year": result.year,
            "month": result.month,
            "day": result.day,
        },
        "displayText": format_gregorian_date_display(result),
        "speechText": format_gregorian_date_display(result),
        "speechLang": "en-US",
    }


def to_ethiopian_payload(year: int, month: int, day: int) -> Dict[str, object]:
    result = gregorian_to_ethiopian(year, month, day)
    with_weekday = format_ethiopian_date_speech(result.year, result.month, result.day)
    return {
        "ethiopian": {
            "year": result.year,
            "month": result.month,
            "day": result.day,
        },
        "displayText": with_weekday,
        "speechText": with_weekday,
        "speechLang": "am-ET",
    }


def calculator_payload(
    year: int,
    month: int,
    day: int,
    operation: str,
    days: int,
    months: int,
) -> Dict[str, object]:
    result_eth = calculate_ethiopian_date(
        year=year,
        month=month,
        day=day,
        operation=operation,
        days=days,
        months=months,
    )
    result_gr = ethiopian_to_gregorian(result_eth.year, result_eth.month, result_eth.day)

    return {
        "ethiopian": {
            "year": result_eth.year,
            "month": result_eth.month,
            "day": result_eth.day,
        },
        "gregorian": {
            "year": result_gr.year,
            "month": result_gr.month,
            "day": result_gr.day,
        },
        "ethiopianDisplayText": format_ethiopian_date_speech(
            result_eth.year, result_eth.month, result_eth.day
        ),
        "gregorianDisplayText": format_gregorian_date_display(result_gr),
    }

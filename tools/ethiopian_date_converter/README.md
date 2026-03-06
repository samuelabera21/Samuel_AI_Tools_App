# Ethiopian Date Converter

Tool path: `tools/ethiopian_date_converter/`

## Overview
This tool provides Ethiopian <-> Gregorian date conversion and an Ethiopian date calculator.

Implemented behavior matches the MetaAppz flow:
- Ethiopian Date to Gregorian Date
- Gregorian Date to Ethiopian Date
- Ethiopian Date Calculator (Add/Subtract days and months)
- Result speech button and copy button

## API Key Requirement
No API key is required for this tool.

Speech playback uses browser `speechSynthesis`:
- Ethiopian -> Gregorian result speaks in English (`en-US`)
- Gregorian -> Ethiopian result speaks in Amharic (`am-ET`)

Note: available voices depend on the user's browser/OS voice pack.

## Features
- Correct Ethiopian leap year handling.
- Correct Pagume month handling:
  - month 13 has 5 days in normal years
  - month 13 has 6 days in leap years
- Validation for Ethiopian day/month/year ranges.
- Date calculator supports:
  - base Ethiopian date
  - operation (`add` or `subtract`)
  - number of days
  - number of months

## Files
- `tools/ethiopian_date_converter/service.py`
  - conversion algorithms, validation, date calculator logic
- `templates/ethiopian_date_converter.html`
  - converter + calculator UI
- `static/js/ethiopian_date_converter.js`
  - API calls, tab behavior, speech, copy
- `static/css/ethiopian_date_converter.css`
  - page styles
- `app.py`
  - routes and API endpoints

## Routes
Page route:
- `GET /Tools/Ethiopian_Date_Converter`

API routes:
- `POST /api/ethiopian-date/to-gregorian`
- `POST /api/ethiopian-date/to-ethiopian`
- `POST /api/ethiopian-date/calculate`
- `GET /api/ethiopian-date/meta`

## API Examples
### 1. Ethiopian -> Gregorian
Request:
```json
{
  "year": 2018,
  "month": 6,
  "day": 27
}
```

Response:
```json
{
  "gregorian": { "year": 2026, "month": 3, "day": 6 },
  "displayText": "Friday, March 06, 2026",
  "speechText": "Friday, March 06, 2026",
  "speechLang": "en-US"
}
```

### 2. Gregorian -> Ethiopian
Request:
```json
{
  "year": 2026,
  "month": 3,
  "day": 6
}
```

Response:
```json
{
  "ethiopian": { "year": 2018, "month": 6, "day": 27 },
  "displayText": "የካቲት 27 2018",
  "speechText": "ዓርብ፣ የካቲት 27 2018",
  "speechLang": "am-ET"
}
```

### 3. Date Calculator
Request:
```json
{
  "year": 2018,
  "month": 6,
  "day": 27,
  "operation": "add",
  "days": 20,
  "months": 1
}
```

Response:
```json
{
  "ethiopian": { "year": 2018, "month": 8, "day": 17 },
  "gregorian": { "year": 2026, "month": 4, "day": 25 },
  "ethiopianDisplayText": "ቅዳሜ፣ ሚያዝያ 17 2018",
  "gregorianDisplayText": "Saturday, April 25, 2026"
}
```

## Local Run
From project root:
```bash
python app.py
```

Open:
- `http://127.0.0.1:5000/Tools/Ethiopian_Date_Converter`

## Notes
- The converter uses Julian Day Number arithmetic internally for stable bidirectional conversion.
- Month options and day limits are dynamically adjusted in the UI.
- Query param `handler` is supported in the UI flow:
  - `ToGregorian`
  - `ToEthiopian`
  - `DateCalculator`

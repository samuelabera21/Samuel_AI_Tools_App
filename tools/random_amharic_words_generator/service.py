from pathlib import Path
import random
import re

DATA_FILE_PATH = Path(__file__).resolve().parent / "data" / "amharic_words.txt"
ETHIOPIC_WORD_RE = re.compile(r"^[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]+$")

PREFIX_OPTIONS = [
    {"key": "any", "label": "ANY", "letters": ""},
    {"key": "h_family", "label": "ሀ ሁ ሂ ሃ ሄ ህ ሆ", "letters": "ሀሁሂሃሄህሆ"},
    {"key": "l_family", "label": "ለ ሉ ሊ ላ ሌ ል ሎ", "letters": "ለሉሊላሌልሎ"},
    {"key": "hh_family", "label": "ሐ ሑ ሒ ሓ ሔ ሕ ሖ", "letters": "ሐሑሒሓሔሕሖ"},
    {"key": "m_family", "label": "መ ሙ ሚ ማ ሜ ም ሞ", "letters": "መሙሚማሜምሞ"},
    {"key": "s2_family", "label": "ሠ ሡ ሢ ሣ ሤ ሥ ሦ", "letters": "ሠሡሢሣሤሥሦ"},
    {"key": "r_family", "label": "ረ ሩ ሪ ራ ሬ ር ሮ", "letters": "ረሩሪራሬርሮ"},
    {"key": "s_family", "label": "ሰ ሱ ሲ ሳ ሴ ስ ሶ", "letters": "ሰሱሲሳሴስሶ"},
    {"key": "sh_family", "label": "ሸ ሹ ሺ ሻ ሼ ሽ ሾ", "letters": "ሸሹሺሻሼሽሾ"},
    {"key": "q_family", "label": "ቀ ቁ ቂ ቃ ቄ ቅ ቆ", "letters": "ቀቁቂቃቄቅቆ"},
    {"key": "b_family", "label": "በ ቡ ቢ ባ ቤ ብ ቦ", "letters": "በቡቢባቤብቦ"},
    {"key": "v_family", "label": "ቨ ቩ ቪ ቫ ቬ ቭ ቮ", "letters": "ቨቩቪቫቬቭቮ"},
    {"key": "t_family", "label": "ተ ቱ ቲ ታ ቴ ት ቶ", "letters": "ተቱቲታቴትቶ"},
    {"key": "ch_family", "label": "ቸ ቹ ቺ ቻ ቼ ች ቾ", "letters": "ቸቹቺቻቼችቾ"},
    {"key": "x_family", "label": "ኀ ኁ ኂ ኃ ኄ ኅ ኆ", "letters": "ኀኁኂኃኄኅኆ"},
    {"key": "n_family", "label": "ነ ኑ ኒ ና ኔ ን ኖ", "letters": "ነኑኒናኔንኖ"},
    {"key": "ny_family", "label": "ኘ ኙ ኚ ኛ ኜ ኝ ኞ", "letters": "ኘኙኚኛኜኝኞ"},
    {"key": "a_family", "label": "አ ኡ ኢ ኣ ኤ እ ኦ", "letters": "አኡኢኣኤእኦ"},
    {"key": "k_family", "label": "ከ ኩ ኪ ካ ኬ ክ ኮ", "letters": "ከኩኪካኬክኮ"},
    {"key": "w_family", "label": "ወ ዉ ዊ ዋ ዌ ው ዎ", "letters": "ወዉዊዋዌውዎ"},
    {"key": "e2_family", "label": "ዐ ዑ ዒ ዓ ዔ ዕ ዖ", "letters": "ዐዑዒዓዔዕዖ"},
    {"key": "z_family", "label": "ዘ ዙ ዚ ዛ ዜ ዝ ዞ", "letters": "ዘዙዚዛዜዝዞ"},
    {"key": "zh_family", "label": "ዠ ዡ ዢ ዣ ዤ ዥ ዦ", "letters": "ዠዡዢዣዤዥዦ"},
    {"key": "y_family", "label": "የ ዩ ዪ ያ ዬ ይ ዮ", "letters": "የዩዪያዬይዮ"},
    {"key": "d_family", "label": "ደ ዱ ዲ ዳ ዴ ድ ዶ", "letters": "ደዱዲዳዴድዶ"},
    {"key": "j_family", "label": "ጀ ጁ ጂ ጃ ጄ ጅ ጆ", "letters": "ጀጁጂጃጄጅጆ"},
    {"key": "g_family", "label": "ገ ጉ ጊ ጋ ጌ ግ ጎ", "letters": "ገጉጊጋጌግጎ"},
    {"key": "tt_family", "label": "ጠ ጡ ጢ ጣ ጤ ጥ ጦ", "letters": "ጠጡጢጣጤጥጦ"},
    {"key": "ch2_family", "label": "ጨ ጩ ጪ ጫ ጬ ጭ ጮ", "letters": "ጨጩጪጫጬጭጮ"},
    {"key": "ph_family", "label": "ጰ ጱ ጲ ጳ ጴ ጵ ጶ", "letters": "ጰጱጲጳጴጵጶ"},
    {"key": "ts_family", "label": "ጸ ጹ ጺ ጻ ጼ ጽ ጾ", "letters": "ጸጹጺጻጼጽጾ"},
    {"key": "ts2_family", "label": "ፀ ፁ ፂ ፃ ፄ ፅ ፆ", "letters": "ፀፁፂፃፄፅፆ"},
    {"key": "f_family", "label": "ፈ ፉ ፊ ፋ ፌ ፍ ፎ", "letters": "ፈፉፊፋፌፍፎ"},
    {"key": "p_family", "label": "ፐ ፑ ፒ ፓ ፔ ፕ ፖ", "letters": "ፐፑፒፓፔፕፖ"}
]

VALID_COUNTS = {1, 5, 10, 20, 50, 100, 200}
VALID_ORDERS = {"random", "alphabetical"}
_CACHED_WORDS = None

_FIDEL_ORDER = (
    "ሀሁሂሃሄህሆ"
    "ለሉሊላሌልሎ"
    "ሐሑሒሓሔሕሖ"
    "መሙሚማሜምሞ"
    "ሠሡሢሣሤሥሦ"
    "ረሩሪራሬርሮ"
    "ሰሱሲሳሴስሶ"
    "ሸሹሺሻሼሽሾ"
    "ቀቁቂቃቄቅቆ"
    "በቡቢባቤብቦ"
    "ቨቩቪቫቬቭቮ"
    "ተቱቲታቴትቶ"
    "ቸቹቺቻቼችቾ"
    "ኀኁኂኃኄኅኆ"
    "ነኑኒናኔንኖ"
    "ኘኙኚኛኜኝኞ"
    "አኡኢኣኤእኦ"
    "ከኩኪካኬክኮ"
    "ኸኹኺኻኼኽኾ"
    "ወዉዊዋዌውዎ"
    "ዐዑዒዓዔዕዖ"
    "ዘዙዚዛዜዝዞ"
    "ዠዡዢዣዤዥዦ"
    "የዩዪያዬይዮ"
    "ደዱዲዳዴድዶ"
    "ጀጁጂጃጄጅጆ"
    "ገጉጊጋጌግጎ"
    "ጠጡጢጣጤጥጦ"
    "ጨጩጪጫጬጭጮ"
    "ጰጱጲጳጴጵጶ"
    "ጸጹጺጻጼጽጾ"
    "ፀፁፂፃፄፅፆ"
    "ፈፉፊፋፌፍፎ"
    "ፐፑፒፓፔፕፖ"
)

_FIDEL_RANK = {char: index for index, char in enumerate(_FIDEL_ORDER)}


def _load_word_bank():
    global _CACHED_WORDS

    if _CACHED_WORDS is not None:
        return _CACHED_WORDS

    if not DATA_FILE_PATH.exists():
        raise FileNotFoundError(f"Amharic dataset not found: {DATA_FILE_PATH}")

    words = []
    seen = set()
    with DATA_FILE_PATH.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            word = raw_line.strip()
            if not word or word.startswith("#"):
                continue
            if not ETHIOPIC_WORD_RE.match(word):
                continue
            if word in seen:
                continue
            seen.add(word)
            words.append(word)

    if not words:
        raise ValueError(f"No valid Amharic words found in dataset: {DATA_FILE_PATH}")

    _CACHED_WORDS = words
    return _CACHED_WORDS


def get_prefix_options():
    return [{"key": item["key"], "label": item["label"]} for item in PREFIX_OPTIONS]


def _letters_for_prefix(prefix_key: str):
    for item in PREFIX_OPTIONS:
        if item["key"] == prefix_key:
            return item["letters"]
    return ""


def _amharic_sort_key(word: str):
    # Sort words according to Ethiopic (Fidel) order, then by word length.
    rank_tuple = tuple(_FIDEL_RANK.get(char, 100000 + ord(char)) for char in word)
    return rank_tuple, len(word)


def generate_random_amharic_words(count: int, prefix_key: str = "any", order: str = "random"):
    if count not in VALID_COUNTS:
        raise ValueError("Unsupported words count.")
    if order not in VALID_ORDERS:
        raise ValueError("Unsupported words order.")

    word_bank = _load_word_bank()
    letters = _letters_for_prefix(prefix_key)
    if letters:
        source_words = [word for word in word_bank if word and word[0] in letters]
    else:
        source_words = list(word_bank)

    if not source_words:
        return []

    if order == "alphabetical":
        sorted_words = sorted(source_words, key=_amharic_sort_key)
        if count <= len(sorted_words):
            return sorted_words[:count]
        # Preserve alphabetical flow even when reusing words.
        return [sorted_words[index % len(sorted_words)] for index in range(count)]

    if count <= len(source_words):
        return random.sample(source_words, count)

    # If requested count is larger than available unique words, reuse real dataset words.
    return random.choices(source_words, k=count)

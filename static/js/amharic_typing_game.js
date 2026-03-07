const levels = [
  "ያወቀ ናቀ",
  "አለም ሀላፊ መልክ ረጋፊ",
  "አይን አይቶ ልብ ይፈርዳል",
  "ጀርባዬን እከከኝ ለኔ ራቀኝ",
  "ፈስ በወረንጦ እየተለቀመ ነው",
  "ነብር ቢያንቀላፋ ዝንጀሮ ጎበኘው",
  "ለረዥም ሰው ልብ እና ልብስ ያጥረዋል",
  "ለዳኛ ዳኛ አለው ለአንበሳ ተኩላ አለው",
  "ፍቅር ካለ ዘጠኝ ቂጣ ለባልና ሚስት ይበቃል",
  "የማህበር ኣሽከር በልቶም ኣይጠገን ታሞም አይድን"
];

let currentLevel = 0;
let currentRawText = "";
let remainingTime = 180;
const totalTime = 180;
let timerInterval;
let timerStarted = false;
let gameOver = false;
let wordNodes = [];
let wordContainers = [];
let isProgrammaticUpdate = false;

const fidelFamilies = {
  h: ["ሀ", "ሁ", "ሂ", "ሃ", "ሄ", "ህ", "ሆ"],
  hh: ["ሐ", "ሑ", "ሒ", "ሓ", "ሔ", "ሕ", "ሖ"],
  l: ["ለ", "ሉ", "ሊ", "ላ", "ሌ", "ል", "ሎ"],
  m: ["መ", "ሙ", "ሚ", "ማ", "ሜ", "ም", "ሞ"],
  s: ["ሰ", "ሱ", "ሲ", "ሳ", "ሴ", "ስ", "ሶ"],
  sh: ["ሸ", "ሹ", "ሺ", "ሻ", "ሼ", "ሽ", "ሾ"],
  r: ["ረ", "ሩ", "ሪ", "ራ", "ሬ", "ር", "ሮ"],
  q: ["ቀ", "ቁ", "ቂ", "ቃ", "ቄ", "ቅ", "ቆ"],
  b: ["በ", "ቡ", "ቢ", "ባ", "ቤ", "ብ", "ቦ"],
  t: ["ተ", "ቱ", "ቲ", "ታ", "ቴ", "ት", "ቶ"],
  ch: ["ቸ", "ቹ", "ቺ", "ቻ", "ቼ", "ች", "ቾ"],
  n: ["ነ", "ኑ", "ኒ", "ና", "ኔ", "ን", "ኖ"],
  gn: ["ኘ", "ኙ", "ኚ", "ኛ", "ኜ", "ኝ", "ኞ"],
  k: ["ከ", "ኩ", "ኪ", "ካ", "ኬ", "ክ", "ኮ"],
  kh: ["ኸ", "ኹ", "ኺ", "ኻ", "ኼ", "ኽ", "ኾ"],
  z: ["ዘ", "ዙ", "ዚ", "ዛ", "ዜ", "ዝ", "ዞ"],
  zh: ["ዠ", "ዡ", "ዢ", "ዣ", "ዤ", "ዥ", "ዦ"],
  d: ["ደ", "ዱ", "ዲ", "ዳ", "ዴ", "ድ", "ዶ"],
  j: ["ጀ", "ጁ", "ጂ", "ጃ", "ጄ", "ጅ", "ጆ"],
  g: ["ገ", "ጉ", "ጊ", "ጋ", "ጌ", "ግ", "ጎ"],
  tt: ["ጠ", "ጡ", "ጢ", "ጣ", "ጤ", "ጥ", "ጦ"],
  c: ["ጨ", "ጩ", "ጪ", "ጫ", "ጬ", "ጭ", "ጮ"],
  ph: ["ጰ", "ጱ", "ጲ", "ጳ", "ጴ", "ጵ", "ጶ"],
  ts: ["ጸ", "ጹ", "ጺ", "ጻ", "ጼ", "ጽ", "ጾ"],
  f: ["ፈ", "ፉ", "ፊ", "ፋ", "ፌ", "ፍ", "ፎ"],
  p: ["ፐ", "ፑ", "ፒ", "ፓ", "ፔ", "ፕ", "ፖ"],
  w: ["ወ", "ዉ", "ዊ", "ዋ", "ዌ", "ው", "ዎ"],
  y: ["የ", "ዩ", "ዪ", "ያ", "ዬ", "ይ", "ዮ"]
};

const consonantTokens = Object.keys(fidelFamilies).sort((a, b) => b.length - a.length);
const standaloneVowels = {
  a: "አ",
  e: "እ",
  i: "ኢ",
  o: "ኦ",
  u: "ኡ"
};

const vowelOrders = {
  e: 1,
  u: 2,
  i: 3,
  a: 4,
  ee: 5,
  ie: 5,
  ae: 5,
  o: 7
};

const targetTextDiv = document.getElementById("targetText");
const typingInput = document.getElementById("typingInput");
const timerSpan = document.getElementById("timer");
const levelIndicator = document.getElementById("levelIndicator");
const restartBtn = document.getElementById("restartBtn");
const timeProgressBar = document.getElementById("timeProgressBar");
const keyboardToggle = document.getElementById("amharicKey");
const keyboardAssist = document.getElementById("amhKeyAss");

typingInput.addEventListener("paste", (event) => {
  event.preventDefault();
});

typingInput.addEventListener("dragover", (event) => {
  event.preventDefault();
});

typingInput.addEventListener("drop", (event) => {
  event.preventDefault();
});

keyboardToggle.addEventListener("change", renderKeyboardHints);

typingInput.addEventListener("keydown", (event) => {
  if (!keyboardToggle.checked) {
    return;
  }

  if (event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }

  const finalizeKeys = new Set([" ", "Enter", ".", ",", ";", ":", "?", "!"]);
  if (!finalizeKeys.has(event.key)) {
    return;
  }

  transliterateInputAroundCursor(true);
});

function matchConsonant(text, index) {
  for (const token of consonantTokens) {
    if (text.startsWith(token, index)) {
      return token;
    }
  }
  return "";
}

function matchVowel(text, index) {
  if (text.startsWith("ee", index)) return { key: "ee", len: 2 };
  if (text.startsWith("ie", index)) return { key: "ie", len: 2 };
  if (text.startsWith("ae", index)) return { key: "ae", len: 2 };

  const ch = text[index] || "";
  if (Object.prototype.hasOwnProperty.call(vowelOrders, ch)) {
    return { key: ch, len: 1 };
  }

  return { key: "", len: 0 };
}

function transliterateLatinToken(token, finalize) {
  const raw = token.toLowerCase();
  let output = "";
  let index = 0;

  while (index < raw.length) {
    const consonant = matchConsonant(raw, index);
    if (!consonant) {
      const vowel = raw[index];
      if (standaloneVowels[vowel]) {
        output += standaloneVowels[vowel];
      } else {
        output += raw[index];
      }
      index += 1;
      continue;
    }

    let order = 6;
    const vowel = matchVowel(raw, index + consonant.length);
    if (vowel.len > 0) {
      order = vowelOrders[vowel.key];
      index += consonant.length + vowel.len;
    } else {
      // Keep a trailing consonant pending until next key unless finalizing.
      if (!finalize && index + consonant.length === raw.length) {
        output += raw.slice(index);
        break;
      }
      index += consonant.length;
    }

    output += fidelFamilies[consonant][order - 1];
  }

  return output;
}

function transliterateInputAroundCursor(finalize = false) {
  const start = typingInput.selectionStart;
  const end = typingInput.selectionEnd;
  if (start !== end) {
    return;
  }

  const value = typingInput.value;
  const left = value.slice(0, start);
  const right = value.slice(start);
  const match = left.match(/([A-Za-z]+)$/);

  if (!match) {
    return;
  }

  const latinTail = match[1];
  const converted = transliterateLatinToken(latinTail, finalize);
  if (converted === latinTail) {
    return;
  }

  const newLeft = left.slice(0, left.length - latinTail.length) + converted;
  const newValue = newLeft + right;

  isProgrammaticUpdate = true;
  typingInput.value = newValue;
  typingInput.setSelectionRange(newLeft.length, newLeft.length);
  isProgrammaticUpdate = false;
}

function renderKeyboardHints() {
  if (!keyboardToggle.checked) {
    keyboardAssist.innerHTML = "";
    return;
  }

  const hints = ["ya=ያ", "ye=የ", "we=ወ", "shi=ሺ", "cha=ቻ", "gna=ኛ", "tsa=ጻ", "ha=ሀ", "hu=ሁ"];
  keyboardAssist.innerHTML = hints
    .map((item) => `<span class=\"kbd-helper\">${item}</span>`)
    .join("");
}

function startTimer() {
  timerStarted = true;
  timerInterval = setInterval(() => {
    remainingTime -= 1;
    timerSpan.textContent = String(remainingTime);

    const percentage = (remainingTime / totalTime) * 100;
    timeProgressBar.style.width = `${percentage}%`;
    timeProgressBar.setAttribute("aria-valuenow", String(remainingTime));

    if (remainingTime <= 30) {
      timeProgressBar.classList.remove("bg-warning", "bg-success");
      timeProgressBar.classList.add("bg-danger");
    } else if (remainingTime <= 60) {
      timeProgressBar.classList.remove("bg-success", "bg-danger");
      timeProgressBar.classList.add("bg-warning");
    } else {
      timeProgressBar.classList.remove("bg-warning", "bg-danger");
      timeProgressBar.classList.add("bg-success");
    }

    if (remainingTime <= 0) {
      endGameTimeUp();
    }
  }, 1000);
}

function endGameTimeUp() {
  clearInterval(timerInterval);
  gameOver = true;
  typingInput.disabled = true;
  document.getElementById("resultModalLabel").textContent = "Game Over";
  document.getElementById("resultModalBody").textContent = `Time's up! You completed level ${currentLevel + 1} out of ${levels.length}.`;
  const resultModal = new bootstrap.Modal(document.getElementById("resultModal"));
  resultModal.show();
}

function loadLevel(level) {
  if (level >= levels.length) {
    return;
  }

  levelIndicator.textContent = `Level ${level + 1} of ${levels.length}`;
  currentRawText = levels[level];
  targetTextDiv.innerHTML = "";
  wordNodes = [];
  wordContainers = [];

  const expectedWords = currentRawText.split(" ");

  for (let i = 0; i < expectedWords.length; i += 1) {
    const wordContainer = document.createElement("span");
    wordContainer.classList.add("word-container");

    const letterNodes = [];
    for (const character of expectedWords[i]) {
      const span = document.createElement("span");
      span.textContent = character;
      wordContainer.appendChild(span);
      letterNodes.push(span);
    }

    wordNodes.push(letterNodes);
    wordContainers.push(wordContainer);
    targetTextDiv.appendChild(wordContainer);

    if (i < expectedWords.length - 1) {
      const spaceMarker = document.createElement("kbd");
      spaceMarker.classList.add("ios", "kbd_targetText");
      spaceMarker.textContent = "space";
      targetTextDiv.appendChild(spaceMarker);
    }
  }

  const finalMarker = document.createElement("kbd");
  finalMarker.classList.add("ios", "kbd_targetText");
  finalMarker.textContent = "space";
  targetTextDiv.appendChild(finalMarker);

  typingInput.value = "";
  typingInput.focus();
}

function validateInput() {
  if (gameOver) {
    return;
  }

  const rawInput = typingInput.value;
  const typedWords = rawInput.trim().split(" ");
  const expectedWords = currentRawText.split(" ");
  let underlineIndex = null;

  for (let i = 0; i < expectedWords.length; i += 1) {
    const typedWord = typedWords[i] || "";
    const expectedWord = expectedWords[i];

    if (typedWord === expectedWord) {
      wordNodes[i].forEach((node) => node.classList.add("text-success"));
      wordContainers[i].classList.remove("animated-underline");
      const nextElement = wordContainers[i].nextElementSibling;
      if (nextElement && nextElement.tagName === "KBD") {
        nextElement.classList.remove("animated-underline");
      }
    } else {
      wordNodes[i].forEach((node) => node.classList.remove("text-success"));
      wordContainers[i].classList.remove("animated-underline");
      const nextElement = wordContainers[i].nextElementSibling;
      if (nextElement && nextElement.tagName === "KBD") {
        nextElement.classList.remove("animated-underline");
      }

      if (underlineIndex === null) {
        underlineIndex = i;
      }
    }
  }

  if (underlineIndex !== null) {
    wordContainers[underlineIndex].classList.add("animated-underline");
    const nextElement = wordContainers[underlineIndex].nextElementSibling;
    if (nextElement && nextElement.tagName === "KBD") {
      nextElement.classList.add("animated-underline");
    }
  }

  if (rawInput.trim() === currentRawText) {
    if (currentLevel < levels.length - 1) {
      currentLevel += 1;
      loadLevel(currentLevel);
    } else {
      clearInterval(timerInterval);
      document.getElementById("resultModalLabel").textContent = "Congratulations!";
      document.getElementById("resultModalBody").textContent = `You finished all levels with ${remainingTime} seconds remaining.`;
      const resultModal = new bootstrap.Modal(document.getElementById("resultModal"));
      resultModal.show();
    }
  }
}

typingInput.addEventListener("input", () => {
  if (keyboardToggle.checked && !isProgrammaticUpdate) {
    transliterateInputAroundCursor();
  }

  if (!timerStarted && typingInput.value.length > 0) {
    startTimer();
  }
  validateInput();
});

restartBtn.addEventListener("click", () => {
  window.location.reload();
});

function initGame() {
  currentLevel = 0;
  remainingTime = totalTime;
  timerSpan.textContent = String(remainingTime);
  timeProgressBar.style.width = "100%";
  timeProgressBar.setAttribute("aria-valuenow", String(remainingTime));
  timeProgressBar.classList.remove("bg-warning", "bg-danger");
  timeProgressBar.classList.add("bg-success");

  timerStarted = false;
  gameOver = false;
  typingInput.disabled = false;

  renderKeyboardHints();
  loadLevel(currentLevel);
  clearInterval(timerInterval);
}

window.onload = initGame;

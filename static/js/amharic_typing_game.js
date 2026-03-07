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

const transliterationMap = {
  a: "አ",
  b: "በ",
  c: "ቸ",
  d: "ደ",
  e: "እ",
  f: "ፈ",
  g: "ገ",
  h: "ሀ",
  i: "ኢ",
  j: "ጀ",
  k: "ከ",
  l: "ለ",
  m: "መ",
  n: "ነ",
  o: "ኦ",
  p: "ፐ",
  q: "ቀ",
  r: "ረ",
  s: "ሰ",
  t: "ተ",
  u: "ኡ",
  v: "ቨ",
  w: "ወ",
  x: "ሸ",
  y: "የ",
  z: "ዘ"
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

typingInput.addEventListener("keydown", (event) => {
  if (!keyboardToggle.checked) {
    return;
  }

  if (event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }

  if (event.key.length !== 1) {
    return;
  }

  const mapped = transliterationMap[event.key.toLowerCase()];
  if (!mapped) {
    return;
  }

  event.preventDefault();
  insertAtCursor(typingInput, mapped);

  // Trigger standard live validation workflow after programmatic insertion.
  typingInput.dispatchEvent(new Event("input", { bubbles: true }));
});

keyboardToggle.addEventListener("change", renderKeyboardHints);

function insertAtCursor(inputElement, text) {
  const start = inputElement.selectionStart;
  const end = inputElement.selectionEnd;
  const value = inputElement.value;

  inputElement.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
  const nextCursor = start + text.length;
  inputElement.selectionStart = nextCursor;
  inputElement.selectionEnd = nextCursor;
}

function renderKeyboardHints() {
  if (!keyboardToggle.checked) {
    keyboardAssist.innerHTML = "";
    return;
  }

  const hints = ["h=ሀ", "l=ለ", "m=መ", "s=ሰ", "r=ረ", "b=በ", "t=ተ", "n=ነ", "k=ከ", "w=ወ"];
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

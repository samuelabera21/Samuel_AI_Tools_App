const asciiInput = document.getElementById("ascii-input");
const keyboardToggle = document.getElementById("keyboard-toggle");
const submitBtn = document.getElementById("submit-btn");
const errorEl = document.getElementById("ascii-error");
const resultWrap = document.getElementById("result-wrap");
const style1Text = document.getElementById("style-1-text");
const style2Text = document.getElementById("style-2-text");
const copyStyle1Btn = document.getElementById("copy-style-1");
const copyStyle2Btn = document.getElementById("copy-style-2");

const latinToAmharicMap = {
    h: "ሀ", l: "ለ", m: "መ", s: "ሰ", r: "ረ", b: "በ",
    t: "ተ", n: "ነ", k: "ከ", w: "ወ", y: "የ", d: "ደ",
    g: "ገ", p: "ፐ", f: "ፈ", q: "ቀ", c: "ቸ", j: "ጀ",
    z: "ዘ", x: "ሸ", v: "ቨ", a: "አ", e: "እ", i: "ኢ",
    o: "ኦ", u: "ኡ"
};

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
}

function hideError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Generating..." : "Submit";
}

async function copyText(value) {
    if (!value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
    } catch (error) {
        showError("Could not copy text. Please copy manually.");
    }
}

function insertAtCursor(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;

    input.value = current.slice(0, start) + text + current.slice(end);
    const pos = start + text.length;
    input.selectionStart = pos;
    input.selectionEnd = pos;
}

async function generateAsciiArt() {
    hideError();
    const text = asciiInput.value.trim();

    if (!text) {
        showError("Please type a word first.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/amharic-ascii-art", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Could not generate ASCII art.");
        }

        style1Text.textContent = data.style1 || "";
        style2Text.textContent = data.style2 || "";
        resultWrap.classList.remove("hidden");
    } catch (error) {
        showError(error.message || "Could not generate ASCII art.");
    } finally {
        setLoading(false);
    }
}

asciiInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        generateAsciiArt();
        return;
    }

    if (!keyboardToggle.checked) {
        return;
    }

    if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
    }

    if (event.key.length !== 1) {
        return;
    }

    const mapped = latinToAmharicMap[event.key.toLowerCase()];
    if (!mapped) {
        return;
    }

    event.preventDefault();
    insertAtCursor(asciiInput, mapped);
});

submitBtn.addEventListener("click", generateAsciiArt);
copyStyle1Btn.addEventListener("click", () => copyText(style1Text.textContent));
copyStyle2Btn.addEventListener("click", () => copyText(style2Text.textContent));

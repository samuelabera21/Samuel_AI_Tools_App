const countSelect = document.getElementById("count-select");
const prefixSelect = document.getElementById("prefix-select");
const styleSelect = document.getElementById("style-select");
const orderSelect = document.getElementById("order-select");
const generateButton = document.getElementById("generate-btn");
const errorEl = document.getElementById("error");
const resultWrap = document.getElementById("result-wrap");
const resultOutput = document.getElementById("result-output");
const copyButton = document.getElementById("copy-btn");

let currentWords = [];

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
}

function hideError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderWords(words, style) {
    if (style === "numbered") {
        return `<ol>${words.map((word) => `<li>${escapeHtml(word)}</li>`).join("")}</ol>`;
    }

    if (style === "paragraph") {
        return `<p>${words.map(escapeHtml).join("፣ ")}</p>`;
    }

    if (style === "table") {
        return `<table><tbody>${words.map((word) => `<tr><td>${escapeHtml(word)}</td></tr>`).join("")}</tbody></table>`;
    }

    return `<ul>${words.map((word) => `<li>${escapeHtml(word)}</li>`).join("")}</ul>`;
}

async function generateWords() {
    generateButton.disabled = true;
    hideError();

    try {
        const response = await fetch("/api/amharic-words-generator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                count: Number(countSelect.value),
                prefix: prefixSelect.value,
                order: orderSelect.value
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Generation failed.");
        }

        currentWords = Array.isArray(data.words) ? data.words : [];
        if (!currentWords.length) {
            throw new Error("No words were found for the selected filter.");
        }

        resultOutput.innerHTML = renderWords(currentWords, styleSelect.value);
        resultWrap.classList.remove("hidden");
    } catch (error) {
        showError(error.message || "Could not generate words.");
    } finally {
        generateButton.disabled = false;
    }
}

async function copyResult() {
    if (!currentWords.length) {
        return;
    }

    const plainText = currentWords.join("\n");
    try {
        await navigator.clipboard.writeText(plainText);
    } catch (error) {
        showError("Could not copy result. Please copy manually.");
    }
}

generateButton.addEventListener("click", generateWords);
copyButton.addEventListener("click", copyResult);
styleSelect.addEventListener("change", () => {
    if (currentWords.length) {
        resultOutput.innerHTML = renderWords(currentWords, styleSelect.value);
    }
});

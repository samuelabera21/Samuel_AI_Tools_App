const inputText = document.getElementById("input-text");
const copyButton = document.getElementById("copy-btn");
const convertButton = document.getElementById("convert-btn");
const speechButton = document.getElementById("speech-btn");
const aiImproveButton = document.getElementById("ai-improve-btn");
const statusText = document.getElementById("status");
const imageResult = document.getElementById("image-result");
const previewImage = document.getElementById("preview-image");
const downloadButton = document.getElementById("download-btn");

let recognition = null;
let listening = false;

function showStatus(message) {
    statusText.textContent = message;
    statusText.classList.remove("hidden");
}

function hideStatus() {
    statusText.textContent = "";
    statusText.classList.add("hidden");
}

async function copyText() {
    const text = inputText.value.trim();
    if (!text) {
        showStatus("Please type some Amharic text first.");
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        hideStatus();
    } catch (error) {
        showStatus("Copy failed. Please copy manually.");
    }
}

function wrapTextLines(ctx, text, maxWidth) {
    const paragraphs = text.split(/\n/);
    const lines = [];

    paragraphs.forEach((paragraph) => {
        if (!paragraph.trim()) {
            lines.push("");
            return;
        }

        const words = paragraph.split(/\s+/);
        let currentLine = "";

        words.forEach((word) => {
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(candidate).width <= maxWidth) {
                currentLine = candidate;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }
    });

    return lines;
}

function renderTextToImage() {
    const text = inputText.value.trim();
    if (!text) {
        showStatus("Please type some Amharic text first.");
        return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const padding = 24;
    const maxCanvasWidth = Math.min(window.innerWidth - 130, 820);
    const drawWidth = maxCanvasWidth - (padding * 2);
    let lines = text.split(/\n/).map((line) => line.trimEnd()).filter((line) => line.length > 0);
    if (!lines.length) {
        showStatus("Please type some Amharic text first.");
        return;
    }

    let fontSize = 42;
    const minFontSize = 28;
    const fontFamily = '"Noto Sans Ethiopic", "Abyssinica SIL", sans-serif';

    // Try wrapping first to keep a readable font size.
    ctx.font = `${fontSize}px ${fontFamily}`;
    lines = wrapTextLines(ctx, lines.join("\n"), drawWidth);

    // Fit long lines by decreasing font size only when still needed.
    while (fontSize > minFontSize) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const widest = lines.reduce((maxWidth, line) => Math.max(maxWidth, ctx.measureText(line).width), 0);
        if (widest <= drawWidth) {
            break;
        }
        fontSize -= 2;
    }

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "alphabetic";

    const lineMetrics = lines.map((line) => {
        const sample = line || " ";
        const m = ctx.measureText(sample);
        const ascent = Math.ceil(m.actualBoundingBoxAscent || fontSize * 0.9);
        const descent = Math.ceil(m.actualBoundingBoxDescent || fontSize * 0.28);
        const width = Math.ceil(m.width || 0);
        return { ascent, descent, width };
    });

    const maxAscent = Math.max(...lineMetrics.map((m) => m.ascent));
    const maxDescent = Math.max(...lineMetrics.map((m) => m.descent));
    const lineGap = Math.ceil(fontSize * 0.22);
    const lineHeight = maxAscent + maxDescent + lineGap;
    const widestLine = Math.max(...lineMetrics.map((m) => m.width), 0);

    const canvasWidth = Math.max(Math.ceil(widestLine + (padding * 2)), 220);
    const canvasHeight = Math.max((lines.length * lineHeight) + (padding * 2), 110);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#111827";
    ctx.font = `${fontSize}px ${fontFamily}`;

    lines.forEach((line, index) => {
        // Draw using alphabetic baseline so full glyph body fits inside canvas.
        const y = padding + maxAscent + (index * lineHeight);
        ctx.fillText(line, padding, y);
    });

    const imageDataUrl = canvas.toDataURL("image/png");
    previewImage.src = imageDataUrl;
    downloadButton.href = imageDataUrl;
    imageResult.classList.remove("hidden");
    hideStatus();
}

async function aiImproveText() {
    const text = inputText.value.trim();
    if (!text) {
        showStatus("Please type some Amharic text first.");
        return;
    }

    aiImproveButton.disabled = true;
    const previousLabel = aiImproveButton.textContent;
    aiImproveButton.textContent = "Improving...";

    try {
        const response = await fetch("/api/amharic-keyboard/ai-polish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "AI improvement failed.");
        }

        inputText.value = data.text;
        hideStatus();
    } catch (error) {
        showStatus(error.message || "AI improvement failed.");
    } finally {
        aiImproveButton.disabled = false;
        aiImproveButton.textContent = previousLabel;
    }
}

function stopListening() {
    if (recognition && listening) {
        recognition.stop();
    }
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showStatus("Speech recognition is not supported in this browser.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "am-ET";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
        listening = true;
        speechButton.textContent = "Stop Speech-to-Text 🔴";
        hideStatus();
    };

    recognition.onresult = (event) => {
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalText += transcript + " ";
            }
        }

        if (finalText.trim()) {
            const spacer = inputText.value && !inputText.value.endsWith(" ") ? " " : "";
            inputText.value += `${spacer}${finalText.trim()}`;
        }
    };

    recognition.onerror = () => {
        showStatus("Speech-to-text failed. Check microphone permissions.");
    };

    recognition.onend = () => {
        listening = false;
        speechButton.textContent = "Speech-to-Text";
    };

    recognition.start();
}

function toggleSpeechRecognition() {
    if (listening) {
        stopListening();
        return;
    }
    startListening();
}

copyButton.addEventListener("click", copyText);
convertButton.addEventListener("click", renderTextToImage);
speechButton.addEventListener("click", toggleSpeechRecognition);
aiImproveButton.addEventListener("click", aiImproveText);

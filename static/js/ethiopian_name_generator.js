const generateBtn = document.getElementById("generate-btn");
const generateAgainBtn = document.getElementById("generate-again-btn");
const resultCard = document.getElementById("result-card");
const nameAmharicEl = document.getElementById("name-amharic");
const nameEnglishEl = document.getElementById("name-english");
const nameAudioEl = document.getElementById("name-audio");
const copyBtn = document.getElementById("copy-btn");
const errorEl = document.getElementById("error");
const warningEl = document.getElementById("warning");

let currentName = null;
let audioRequestId = 0;

function selectedGender() {
    const selected = document.querySelector("input[name='gender']:checked");
    return selected ? selected.value : "girl";
}

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
}

function hideError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
}

function showWarning(message) {
    warningEl.textContent = message;
    warningEl.classList.remove("hidden");
}

function hideWarning() {
    warningEl.textContent = "";
    warningEl.classList.add("hidden");
}

function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateAgainBtn.disabled = isLoading;
    generateBtn.textContent = isLoading ? "Generating..." : "Generate";
    generateAgainBtn.textContent = isLoading ? "Generating..." : "Generate Again";
}

function setAudioLoading(isLoading) {
    if (isLoading) {
        nameAudioEl.classList.add("hidden");
    }
}

async function loadAudioForName(nameAmharic, requestId) {
    setAudioLoading(true);

    try {
        const response = await fetch("/api/ethiopian-name-generator/audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nameAmharic })
        });

        const data = await response.json();
        if (requestId !== audioRequestId) {
            return;
        }

        if (!response.ok || !data.audioDataUrl) {
            nameAudioEl.classList.add("hidden");
            if (data.error) {
                showWarning(String(data.error));
            }
            return;
        }

        nameAudioEl.src = data.audioDataUrl;
        nameAudioEl.currentTime = 0;
        nameAudioEl.pause();
        nameAudioEl.classList.remove("hidden");
    } catch (error) {
        if (requestId === audioRequestId) {
            nameAudioEl.classList.add("hidden");
            showWarning("Audio is temporarily unavailable.");
        }
    }
}

async function generateName() {
    hideError();
    hideWarning();
    setLoading(true);

    try {
        const response = await fetch("/api/ethiopian-name-generator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gender: selectedGender() })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Could not generate name.");
        }

        const generated = data.name || {};
        if (!generated.amharic || !generated.english) {
            throw new Error("Invalid name response from server.");
        }

        currentName = generated;
        nameAmharicEl.textContent = generated.amharic;
        nameEnglishEl.textContent = generated.english;
        nameAudioEl.removeAttribute("src");
        nameAudioEl.load();
        nameAudioEl.classList.add("hidden");

        audioRequestId += 1;
        const currentRequestId = audioRequestId;
        loadAudioForName(generated.amharic, currentRequestId);

        resultCard.classList.remove("hidden");
    } catch (error) {
        showError(error.message || "Could not generate name.");
    } finally {
        setLoading(false);
    }
}

async function copyCurrentName() {
    if (!currentName) {
        return;
    }

    const text = `${currentName.amharic}\n${currentName.english}`;
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        showError("Could not copy name. Please copy manually.");
    }
}

generateBtn.addEventListener("click", generateName);
generateAgainBtn.addEventListener("click", generateName);
copyBtn.addEventListener("click", copyCurrentName);

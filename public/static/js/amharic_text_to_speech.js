const textArea = document.getElementById("tts-text");
const voiceSelect = document.getElementById("voice-select");
const generateButton = document.getElementById("generate-btn");
const enableKeyboard = document.getElementById("enable-keyboard");
const errorEl = document.getElementById("error");
const audioResult = document.getElementById("audio-result");
const audioPlayer = document.getElementById("audio-player");
const downloadAudio = document.getElementById("download-audio");

let currentAudioUrl = "";

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
}

function hideError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
}

function setLoading(isLoading) {
    generateButton.disabled = isLoading;
    generateButton.textContent = isLoading ? "Generating..." : "Generate";
}

function clearAudioUrl() {
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = "";
    }
}

async function generateSpeech() {
    const text = textArea.value.trim();
    if (!text) {
        showError("Please enter Amharic text first.");
        return;
    }

    hideError();
    setLoading(true);

    try {
        const response = await fetch("/api/amharic-text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                voice: voiceSelect.value
            })
        });

        if (!response.ok) {
            let message = "Audio generation failed.";
            try {
                const errorData = await response.json();
                message = errorData.error || message;
            } catch (error) {
                // Ignore parse failure and keep generic message.
            }
            throw new Error(message);
        }

        const audioBlob = await response.blob();
        clearAudioUrl();
        currentAudioUrl = URL.createObjectURL(audioBlob);

        audioPlayer.src = currentAudioUrl;
        audioPlayer.currentTime = 0;
        audioPlayer.pause();
        downloadAudio.href = currentAudioUrl;
        audioResult.classList.remove("hidden");
    } catch (error) {
        showError(error.message || "Audio generation failed.");
    } finally {
        setLoading(false);
    }
}

// Lightweight behavior: quick link to keyboard tool when user wants keyboard help.
enableKeyboard.addEventListener("change", () => {
    if (enableKeyboard.checked) {
        window.location.href = "/Tools/Free_Amharic_Keyboard";
    }
});

generateButton.addEventListener("click", generateSpeech);
textArea.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        generateSpeech();
    }
});

window.addEventListener("beforeunload", clearAudioUrl);

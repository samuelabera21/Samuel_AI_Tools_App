const longUrlInput = document.getElementById("long-url-input");
const generateBtn = document.getElementById("generate-btn");
const errorEl = document.getElementById("error");
const resultCard = document.getElementById("result-card");
const shortUrlLink = document.getElementById("short-url-link");
const copyBtn = document.getElementById("copy-btn");

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
}

function hideError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
}

function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.textContent = isLoading ? "Generating..." : "Generate";
}

async function generateShortUrl() {
    hideError();

    const longUrl = longUrlInput.value.trim();
    if (!longUrl) {
        showError("Please paste a URL first.");
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/api/amharic-link-shortner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ longUrl })
        });

        const data = await response.json();
        if (!response.ok || !data.shortUrl) {
            throw new Error(data.error || "Could not generate short URL.");
        }

        shortUrlLink.href = data.shortUrl;
        shortUrlLink.textContent = data.shortUrl;
        resultCard.classList.remove("hidden");
    } catch (error) {
        showError(error.message || "Could not generate short URL.");
    } finally {
        setLoading(false);
    }
}

async function copyShortUrl() {
    const value = shortUrlLink.textContent.trim();
    if (!value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
        copyBtn.textContent = "Copied";
        setTimeout(() => {
            copyBtn.textContent = "Copy";
        }, 1100);
    } catch (error) {
        showError("Could not copy short link. Please copy manually.");
    }
}

generateBtn.addEventListener("click", generateShortUrl);
copyBtn.addEventListener("click", copyShortUrl);

longUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        generateShortUrl();
    }
});

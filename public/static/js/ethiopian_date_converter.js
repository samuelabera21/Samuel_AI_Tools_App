const ETHIOPIAN_MONTHS = [
    "1 - መስከረም / Meskerem",
    "2 - ጥቅምት / Tikimit",
    "3 - ኅዳር / Hedar",
    "4 - ታህሳስ / Tahassas",
    "5 - ጥር / Tir",
    "6 - የካቲት / Yekatit",
    "7 - መጋቢት / Megabit",
    "8 - ሚያዝያ / Miyazia",
    "9 - ግንቦት / Ginbot",
    "10 - ሰኔ / Sene",
    "11 - ሐምሌ / Hamle",
    "12 - ነሐሴ / Nehase",
    "13 - ጳጉሜ / Puagme"
];

const GREGORIAN_MONTHS = [
    "1 - January",
    "2 - February",
    "3 - March",
    "4 - April",
    "5 - May",
    "6 - June",
    "7 - July",
    "8 - August",
    "9 - September",
    "10 - October",
    "11 - November",
    "12 - December"
];

const tabDateConverter = document.getElementById("tab-date-converter");
const tabDateCalculator = document.getElementById("tab-date-calculator");
const panelDateConverter = document.getElementById("panel-date-converter");
const panelDateCalculator = document.getElementById("panel-date-calculator");
const errorEl = document.getElementById("converter-error");

const toGregorianMonthEl = document.getElementById("to-gregorian-month");
const toGregorianDayEl = document.getElementById("to-gregorian-day");
const toGregorianYearEl = document.getElementById("to-gregorian-year");
const toGregorianBtn = document.getElementById("to-gregorian-btn");
const toGregorianResult = document.getElementById("to-gregorian-result");
const toGregorianText = document.getElementById("to-gregorian-text");
const toGregorianSpeakBtn = document.getElementById("to-gregorian-speak");
const toGregorianCopyBtn = document.getElementById("to-gregorian-copy");

const toEthiopianMonthEl = document.getElementById("to-ethiopian-month");
const toEthiopianDayEl = document.getElementById("to-ethiopian-day");
const toEthiopianYearEl = document.getElementById("to-ethiopian-year");
const toEthiopianBtn = document.getElementById("to-ethiopian-btn");
const toEthiopianResult = document.getElementById("to-ethiopian-result");
const toEthiopianText = document.getElementById("to-ethiopian-text");
const toEthiopianSpeakBtn = document.getElementById("to-ethiopian-speak");
const toEthiopianCopyBtn = document.getElementById("to-ethiopian-copy");

const calcMonthEl = document.getElementById("calc-month");
const calcDayEl = document.getElementById("calc-day");
const calcYearEl = document.getElementById("calc-year");
const calcOperationEl = document.getElementById("calc-operation");
const calcDaysEl = document.getElementById("calc-days");
const calcMonthsEl = document.getElementById("calc-months");
const calcBtn = document.getElementById("calc-btn");
const calcResult = document.getElementById("calc-result");
const calcEthiopianText = document.getElementById("calc-ethiopian-text");
const calcGregorianText = document.getElementById("calc-gregorian-text");
const calcCopyBtn = document.getElementById("calc-copy");

let lastToGregorianSpeech = { text: "", lang: "en-US" };
let lastToEthiopianSpeech = { text: "", lang: "am-ET" };
let amharicFemaleAudio = null;
let amharicFemaleAudioUrl = "";

function isEthiopianLeapYear(year) {
    return year % 4 === 3;
}

function maxEthiopianDay(year, month) {
    if (month <= 12) {
        return 30;
    }
    return isEthiopianLeapYear(year) ? 6 : 5;
}

function maxGregorianDay(year, month) {
    return new Date(year, month, 0).getDate();
}

function fillSelect(selectEl, values) {
    selectEl.innerHTML = "";
    values.forEach((item) => {
        const option = document.createElement("option");
        option.value = String(item.value);
        option.textContent = item.label;
        selectEl.appendChild(option);
    });
}

function fillNumberSelect(selectEl, start, end) {
    const values = [];
    for (let value = start; value <= end; value += 1) {
        values.push({ value, label: String(value) });
    }
    fillSelect(selectEl, values);
}

function populateEthiopianMonthSelect(selectEl) {
    fillSelect(
        selectEl,
        ETHIOPIAN_MONTHS.map((label, index) => ({ value: index + 1, label }))
    );
}

function populateGregorianMonthSelect(selectEl) {
    fillSelect(
        selectEl,
        GREGORIAN_MONTHS.map((label, index) => ({ value: index + 1, label }))
    );
}

function setSelectValue(selectEl, value) {
    selectEl.value = String(value);
}

function populateEthiopianDaySelect(dayEl, yearEl, monthEl, defaultDay = 1) {
    const year = Number(yearEl.value);
    const month = Number(monthEl.value);
    const maxDay = maxEthiopianDay(year, month);
    fillNumberSelect(dayEl, 1, maxDay);
    setSelectValue(dayEl, Math.min(defaultDay, maxDay));
}

function populateGregorianDaySelect(dayEl, yearEl, monthEl, defaultDay = 1) {
    const year = Number(yearEl.value);
    const month = Number(monthEl.value);
    const maxDay = maxGregorianDay(year, month);
    fillNumberSelect(dayEl, 1, maxDay);
    setSelectValue(dayEl, Math.min(defaultDay, maxDay));
}

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
}

function hideError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
}

function setTab(handler) {
    const isCalculator = handler === "DateCalculator";
    tabDateConverter.classList.toggle("active", !isCalculator);
    tabDateCalculator.classList.toggle("active", isCalculator);
    panelDateConverter.classList.toggle("active", !isCalculator);
    panelDateCalculator.classList.toggle("active", isCalculator);

    const url = new URL(window.location.href);
    if (handler === "ToGregorian") {
        url.searchParams.delete("handler");
    } else {
        url.searchParams.set("handler", handler);
    }
    window.history.replaceState({}, "", url.toString());
}

function speakText(payload) {
    if (!payload || !payload.text) {
        return;
    }

    if (!("speechSynthesis" in window)) {
        showError("Speech is not supported in this browser.");
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(payload.text);
    utterance.lang = payload.lang || "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
}

async function speakAmharicFemale(text) {
    if (!text) {
        return;
    }

    try {
        const response = await fetch("/api/amharic-text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice: "female" })
        });

        if (!response.ok) {
            let message = "Could not generate Amharic female voice.";
            try {
                const payload = await response.json();
                if (payload && payload.error) {
                    message = String(payload.error);
                }
            } catch (error) {
                // Keep default message when JSON error payload is unavailable.
            }
            throw new Error(message);
        }

        const audioBlob = await response.blob();
        if (amharicFemaleAudioUrl) {
            URL.revokeObjectURL(amharicFemaleAudioUrl);
            amharicFemaleAudioUrl = "";
        }

        amharicFemaleAudioUrl = URL.createObjectURL(audioBlob);
        if (!amharicFemaleAudio) {
            amharicFemaleAudio = new Audio();
        }

        amharicFemaleAudio.pause();
        amharicFemaleAudio.src = amharicFemaleAudioUrl;
        amharicFemaleAudio.currentTime = 0;
        await amharicFemaleAudio.play();
    } catch (error) {
        // Fall back to browser speech if backend TTS is unavailable.
        speakText({ text, lang: "am-ET" });
        const message = error instanceof Error ? error.message : "Could not generate Amharic female voice.";
        showError(`${message} Using browser speech fallback.`);
    }
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

function setButtonLoading(button, isLoading, loadingText, defaultText) {
    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : defaultText;
}

async function convertToGregorian() {
    hideError();
    setButtonLoading(toGregorianBtn, true, "Converting...", "Convert");

    try {
        const response = await fetch("/api/ethiopian-date/to-gregorian", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                year: Number(toGregorianYearEl.value),
                month: Number(toGregorianMonthEl.value),
                day: Number(toGregorianDayEl.value)
            })
        });

        const data = await response.json();
        if (!response.ok || !data.displayText) {
            throw new Error(data.error || "Could not convert Ethiopian date.");
        }

        toGregorianText.textContent = data.displayText;
        toGregorianResult.classList.remove("hidden");
        lastToGregorianSpeech = {
            text: String(data.speechText || data.displayText),
            lang: String(data.speechLang || "en-US")
        };
    } catch (error) {
        showError(error.message || "Could not convert Ethiopian date.");
    } finally {
        setButtonLoading(toGregorianBtn, false, "Converting...", "Convert");
    }
}

async function convertToEthiopian() {
    hideError();
    setButtonLoading(toEthiopianBtn, true, "Converting...", "Convert");

    try {
        const response = await fetch("/api/ethiopian-date/to-ethiopian", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                year: Number(toEthiopianYearEl.value),
                month: Number(toEthiopianMonthEl.value),
                day: Number(toEthiopianDayEl.value)
            })
        });

        const data = await response.json();
        if (!response.ok || !data.displayText) {
            throw new Error(data.error || "Could not convert Gregorian date.");
        }

        toEthiopianText.textContent = data.displayText;
        toEthiopianResult.classList.remove("hidden");
        lastToEthiopianSpeech = {
            text: String(data.speechText || data.displayText),
            lang: String(data.speechLang || "am-ET")
        };
    } catch (error) {
        showError(error.message || "Could not convert Gregorian date.");
    } finally {
        setButtonLoading(toEthiopianBtn, false, "Converting...", "Convert");
    }
}

async function runCalculator() {
    hideError();
    setButtonLoading(calcBtn, true, "Calculating...", "Calculate");

    try {
        const response = await fetch("/api/ethiopian-date/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                year: Number(calcYearEl.value),
                month: Number(calcMonthEl.value),
                day: Number(calcDayEl.value),
                operation: calcOperationEl.value,
                days: Number(calcDaysEl.value || 0),
                months: Number(calcMonthsEl.value || 0)
            })
        });

        const data = await response.json();
        if (!response.ok || !data.ethiopianDisplayText || !data.gregorianDisplayText) {
            throw new Error(data.error || "Could not calculate date.");
        }

        calcEthiopianText.textContent = data.ethiopianDisplayText;
        calcGregorianText.textContent = data.gregorianDisplayText;
        calcResult.classList.remove("hidden");
    } catch (error) {
        showError(error.message || "Could not calculate date.");
    } finally {
        setButtonLoading(calcBtn, false, "Calculating...", "Calculate");
    }
}

function setupDefaults() {
    populateEthiopianMonthSelect(toGregorianMonthEl);
    fillNumberSelect(toGregorianYearEl, 1900, 2300);
    setSelectValue(toGregorianYearEl, 2018);
    setSelectValue(toGregorianMonthEl, 6);
    populateEthiopianDaySelect(toGregorianDayEl, toGregorianYearEl, toGregorianMonthEl, 27);

    populateGregorianMonthSelect(toEthiopianMonthEl);
    fillNumberSelect(toEthiopianYearEl, 1900, 2300);
    setSelectValue(toEthiopianYearEl, 2026);
    setSelectValue(toEthiopianMonthEl, 3);
    populateGregorianDaySelect(toEthiopianDayEl, toEthiopianYearEl, toEthiopianMonthEl, 6);

    populateEthiopianMonthSelect(calcMonthEl);
    fillNumberSelect(calcYearEl, 1900, 2300);
    setSelectValue(calcYearEl, 2018);
    setSelectValue(calcMonthEl, 6);
    populateEthiopianDaySelect(calcDayEl, calcYearEl, calcMonthEl, 27);

    calcDaysEl.value = "0";
    calcMonthsEl.value = "0";
}

function setupDayRefreshHandlers() {
    toGregorianMonthEl.addEventListener("change", () => {
        populateEthiopianDaySelect(toGregorianDayEl, toGregorianYearEl, toGregorianMonthEl, Number(toGregorianDayEl.value || 1));
    });
    toGregorianYearEl.addEventListener("change", () => {
        populateEthiopianDaySelect(toGregorianDayEl, toGregorianYearEl, toGregorianMonthEl, Number(toGregorianDayEl.value || 1));
    });

    toEthiopianMonthEl.addEventListener("change", () => {
        populateGregorianDaySelect(toEthiopianDayEl, toEthiopianYearEl, toEthiopianMonthEl, Number(toEthiopianDayEl.value || 1));
    });
    toEthiopianYearEl.addEventListener("change", () => {
        populateGregorianDaySelect(toEthiopianDayEl, toEthiopianYearEl, toEthiopianMonthEl, Number(toEthiopianDayEl.value || 1));
    });

    calcMonthEl.addEventListener("change", () => {
        populateEthiopianDaySelect(calcDayEl, calcYearEl, calcMonthEl, Number(calcDayEl.value || 1));
    });
    calcYearEl.addEventListener("change", () => {
        populateEthiopianDaySelect(calcDayEl, calcYearEl, calcMonthEl, Number(calcDayEl.value || 1));
    });
}

function setupActions() {
    tabDateConverter.addEventListener("click", () => setTab("ToGregorian"));
    tabDateCalculator.addEventListener("click", () => setTab("DateCalculator"));

    toGregorianBtn.addEventListener("click", convertToGregorian);
    toEthiopianBtn.addEventListener("click", convertToEthiopian);
    calcBtn.addEventListener("click", runCalculator);

    toGregorianSpeakBtn.addEventListener("click", () => speakText(lastToGregorianSpeech));
    toEthiopianSpeakBtn.addEventListener("click", () => speakAmharicFemale(lastToEthiopianSpeech.text));

    toGregorianCopyBtn.addEventListener("click", () => copyText(toGregorianText.textContent.trim()));
    toEthiopianCopyBtn.addEventListener("click", () => copyText(toEthiopianText.textContent.trim()));

    calcCopyBtn.addEventListener("click", () => {
        const joined = `${calcEthiopianText.textContent.trim()}\n${calcGregorianText.textContent.trim()}`.trim();
        copyText(joined);
    });
}

function applyInitialHandler() {
    const params = new URLSearchParams(window.location.search);
    const handler = params.get("handler");

    if (handler === "DateCalculator") {
        setTab("DateCalculator");
        return;
    }

    if (handler === "ToEthiopian") {
        setTab("ToGregorian");
        setTimeout(() => {
            convertToEthiopian();
        }, 20);
        return;
    }

    if (handler === "ToGregorian") {
        setTab("ToGregorian");
        setTimeout(() => {
            convertToGregorian();
        }, 20);
        return;
    }

    setTab("ToGregorian");
}

setupDefaults();
setupDayRefreshHandlers();
setupActions();
applyInitialHandler();

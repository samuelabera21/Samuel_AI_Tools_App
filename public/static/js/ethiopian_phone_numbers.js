(function () {
  const phoneForm = document.getElementById("phone-form");
  const phoneInput = document.getElementById("phone-input");
  const errorNode = document.getElementById("phone-error");
  const resultPanel = document.getElementById("result-panel");
  const copyButton = document.getElementById("copy-btn");
  const shortCodeGroups = document.getElementById("short-code-groups");

  const shortCodesByCategory = {
    "Banks": [
      { code: "8335", service: "Commercial Bank of Ethiopia" },
      { code: "609", service: "Dashen Bank" },
      { code: "945", service: "Awash Bank" }
    ],
    "Emergency Services": [
      { code: "939", service: "Fire Department" },
      { code: "991", service: "Police" },
      { code: "907", service: "Red Cross (Ambulance)" }
    ],
    "Telecom": [
      { code: "994", service: "Ethio Telecom Customer Care" },
      { code: "980", service: "Ethio Telecom Information" },
      { code: "952", service: "Ethio Telecom Recharge Service" }
    ],
    "Utilities": [
      { code: "940", service: "Ethiopian Electric Utility" },
      { code: "939", service: "Emergency Fire Line" },
      { code: "983", service: "Addis Water and Sewerage" }
    ]
  };

  function renderShortCodeAccordions() {
    const categories = Object.keys(shortCodesByCategory);
    shortCodeGroups.innerHTML = categories
      .map((category, index) => {
        const rows = shortCodesByCategory[category]
          .map((row) => `<tr><td>${row.code}</td><td>${row.service}</td></tr>`)
          .join("");

        return `
          <details class="accordion" ${index === 1 ? "open" : ""}>
            <summary>
              <span>${category}</span>
              <span class="chevron">&#9662;</span>
            </summary>
            <div class="accordion-body">
              <table class="short-table">
                <thead>
                  <tr>
                    <th>Short Code</th>
                    <th>Service Description</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </details>
        `;
      })
      .join("");
  }

  function normalizeInput(raw) {
    return raw.replace(/[^\d+]/g, "").trim();
  }

  function getDisplayLineType(phone) {
    const phoneType = phone.getType();

    if (phoneType === "MOBILE") {
      return "Mobile";
    }

    if (phoneType === "FIXED_LINE") {
      return "Landline";
    }

    if (phoneType === "FIXED_LINE_OR_MOBILE") {
      return "Mobile / Landline";
    }

    return "Unknown";
  }

  function getAreaCode(phone) {
    const e164Digits = phone.number.replace("+", "");
    const localDigits = e164Digits.startsWith("251") ? e164Digits.slice(3) : e164Digits;

    if (localDigits.length < 2) {
      return "-";
    }

    return localDigits.slice(0, 2);
  }

  function getCallingFormats(phone) {
    const internationalBody = phone.formatInternational().replace("+", "");
    const localDigits = phone.number.replace("+251", "");
    const localWithZero = localDigits.startsWith("0") ? localDigits : `0${localDigits}`;

    return {
      ethiopia: localWithZero,
      usa: `011 ${internationalBody}`,
      uk: `00 ${internationalBody}`,
      uae: `00 ${internationalBody}`,
      china: `00 ${internationalBody}`
    };
  }

  function fillResult(phone) {
    const calling = getCallingFormats(phone);

    document.getElementById("line-type").textContent = getDisplayLineType(phone);
    document.getElementById("carrier").textContent = "Ethio Telecom";

    document.getElementById("country").textContent = "Ethiopia";
    document.getElementById("region").textContent = "Countrywide";
    document.getElementById("timezone").textContent = "East Africa Time (EAT) (UTC+03:00)";

    document.getElementById("country-code").textContent = phone.countryCallingCode;
    document.getElementById("area-code").textContent = `0${getAreaCode(phone)}`;
    document.getElementById("national-format").textContent = phone.formatNational();
    document.getElementById("international-format").textContent = phone.formatInternational();
    document.getElementById("e164-format").textContent = phone.number;

    document.getElementById("call-et").textContent = calling.ethiopia;
    document.getElementById("call-us").textContent = calling.usa;
    document.getElementById("call-uk").textContent = calling.uk;
    document.getElementById("call-uae").textContent = calling.uae;
    document.getElementById("call-cn").textContent = calling.china;
  }

  function buildCopyText() {
    return [
      "Phone Number Information",
      `Line Type: ${document.getElementById("line-type").textContent}`,
      `Carrier: ${document.getElementById("carrier").textContent}`,
      `Country: ${document.getElementById("country").textContent}`,
      `Site/Region: ${document.getElementById("region").textContent}`,
      `Timezone: ${document.getElementById("timezone").textContent}`,
      `Country Code: ${document.getElementById("country-code").textContent}`,
      `Area Code: ${document.getElementById("area-code").textContent}`,
      `National Format: ${document.getElementById("national-format").textContent}`,
      `International Format: ${document.getElementById("international-format").textContent}`,
      `E.164 Format: ${document.getElementById("e164-format").textContent}`,
      `From Ethiopia: ${document.getElementById("call-et").textContent}`,
      `From USA: ${document.getElementById("call-us").textContent}`,
      `From UK: ${document.getElementById("call-uk").textContent}`,
      `From UAE: ${document.getElementById("call-uae").textContent}`,
      `From China: ${document.getElementById("call-cn").textContent}`
    ].join("\n");
  }

  function showError(message) {
    errorNode.textContent = message;
    resultPanel.classList.add("hidden");
  }

  function clearError() {
    errorNode.textContent = "";
  }

  phoneForm.addEventListener("submit", function (event) {
    event.preventDefault();

    clearError();

    const normalized = normalizeInput(phoneInput.value);
    if (!normalized) {
      showError("Please enter a phone number.");
      return;
    }

    const phone = window.libphonenumber.parsePhoneNumberFromString(normalized, "ET");

    if (!phone || !phone.isValid() || phone.country !== "ET") {
      showError("Please enter a valid Ethiopian phone number.");
      return;
    }

    fillResult(phone);
    resultPanel.classList.remove("hidden");
  });

  copyButton.addEventListener("click", async function () {
    if (resultPanel.classList.contains("hidden")) {
      return;
    }

    try {
      await navigator.clipboard.writeText(buildCopyText());
      copyButton.classList.add("copied");
      setTimeout(function () {
        copyButton.classList.remove("copied");
      }, 1500);
    } catch (error) {
      errorNode.textContent = "Copy failed. Please try again.";
    }
  });

  renderShortCodeAccordions();
})();

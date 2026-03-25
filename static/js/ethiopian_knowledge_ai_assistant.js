const ingestForm = document.getElementById("ingest-form");
const askForm = document.getElementById("ask-form");
const statusEl = document.getElementById("ingest-status");
const sourcesEl = document.getElementById("sources");
const questionInput = document.getElementById("question");
const chatLog = document.getElementById("chat-log");
const sourcesDetails = document.getElementById("sources-details");
const toggleIngestBtn = document.getElementById("toggle-ingest");
const ingestDrawer = document.getElementById("ingest-drawer");

function appendMessage(text, role) {
  if (!chatLog) {
    return;
  }

  const msg = document.createElement("article");
  msg.className = `chat-msg ${role}`;
  msg.textContent = text;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function setIngestDrawer(open) {
  if (!ingestDrawer || !toggleIngestBtn) {
    return;
  }

  ingestDrawer.hidden = !open;
  toggleIngestBtn.setAttribute("aria-expanded", String(open));
}

toggleIngestBtn?.addEventListener("click", () => {
  const isOpen = !ingestDrawer.hidden;
  setIngestDrawer(!isOpen);
});

function renderSources(sources) {
  if (!sourcesEl || !sourcesDetails) {
    return;
  }

  sourcesEl.innerHTML = "";

  if (!Array.isArray(sources) || sources.length === 0) {
    sourcesDetails.hidden = true;
    sourcesDetails.open = false;
    return;
  }

  sourcesDetails.hidden = false;
  sourcesDetails.open = false;

  for (const source of sources) {
    const box = document.createElement("div");
    box.className = "source-item";

    const title = document.createElement("h4");
    title.textContent = source.source || "Unknown source";

    const snippet = document.createElement("p");
    snippet.textContent = source.snippet || "";

    box.appendChild(title);
    box.appendChild(snippet);
    sourcesEl.appendChild(box);
  }
}

ingestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Indexing knowledge base...";

  const formData = new FormData(ingestForm);

  try {
    const response = await fetch("/api/ethiopian-knowledge/ingest", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      statusEl.textContent = payload.error || "Ingestion failed.";
      appendMessage(statusEl.textContent, "assistant");
      return;
    }

    statusEl.textContent = `Indexed ${payload.chunksIndexed} chunks from ${payload.documentsLoaded} documents.`;
    appendMessage("Knowledge sources indexed successfully. You can ask questions now.", "assistant");
    setIngestDrawer(false);
  } catch (error) {
    statusEl.textContent = "Network error during ingestion.";
    appendMessage(statusEl.textContent, "assistant");
  }
});

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  if (!question) {
    return;
  }

  appendMessage(question, "user");
  questionInput.value = "";

  const loadingMessage = document.createElement("article");
  loadingMessage.className = "chat-msg assistant";
  loadingMessage.textContent = "Thinking...";
  chatLog.appendChild(loadingMessage);
  chatLog.scrollTop = chatLog.scrollHeight;

  renderSources([]);

  try {
    const response = await fetch("/api/ethiopian-knowledge/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const payload = await response.json();
    if (!response.ok) {
      loadingMessage.textContent = payload.error || "Failed to generate answer.";
      return;
    }

    loadingMessage.textContent = payload.answer || "No answer generated.";
    renderSources(payload.sources);
  } catch (error) {
    loadingMessage.textContent = "Network error while requesting answer.";
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    questionInput.value = chip.getAttribute("data-q") || "";
    questionInput.focus();
  });
});

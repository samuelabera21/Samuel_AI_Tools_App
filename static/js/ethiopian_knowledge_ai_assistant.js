const ingestForm = document.getElementById("ingest-form");
const askForm = document.getElementById("ask-form");
const statusEl = document.getElementById("ingest-status");
const answerEl = document.getElementById("answer");
const sourcesEl = document.getElementById("sources");
const questionInput = document.getElementById("question");

function renderSources(sources) {
  sourcesEl.innerHTML = "";

  if (!Array.isArray(sources) || sources.length === 0) {
    sourcesEl.textContent = "No source snippets returned.";
    return;
  }

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
      return;
    }

    statusEl.textContent = `Indexed ${payload.chunksIndexed} chunks from ${payload.documentsLoaded} documents.`;
  } catch (error) {
    statusEl.textContent = "Network error during ingestion.";
  }
});

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();
  if (!question) {
    return;
  }

  answerEl.textContent = "Generating answer...";
  sourcesEl.textContent = "";

  try {
    const response = await fetch("/api/ethiopian-knowledge/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const payload = await response.json();
    if (!response.ok) {
      answerEl.textContent = payload.error || "Failed to generate answer.";
      return;
    }

    answerEl.textContent = payload.answer || "No answer generated.";
    renderSources(payload.sources);
  } catch (error) {
    answerEl.textContent = "Network error while requesting answer.";
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    questionInput.value = chip.getAttribute("data-q") || "";
    questionInput.focus();
  });
});

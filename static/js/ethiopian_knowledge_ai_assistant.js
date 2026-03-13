const ingestForm = document.getElementById("ingest-form");
const askForm = document.getElementById("ask-form");
const statusEl = document.getElementById("ingest-status");
const answerEl = document.getElementById("answer");
const sourcesEl = document.getElementById("sources");
const questionInput = document.getElementById("question");

function initNetworkBackground() {
  const canvas = document.getElementById("ai-network");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const points = [];
  const pointCount = 72;
  const maxDistance = 130;
  let width = 0;
  let height = 0;
  let rafId = null;

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  function seedPoints() {
    points.length = 0;
    for (let i = 0; i < pointCount; i += 1) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: 1.4 + Math.random() * 1.9,
      });
    }
  }

  function drawFrame() {
    context.clearRect(0, 0, width, height);

    for (const point of points) {
      point.x += point.vx;
      point.y += point.vy;

      if (point.x <= 0 || point.x >= width) {
        point.vx *= -1;
      }
      if (point.y <= 0 || point.y >= height) {
        point.vy *= -1;
      }
    }

    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
          continue;
        }

        const alpha = (1 - distance / maxDistance) * 0.32;
        context.strokeStyle = `rgba(112, 170, 255, ${alpha})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }

    for (const point of points) {
      context.fillStyle = "rgba(148, 197, 255, 0.85)";
      context.beginPath();
      context.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      context.fill();
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  resizeCanvas();
  seedPoints();
  drawFrame();

  window.addEventListener("resize", () => {
    resizeCanvas();
    seedPoints();
  });

  window.addEventListener("beforeunload", () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  });
}

initNetworkBackground();

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

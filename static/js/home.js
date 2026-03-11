(function () {
  const canvas = document.getElementById("ai-network");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    mouse: {
      x: -9999,
      y: -9999,
      active: false,
    },
    config: {
      speedMin: 0.3,
      speedMax: 0.6,
      connectionDistance: 130,
      particleRadiusMin: 2,
      particleRadiusMax: 4,
      maxParticlesDesktop: 95,
      maxParticlesMobile: 55,
    },
  };

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function particleCount() {
    const isMobile = window.innerWidth <= 768;
    const base = isMobile
      ? state.config.maxParticlesMobile
      : state.config.maxParticlesDesktop;
    const densityScale = Math.min(window.innerWidth / 1440, 1.15);
    return Math.max(30, Math.floor(base * densityScale));
  }

  function createParticle() {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(state.config.speedMin, state.config.speedMax);

    return {
      x: rand(0, state.width),
      y: rand(0, state.height),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rand(state.config.particleRadiusMin, state.config.particleRadiusMax),
      phase: rand(0, Math.PI * 2),
    };
  }

  function setup() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;

    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = state.width + "px";
    canvas.style.height = state.height + "px";

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.particles = [];
    for (let i = 0; i < particleCount(); i += 1) {
      state.particles.push(createParticle());
    }
  }

  function updateParticles(time) {
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      if (p.x <= 0 || p.x >= state.width) {
        p.vx *= -1;
      }

      if (p.y <= 0 || p.y >= state.height) {
        p.vy *= -1;
      }

      if (state.mouse.active) {
        const dx = state.mouse.x - p.x;
        const dy = state.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 0.1) {
          const force = (160 - dist) / 160;
          p.x -= (dx / dist) * force * 0.45;
          p.y -= (dy / dist) * force * 0.45;
        }
      }

      const flicker = 0.65 + Math.sin(time * 0.0012 + p.phase) * 0.2;
      p.alpha = Math.max(0.25, Math.min(1, flicker));
    }
  }

  function drawParticles() {
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120,180,255," + p.alpha.toFixed(3) + ")";
      ctx.shadowColor = "rgba(120,180,255,0.95)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawConnections() {
    const maxDist = state.config.connectionDistance;

    for (let i = 0; i < state.particles.length; i += 1) {
      for (let j = i + 1; j < state.particles.length; j += 1) {
        const a = state.particles[i];
        const b = state.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= maxDist) {
          const fade = 1 - dist / maxDist;
          const alpha = (0.2 * fade).toFixed(3);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(80,150,255," + alpha + ")";
          ctx.stroke();
        }
      }
    }

    if (state.mouse.active) {
      for (let i = 0; i < state.particles.length; i += 1) {
        const p = state.particles[i];
        const dx = state.mouse.x - p.x;
        const dy = state.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          const fade = 1 - dist / 150;
          const alpha = (0.24 * fade).toFixed(3);
          ctx.beginPath();
          ctx.moveTo(state.mouse.x, state.mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(120,180,255," + alpha + ")";
          ctx.stroke();
        }
      }
    }
  }

  function render(time) {
    ctx.clearRect(0, 0, state.width, state.height);
    updateParticles(time);
    drawConnections();
    drawParticles();
    window.requestAnimationFrame(render);
  }

  function setMousePosition(event) {
    state.mouse.x = event.clientX;
    state.mouse.y = event.clientY;
    state.mouse.active = true;
  }

  window.addEventListener("mousemove", setMousePosition);
  window.addEventListener("touchstart", function (event) {
    if (event.touches.length > 0) {
      setMousePosition(event.touches[0]);
    }
  }, { passive: true });

  window.addEventListener("touchmove", function (event) {
    if (event.touches.length > 0) {
      setMousePosition(event.touches[0]);
    }
  }, { passive: true });

  window.addEventListener("mouseleave", function () {
    state.mouse.active = false;
  });

  window.addEventListener("touchend", function () {
    state.mouse.active = false;
  }, { passive: true });

  window.addEventListener("resize", setup);

  setup();
  window.requestAnimationFrame(render);
})();

(function () {
  const launcher = document.getElementById("chatbot-launcher");
  const toggleBtn = document.getElementById("chatbot-toggle");
  const closeBtn = document.getElementById("chatbot-close");
  const panel = document.getElementById("chatbot-panel");
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-input");
  const messages = document.getElementById("chatbot-messages");

  if (!launcher || !toggleBtn || !closeBtn || !panel || !form || !input || !messages) {
    return;
  }

  function addMessage(role, text) {
    const message = document.createElement("article");
    message.className = "chatbot-msg " + role;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function setOpen(isOpen) {
    if (isOpen) {
      panel.removeAttribute("hidden");
      launcher.setAttribute("hidden", "hidden");
    } else {
      panel.setAttribute("hidden", "hidden");
      launcher.removeAttribute("hidden");
    }

    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      input.focus();
    }
  }

  toggleBtn.addEventListener("click", function () {
    setOpen(panel.hidden);
  });

  closeBtn.addEventListener("click", function () {
    setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const question = input.value.trim();
    if (!question) {
      return;
    }

    addMessage("user", question);
    input.value = "";

    const waitingMsg = document.createElement("article");
    waitingMsg.className = "chatbot-msg bot";
    waitingMsg.textContent = "Thinking...";
    messages.appendChild(waitingMsg);
    messages.scrollTop = messages.scrollHeight;

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(function () {
        controller.abort();
      }, 30000);

      const response = await fetch("/api/home-chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question }),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      const payload = await response.json();
      waitingMsg.remove();

      if (!response.ok) {
        addMessage("bot", payload.error || "Unable to answer right now.");
        return;
      }

      addMessage("bot", payload.answer || "No answer generated.");
    } catch (error) {
      waitingMsg.remove();
      if (error && error.name === "AbortError") {
        addMessage("bot", "The response took too long. Please try a shorter question.");
      } else {
        addMessage("bot", "Network error. Please try again.");
      }
    }
  });

  panel.setAttribute("hidden", "hidden");
  launcher.removeAttribute("hidden");
  setOpen(false);
})();

(function () {
  const viewport = document.getElementById("tools-viewport");
  const prevBtn = document.getElementById("tools-prev");
  const nextBtn = document.getElementById("tools-next");
  const dotsHost = document.getElementById("tools-dots");

  if (!viewport || !prevBtn || !nextBtn || !dotsHost) {
    return;
  }

  let pageCount = 1;
  let currentPage = 0;
  let autoplayId = null;

  function maxScroll() {
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  }

  function pageWidth() {
    return Math.max(1, viewport.clientWidth);
  }

  function setPage(pageIndex) {
    const bounded = Math.max(0, Math.min(pageCount - 1, pageIndex));
    viewport.scrollTo({
      left: bounded * pageWidth(),
      behavior: "smooth",
    });
  }

  function syncActiveDot() {
    const width = pageWidth();
    currentPage = Math.round(viewport.scrollLeft / width);
    currentPage = Math.max(0, Math.min(pageCount - 1, currentPage));

    const dots = dotsHost.querySelectorAll(".tools-dot");
    for (let i = 0; i < dots.length; i += 1) {
      dots[i].classList.toggle("active", i === currentPage);
    }
  }

  function rebuildDots() {
    const width = pageWidth();
    pageCount = Math.max(1, Math.ceil((maxScroll() + width) / width));

    dotsHost.innerHTML = "";
    for (let i = 0; i < pageCount; i += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "tools-dot";
      dot.setAttribute("aria-label", "Go to tools page " + (i + 1));
      dot.addEventListener("click", function () {
        setPage(i);
      });
      dotsHost.appendChild(dot);
    }

    syncActiveDot();
  }

  function stopAutoplay() {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayId = window.setInterval(function () {
      if (pageCount <= 1) {
        return;
      }

      const nextPage = currentPage + 1 >= pageCount ? 0 : currentPage + 1;
      setPage(nextPage);
    }, 4200);
  }

  prevBtn.addEventListener("click", function () {
    setPage(currentPage - 1);
  });

  nextBtn.addEventListener("click", function () {
    setPage(currentPage + 1 >= pageCount ? 0 : currentPage + 1);
  });

  viewport.addEventListener("scroll", syncActiveDot, { passive: true });
  viewport.addEventListener("mouseenter", stopAutoplay);
  viewport.addEventListener("mouseleave", startAutoplay);
  viewport.addEventListener("touchstart", stopAutoplay, { passive: true });
  viewport.addEventListener("touchend", startAutoplay, { passive: true });

  window.addEventListener("resize", function () {
    rebuildDots();
    setPage(currentPage);
  });

  rebuildDots();
  startAutoplay();
})();

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

// Mobile navigation drawer toggle & dropdown handler
(function () {
  const menuToggle = document.getElementById("mobile-nav-toggle");
  const menu = document.getElementById("hero-menu");
  const nav = document.getElementById("main-nav");

  if (menuToggle && menu) {
    function setMenuOpen(isOpen) {
      menu.classList.toggle("is-open", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    }

    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = menu.classList.contains("is-open");
      setMenuOpen(!isOpen);
    });

    // Handle dropdowns on mobile devices (click to open submenus)
    const dropdownBtns = menu.querySelectorAll(".hero-drop-btn");
    dropdownBtns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        if (window.innerWidth <= 880) {
          e.preventDefault();
          e.stopPropagation();
          const dropdown = btn.closest(".hero-dropdown");
          if (!dropdown) return;
          const isOpen = dropdown.classList.contains("is-open");
          
          // Close other dropdowns
          menu.querySelectorAll(".hero-dropdown").forEach(function (d) {
            if (d !== dropdown) {
              d.classList.remove("is-open");
              const b = d.querySelector(".hero-drop-btn");
              if (b) b.setAttribute("aria-expanded", "false");
            }
          });

          dropdown.classList.toggle("is-open", !isOpen);
          btn.setAttribute("aria-expanded", String(!isOpen));
        }
      });
    });

    // Close menu on link click
    if (nav) {
      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          if (window.innerWidth <= 880) {
            setMenuOpen(false);
          }
        });
      });
    }

    // Close menu when clicking outside
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("is-open") && !menu.contains(e.target) && !menuToggle.contains(e.target)) {
        setMenuOpen(false);
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setMenuOpen(false);
      }
    });
  }
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
  function initCopyPopover(config) {
    const trigger = document.getElementById(config.triggerId);
    const popover = document.getElementById(config.popoverId);
    const copyBtn = document.getElementById(config.copyBtnId);
    const valueText = popover ? popover.querySelector(".home-copy-value") : null;
    const defaultCopyLabel = copyBtn ? copyBtn.textContent : "Copy";
    let autoCloseTimer = null;

    if (!trigger || !popover || !copyBtn || !valueText) {
      return;
    }

    function isOpen() {
      return popover.classList.contains("is-open");
    }

    function setOpen(openState) {
      if (autoCloseTimer) {
        window.clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
      }

      popover.classList.toggle("is-open", openState);
      popover.setAttribute("aria-hidden", String(!openState));
      trigger.setAttribute("aria-expanded", String(openState));

      if (openState) {
        autoCloseTimer = window.setTimeout(function () {
          setOpen(false);
        }, 3000);
      }
    }

    async function copyValue() {
      const value = valueText.textContent ? valueText.textContent.trim() : "";
      if (!value) {
        copyBtn.textContent = "Unavailable";
        window.setTimeout(function () {
          copyBtn.textContent = defaultCopyLabel;
        }, 1200);
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        copyBtn.textContent = "Copied";
      } catch (error) {
        copyBtn.textContent = "Failed";
      }

      window.setTimeout(function () {
        copyBtn.textContent = defaultCopyLabel;
        setOpen(false);
      }, 900);
    }

    trigger.addEventListener("click", function () {
      setOpen(!isOpen());
      copyBtn.textContent = defaultCopyLabel;
    });

    copyBtn.addEventListener("click", copyValue);

    document.addEventListener("click", function (event) {
      if (isOpen() && !popover.contains(event.target) && !trigger.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  }

  initCopyPopover({
    triggerId: "home-email-trigger",
    popoverId: "home-email-popover",
    copyBtnId: "home-email-copy",
  });

  initCopyPopover({
    triggerId: "home-phone-trigger",
    popoverId: "home-phone-popover",
    copyBtnId: "home-phone-copy",
  });
})();

(function () {
  function initProjectCarousel(sectionId, progressId, options) {
    const story = document.getElementById(sectionId);
    const progressHost = document.getElementById(progressId);
    if (!story || !progressHost) {
      return;
    }

    const settings = Object.assign({
      lockWheelToSlides: false,
    }, options || {});

    const sticky = story.querySelector(".tools-story-sticky");
    const scenes = Array.from(story.querySelectorAll(".tool-scene"));
    if (scenes.length === 0) {
      return;
    }

    let activeIndex = 0;
    let autoPlayTimer = null;
    let touchStartX = null;
    let lastWheelChangeAt = 0;
    const autoPlayDelay = 4500;
    const wheelCooldown = 420;

    if (!sticky) {
      return;
    }

    function normalize(index) {
      const length = scenes.length;
      return ((index % length) + length) % length;
    }

    function signedDistance(index) {
      const raw = index - activeIndex;
      const half = Math.floor(scenes.length / 2);

      if (raw > half) {
        return raw - scenes.length;
      }

      if (raw < -half) {
        return raw + scenes.length;
      }

      return raw;
    }

    function setScene(index) {
      activeIndex = normalize(index);

      for (let i = 0; i < scenes.length; i += 1) {
        const scene = scenes[i];
        const distance = signedDistance(i);

        scene.classList.remove("is-active", "is-prev", "is-next", "is-far-left", "is-far-right");

        if (distance === 0) {
          scene.classList.add("is-active");
        } else if (distance === -1) {
          scene.classList.add("is-prev");
        } else if (distance === 1) {
          scene.classList.add("is-next");
        } else if (distance < 0) {
          scene.classList.add("is-far-left");
        } else {
          scene.classList.add("is-far-right");
        }
      }

      const dots = progressHost.querySelectorAll(".tools-story-dot");
      for (let i = 0; i < dots.length; i += 1) {
        dots[i].classList.toggle("is-active", i === activeIndex);
      }
    }

    function buildProgress() {
      progressHost.innerHTML = "";
      for (let i = 0; i < scenes.length; i += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "tools-story-dot";
        dot.setAttribute("aria-label", "Go to slide " + (i + 1));
        dot.addEventListener("click", function () {
          setScene(i);
          restartAutoPlay();
        });
        progressHost.appendChild(dot);
      }
    }

    function buildControls() {
      if (scenes.length <= 1 || sticky.querySelector(".tools-story-arrow")) {
        return;
      }

      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "tools-story-arrow prev";
      prevBtn.setAttribute("aria-label", "Previous slide");
      prevBtn.innerHTML = "&#10094;";

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "tools-story-arrow next";
      nextBtn.setAttribute("aria-label", "Next slide");
      nextBtn.innerHTML = "&#10095;";

      prevBtn.addEventListener("click", function () {
        setScene(activeIndex - 1);
        restartAutoPlay();
      });

      nextBtn.addEventListener("click", function () {
        setScene(activeIndex + 1);
        restartAutoPlay();
      });

      sticky.appendChild(prevBtn);
      sticky.appendChild(nextBtn);
    }

    function stopAutoPlay() {
      if (autoPlayTimer !== null) {
        window.clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    function startAutoPlay() {
      stopAutoPlay();
      if (scenes.length <= 1) {
        return;
      }

      autoPlayTimer = window.setInterval(function () {
        setScene(activeIndex + 1);
      }, autoPlayDelay);
    }

    function restartAutoPlay() {
      startAutoPlay();
    }

    function bindTouchSwipe() {
      sticky.addEventListener("touchstart", function (event) {
        if (event.touches.length === 1) {
          touchStartX = event.touches[0].clientX;
        }
      }, { passive: true });

      sticky.addEventListener("touchend", function (event) {
        if (touchStartX === null || event.changedTouches.length === 0) {
          return;
        }

        const delta = touchStartX - event.changedTouches[0].clientX;
        touchStartX = null;

        if (Math.abs(delta) < 45) {
          return;
        }

        setScene(activeIndex + (delta > 0 ? 1 : -1));
        restartAutoPlay();
      }, { passive: true });
    }

    function bindHoverPause() {
      sticky.addEventListener("mouseenter", stopAutoPlay);
      sticky.addEventListener("mouseleave", startAutoPlay);
      sticky.addEventListener("focusin", stopAutoPlay);
      sticky.addEventListener("focusout", startAutoPlay);
    }

    function bindKeyboard() {
      story.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          setScene(activeIndex - 1);
          restartAutoPlay();
        } else if (event.key === "ArrowRight") {
          setScene(activeIndex + 1);
          restartAutoPlay();
        }
      });

      story.setAttribute("tabindex", "0");
    }

    function bindWheelNavigation() {
      if (!settings.lockWheelToSlides || scenes.length <= 1) {
        return;
      }

      story.addEventListener("wheel", function (event) {
        if (event.ctrlKey) {
          return;
        }

        const deltaY = event.deltaY;
        if (Math.abs(deltaY) < 10) {
          return;
        }

        if (Math.abs(event.deltaX) > Math.abs(deltaY)) {
          return;
        }

        const direction = deltaY > 0 ? 1 : -1;
        const atStart = activeIndex === 0;
        const atEnd = activeIndex === scenes.length - 1;

        if ((direction > 0 && atEnd) || (direction < 0 && atStart)) {
          return;
        }

        const now = Date.now();
        if (now - lastWheelChangeAt < wheelCooldown) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        setScene(activeIndex + direction);
        restartAutoPlay();
        lastWheelChangeAt = now;
      }, { passive: false });
    }

    window.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
    });

    buildProgress();
    buildControls();
    bindTouchSwipe();
    bindHoverPause();
    bindKeyboard();
    bindWheelNavigation();
    setScene(0);
    startAutoPlay();
  }

  initProjectCarousel("tools-grid", "tools-story-progress");
  initProjectCarousel("games-grid", "games-story-progress");
  initProjectCarousel("knowledge-grid", "knowledge-story-progress");
})();

// ==========================================================================
// Server Pre-Warming & Cold-Start Auto-Redirect Handler
// ==========================================================================
(function () {
  window.__serverAwake = false;
  let isChecking = false;
  let activePollTimer = null;
  let pendingUrl = null;

  const backdrop = document.getElementById("server-wake-backdrop");
  const closeBtn = document.getElementById("server-wake-close");
  const cancelBtn = document.getElementById("server-wake-cancel-btn");
  const targetLabel = document.getElementById("server-wake-target");
  const statusLabel = document.getElementById("server-wake-status");
  const modalIcon = document.getElementById("server-wake-icon");

  // Fast silent pre-warming ping on page load
  function pingServer(timeoutMs = 12000) {
    if (window.__serverAwake) return Promise.resolve(true);
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    return fetch("/api/health", { method: "GET", signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        if (res.ok) {
          window.__serverAwake = true;
          return true;
        }
        return false;
      })
      .catch(() => {
        clearTimeout(timer);
        return false;
      });
  }

  // Fire pre-warm immediately after load
  if (document.readyState === "complete" || document.readyState === "interactive") {
    pingServer(15000);
  } else {
    window.addEventListener("DOMContentLoaded", () => pingServer(15000));
  }

  function showWakeModal(toolName, targetUrl) {
    pendingUrl = targetUrl;
    if (targetLabel) targetLabel.textContent = toolName || "AI Tool";
    if (statusLabel) statusLabel.textContent = "Connecting to server instances...";
    if (modalIcon) {
      modalIcon.textContent = "⚡";
      modalIcon.classList.remove("server-wake-ready");
    }
    if (backdrop) {
      backdrop.classList.add("is-active");
      backdrop.setAttribute("aria-hidden", "false");
    }

    startPolling();
  }

  function hideWakeModal() {
    pendingUrl = null;
    if (activePollTimer) {
      clearTimeout(activePollTimer);
      activePollTimer = null;
    }
    isChecking = false;
    if (backdrop) {
      backdrop.classList.remove("is-active");
      backdrop.setAttribute("aria-hidden", "true");
    }
  }

  let attemptCount = 0;
  function startPolling() {
    if (isChecking) return;
    isChecking = true;
    attemptCount = 0;

    function pollStep() {
      if (!pendingUrl) return;
      attemptCount++;

      if (statusLabel) {
        if (attemptCount <= 3) {
          statusLabel.textContent = "Pinging AI server instances...";
        } else if (attemptCount <= 8) {
          statusLabel.textContent = "Waking up container (free tier booting)...";
        } else {
          statusLabel.textContent = "Almost ready, initializing models...";
        }
      }

      pingServer(5000).then((isAwake) => {
        if (!pendingUrl) return; // User cancelled modal

        if (isAwake) {
          if (statusLabel) statusLabel.textContent = "✓ Server ready! Opening page...";
          if (modalIcon) {
            modalIcon.textContent = "✓";
            modalIcon.classList.add("server-wake-ready");
          }
          setTimeout(() => {
            if (pendingUrl) {
              window.location.href = pendingUrl;
            }
          }, 600);
        } else {
          // If still waking up and reached fallback threshold, proceed to URL
          if (attemptCount > 20) {
            if (statusLabel) statusLabel.textContent = "Opening page now...";
            setTimeout(() => {
              if (pendingUrl) window.location.href = pendingUrl;
            }, 500);
            return;
          }
          activePollTimer = setTimeout(pollStep, 2500);
        }
      });
    }

    pollStep();
  }

  if (closeBtn) closeBtn.addEventListener("click", hideWakeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", hideWakeModal);
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) hideWakeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop && backdrop.classList.contains("is-active")) {
      hideWakeModal();
    }
  });

  // Intercept clicks on links pointing to backend routes
  document.addEventListener("click", function (e) {
    const link = e.target.closest("a");
    if (!link || !link.href) return;

    // Check if target is a backend tool/game/service route
    const href = link.getAttribute("href") || "";
    const isBackendRoute =
      href.startsWith("/Tools/") ||
      href.startsWith("/Games/") ||
      href === "/generate-music" ||
      href === "/Resources" ||
      href === "/Ethiopian_Knowledge_AI_Assistant";

    if (!isBackendRoute) return;

    // If server is already confirmed awake, allow instant normal navigation!
    if (window.__serverAwake) return;

    // Otherwise, prevent default and display the professional waking up modal
    e.preventDefault();
    const toolName = link.textContent.trim().replace(/^[^\w\u1200-\u137F]+/, "").replace(/▾/, "").trim() || "AI Tool";
    showWakeModal(toolName, link.href);
  });
})();

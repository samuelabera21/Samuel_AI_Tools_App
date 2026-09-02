(function () {
  // Mobile navigation drawer toggle & dropdown handler
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

  // Floating Chatbot Widget
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

// ==========================================================================
// Server Pre-Warming & Cold-Start Auto-Redirect Handler
// ==========================================================================
(function () {
  window.__serverAwake = true; // On a tool page served by Render, server is active
  let isChecking = false;
  let activePollTimer = null;
  let pendingUrl = null;

  const backdrop = document.getElementById("server-wake-backdrop");
  const closeBtn = document.getElementById("server-wake-close");
  const cancelBtn = document.getElementById("server-wake-cancel-btn");
  const targetLabel = document.getElementById("server-wake-target");
  const statusLabel = document.getElementById("server-wake-status");
  const modalIcon = document.getElementById("server-wake-icon");

  function pingServer(timeoutMs = 12000) {
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
        if (!pendingUrl) return;

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

  document.addEventListener("click", function (e) {
    const link = e.target.closest("a");
    if (!link || !link.href) return;

    const href = link.getAttribute("href") || "";
    const isBackendRoute =
      href.startsWith("/Tools/") ||
      href.startsWith("/Games/") ||
      href === "/generate-music" ||
      href === "/Resources" ||
      href === "/Ethiopian_Knowledge_AI_Assistant";

    if (!isBackendRoute) return;
    if (window.__serverAwake) return;

    e.preventDefault();
    const toolName = link.textContent.trim().replace(/^[^\w\u1200-\u137F]+/, "").replace(/▾/, "").trim() || "AI Tool";
    showWakeModal(toolName, link.href);
  });
})();

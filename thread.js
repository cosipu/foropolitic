(function bootstrapThreadView() {
  const AUTHOR_NAME = "Ignoto";
  const POST_BODY_LIMIT = 1500;
  const STORAGE_KEY = "foropolitic.static.threads.v1";

  const elements = {
    banner: document.getElementById("forum-mode-banner"),
    status: document.getElementById("forum-status"),
    refreshThread: document.getElementById("refresh-thread"),
    threadView: document.getElementById("thread-view"),
    threadEmptyState: document.getElementById("thread-empty-state"),
    replyPanel: document.getElementById("reply-panel"),
    replyForm: document.getElementById("reply-form"),
    replyFormFeedback: document.getElementById("reply-form-feedback")
  };

  const state = {
    mode: "loading",
    service: null,
    threadId: null,
    serverConnected: false,
    thread: null
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeText(value, maxLength) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function sanitizeBody(value) {
    return String(value || "")
      .replace(/[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .replace(/\r\n/g, "\n")
      .trim()
      .slice(0, POST_BODY_LIMIT);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function getApiBase() {
    const metaValue = document.querySelector('meta[name="forum-api-base"]')?.content || "";
    const configuredBase = metaValue.trim().replace(/\/$/, "");

    if (configuredBase) {
      return configuredBase;
    }

    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (isLocalhost && window.location.port && window.location.port !== "3000") {
      return "http://localhost:3000";
    }

    return "";
  }

  function buildApiUrl(path) {
    return `${getApiBase()}${path}`;
  }

  function sortThreads(threads) {
    return [...threads].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  }

  function normalizeThread(thread) {
    if (!thread) {
      return null;
    }

    const initialPost = thread.initialPost || {
      id: thread.id,
      threadId: thread.id,
      author: AUTHOR_NAME,
      body: thread.body || "",
      createdAt: thread.createdAt,
      isOp: true,
      replyToId: null
    };

    return {
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt || initialPost.createdAt,
      updatedAt: thread.updatedAt || thread.createdAt || initialPost.createdAt,
      replyCount: Number.isInteger(thread.replyCount)
        ? thread.replyCount
        : Array.isArray(thread.replies)
          ? thread.replies.length
          : 0,
      initialPost: {
        ...initialPost,
        author: AUTHOR_NAME
      },
      replies: Array.isArray(thread.replies)
        ? thread.replies.map((reply) => ({
            ...reply,
            author: AUTHOR_NAME
          }))
        : []
    };
  }

  class LocalForumService {
    constructor() {}

    readThreads() {
      try {
        const rawValue = localStorage.getItem(STORAGE_KEY);
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (error) {
        return [];
      }
    }

    writeThreads(threads) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sortThreads(threads)));
    }

    async listThreads() {
      return sortThreads(this.readThreads());
    }

    async getThread(threadId) {
      return normalizeThread(this.readThreads().find((thread) => String(thread.id) === String(threadId)) || null);
    }

    async createReply(threadId, payload) {
      const threads = this.readThreads();
      const threadIndex = threads.findIndex((thread) => String(thread.id) === String(threadId));

      if (threadIndex === -1) {
        throw new Error("THREAD_NOT_FOUND");
      }

      const now = new Date().toISOString();
      const reply = {
        id: crypto.randomUUID(),
        threadId: threads[threadIndex].id,
        author: AUTHOR_NAME,
        body: payload.body,
        createdAt: now,
        isOp: false,
        replyToId: payload.replyToId || null
      };

      threads[threadIndex].replies.push(reply);
      threads[threadIndex].replyCount = threads[threadIndex].replies.length;
      threads[threadIndex].updatedAt = now;

      this.writeThreads(threads);
      return reply;
    }
  }

  class ApiForumService {
    async request(path, options) {
      const response = await fetch(buildApiUrl(path), {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        ...options
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : null;

      if (!response.ok) {
        const error = new Error(payload?.error || "No se pudo completar la solicitud.");
        error.status = response.status;
        throw error;
      }

      return payload;
    }

    async listThreads() {
      const payload = await this.request("/threads");
      return payload.threads;
    }

    async getThread(threadId) {
      const payload = await this.request(`/threads/${threadId}`);
      return normalizeThread(payload.thread);
    }

    async createReply(threadId, payload) {
      const result = await this.request(`/threads/${threadId}/replies`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      return result.reply;
    }
  }

  async function detectService() {
    const apiService = new ApiForumService();

    try {
      const threads = await apiService.listThreads();
      if (Array.isArray(threads)) {
        state.mode = "api";
        return apiService;
      }
    } catch (error) {
      state.mode = "local";
    }

    return new LocalForumService();
  }

  function setFeedback(element, message, isError) {
    element.textContent = message || "";
    element.classList.toggle("is-error", Boolean(isError));
  }

  function setConnectionStatus(isOnline) {
    const message = isOnline ? "🟢 En línea" : "🔴 Fuera de servicio";
    elements.status.value = message;
    elements.status.classList.toggle("status-online", isOnline);
    elements.status.classList.toggle("status-offline", !isOnline);
    state.serverConnected = isOnline;
  }

  function updateModeBanner() {
    const message = "cirkast";

    elements.banner.textContent = message;
  }

  function showThreadError(message) {
    document.title = "Hilo no encontrado · ForoPolitic";
    elements.threadView.innerHTML = `<div class="news-empty">${escapeHtml(message)}</div>`;
    elements.threadEmptyState?.classList.remove("is-hidden");
    elements.replyPanel.classList.add("is-hidden");
  }

  function renderThread() {
    if (!state.thread) {
      showThreadError("No se encontro el hilo solicitado.");
      return;
    }

    const thread = normalizeThread(state.thread);
    const repliesMarkup = thread.replies.length > 0
      ? thread.replies
          .map((reply) => {
            const replyTarget = reply.replyToId
              ? `<div class="reply-target">Respuesta a &gt;&gt;${escapeHtml(reply.replyToId)}</div>`
              : "";

            return `
              <article class="news-card reply-card">
                <div class="reply-card-header">
                  <span class="news-date">${formatDate(reply.createdAt)}</span>
                  <span class="forum-meta">${AUTHOR_NAME} · No.${escapeHtml(reply.id)}</span>
                </div>
                ${replyTarget}
                <p class="news-description reply-body">${escapeHtml(reply.body)}</p>
                <div class="detail-actions">
                  <button class="filter-button" type="button" data-reply-target="${reply.id}">Citar</button>
                </div>
              </article>`;
          })
          .join("")
      : '<div class="news-empty">Este hilo todavia no tiene respuestas.</div>';

    document.title = `${thread.title} · ForoPolitic`;
    elements.threadView.innerHTML = `
      <article class="forum-panel">
        <div class="thread-detail-header">
          <div>
            <span class="news-date">${formatDate(thread.updatedAt)}</span>
            <h2 id="thread-title" class="news-title">${escapeHtml(thread.title)}</h2>
          </div>
          <span class="thread-count">${thread.replyCount} respuestas</span>
        </div>
        <p class="thread-detail-body">${escapeHtml(thread.initialPost.body)}</p>
        <p class="forum-inline-note">Publicado por ${AUTHOR_NAME} · ${formatDate(thread.createdAt)} · No.${escapeHtml(thread.initialPost.id)}</p>
      </article>
      <section class="forum-replies">${repliesMarkup}</section>`;

    elements.replyPanel.classList.remove("is-hidden");
  }

  async function refreshThread() {
    if (!state.threadId) {
      showThreadError("Falta el identificador del hilo en la URL.");
      return;
    }

    try {
      state.thread = await state.service.getThread(state.threadId);
      setConnectionStatus(state.mode === "api");
      renderThread();
    } catch (error) {
      setConnectionStatus(false);
      showThreadError(error.message || "No se pudo cargar el hilo.");
    }
  }

  async function handleReplySubmit(event) {
    event.preventDefault();

    const privacyAccepted = await window.ForoPrivacy?.ensureAccepted();
    if (!privacyAccepted) {
      return;
    }

    const body = sanitizeBody(elements.replyForm.body.value);
    const replyToId = sanitizeText(elements.replyForm.replyToId.value, 64);

    if (body.length < 2) {
      setFeedback(elements.replyFormFeedback, "La respuesta debe tener al menos 2 caracteres.", true);
      return;
    }

    try {
      await state.service.createReply(state.threadId, {
        body,
        replyToId: replyToId || null
      });

      elements.replyForm.reset();
      setConnectionStatus(state.mode === "api");
      setFeedback(elements.replyFormFeedback, "Respuesta publicada.", false);
      await refreshThread();
    } catch (error) {
      setConnectionStatus(false);
      setFeedback(elements.replyFormFeedback, error.message || "No se pudo publicar la respuesta.", true);
    }
  }

  function handleThreadViewClick(event) {
    const quoteButton = event.target.closest("[data-reply-target]");
    if (!quoteButton) {
      return;
    }

    const targetId = quoteButton.getAttribute("data-reply-target");
    if (!targetId) {
      return;
    }

    elements.replyForm.replyToId.value = targetId;
    elements.replyForm.body.focus();
  }

  async function initialize() {
    state.threadId = new URLSearchParams(window.location.search).get("id");
    state.service = await detectService();
    updateModeBanner();
    window.ForoPrivacy?.promptIfNeeded();
    await refreshThread();
  }

  elements.refreshThread.addEventListener("click", async () => {
    await refreshThread();
  });

  elements.replyForm.addEventListener("submit", handleReplySubmit);
  elements.threadView.addEventListener("click", handleThreadViewClick);

  initialize().catch((error) => {
    state.mode = "local";
    state.service = new LocalForumService();
    updateModeBanner();
    setConnectionStatus(false);
    setFeedback(elements.replyFormFeedback, "No se pudo inicializar el hilo.", true);
    refreshThread().catch(() => {});
    console.error(error);
  });
})();

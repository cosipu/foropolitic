(function bootstrapForum() {
  const THREAD_TITLE_LIMIT = 80;
  const POST_BODY_LIMIT = 1500;
  const STORAGE_KEY = "foropolitic.static.threads.v1";

  const elements = {
    banner: document.getElementById("forum-mode-banner"),
    status: document.getElementById("forum-status"),
    toggleThreadForm: document.getElementById("toggle-thread-form"),
    refreshThreads: document.getElementById("refresh-threads"),
    threadFormPanel: document.getElementById("thread-form-panel"),
    threadForm: document.getElementById("thread-form"),
    threadFormFeedback: document.getElementById("thread-form-feedback"),
    threadList: document.getElementById("thread-list"),
    threadDetail: document.getElementById("thread-detail"),
    threadEmptyState: document.getElementById("thread-empty-state")
  };

  const state = {
    mode: "loading",
    service: null,
    threads: [],
    activeThreadId: null,
    composerOpen: false
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
    return metaValue.trim().replace(/\/$/, "");
  }

  function buildApiUrl(path) {
    const apiBase = getApiBase();
    return `${apiBase}${path}`;
  }

  function sortThreads(threads) {
    return [...threads].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  }

  function createWelcomeThread() {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      title: "Bienvenido al foro",
      createdAt: now,
      updatedAt: now,
      replyCount: 1,
      initialPost: {
        id: crypto.randomUUID(),
        threadId: null,
        author: "Anonymous",
        body: "Este es el hilo inicial de demostración. En GitHub Pages vive en localStorage; cuando exista API disponible, el frontend cambiará automáticamente a modo backend.",
        createdAt: now,
        isOp: true,
        replyToId: null
      },
      replies: [
        {
          id: crypto.randomUUID(),
          threadId: null,
          author: "Anonymous",
          body: "Las respuestas reordenan el hilo por actividad reciente.",
          createdAt: now,
          isOp: false,
          replyToId: null
        }
      ]
    };
  }

  class LocalForumService {
    constructor() {
      this.ensureSeed();
    }

    ensureSeed() {
      const existingThreads = this.readThreads();
      if (existingThreads.length > 0) {
        return;
      }

      const seedThread = createWelcomeThread();
      seedThread.initialPost.threadId = seedThread.id;
      seedThread.replies = seedThread.replies.map((reply) => ({ ...reply, threadId: seedThread.id }));
      this.writeThreads([seedThread]);
    }

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
      return this.readThreads().find((thread) => thread.id === threadId) || null;
    }

    async createThread(payload) {
      const threads = this.readThreads();
      const now = new Date().toISOString();
      const threadId = crypto.randomUUID();
      const newThread = {
        id: threadId,
        title: payload.title,
        createdAt: now,
        updatedAt: now,
        replyCount: 0,
        initialPost: {
          id: crypto.randomUUID(),
          threadId,
          author: "Anonymous",
          body: payload.body,
          createdAt: now,
          isOp: true,
          replyToId: null
        },
        replies: []
      };

      threads.push(newThread);
      this.writeThreads(threads);
      return newThread;
    }

    async createReply(threadId, payload) {
      const threads = this.readThreads();
      const threadIndex = threads.findIndex((thread) => thread.id === threadId);

      if (threadIndex === -1) {
        throw new Error("THREAD_NOT_FOUND");
      }

      const now = new Date().toISOString();
      const reply = {
        id: crypto.randomUUID(),
        threadId,
        author: "Anonymous",
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
      return payload.thread;
    }

    async createThread(payload) {
      const result = await this.request("/threads", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      return result.thread;
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

  function updateModeBanner() {
    const message = state.mode === "api"
      ? "Modo API activo: datos servidos por backend y PostgreSQL."
      : "Modo estático activo: datos almacenados en localStorage.";

    elements.banner.textContent = message;
    elements.status.value = message;
  }

  function toggleComposer(forceValue) {
    state.composerOpen = typeof forceValue === "boolean" ? forceValue : !state.composerOpen;
    elements.threadFormPanel.classList.toggle("is-hidden", !state.composerOpen);
  }

  function renderThreadList() {
    if (state.threads.length === 0) {
      elements.threadList.innerHTML = '<div class="news-empty">Todavía no hay hilos publicados.</div>';
      return;
    }

    elements.threadList.innerHTML = state.threads
      .map((thread) => {
        const preview = escapeHtml(thread.initialPost.body).slice(0, 220);
        return `
          <article class="news-card">
            <div class="thread-card-header">
              <div>
                <span class="news-date">${formatDate(thread.updatedAt)}</span>
                <h3 class="news-title">${escapeHtml(thread.title)}</h3>
              </div>
              <span class="thread-count">${thread.replyCount} respuestas</span>
            </div>
            <p class="news-description thread-preview">${preview}</p>
            <p class="forum-inline-note">Publicado por Anonymous · ${formatDate(thread.createdAt)}</p>
            <div class="thread-actions">
              <button class="filter-button" type="button" data-open-thread="${thread.id}">Ver hilo</button>
            </div>
          </article>`;
      })
      .join("");
  }

  function renderThreadDetail() {
    const activeThread = state.threads.find((thread) => thread.id === state.activeThreadId);

    if (!activeThread) {
      elements.threadDetail.innerHTML = "";
      elements.threadEmptyState.classList.remove("is-hidden");
      return;
    }

    elements.threadEmptyState.classList.add("is-hidden");

    const repliesMarkup = activeThread.replies.length > 0
      ? activeThread.replies
          .map((reply) => {
            const replyTarget = reply.replyToId ? `<div class="reply-target">Respuesta a &gt;&gt;${escapeHtml(reply.replyToId)}</div>` : "";
            return `
              <article class="news-card reply-card">
                <div class="reply-card-header">
                  <span class="news-date">${formatDate(reply.createdAt)}</span>
                  <span class="forum-meta">Anonymous · No.${escapeHtml(reply.id)}</span>
                </div>
                ${replyTarget}
                <p class="news-description reply-body">${escapeHtml(reply.body)}</p>
                <div class="detail-actions">
                  <button class="filter-button" type="button" data-reply-target="${reply.id}">Citar</button>
                </div>
              </article>`;
          })
          .join("")
      : '<div class="news-empty">Este hilo todavía no tiene respuestas.</div>';

    elements.threadDetail.innerHTML = `
      <article class="forum-panel">
        <div class="thread-detail-header">
          <div>
            <span class="news-date">${formatDate(activeThread.updatedAt)}</span>
            <h3 class="news-title">${escapeHtml(activeThread.title)}</h3>
          </div>
          <span class="thread-count">${activeThread.replyCount} respuestas</span>
        </div>
        <p class="thread-detail-body">${escapeHtml(activeThread.initialPost.body)}</p>
        <p class="forum-inline-note">Publicado por Anonymous · ${formatDate(activeThread.createdAt)}</p>
      </article>

      <section class="forum-replies">${repliesMarkup}</section>

      <section class="forum-panel">
        <h3>Responder hilo</h3>
        <p class="forum-inline-note">Todos los mensajes aparecen como Anonymous.</p>
        <form id="reply-form" class="forum-form" data-thread-id="${activeThread.id}">
          <div class="filter-field forum-field-grow">
            <label class="filter-label" for="reply-body">Respuesta</label>
            <textarea class="filter-input forum-textarea" id="reply-body" name="body" maxlength="1500" required></textarea>
          </div>
          <div class="filter-field">
            <label class="filter-label" for="reply-target">Referencia opcional</label>
            <input class="filter-input" id="reply-target" name="replyToId" type="text" placeholder="ID del post" />
          </div>
          <div class="section-action">
            <button class="filter-button" type="submit">Publicar respuesta</button>
          </div>
          <p class="forum-feedback" id="reply-form-feedback" aria-live="polite"></p>
        </form>
      </section>`;
  }

  async function refreshThreads(options = {}) {
    state.threads = sortThreads(await state.service.listThreads());

    if (!state.activeThreadId && state.threads.length > 0 && options.keepSelection !== false) {
      state.activeThreadId = state.threads[0].id;
    }

    if (state.activeThreadId && options.refreshDetail !== false) {
      try {
        const thread = await state.service.getThread(state.activeThreadId);
        if (thread) {
          state.threads = sortThreads(
            state.threads.map((currentThread) => (currentThread.id === thread.id ? thread : currentThread))
          );
        }
      } catch (error) {
        state.activeThreadId = null;
      }
    }

    renderThreadList();
    renderThreadDetail();
  }

  async function handleCreateThread(event) {
    event.preventDefault();

    const title = sanitizeText(elements.threadForm.title.value, THREAD_TITLE_LIMIT);
    const body = sanitizeBody(elements.threadForm.body.value);

    if (title.length < 3) {
      setFeedback(elements.threadFormFeedback, "El título debe tener al menos 3 caracteres.", true);
      return;
    }

    if (body.length < 3) {
      setFeedback(elements.threadFormFeedback, "El mensaje inicial debe tener al menos 3 caracteres.", true);
      return;
    }

    try {
      const thread = await state.service.createThread({ title, body });
      elements.threadForm.reset();
      setFeedback(elements.threadFormFeedback, "Hilo publicado.", false);
      state.activeThreadId = thread.id;
      await refreshThreads();
      toggleComposer(false);
    } catch (error) {
      setFeedback(elements.threadFormFeedback, error.message || "No se pudo crear el hilo.", true);
    }
  }

  async function handleReplySubmit(event) {
    event.preventDefault();

    const form = event.target;
    const body = sanitizeBody(form.body.value);
    const replyToId = sanitizeText(form.replyToId.value, 64);
    const feedback = document.getElementById("reply-form-feedback");

    if (body.length < 2) {
      setFeedback(feedback, "La respuesta debe tener al menos 2 caracteres.", true);
      return;
    }

    try {
      await state.service.createReply(form.dataset.threadId, {
        body,
        replyToId: replyToId || null
      });

      form.reset();
      setFeedback(feedback, "Respuesta publicada.", false);
      await refreshThreads();
    } catch (error) {
      setFeedback(feedback, error.message || "No se pudo publicar la respuesta.", true);
    }
  }

  function handleThreadListClick(event) {
    const openButton = event.target.closest("[data-open-thread]");
    if (!openButton) {
      return;
    }

    state.activeThreadId = openButton.getAttribute("data-open-thread");
    renderThreadDetail();
  }

  function handleThreadDetailClick(event) {
    const quoteButton = event.target.closest("[data-reply-target]");
    if (!quoteButton) {
      return;
    }

    const replyTargetInput = document.getElementById("reply-target");
    const replyBodyInput = document.getElementById("reply-body");
    const targetId = quoteButton.getAttribute("data-reply-target");

    if (!replyTargetInput || !replyBodyInput || !targetId) {
      return;
    }

    replyTargetInput.value = targetId;
    replyBodyInput.focus();
  }

  async function initialize() {
    state.service = await detectService();
    updateModeBanner();
    await refreshThreads({ keepSelection: true, refreshDetail: false });
  }

  elements.toggleThreadForm.addEventListener("click", () => {
    toggleComposer();
  });

  elements.refreshThreads.addEventListener("click", async () => {
    await refreshThreads();
  });

  elements.threadForm.addEventListener("submit", handleCreateThread);
  elements.threadList.addEventListener("click", handleThreadListClick);
  elements.threadDetail.addEventListener("click", handleThreadDetailClick);
  elements.threadDetail.addEventListener("submit", (event) => {
    if (event.target && event.target.id === "reply-form") {
      handleReplySubmit(event);
    }
  });

  initialize().catch((error) => {
    state.mode = "local";
    state.service = new LocalForumService();
    updateModeBanner();
    setFeedback(elements.threadFormFeedback, "Se cargó el modo local por un problema inicializando el foro.", true);
    refreshThreads({ keepSelection: true, refreshDetail: false }).catch(() => {});
    console.error(error);
  });
})();
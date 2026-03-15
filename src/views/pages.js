const renderLayout = require("./layout");
const {
  renderThreadForm,
  renderThreadCard,
  renderPost,
  renderReplyForm
} = require("./components");
const { escapeHtml, formatDate } = require("../utils/html");

function renderHomePage({ threads, challengeQuestion, basePath }) {
  const content = `
    <header class="topbar">
      <a class="brand" href="${basePath || "/"}">ForoPolitic</a>
      <span class="topbar-note">Privado, anónimo y no indexable</span>
    </header>

    ${renderThreadForm({ challengeQuestion, basePath })}

    <main class="thread-grid">
      ${threads.length > 0 ? threads.map((thread) => renderThreadCard(thread, basePath)).join("") : `
        <section class="panel empty-state">
          <h2>No hay hilos todavia</h2>
          <p>El primer mensaje abre la conversacion. La sesion es anonima y temporal.</p>
        </section>`}
    </main>`;

  return renderLayout({
    title: "ForoPolitic",
    content,
    basePath
  });
}

function renderThreadPage({ thread, challengeQuestion, basePath }) {
  const content = `
    <header class="topbar">
      <a class="brand" href="${basePath || "/"}">ForoPolitic</a>
      <nav>
        <a class="topbar-link" href="${basePath || "/"}">Volver a hilos</a>
      </nav>
    </header>

    <section class="thread-layout">
      <main class="thread-column">
        <section class="panel thread-page-header">
          <p class="eyebrow">Hilo #${thread.id}</p>
          <h1>${escapeHtml(thread.subject)}</h1>
          <p class="thread-summary">${thread.replyCount} respuestas · ultima actividad ${formatDate(thread.bumpedAt)}</p>
        </section>

        <section class="thread-posts">
          ${renderPost(thread.opPost, { showReplyButton: false })}
          ${thread.replies.map((post) => renderPost(post)).join("")}
        </section>
      </main>

      <aside class="composer-column">
        ${renderReplyForm({ threadId: thread.id, challengeQuestion, basePath })}
      </aside>
    </section>`;

  return renderLayout({
    title: `${thread.subject} · ForoPolitic`,
    content,
    basePath
  });
}

function renderNotFoundPage({ basePath }) {
  const content = `
    <section class="panel empty-state centered">
      <p class="eyebrow">404</p>
      <h1>Contenido no disponible</h1>
      <p>La ruta no existe o el hilo fue eliminado.</p>
      ${basePath ? `<p><a class="thread-link" href="${basePath}">Ir al foro</a></p>` : ""}
    </section>`;

  return renderLayout({
    title: "No encontrado",
    content,
    basePath: basePath || ""
  });
}

module.exports = {
  renderHomePage,
  renderThreadPage,
  renderNotFoundPage
};
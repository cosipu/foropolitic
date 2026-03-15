const { escapeHtml, formatDate, formatPostBody, summarizeText } = require("../utils/html");

function renderThreadForm({ challengeQuestion, basePath }) {
  return `
    <section class="panel hero-panel">
      <div>
        <p class="eyebrow">Foro privado</p>
        <h1>ForoPolitic</h1>
        <p class="lede">Imageboard anonimo, sin registro, con hilos ordenados por actividad reciente y moderacion minima por clave.</p>
        <p class="privacy-note">Privacidad aplicada en la app: sin cuentas, sin perfiles, sin trackers y con bloqueo para indexacion. Para mantener el acceso realmente privado, define un path secreto en la variable <strong>PRIVATE_BASE_PATH</strong>.</p>
      </div>

      <form class="post-form" method="post" action="${basePath}/api/threads" data-async-form>
        <h2>Abrir hilo</h2>
        <label>
          <span>Titulo</span>
          <input type="text" name="subject" maxlength="120" required />
        </label>
        <label>
          <span>Mensaje</span>
          <textarea name="content" rows="8" maxlength="5000" required></textarea>
        </label>
        <label class="challenge-field">
          <span>Verificacion anti-bot: <strong data-challenge-label>${escapeHtml(challengeQuestion)}</strong></span>
          <input type="text" name="challengeAnswer" inputmode="numeric" autocomplete="off" required />
        </label>
        <button type="submit">Publicar hilo</button>
        <p class="form-status" aria-live="polite"></p>
      </form>
    </section>`;
}

function renderPost(post, { showReplyButton = true, compact = false }) {
  const replyBadge = post.replyToId
    ? `<a class="reply-ref inline-ref" href="#p${post.replyToId}">&gt;&gt;${post.replyToId}</a>`
    : "";

  return `
    <article class="post-card ${post.isOp ? "op-post" : "reply-post"} ${compact ? "compact-post" : ""}" id="p${post.id}">
      <header class="post-meta">
        <div>
          <strong class="author">Anónimo</strong>
          ${post.subject ? `<span class="subject">${escapeHtml(post.subject)}</span>` : ""}
          ${replyBadge}
        </div>
        <div class="meta-actions">
          <time datetime="${new Date(post.createdAt).toISOString()}">${formatDate(post.createdAt)}</time>
          <span class="post-id">No.${post.id}</span>
          ${showReplyButton ? `<button type="button" class="link-button" data-reply-target="${post.id}">&gt;&gt; responder</button>` : ""}
          <button type="button" class="link-button destructive" data-delete-post="${post.id}">borrar</button>
        </div>
      </header>
      <div class="post-body">${formatPostBody(post.content)}</div>
    </article>`;
}

function renderThreadCard(thread, basePath) {
  const snippet = summarizeText(thread.opPost?.content || "", 220);

  return `
    <section class="panel thread-card">
      <header class="thread-header">
        <div>
          <p class="thread-kicker">Hilo #${thread.id}</p>
          <h2><a href="${basePath}/thread/${thread.id}">${escapeHtml(thread.subject)}</a></h2>
        </div>
        <dl class="thread-stats">
          <div>
            <dt>Respuestas</dt>
            <dd>${thread.replyCount}</dd>
          </div>
          <div>
            <dt>Ultima actividad</dt>
            <dd>${formatDate(thread.bumpedAt)}</dd>
          </div>
        </dl>
      </header>

      ${renderPost(thread.opPost, { showReplyButton: false, compact: true })}

      <p class="thread-snippet">${escapeHtml(snippet)}</p>

      ${thread.previewReplies.length > 0 ? `
        <div class="reply-preview-list">
          ${thread.previewReplies.map((post) => renderPost(post, { compact: true, showReplyButton: false })).join("")}
        </div>` : ""}

      <footer class="thread-footer">
        <a class="thread-link" href="${basePath}/thread/${thread.id}">Abrir hilo completo</a>
      </footer>
    </section>`;
}

function renderReplyForm({ threadId, challengeQuestion, basePath }) {
  return `
    <form class="post-form sticky-form" method="post" action="${basePath}/api/threads/${threadId}/posts" data-async-form>
      <h2>Responder</h2>
      <input type="hidden" name="replyToId" value="" data-reply-input />
      <label>
        <span>Mensaje</span>
        <textarea name="content" rows="7" maxlength="5000" required></textarea>
      </label>
      <label class="challenge-field">
        <span>Verificacion anti-bot: <strong data-challenge-label>${escapeHtml(challengeQuestion)}</strong></span>
        <input type="text" name="challengeAnswer" inputmode="numeric" autocomplete="off" required />
      </label>
      <button type="submit">Publicar respuesta</button>
      <p class="form-status" aria-live="polite"></p>
    </form>`;
}

module.exports = {
  renderThreadForm,
  renderPost,
  renderThreadCard,
  renderReplyForm
};
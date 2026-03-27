const { escapeHtml } = require("../utils/html");

function renderPrivacyModal() {
  return `
    <div class="privacy-modal is-hidden" id="privacy-modal" aria-hidden="true">
      <div class="privacy-modal__overlay"></div>
      <section
        class="privacy-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        aria-describedby="privacy-modal-summary"
      >
        <p class="privacy-modal__eyebrow">Aviso de privacidad</p>
        <h2 id="privacy-modal-title">Todos somos Ignoto.</h2>
        <p id="privacy-modal-summary" class="privacy-modal__lead">
          Este foro está diseñado para conversaciones anónimas, sin registro y sin perfiles.
          La plataforma minimiza rastros visibles, pero tu comportamiento sigue siendo decisivo.
        </p>

        <div class="privacy-modal__content">
          <section>
            <h3>Privacidad de la plataforma</h3>
            <ul>
              <li>No requiere registro.</li>
              <li>No almacena datos personales.</li>
              <li>No guarda direcciones IP desde la lógica de la aplicación.</li>
            </ul>
          </section>

          <section>
            <h3>Para tu seguridad</h3>
            <ul>
              <li>No compartas nombre real, dirección, teléfono, contraseñas ni identificadores únicos.</li>
              <li>No compartas enlaces externos ni imágenes sensibles o privadas.</li>
              <li>Evita revelar detalles que puedan identificarte indirectamente.</li>
            </ul>
          </section>

          <section>
            <h3>Recomendaciones de ciberseguridad</h3>
            <ul>
              <li>No confíes en desconocidos y desconfía del phishing o la ingeniería social.</li>
              <li>No descargues archivos sospechosos.</li>
              <li>Si necesitas más privacidad, usa Tor Browser o una VPN confiable.</li>
            </ul>
          </section>
        </div>

        <p class="privacy-modal__footnote">
          El anonimato también depende de tu comportamiento. Al continuar, aceptas estas
          recomendaciones y entiendes los riesgos de compartir información en internet.
        </p>

        <div class="privacy-modal__actions">
          <button class="privacy-modal__button" id="privacy-modal-accept" type="button">
            Entendido, continuar
          </button>
        </div>
      </section>
    </div>`;
}

function renderLayout({ title, content, basePath }) {
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow,noarchive,nosnippet" />
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="${basePath}/styles.css" />
  </head>
  <body data-base-path="${escapeHtml(basePath)}">
    ${renderPrivacyModal()}
    <div class="page-shell">
      ${content}
    </div>
    <script src="${basePath}/app.js" defer></script>
  </body>
</html>`;
}

module.exports = renderLayout;
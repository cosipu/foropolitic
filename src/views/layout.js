const { escapeHtml } = require("../utils/html");

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
    <div class="page-shell">
      ${content}
    </div>
    <script src="${basePath}/app.js" defer></script>
  </body>
</html>`;
}

module.exports = renderLayout;
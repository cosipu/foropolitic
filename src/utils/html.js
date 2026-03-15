const sanitizeHtml = require("sanitize-html");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizePlainText(value, maxLength) {
  const sanitized = sanitizeHtml(String(value || ""), {
    allowedTags: [],
    allowedAttributes: {}
  })
    .replace(/\r\n/g, "\n")
    .trim();

  return sanitized.slice(0, maxLength);
}

function formatPostBody(value) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/(^|\s)&gt;&gt;(\d+)/g, '$1<a href="#p$2" class="reply-ref">&gt;&gt;$2</a>')
    .replace(/\n/g, "<br />");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

function summarizeText(value, maxLength) {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

module.exports = {
  escapeHtml,
  sanitizePlainText,
  formatPostBody,
  formatDate,
  summarizeText
};
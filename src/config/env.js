function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBasePath(value) {
  if (!value || value === "/") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
  return normalized === "/" ? "" : normalized;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseNumber(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL || "",
  modPassword: process.env.MOD_PASSWORD || "",
  privateBasePath: normalizeBasePath(process.env.PRIVATE_BASE_PATH || ""),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "anon_forum_sid",
  sessionTtlMs: parseNumber(process.env.SESSION_TTL_HOURS, 24) * 60 * 60 * 1000,
  generalWindowMs: parseNumber(process.env.GENERAL_WINDOW_MS, 60_000),
  generalMaxRequests: parseNumber(process.env.GENERAL_MAX_REQUESTS, 120),
  threadWindowMs: parseNumber(process.env.THREAD_WINDOW_MS, 900_000),
  threadMaxRequests: parseNumber(process.env.THREAD_MAX_REQUESTS, 3),
  postWindowMs: parseNumber(process.env.POST_WINDOW_MS, 300_000),
  postMaxRequests: parseNumber(process.env.POST_MAX_REQUESTS, 12),
  duplicateWindowMs: parseNumber(process.env.DUPLICATE_WINDOW_MS, 120_000),
  threadTtlDays: parseNumber(process.env.THREAD_TTL_DAYS, 30)
};

function validateEnv() {
  const missing = [];

  if (!env.databaseUrl) {
    missing.push("DATABASE_URL");
  }

  if (!env.modPassword) {
    missing.push("MOD_PASSWORD");
  }

  if (missing.length > 0) {
    throw new Error(`Faltan variables obligatorias: ${missing.join(", ")}`);
  }
}

module.exports = {
  env,
  validateEnv
};
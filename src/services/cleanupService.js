const { env } = require("../config/env");
const { cleanupExpiredThreads } = require("./forumService");

async function runCleanupNow() {
  try {
    await cleanupExpiredThreads(env.threadTtlDays);
  } catch (error) {
    console.error("No se pudo ejecutar la limpieza automatica:", error.message);
  }
}

function startCleanupScheduler() {
  runCleanupNow();
  setInterval(runCleanupNow, 60 * 60 * 1000).unref();
}

module.exports = {
  startCleanupScheduler
};
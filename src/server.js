require("dotenv/config");

const prisma = require("./db/prisma");
const createApp = require("./app");
const { env, validateEnv } = require("./config/env");
const { startCleanupScheduler } = require("./services/cleanupService");

async function startServer() {
  validateEnv();
  await prisma.$connect();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`ForoPolitic escuchando en puerto ${env.port}`);
    console.log(`Path privado configurado: ${env.privateBasePath || "/"}`);
  });

  startCleanupScheduler();
}

startServer().catch(async (error) => {
  console.error("No se pudo iniciar el servidor:", error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
});
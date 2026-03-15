const path = require("path");

const cookieParser = require("cookie-parser");
const express = require("express");
const helmet = require("helmet");

const { env } = require("./config/env");
const noIndexMiddleware = require("./middleware/noindex");
const { sessionMiddleware } = require("./middleware/session");
const apiRoutes = require("./routes/api");
const pageRoutes = require("./routes/pages");
const { renderNotFoundPage } = require("./views/pages");

function createApp() {
  const app = express();
  const mountPath = env.privateBasePath || "/";

  app.disable("x-powered-by");
  app.disable("etag");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(express.json({ limit: "20kb" }));
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));
  app.use(cookieParser());
  app.use(sessionMiddleware);

  app.get("/health", (req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  app.get("/robots.txt", (req, res) => {
    res.type("text/plain").send("User-agent: *\nDisallow: /\n");
  });

  if (env.privateBasePath) {
    app.get("/", (req, res) => {
      res.status(404).send("Not found");
    });
  }

  app.use(mountPath, noIndexMiddleware, express.static(path.join(__dirname, "..", "public")));
  app.use(mountPath, noIndexMiddleware, pageRoutes);
  app.use(mountPath, noIndexMiddleware, apiRoutes);

  app.use((req, res) => {
    res.status(404).send(renderNotFoundPage({ basePath: env.privateBasePath }));
  });

  app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      error: "Error interno del servidor."
    });
  });

  return app;
}

module.exports = createApp;
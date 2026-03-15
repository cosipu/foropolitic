const express = require("express");

const { env } = require("../config/env");
const requireModeratorPassword = require("../middleware/modAuth");
const createRateLimit = require("../middleware/rateLimit");
const {
  getCurrentChallenge,
  verifyChallenge,
  consumeRateLimit,
  isDuplicateContent,
  rememberContent
} = require("../middleware/session");
const { sanitizePlainText } = require("../utils/html");
const {
  listThreads,
  getThread,
  createThread,
  createReply,
  deletePost
} = require("../services/forumService");

const router = express.Router();

const genericLimiter = createRateLimit({
  bucketName: "generic",
  windowMs: env.generalWindowMs,
  maxRequests: env.generalMaxRequests,
  errorMessage: "Demasiadas solicitudes en poco tiempo.",
  consumeRateLimit,
  getCurrentChallenge
});

const threadLimiter = createRateLimit({
  bucketName: "thread",
  windowMs: env.threadWindowMs,
  maxRequests: env.threadMaxRequests,
  errorMessage: "Limite de creacion de hilos alcanzado para esta sesion.",
  consumeRateLimit,
  getCurrentChallenge
});

const postLimiter = createRateLimit({
  bucketName: "post",
  windowMs: env.postWindowMs,
  maxRequests: env.postMaxRequests,
  errorMessage: "Limite de respuestas alcanzado para esta sesion.",
  consumeRateLimit,
  getCurrentChallenge
});

function validateChallenge(req, res) {
  const valid = verifyChallenge(req.anonSession, req.body.challengeAnswer);

  if (!valid) {
    res.status(400).json({
      error: "La verificacion anti-bot no coincide.",
      challengeQuestion: getCurrentChallenge(req.anonSession)
    });
    return false;
  }

  return true;
}

function validateContentAgainstSpam(req, res, content) {
  if (isDuplicateContent(req.anonSession, content)) {
    res.status(409).json({
      error: "Mensaje duplicado detectado en la misma sesion.",
      challengeQuestion: getCurrentChallenge(req.anonSession)
    });
    return false;
  }

  return true;
}

router.get("/api/threads", genericLimiter, async (req, res, next) => {
  try {
    const threads = await listThreads();
    res.json({ threads });
  } catch (error) {
    next(error);
  }
});

router.get("/api/threads/:threadId", genericLimiter, async (req, res, next) => {
  try {
    const threadId = Number(req.params.threadId);
    const thread = await getThread(threadId);

    if (!thread) {
      return res.status(404).json({ error: "Hilo no encontrado." });
    }

    return res.json({ thread });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/threads", genericLimiter, threadLimiter, async (req, res, next) => {
  try {
    if (!validateChallenge(req, res)) {
      return;
    }

    const subject = sanitizePlainText(req.body.subject, 120);
    const content = sanitizePlainText(req.body.content, 5000);

    if (subject.length < 3) {
      return res.status(400).json({
        error: "El titulo debe tener al menos 3 caracteres.",
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    if (content.length < 3) {
      return res.status(400).json({
        error: "El mensaje debe tener al menos 3 caracteres.",
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    if (!validateContentAgainstSpam(req, res, `${subject}\n${content}`)) {
      return;
    }

    const thread = await createThread({ subject, content });
    rememberContent(req.anonSession, `${subject}\n${content}`);

    return res.status(201).json({
      ok: true,
      redirectTo: `${env.privateBasePath}/thread/${thread.id}`,
      challengeQuestion: getCurrentChallenge(req.anonSession)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/threads/:threadId/posts", genericLimiter, postLimiter, async (req, res, next) => {
  try {
    if (!validateChallenge(req, res)) {
      return;
    }

    const threadId = Number(req.params.threadId);
    const replyToId = req.body.replyToId ? Number(req.body.replyToId) : null;
    const content = sanitizePlainText(req.body.content, 5000);

    if (!Number.isInteger(threadId)) {
      return res.status(400).json({
        error: "Identificador de hilo invalido.",
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    if (replyToId !== null && !Number.isInteger(replyToId)) {
      return res.status(400).json({
        error: "El identificador de respuesta no es valido.",
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    if (content.length < 2) {
      return res.status(400).json({
        error: "La respuesta debe tener al menos 2 caracteres.",
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    if (!validateContentAgainstSpam(req, res, content)) {
      return;
    }

    await createReply({ threadId, content, replyToId });
    rememberContent(req.anonSession, content);

    return res.status(201).json({
      ok: true,
      redirectTo: `${env.privateBasePath}/thread/${threadId}`,
      challengeQuestion: getCurrentChallenge(req.anonSession)
    });
  } catch (error) {
    if (error.message === "THREAD_NOT_FOUND") {
      return res.status(404).json({
        error: "Hilo no encontrado.",
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    if (error.message === "INVALID_REPLY_TARGET") {
      return res.status(400).json({
        error: "La referencia de respuesta no pertenece a este hilo.",
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    return next(error);
  }
});

router.delete("/api/posts/:postId", requireModeratorPassword, async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: "Identificador de post invalido." });
    }

    const result = await deletePost(postId);

    if (!result) {
      return res.status(404).json({ error: "Post no encontrado." });
    }

    return res.json({ ok: true, result });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
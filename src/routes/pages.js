const express = require("express");

const { env } = require("../config/env");
const { getCurrentChallenge } = require("../middleware/session");
const { listThreads, getThread } = require("../services/forumService");
const { renderHomePage, renderThreadPage, renderNotFoundPage } = require("../views/pages");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const threads = await listThreads();
    res.send(
      renderHomePage({
        threads,
        challengeQuestion: getCurrentChallenge(req.anonSession),
        basePath: env.privateBasePath
      })
    );
  } catch (error) {
    next(error);
  }
});

router.get("/thread/:threadId", async (req, res, next) => {
  try {
    const threadId = Number(req.params.threadId);

    if (!Number.isInteger(threadId)) {
      return res.status(404).send(renderNotFoundPage({ basePath: env.privateBasePath }));
    }

    const thread = await getThread(threadId);

    if (!thread) {
      return res.status(404).send(renderNotFoundPage({ basePath: env.privateBasePath }));
    }

    return res.send(
      renderThreadPage({
        thread,
        challengeQuestion: getCurrentChallenge(req.anonSession),
        basePath: env.privateBasePath
      })
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
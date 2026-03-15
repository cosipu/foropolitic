function createRateLimit(options) {
  const { bucketName, windowMs, maxRequests, errorMessage, consumeRateLimit, getCurrentChallenge } = options;

  return function rateLimitMiddleware(req, res, next) {
    const allowed = consumeRateLimit(req.anonSession, bucketName, windowMs, maxRequests);

    if (!allowed) {
      return res.status(429).json({
        error: errorMessage,
        challengeQuestion: getCurrentChallenge(req.anonSession)
      });
    }

    return next();
  };
}

module.exports = createRateLimit;
const crypto = require("crypto");

const { env } = require("../config/env");

const sessions = new Map();

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateChallenge() {
  const left = Math.floor(Math.random() * 8) + 1;
  const right = Math.floor(Math.random() * 8) + 1;
  const answer = String(left + right);

  return {
    prompt: `${left} + ${right} = ?`,
    answerHash: hashValue(answer)
  };
}

function pruneSessionState(session) {
  const now = Date.now();
  const recentFingerprints = session.recentFingerprints || [];
  const rateBuckets = session.rateBuckets || {};

  session.recentFingerprints = recentFingerprints.filter((entry) => now - entry.createdAt <= env.duplicateWindowMs);

  Object.keys(rateBuckets).forEach((bucketName) => {
    rateBuckets[bucketName] = rateBuckets[bucketName].filter((timestamp) => now - timestamp <= env.generalWindowMs);
  });
}

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(sessionId);
      continue;
    }

    pruneSessionState(session);
  }
}

setInterval(cleanupExpiredSessions, 10 * 60 * 1000).unref();

function createSession() {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    expiresAt: now + env.sessionTtlMs,
    challenge: generateChallenge(),
    rateBuckets: {},
    recentFingerprints: []
  };
}

function persistSessionCookie(res, sessionId) {
  res.cookie(env.sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: env.sessionTtlMs,
    path: "/"
  });
}

function sessionMiddleware(req, res, next) {
  let sessionId = req.cookies?.[env.sessionCookieName];
  let session = sessionId ? sessions.get(sessionId) : null;

  if (!session || session.expiresAt <= Date.now()) {
    session = createSession();
    sessionId = session.id;
    sessions.set(session.id, session);
    persistSessionCookie(res, session.id);
  }

  session.expiresAt = Date.now() + env.sessionTtlMs;
  req.anonSession = session;
  next();
}

function rotateChallenge(session) {
  session.challenge = generateChallenge();
  return session.challenge.prompt;
}

function getCurrentChallenge(session) {
  if (!session.challenge) {
    return rotateChallenge(session);
  }

  return session.challenge.prompt;
}

function verifyChallenge(session, answer) {
  if (!session.challenge) {
    rotateChallenge(session);
    return false;
  }

  const normalizedAnswer = String(answer || "").trim();
  const isValid = hashValue(normalizedAnswer) === session.challenge.answerHash;
  rotateChallenge(session);
  return isValid;
}

function consumeRateLimit(session, bucketName, windowMs, maxRequests) {
  const now = Date.now();
  const bucket = session.rateBuckets[bucketName] || [];
  const recentTimestamps = bucket.filter((timestamp) => now - timestamp <= windowMs);

  if (recentTimestamps.length >= maxRequests) {
    session.rateBuckets[bucketName] = recentTimestamps;
    return false;
  }

  recentTimestamps.push(now);
  session.rateBuckets[bucketName] = recentTimestamps;
  return true;
}

function isDuplicateContent(session, content) {
  const fingerprint = hashValue(content.trim().toLowerCase());
  return (session.recentFingerprints || []).some((entry) => entry.hash === fingerprint);
}

function rememberContent(session, content) {
  const fingerprint = hashValue(content.trim().toLowerCase());
  const recentFingerprints = session.recentFingerprints || [];

  recentFingerprints.push({
    hash: fingerprint,
    createdAt: Date.now()
  });

  session.recentFingerprints = recentFingerprints.filter((entry) => Date.now() - entry.createdAt <= env.duplicateWindowMs);
}

module.exports = {
  sessionMiddleware,
  getCurrentChallenge,
  verifyChallenge,
  consumeRateLimit,
  isDuplicateContent,
  rememberContent
};
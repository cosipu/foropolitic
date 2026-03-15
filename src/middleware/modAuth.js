const crypto = require("crypto");

const { env } = require("../config/env");

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireModeratorPassword(req, res, next) {
  const providedPassword = req.header("x-mod-password") || req.body?.modPassword || "";

  if (!providedPassword || !safeEqual(providedPassword, env.modPassword)) {
    return res.status(401).json({ error: "Contrasena de moderacion invalida." });
  }

  return next();
}

module.exports = requireModeratorPassword;
function noIndexMiddleware(req, res, next) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
}

module.exports = noIndexMiddleware;
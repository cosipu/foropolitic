export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const isApiRoute =
      pathname.startsWith("/threads") ||
      pathname.startsWith("/posts") ||
      pathname === "/health" ||
      pathname === "/salud";

    if (isApiRoute) {
      const apiBaseUrl = String(env.API_BASE_URL || "").trim().replace(/\/$/, "");

      if (!apiBaseUrl) {
        return new Response(JSON.stringify({ error: "API_BASE_URL no configurada en Cloudflare." }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }

      const targetUrl = `${apiBaseUrl}${pathname}${url.search}`;
      const method = request.method.toUpperCase();
      const headers = new Headers();

      // Forward only required app headers to avoid proxy-specific header conflicts.
      ["accept", "content-type", "authorization", "x-mod-password"].forEach((headerName) => {
        const value = request.headers.get(headerName);
        if (value) {
          headers.set(headerName, value);
        }
      });

      const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

      return fetch(targetUrl, {
        method,
        headers,
        body,
        redirect: "follow"
      });
    }

    return env.ASSETS.fetch(request);
  }
};

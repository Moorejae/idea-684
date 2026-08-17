// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare Pages Function — API proxy.
//
// myzelva.com is served by Cloudflare (fast edge, static frontend). The real
// backend (Qwen via HF) lives on Render. This catch-all forwards every
// /api/* request to the Render app so the browser's fetch("/api/...") calls
// work — otherwise Cloudflare would 405 them (no backend behind the static host).
//
// Deploy: Cloudflare Pages picks up the functions/ directory automatically on
// push to main. Override the backend with MYZELVA_BACKEND env if needed.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BACKEND = "https://idea-684.onrender.com";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const backend = (env && env.MYZELVA_BACKEND) || DEFAULT_BACKEND;
  const target = `${backend}${url.pathname}${url.search}`;

  // Rebuild the request with the original method, headers and body.
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  // Only attach a body for methods that carry one.
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const backendRes = await fetch(target, init);

    // Copy the backend response back to the browser, plus permissive CORS in
    // case the frontend is ever served from a different origin.
    const resHeaders = new Headers(backendRes.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    // Backend unreachable / cold-boot timeout — return clean JSON, never 405.
    return new Response(
      JSON.stringify({
        error: "Myzelva backend is temporarily unreachable. Please try again in a moment.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Answer CORS preflight so the browser can call /api/* cross-origin if needed.
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

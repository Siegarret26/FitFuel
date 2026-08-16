const ALLOWED_ORIGINS = [
  "https://fitfuel-ihuvidea.vercel.app",
  "https://fitfuel-alpha.vercel.app",
];

const ALLOWED_METHODS = ["generateContent", "streamGenerateContent"];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    const cors = {
      "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0] || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const fail = (status, message) =>
      new Response(JSON.stringify({ error: { message } }), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    if (request.method !== "POST") return fail(405, "Method not allowed.");
    if (!isAllowed) return fail(403, "This origin isn't allowed to use this proxy.");
    if (!env.GEMINI_API_KEY) {
      return fail(500, "Proxy is missing its GEMINI_API_KEY secret.");
    }

    const url = new URL(request.url);
    const model = url.searchParams.get("model") || "";
    const method = url.searchParams.get("method") || "";
    const wantsStream = url.searchParams.get("stream") === "1";

    if (!/^[a-zA-Z0-9._-]+$/.test(model)) return fail(400, "Invalid model name.");
    if (!ALLOWED_METHODS.includes(method)) return fail(400, "Unsupported method.");

    let target = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`;
    if (wantsStream) target += "?alt=sse";

    let body;
    try {
      body = await request.text();
    } catch {
      return fail(400, "Couldn't read the request body.");
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body,
      });
    } catch {
      return fail(502, "Couldn't reach Gemini. Please try again.");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  },
};

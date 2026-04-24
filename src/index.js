export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/test/claude") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_ADMIN_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 20,
          messages: [{ role: "user", content: "Reply with OK only." }]
        })
      });

      const data = await response.json();

      return Response.json({
        ok: response.ok,
        status: response.status,
        usage: data.usage || null,
        raw: data
      });
    }

    if (url.pathname === "/api/test/kimi") {
      const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${env.MOONSHOT_API_KEY}`
        },
        body: JSON.stringify({
          model: "kimi-k2.6",
          messages: [{ role: "user", content: "Reply with OK only." }],
          temperature: 0,
          max_tokens: 20
        })
      });

      const data = await response.json();

      return Response.json({
        ok: response.ok,
        status: response.status,
        usage: data.usage || null,
        raw: data
      });
    }

    if (url.pathname === "/api/usage/claude") {
      return Response.json({
        provider: "claude",
        ok: true,
        has_key: Boolean(env.ANTHROPIC_ADMIN_KEY),
        currency: "USD",
        spend: 0,
        requests: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        raw: { note: "Use /api/test/claude to verify live Claude usage fields." }
      });
    }

    if (url.pathname === "/api/usage/kimi") {
      return Response.json({
        provider: "kimi",
        ok: true,
        has_key: Boolean(env.MOONSHOT_API_KEY),
        currency: "USD",
        spend: 0,
        requests: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        raw: { note: "Use /api/test/kimi to verify live Kimi usage fields." }
      });
    }

    return env.ASSETS.fetch(request);
  }
};

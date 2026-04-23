export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/usage/claude") {
      return Response.json({
        provider: "claude",
        ok: true,
        currency: "USD",
        spend: 0,
        requests: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        raw: { note: "Claude usage adapter goes here" }
      });
    }

    if (url.pathname === "/api/usage/kimi") {
      return Response.json({
        provider: "kimi",
        ok: true,
        currency: "USD",
        spend: 0,
        requests: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        raw: { note: "Kimi usage adapter goes here" }
      });
    }

    return env.ASSETS.fetch(request);
  }
};

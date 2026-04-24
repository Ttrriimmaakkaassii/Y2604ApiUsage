export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
        raw: {
          note: "Claude key detected. Next step is mapping Anthropic Usage & Cost API response."
        }
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
        raw: {
          note: "Kimi key detected. Public docs show per-request usage; account-level usage endpoint still needs confirmation."
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};

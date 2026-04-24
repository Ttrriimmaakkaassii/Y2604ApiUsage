const PRICING = {
  // Verify pricing before relying on billing accuracy.
  // Values are USD per 1M tokens.
  claude: {
    model: "claude-haiku-4-5-20251001",
    inputPer1M: 1.00,
    outputPer1M: 5.00
  },
  kimi: {
    model: "kimi-k2.6",
    inputPer1M: 0.60,
    outputPer1M: 2.50
  }
};

function costUsd(inputTokens, outputTokens, pricing) {
  return (inputTokens / 1_000_000) * pricing.inputPer1M +
         (outputTokens / 1_000_000) * pricing.outputPer1M;
}

async function logUsage(env, row) {
  await env.DB.prepare(`
    INSERT INTO usage_logs (
      created_at,
      provider,
      model,
      input_tokens,
      output_tokens,
      total_tokens,
      estimated_cost_usd,
      raw_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    new Date().toISOString(),
    row.provider,
    row.model,
    row.input_tokens,
    row.output_tokens,
    row.total_tokens,
    row.estimated_cost_usd,
    JSON.stringify(row.raw || {})
  ).run();
}

async function summary(env, sinceIso = null) {
  const where = sinceIso ? "WHERE created_at >= ?" : "";
  const stmt = env.DB.prepare(`
    SELECT
      provider,
      COUNT(*) AS requests,
      SUM(input_tokens) AS input_tokens,
      SUM(output_tokens) AS output_tokens,
      SUM(total_tokens) AS total_tokens,
      SUM(estimated_cost_usd) AS estimated_cost_usd
    FROM usage_logs
    ${where}
    GROUP BY provider
  `);

  const result = sinceIso
    ? await stmt.bind(sinceIso).all()
    : await stmt.all();

  return result.results || [];
}

async function latest(env) {
  const result = await env.DB.prepare(`
    SELECT *
    FROM usage_logs
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  return result.results || [];
}

function sinceForRange(range) {
  const now = new Date();

  if (range === "24h") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }

  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (range === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/test/claude") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_ADMIN_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: PRICING.claude.model,
          max_tokens: 20,
          messages: [{ role: "user", content: "Reply with OK only." }]
        })
      });

      const data = await response.json();
      const usage = data.usage || {};
      const input = Number(usage.input_tokens || 0);
      const output = Number(usage.output_tokens || 0);
      const total = input + output;
      const estimated = costUsd(input, output, PRICING.claude);

      if (response.ok) {
        await logUsage(env, {
          provider: "claude",
          model: data.model || PRICING.claude.model,
          input_tokens: input,
          output_tokens: output,
          total_tokens: total,
          estimated_cost_usd: estimated,
          raw: data
        });
      }

      return Response.json({
        ok: response.ok,
        status: response.status,
        provider: "claude",
        model: data.model || PRICING.claude.model,
        usage,
        estimated_cost_usd: estimated,
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
          model: PRICING.kimi.model,
          messages: [{ role: "user", content: "Reply with OK only." }],
          temperature: 1,
          max_tokens: 20
        })
      });

      const data = await response.json();
      const usage = data.usage || {};
      const input = Number(usage.prompt_tokens || 0);
      const output = Number(usage.completion_tokens || 0);
      const total = Number(usage.total_tokens || input + output);
      const estimated = costUsd(input, output, PRICING.kimi);

      if (response.ok) {
        await logUsage(env, {
          provider: "kimi",
          model: data.model || PRICING.kimi.model,
          input_tokens: input,
          output_tokens: output,
          total_tokens: total,
          estimated_cost_usd: estimated,
          raw: data
        });
      }

      return Response.json({
        ok: response.ok,
        status: response.status,
        provider: "kimi",
        model: data.model || PRICING.kimi.model,
        usage,
        estimated_cost_usd: estimated,
        raw: data
      });
    }

    if (url.pathname === "/api/usage") {
      const range = url.searchParams.get("range") || "24h";
      const since = sinceForRange(range);

      return Response.json({
        ok: true,
        range,
        since,
        summary: await summary(env, since),
        latest: await latest(env)
      });
    }

    return env.ASSETS.fetch(request);
  }
};

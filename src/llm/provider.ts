import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Myzelva LLM Provider — Qwen via Hugging Face, no Gemini keys.
//
// Waterfall (first success wins):
//   Tier 1: Self-hosted Qwen Space  (LLM_ENDPOINT, OpenAI-compatible /v1)
//   Tier 2: HF Router              (router.huggingface.co, strong open models)
//
// Both speak the OpenAI chat-completions wire format, so one client fits all.
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask for pure JSON output (prompt-based JSON mode, since Qwen has no
   *  native responseSchema like Gemini). The raw text is still returned;
   *  callers use extractJson() to parse. */
  json?: boolean;
  /** Optional timeout (ms) per tier. Default 300000 — the free self-hosted
   *  Qwen Space can cold-start for several minutes. */
  timeoutMs?: number;
}

export interface ProviderResult {
  text: string;
  provider: "qwen-space" | "hf-router" | "none";
  model: string;
}

// ── config ───────────────────────────────────────────────────────────────────
function env(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

export function getLLMEndpoint(): string {
  return env("LLM_ENDPOINT", "https://slymun-forchi.hf.space").replace(/\/+$/, "");
}

export function getLLMModel(): string {
  return env("LLM_MODEL", "qwen2.5-7b");
}

export function getHFToken(): string {
  return env("HF_TOKEN", env("HF_ACCESS_TOKEN", ""));
}

/** True when any LLM backend is configured (used by checkApiKey()). */
export function hasLLMBackend(): boolean {
  return Boolean(getHFToken()) || Boolean(env("LLM_ENDPOINT"));
}

const HF_ROUTER = "https://router.huggingface.co/v1/chat/completions";

// Stronger open models first — the HF router serves them fast and at high quality.
const HF_ROUTER_MODELS = [
  "Qwen/Qwen3-32B",
  "Qwen/Qwen2.5-72B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "google/gemma-4-26B-A4B-it",
  "meta-llama/Llama-3.3-70B-Instruct",
];

// ── shared OpenAI-compatible call ────────────────────────────────────────────
async function chatCompletion(
  url: string,
  headers: Record<string, string>,
  model: string,
  opts: GenerateOptions
): Promise<string> {
  const jsonMode = opts.json
    ? "Respond with ONLY raw valid JSON. No markdown, no code fences, no explanations before or after."
    : "";

  const system = [opts.system, jsonMode].filter(Boolean).join("\n\n");

  const body = {
    model,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: opts.user },
    ],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1200,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 300000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${model} HTTP ${res.status}: ${errText.substring(0, 240)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${model} returned empty content`);
  return String(content).trim();
}

// ── Tier 1: self-hosted Qwen Space ───────────────────────────────────────────
/** Fire a tiny chat request so the Space BOTH wakes up AND loads the model into
 *  memory (a /v1/models ping keeps the container alive but never loads the GGUF,
 *  which is the slow 5+ min step on HF free CPU). Call this on boot and on an
 *  interval so the first real user request is fast. Returns true on success. */
export async function warmUpQwenSpace(): Promise<boolean> {
  const base = getLLMEndpoint();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getLLMModel(),
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(60 * 1000), // short — if it times out the load continues server-side
    });
    return res.ok;
  } catch {
    // Timeout is expected during a cold load; the model keeps loading on the Space.
    return false;
  }
}

async function tryQwenSpace(opts: GenerateOptions): Promise<ProviderResult | null> {
  const base = getLLMEndpoint();
  if (!base) return null;
  const model = getLLMModel();
  const attempt = async () => chatCompletion(
    `${base}/v1/chat/completions`,
    { "Content-Type": "application/json" },
    model,
    opts
  );
  try {
    console.log("[PROVIDER] Trying self-hosted Qwen Space...");
    const text = await attempt();
    console.log(`[PROVIDER] ✅ Qwen Space (${model}) succeeded`);
    return { text, provider: "qwen-space", model };
  } catch (err: any) {
    // Cold-start retry: the Space may be asleep/loading; wake it and try once more.
    console.warn(`[PROVIDER] Qwen Space attempt 1 failed: ${err?.message?.substring(0, 140)} — warming up and retrying once...`);
    await warmUpQwenSpace();
    try {
      const text = await attempt();
      console.log(`[PROVIDER] ✅ Qwen Space (${model}) succeeded after warm-up`);
      return { text, provider: "qwen-space", model };
    } catch (err2: any) {
      console.warn(`[PROVIDER] Qwen Space retry failed: ${err2?.message?.substring(0, 140)} — moving to HF router`);
      return null;
    }
  }
}

// ── Tier 2: HF router ────────────────────────────────────────────────────────
async function tryHFRouter(opts: GenerateOptions): Promise<ProviderResult | null> {
  const token = getHFToken();
  if (!token) {
    console.warn("[PROVIDER] No HF_TOKEN — skipping HF router");
    return null;
  }
  for (const model of HF_ROUTER_MODELS) {
    try {
      console.log(`[PROVIDER] Trying HF router model "${model}"...`);
      const text = await chatCompletion(
        HF_ROUTER,
        { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        model,
        opts
      );
      console.log(`[PROVIDER] ✅ HF router (${model}) succeeded`);
      return { text, provider: "hf-router", model };
    } catch (err: any) {
      console.warn(`[PROVIDER] HF router ${model} failed: ${err?.message?.substring(0, 160)} — next...`);
    }
  }
  return null;
}

// ── main entry ───────────────────────────────────────────────────────────────
/** Run the full waterfall. Returns provider "none" if nothing is configured. */
export async function generate(opts: GenerateOptions): Promise<ProviderResult> {
  const tier1 = await tryQwenSpace(opts);
  if (tier1) return tier1;

  const tier2 = await tryHFRouter(opts);
  if (tier2) return tier2;

  return { text: "", provider: "none", model: "" };
}

/** Convenience: generate and throw if no backend answered. */
export async function generateOrThrow(opts: GenerateOptions): Promise<ProviderResult> {
  const result = await generate(opts);
  if (result.provider === "none") {
    throw new Error(
      "No LLM backend available. Configure LLM_ENDPOINT or HF_TOKEN in the environment."
    );
  }
  return result;
}

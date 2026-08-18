import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// Myzelva LLM Provider — Gemini (primary, max quality) with Qwen 2.5 7B fallback.
//
// Waterfall (first success wins):
//   Tier 1: Gemini key → model waterfall (GEMINI_API_KEY / GEMINI_API_KEY_POOL).
//           Walks GEMINI_MODELS in order; when one hits a rate limit it falls
//           through to the next model, then to the next key, then to Qwen.
//   Tier 2: Qwen 2.5 7B fallback (LLM_ENDPOINT, self-hosted, OpenAI-compatible /v1)
//   Tier 3: HF Router              (router.huggingface.co, strong open models)
//
// All tiers speak the OpenAI chat-completions wire format, so one client fits.
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask for pure JSON output (prompt-based JSON mode). The raw text is still
   *  returned; callers use extractJson() to parse. */
  json?: boolean;
  /** Optional timeout (ms) per tier. Default 300000 — the free self-hosted
   *  Qwen Space can cold-start for several minutes. */
  timeoutMs?: number;
}

export interface ProviderResult {
  text: string;
  provider: "gemini" | "qwen-space" | "hf-router" | "none";
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

export function getGeminiKeys(): string[] {
  const pool = env("GEMINI_API_KEY_POOL", env("GEMINI_API_KEY", ""));
  return pool
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .filter((k) => !/^0x[0-9a-f]+$/i.test(k)); // drop crypto-wallet addresses accidentally pasted into the pool
}

/** True when any LLM backend is configured (used by checkApiKey()). */
export function hasLLMBackend(): boolean {
  return Boolean(getGeminiKeys().length) || Boolean(getHFToken()) || Boolean(env("LLM_ENDPOINT"));
}

// ── Gemini model waterfall (fast models first) ──────────────────────────────
// When a model hits its rate limit, we fall through to the next one, then to
// the next key, then to the Qwen 2.5 7B fallback.
//
// The gemini flash models are fast and reliable, so they go FIRST. The gemma
// models are "thinking" models — much slower (30-50s/call, they reason before
// answering) and prone to 503 high-demand spikes — so they're pushed to the
// back and only used when the flash models are all unavailable.
//
// NOTE: model IDs are the exact Gemini API ids (verified against
// /v1beta/models). The gemma ids carry suffixes (-it / -a4b-it) — the bare
// "gemma-4-31b" / "gemma-4-26b" ids do NOT exist and 404.
const GEMINI_MODELS = [
  "gemini-3.5-flash",          // gemini 3.5 — fast & capable (primary)
  "gemini-3.7-flash",          // 3.7
  "gemini-3.6-flash",          // 3.6 flash
  "gemini-3.1-flash-lite",     // 3.1 flash lite — fastest, huge quota (workhorse)
  "gemma-4-31b-it",            // gemma 4 31b — thinking/slow, last resort
  "gemma-4-26b-a4b-it",        // gemma 4 26b — thinking/slow, last resort
];

const GEMINI_COMPAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_REST_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
    console.log("[PROVIDER] Trying Qwen 2.5 7B fallback (self-hosted Space)...");
    const text = await attempt();
    console.log(`[PROVIDER] ✅ Qwen 2.5 7B fallback (${model}) succeeded`);
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

// ── Tier 1: Gemini (key pool × model rotation) ───────────────────────────────
/**
 * Native Gemini structured-JSON call (REST generateContent). The thinking
 * models (gemma-4-31b-it etc.) wrap prompt-JSON output in <thought>…</thought>
 * blocks and prefix stray text, which the OpenAI-compat json_object mode does
 * NOT cleanly suppress. Using the native generateContent endpoint with
 * responseMimeType:"application/json" makes the API return clean JSON directly.
 */
async function geminiNativeJson(key: string, model: string, opts: GenerateOptions): Promise<string> {
  // Thinking gemma models spend output tokens on reasoning BEFORE emitting the
  // JSON, and the app's JSON payloads can exceed ~2.5k tokens (e.g. 5 clarifying
  // questions). A small maxOutputTokens truncates the JSON (finishReason
  // MAX_TOKENS) → "Unbalanced JSON in model output". Give the gemma thinking
  // models a large budget (the model still stops at the end of the JSON);
  // non-gemma models get a generous floor too.
  const isThinkingGemma = model.startsWith("gemma-");
  const maxOutputTokens = Math.max(
    opts.maxTokens ?? 1200,
    isThinkingGemma ? 8192 : 4096
  );

  const body: any = {
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens,
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${GEMINI_REST_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 300000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${model} HTTP ${res.status}: ${errText.substring(0, 240)}`);
  }
  const data = await res.json();
  // Thinking models (gemma-4-31b-it etc.) put their reasoning in parts flagged
  // `thought: true`; the actual JSON lives in the final non-thought part(s).
  // Drop the thought parts so we only return the clean JSON.
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .filter((p: any) => !p.thought)
    .map((p: any) => p.text || "")
    .join("");
  if (!text) throw new Error(`${model} returned empty content`);
  return text.trim();
}

async function tryGemini(opts: GenerateOptions): Promise<ProviderResult | null> {
  const keys = getGeminiKeys();
  if (!keys.length) {
    console.warn("[PROVIDER] No GEMINI_API_KEY_POOL — skipping Gemini tier");
    return null;
  }
  // Round-robin keys, and for each key walk the model list (best quality first).
  for (let ki = 0; ki < keys.length; ki++) {
    const key = keys[ki];
    for (const model of GEMINI_MODELS) {
      try {
        console.log(`[PROVIDER] Trying Gemini key ${ki + 1}/${keys.length} · ${model}...`);
        // JSON requests use the NATIVE structured-output endpoint (clean JSON);
        // plain chat requests keep the OpenAI-compatible path.
        const text = opts.json
          ? await geminiNativeJson(key, model, opts)
          : await chatCompletion(
              GEMINI_COMPAT_URL,
              { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
              model,
              opts
            );
        console.log(`[PROVIDER] ✅ Gemini (${model}) on key ${ki + 1} succeeded`);
        return { text, provider: "gemini", model };
      } catch (err: any) {
        // 401/403/400 = key or model unusable — move to next model/key.
        console.warn(`[PROVIDER] Gemini ${model} key ${ki + 1} failed: ${err?.message?.substring(0, 150)}`);
      }
    }
  }
  console.warn("[PROVIDER] All Gemini keys/models exhausted — moving to fallbacks");
  return null;
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
  const tier1 = await tryGemini(opts);
  if (tier1) return tier1;

  const tier2 = await tryQwenSpace(opts);
  if (tier2) return tier2;

  const tier3 = await tryHFRouter(opts);
  if (tier3) return tier3;

  return { text: "", provider: "none", model: "" };
}

/** Convenience: generate and throw if no backend answered. */
export async function generateOrThrow(opts: GenerateOptions): Promise<ProviderResult> {
  const result = await generate(opts);
  if (result.provider === "none") {
    throw new Error(
      "No LLM backend available. Configure GEMINI_API_KEY_POOL, LLM_ENDPOINT or HF_TOKEN in the environment."
    );
  }
  return result;
}

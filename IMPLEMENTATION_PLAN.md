# Myzelva (idea-684) — Qwen/HF Implementation

**Status:** Core build complete (2026-08-17). Myzelva now runs entirely on **Qwen via
Hugging Face** — no Gemini keys. UI contracts unchanged (frontend untouched).

## What changed

- **`server.ts`** — rewritten for the current 3-endpoint architecture
  (`/api/analyze-prompt`, `/api/regenerate-prompt`, `/api/simulate-prompt`).
  All model calls go through `generateOrThrow()` in `src/llm/provider.ts`.
- **`src/llm/provider.ts`** — provider waterfall (first success wins):
  1. Self-hosted Qwen Space (`LLM_ENDPOINT`, OpenAI-compatible `/v1/chat/completions`)
  2. HF Router (`router.huggingface.co`) with stronger open models
  Includes boot warm-up + 4-min keep-alive so the free Space stays loaded.
- **`src/llm/json.ts`** — robust JSON extraction (Qwen has no native `responseSchema`).
- **`src/llm/playbooks.ts`** — auto category detection + per-category questioning
  playbooks (coding, agent, content, data, marketing, research, education, automation).
- **`analyze-prompt` is now TWO-STAGE:** (1) diagnose only → (2) generate exactly 5
  deep, category-specific clarifying questions with a specificity self-check.
- **Bug fixes:** removed undefined `getAI()` call (simulate always 500'd) and the
  missing `fs` import (learning loop dead) — both were in the old architecture and are
  resolved in this rewrite.
- **`package.json`** — removed dead `@google/genai` dependency.

## Env (`.env` / `.env.example`)

```
LLM_ENDPOINT=https://slymun-forchi.hf.space
LLM_MODEL=qwen2.5-7b
HF_TOKEN=your_huggingface_access_token_here
PORT=3000
```

## Deployment

- Render workspace already exists and auto-deploys on push to `main`.
- The local git remote was misconfigured (`my-obsidian-vault`) — fixed to
  `https://github.com/Moorejae/idea-684.git`.
- On Render, set `LLM_ENDPOINT`, `LLM_MODEL`, `HF_TOKEN` in the dashboard secrets.

## Notes / caveats (free tier)

- The self-hosted Qwen Space is free but **sleeps on inactivity** and its GGUF cold
  load takes minutes on CPU. The server pings it every 4 min to keep it warm; once warm
  requests are fast.
- The HF Router tier needs free monthly credits (`402` when exhausted) — it's a
  fallback, not required.
- Two-stage analyze = two sequential LLM calls; on a fully cold Space the first
  request can be slow. The provider retries once after a warm-up ping.

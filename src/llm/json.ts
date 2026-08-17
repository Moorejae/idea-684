/**
 * Robust JSON extraction for models WITHOUT native structured-output support
 * (Qwen via OpenAI-compatible endpoints). Handles code fences, leading text,
 * trailing text, and tries to repair common malformations.
 */

export function extractJson(text: string): any {
  const t = (text || "").trim();
  if (!t) throw new Error("Empty model output — nothing to parse.");

  // 1) Strip code fences (```json ... ``` or ``` ... ```)
  let cleaned = t.replace(/```(?:json)?/gi, "").trim();

  // 2) Find the outermost { ... } (or [ ... ]) region if surrounding noise exists
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  let openChar = "";
  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error(`No JSON object/array found in model output: ${t.substring(0, 120)}`);
  }
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    openChar = "{";
  } else {
    start = firstBracket;
    openChar = "[";
  }
  const closeChar = openChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("Unbalanced JSON in model output.");

  const candidate = cleaned.substring(start, end).trim();

  // 3) Try strict parse, then a repair pass
  try {
    return JSON.parse(candidate);
  } catch {
    // Repair pass: drop trailing commas before } or ]
    const repaired = candidate
      .replace(/,\s*([}\]])/g, "$1")
      // unquoted keys -> quoted keys (heuristic, only when parse fails)
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
    return JSON.parse(repaired);
  }
}

/** Normalize into the analysis shape the UI already expects. */
export function safeString(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function safeStringArray(v: any): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

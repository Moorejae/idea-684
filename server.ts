import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import { generateOrThrow, warmUpQwenSpace } from "./src/llm/provider.js";
import { extractJson, safeString, safeStringArray } from "./src/llm/json.js";
import {
  CATEGORY_LABELS,
  detectCategory,
  PLAYBOOKS,
  type Category,
} from "./src/llm/playbooks.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

// ── HEALTH / WAKE-ALIVE ──
// UptimeRobot pings this every 5 min to keep the free-tier Render instance awake
// (Render hibernates after ~15 min of no traffic). Keep it instant and LLM-free
// so a ping never triggers a slow model call or Vite middleware spin-up.
app.get(["/health", "/api/health"], (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ── LLM BACKEND (Qwen via Hugging Face — no Gemini keys) ──
console.log("[STARTUP] LLM backend: Qwen via Hugging Face (self-hosted Space -> HF router).");

// Wake the self-hosted Qwen Space on boot + keep it warm so the first real
// request isn't a multi-minute cold start. Free HF Spaces sleep on inactivity.
(async () => {
  try {
    const ok = await warmUpQwenSpace();
    console.log(`[WARMUP] Qwen Space ${ok ? "is awake" : "not reachable yet (will retry)"}.`);
  } catch (e: any) {
    console.warn(`[WARMUP] error: ${e?.message}`);
  }
})();
setInterval(() => {
  warmUpQwenSpace().then((ok) => {
    if (ok) console.log("[KEEPALIVE] Qwen Space ping OK");
  }).catch(() => {});
}, 4 * 60 * 1000); // every 4 min — under HF free-tier sleep thresholds

// Helper to ensure an LLM backend exists
function checkApiKey(res: express.Response) {
  const endpoint = (process.env.LLM_ENDPOINT || "").trim();
  const token = (process.env.HF_TOKEN || process.env.HF_ACCESS_TOKEN || "").trim();
  if (!endpoint && !token) {
    res.status(500).json({
      error: "No LLM backend configured. Set LLM_ENDPOINT (self-hosted Qwen Space) or HF_TOKEN in the environment."
    });
    return false;
  }
  return true;
}

// Prompt Engineering Knowledge Base (embedded in system instruction)
const CORE_PROMPT_ENGINEERING_GUIDELINES = `
You are the World's Premier Prompt Architect and Prompt Engineering Researcher.
Your expertise is built upon the published prompt engineering best practices from Google (Gemini), Anthropic (Claude), and OpenAI (GPT-4o).

When analyzing or refining a user's prompt, adhere strictly to these core research-backed rules:

1. ROLE / PERSONA: Define a highly specific persona with specialized skills, worldview, and output tone (e.g., "You are an expert full-stack developer who values modular, clean, and self-documenting code...").
2. CONTEXT / OBJECTIVE: Set a crystal clear goal. State exactly what the model should accomplish, why it matters, and who the target audience is.
3. CLEAR SEPARATION OF CONCERNS (Delimiters): Use structured headers and delimiters. For Standard/OpenAI styles, use Markdown headers and triple backticks or dashes. For Anthropic styles, use XML tags (e.g., <role>, <context>, <instructions>, <input>, <constraints>).
4. VARIABLES / PLACEHOLDERS: Use uppercase bracket placeholders like [INPUT_TEXT] or [DATA] to represent dynamic user inputs, so the prompt remains reusable.
5. EXPLICIT FORMATTING & CONSTRAINTS: Give unambiguous directions about output style, layout, length, and language. Specify "Negative Constraints" (what NOT to do, e.g., "Do not write any introductory or concluding remarks").
6. FEW-SHOT EXAMPLES (Optional but powerful): Provide structured, representative input-output pairs to guide the model's pattern matching.
7. THINKING/REASONING CAPABILITIES: Instruct the model to analyze before outputting (e.g., using <thinking> tags or step-by-step chains).
`;

// 1. Analyze prompt and produce clarifying questions + initial refined draft
//    TWO-STAGE: diagnose first, then generate only deep category-specific
//    questions grounded in the diagnosis (auto-detected build category).
app.post("/api/analyze-prompt", async (req, res) => {
  if (!checkApiKey(res)) return;

  const { prompt: userPrompt } = req.body;
  if (!userPrompt || typeof userPrompt !== "string" || !userPrompt.trim()) {
    res.status(400).json({ error: "A valid prompt string is required." });
    return;
  }

  try {
    const category: Category = detectCategory(userPrompt);
    const catLabel = CATEGORY_LABELS[category];
    const playbook = PLAYBOOKS[category];

    // ── STAGE 1: Diagnose only (no questions yet) ──
    const diagnosis = await generateOrThrow({
      system: `${CORE_PROMPT_ENGINEERING_GUIDELINES}\n\nYou are a Senior Principal Engineer and elite Prompt Architect diagnosing a rough prompt for a "${catLabel}" build.`,
      user: `Analyze this rough prompt draft for the category "${catLabel}". Produce a JSON object with exactly these fields:
- "refinedPrompt": a preliminary refined version that instantly applies basic structure (Persona, Context, Basic Constraints).
- "evaluation": array of {criteria, rating ("excellent"|"good"|"needs-improvement"), feedback}.
- "strengths": array of strings — what the user did well.
- "gaps": array of strings — critical prompt-engineering details missing or ambiguous.

Category playbook (parameters that matter for this build type — use them to find the real gaps):
${playbook.parameters.map((p) => `- ${p}`).join("\n")}

Edge cases this build type usually forgets:
${playbook.edgeCases.map((p) => `- ${p}`).join("\n")}

User's Rough Prompt:
"""
${userPrompt}
"""`,
      json: true,
      temperature: 0.4,
      maxTokens: 1400,
      timeoutMs: 90 * 1000,
    });

    const parsed = extractJson(diagnosis.text);

    // ── STAGE 2: Generate ONLY deep, category-specific clarifying questions ──
    const questionResult = await generateOrThrow({
      system: `${CORE_PROMPT_ENGINEERING_GUIDELINES}\n\nYou are a Senior Staff Engineer and elite Prompt Architect. You NEVER ask generic, surface-level questions ("Who is the audience?", "What is the tone?"). You probe deeply into architecture, edge-cases, technical constraints, and domain-specific mechanics.`,
      user: `Here is a rough prompt and its diagnosis for a "${catLabel}" build.

ROUGH PROMPT:
"""
${userPrompt}
"""

DIAGNOSIS (gaps):
- ${(parsed.gaps || []).join("\n- ") || "none listed"}

CATEGORY PARAMETERS THAT MUST BE COVERED (probe the ones the user has NOT already specified):
${playbook.parameters.map((p) => `- ${p}`).join("\n")}

GENERATE EXACTLY 5 clarifying questions. They must be:
1. SPECIFIC to this exact build — not generic, not interchangeable with another build type.
2. Probing a real missing parameter that the prompt has NOT already answered.
3. Each must include: "id" (short slug), "question", "context" (why this parameter is vital for a great AI response), "options" (3-4 pre-baked suggestions).

Self-check before answering: score each question 1-5 on (a) specificity, (b) cannot-be-answered-from-the-prompt, (c) leverage. Drop any that score under 4. Quality over quantity — exactly 5 questions.

Output ONLY a JSON object: { "clarifyingQuestions": [ {id, question, context, options} ] }`,
      json: true,
      temperature: 0.5,
      maxTokens: 1200,
      timeoutMs: 90 * 1000,
    });

    const qParsed = extractJson(questionResult.text);
    const rawQuestions = Array.isArray(qParsed?.clarifyingQuestions)
      ? qParsed.clarifyingQuestions
      : [];

    const clarifyingQuestions = rawQuestions
      .filter((q: any) => q && typeof q.id === "string" && typeof q.question === "string")
      .slice(0, 6)
      .map((q: any) => ({
        id: safeString(q.id, `q${Math.random().toString(36).slice(2, 7)}`),
        question: safeString(q.question, ""),
        context: safeString(q.context, ""),
        options: Array.isArray(q.options)
          ? q.options.filter((o: any) => typeof o === "string").slice(0, 4)
          : [],
      }));

    // Same shape the UI already expects.
    const normalizedAnalysis = {
      originalPrompt: userPrompt,
      refinedPrompt: safeString(parsed.refinedPrompt, ""),
      evaluation: Array.isArray(parsed.evaluation)
        ? parsed.evaluation.filter((e: any) => e && typeof e.criteria === "string")
        : [],
      strengths: safeStringArray(parsed.strengths),
      gaps: safeStringArray(parsed.gaps),
      clarifyingQuestions,
    };

    res.json(normalizedAnalysis);
  } catch (err: any) {
    console.error("Analysis API Error:", err);
    res.status(500).json({ error: "Failed to analyze prompt: " + err.message });
  }
});

// 2. Regenerate final prompt using answers to clarifying questions and a specific style
app.post("/api/regenerate-prompt", async (req, res) => {
  if (!checkApiKey(res)) return;

  const { originalPrompt, answers, style } = req.body;
  if (!originalPrompt || !style) {
    res.status(400).json({ error: "Missing originalPrompt or style in request body." });
    return;
  }

  const answersText = (answers || [])
    .map((a: any) => `- Question: "${a.question}"\n  Answer: "${a.answer || 'Not specified'}"`)
    .join("\n\n");

  let styleDescription = "";
  if (style === "xml") {
    styleDescription = `
    STYLE MANDATE: ANTHROPIC (XML-Structured).
    - Wrap ALL distinct sections of the prompt in descriptive XML-like tags (e.g., <role>, <context>, <instructions>, <constraints>, <variables>, <formatting_requirements>).
    - Use clear variable markers like {{VARIABLE}} inside instructions.
    - Ask the model to pre-think its answer inside a <thinking> tag to ensure depth.
    - Excellent for Claude and Gemini's larger context windows.
    `;
  } else if (style === "persona") {
    styleDescription = `
    STYLE MANDATE: DEEP PERSONA-DRIVEN.
    - Spend 1-2 paragraphs building a rich, world-class expert background, credentials, motivation, and standards of quality for the AI persona.
    - Incorporate standard task instructions and parameters into this role-based worldview.
    - Design a highly interactive, conversational tone or standard of work.
    `;
  } else if (style === "sequential") {
    styleDescription = `
    STYLE MANDATE: SEQUENTIAL CHAIN-OF-THOUGHT / FEW-SHOT.
    - Break the task down into sequential, numbered steps (e.g., "Step 1: Analyze...", "Step 2: Generate...", "Step 3: Refine...").
    - Explicitly direct the model on how to reason through each phase.
    - Include a few-shot mock example showing how the model should think or format its output.
    `;
  } else {
    styleDescription = `
    STYLE MANDATE: STANDARD MARKDOWN-DELIMITED (Universal/OpenAI style).
    - Use clean, modern Markdown headers (e.g., # System Instructions, # Core Task, # Context, # Rules & Constraints, # Target Output Format).
    - Use code blocks or blockquotes to clearly isolate parts.
    - High readability and widely applicable to all LLMs (GPT-4o, Gemini, Llama).
    `;
  }

  const systemPrompt = `
  ${CORE_PROMPT_ENGINEERING_GUIDELINES}
  
  You will synthesize a masterpiece, production-ready, highly optimized prompt.
  To do this, you must merge:
  1. The user's original rough draft.
  2. The precise answers they provided to the clarifying questions.
  3. The specific prompting style requested.
  
  ${styleDescription}
  
  Make the resulting prompt extremely professional. It should be written from the perspective of an expert user instructing an AI system. It should include clear sections, variables, and strict rules.
  `;

  try {
    const response = await generateOrThrow({
      system: systemPrompt,
      user: `Generate a fully refined, final, optimized prompt.
      
      Original User Draft:
      """
      ${originalPrompt}
      """
      
      User Answers to Clarifying Questions:
      ${answersText}
      
      Requested Format Style: ${style.toUpperCase()}

      Output ONLY a JSON object with exactly these fields:
      - "refinedPrompt": the complete, finalized, ready-to-use optimized prompt.
      - "explanation": a summary of what was added or improved based on user choices.
      - "keyAdditions": array of strings — key additions compiled directly from user answers.`,
      json: true,
      temperature: 0.4,
      maxTokens: 2200,
      timeoutMs: 120 * 1000,
    });

    const parsedResult = extractJson(response.text);

    // Server-side normalization: never trust the LLM to send a perfectly
    // shaped response. Guarantee all required fields are present.
    const normalizedResult = {
      refinedPrompt: safeString(parsedResult.refinedPrompt, "").trim()
        || "[Error: The AI did not return a refined prompt. Please try again.]",
      explanation: safeString(parsedResult.explanation, "").trim()
        || "Prompt refined successfully.",
      keyAdditions: safeStringArray(parsedResult.keyAdditions),
    };

    res.json(normalizedResult);
  } catch (err: any) {
    console.error("Regenerate API Error:", err);
    res.status(500).json({ error: "Failed to refine prompt: " + err.message });
  }
});

// 3. Simulate Prompt Sandbox: Runs the optimized prompt with mock inputs to show immediate results
app.post("/api/simulate-prompt", async (req, res) => {
  if (!checkApiKey(res)) return;

  const { prompt, userInput } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required for simulation." });
    return;
  }

  const testInput = userInput || "Provide a default or empty sample input to demonstrate.";

  try {
    // Run simulation and evaluation IN PARALLEL with Promise.all
    const [simulateResponse, evaluationResponse] = await Promise.all([
      generateOrThrow({
        system: "Execute the engineered prompt exactly as written. Do not break character. Do not include any meta-introductions about this simulation.",
        user: `=== ENGINEERED PROMPT START ===
${prompt}
=== ENGINEERED PROMPT END ===

Test Input:
${testInput}`,
        temperature: 0.7,
        maxTokens: 1500,
        timeoutMs: 90 * 1000,
      }),
      generateOrThrow({
        system: "You are a friendly, highly constructive prompt engineering validator. Be concise — under 150 words.",
        user: `You are a prompt validator. Review this engineered prompt and test input. Explain in under 150 words why this prompt is well-structured, what design elements worked well, and one small improvement the user could consider.
      
      Prompt: ${prompt}
      Test Input: ${testInput}`,
        temperature: 0.4,
        maxTokens: 300,
        timeoutMs: 60 * 1000,
      })
    ]);

    const simulatedOutput = simulateResponse.text || "No output generated.";

    res.json({
      simulatedOutput,
      analysis: evaluationResponse.text || "Highly structured layout successfully isolated instructions from variables."
    });
  } catch (err: any) {
    console.error("Simulation API Error:", err);
    res.status(500).json({ error: "Failed to simulate prompt: " + err.message });
  }
});

// ── Global JSON error handler ──
// Guarantee every response is JSON, even on an unexpected crash — an empty
// body is what makes the browser throw "unexpected end of JSON input".
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[SERVER ERROR]", err);
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(err?.status || 500).json({
    error: err?.message || "Internal server error. Please try again."
  });
});

// Serve static assets in production, hook Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

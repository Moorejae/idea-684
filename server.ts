import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// ── DIAGNOSTIC: log key status at startup so Render logs show the truth ──
const _startupKey = process.env.GEMINI_API_KEY;
console.log("[STARTUP] GEMINI_API_KEY loaded:", _startupKey ? `YES (${_startupKey.slice(0, 8)}...)` : "NO — KEY IS MISSING");

// Initialize Gemini SDK — reads key fresh on every instantiation
function getAI() {
  const key = process.env.GEMINI_API_KEY || "MOCK_KEY";
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

// Helper to ensure Gemini API Key exists — reads LIVE from process.env
function checkApiKey(res: express.Response) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    res.status(500).json({
      error: "Gemini API key is missing. Please configure it in Settings > Secrets."
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
app.post("/api/analyze-prompt", async (req, res) => {
  if (!checkApiKey(res)) return;

  const { prompt: userPrompt, category = "Basic/General" } = req.body;
  if (!userPrompt || typeof userPrompt !== "string" || !userPrompt.trim()) {
    res.status(400).json({ error: "A valid prompt string is required." });
    return;
  }

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Analyze this rough prompt draft specifically for the category: "${category}". Provide prompt-engineering diagnostic feedback, strengths, missing details (gaps), an initial refined draft, and 5 to 10 highly specific clarifying questions to gather missing parameters required for a professional ${category} build.
      
      User's Rough Prompt:
      """
      ${userPrompt}
      """`,
      config: {
        systemInstruction: `${CORE_PROMPT_ENGINEERING_GUIDELINES}\nProvide a deep, constructive analysis. Since the user selected the "${category}" category, ensure your clarifying questions are NOT generalized. They MUST be highly targeted at identifying critical technical omissions, design constraints, architecture, tech stack, or user experience details specific to ${category}. Provide 5 to 10 of these specific questions, and include suggestive options for quick user replies.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedPrompt: {
              type: Type.STRING,
              description: "A preliminary refined version of the prompt that instantly applies basic structures (Persona, Context, Basic Constraints) to show immediate improvement."
            },
            evaluation: {
              type: Type.ARRAY,
              description: "Evaluate the prompt across core prompt-engineering dimensions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  criteria: { type: Type.STRING, description: "Dimension being evaluated (e.g., Persona/Role, Objective, Constraints, Output Structure)." },
                  rating: { type: Type.STRING, description: "Must be exactly one of: 'excellent', 'good', or 'needs-improvement'" },
                  feedback: { type: Type.STRING, description: "Short, actionable feedback about how this dimension stands in the original prompt." }
                },
                required: ["criteria", "rating", "feedback"]
              }
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "What the user actually did well in their initial formulation."
            },
            gaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Critical prompt engineering details that are currently missing or ambiguous."
            },
            clarifyingQuestions: {
              type: Type.ARRAY,
              description: `5 to 10 highly relevant and specific clarifying questions targeting missing parameters for ${category}.`,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A short, unique slug (e.g., 'framework', 'constraints', 'format')." },
                  question: { type: Type.STRING, description: "The core question asking for detail." },
                  context: { type: Type.STRING, description: "A brief, friendly explanation of why this parameter is vital for a great AI response." },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3-4 helpful pre-baked option suggestions to make replying effortless."
                  }
                },
                required: ["id", "question", "context", "options"]
              }
            }
          },
          required: ["refinedPrompt", "evaluation", "strengths", "gaps", "clarifyingQuestions"]
        }
      }
    });

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedResult = JSON.parse(jsonText);

    // Normalize analysis response — ensure all array fields always exist
    const normalizedAnalysis = {
      refinedPrompt: typeof parsedResult.refinedPrompt === "string" ? parsedResult.refinedPrompt : "",
      evaluation: Array.isArray(parsedResult.evaluation)
        ? parsedResult.evaluation.filter((e: any) => e && typeof e.criteria === "string")
        : [],
      strengths: Array.isArray(parsedResult.strengths)
        ? parsedResult.strengths.filter((s: any) => typeof s === "string")
        : [],
      gaps: Array.isArray(parsedResult.gaps)
        ? parsedResult.gaps.filter((g: any) => typeof g === "string")
        : [],
      clarifyingQuestions: Array.isArray(parsedResult.clarifyingQuestions)
        ? parsedResult.clarifyingQuestions.filter((q: any) => q && typeof q.id === "string" && typeof q.question === "string")
            .map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }))
        : []
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

  const { originalPrompt, answers, style, eyenoBlueprint } = req.body;
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
  ${eyenoBlueprint ? "4. The User's Cognitive Architecture Blueprint (Eyeno)." : ""}
  
  ${styleDescription}

  ${eyenoBlueprint ? `
  =========================================
  COGNITIVE ARCHITECTURE BLUEPRINT (EYENO)
  =========================================
  This is the blueprint of how the user thinks and builds. You MUST use this as the ultimate guide to shape the logic, architecture, and constraints of the final prompt. Enforce these mental models strictly:
  """
  ${eyenoBlueprint}
  """
  ` : ""}
  
  Make the resulting prompt extremely professional. It should be written from the perspective of an expert user instructing an AI system. It should include clear sections, variables, and strict rules.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Generate a fully refined, final, optimized prompt.
      
      Original User Draft:
      """
      ${originalPrompt}
      """
      
      User Answers to Clarifying Questions:
      ${answersText}
      
      Requested Format Style: ${style.toUpperCase()}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedPrompt: { 
              type: Type.STRING, 
              description: "The complete, finalized, ready-to-use optimized prompt." 
            },
            explanation: { 
              type: Type.STRING, 
              description: "A summary of what was added or improved (e.g., persona details, output constraints, formatting schemas) based on user choices." 
            },
            keyAdditions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Bulleted list of key additions compiled directly from user answers."
            },
            suggestedTestInput: {
              type: Type.STRING,
              description: "A realistic, specific test input/scenario the user could run to validate this prompt in the sandbox. Should be context-aware based on what they are building."
            }
          },
          required: ["refinedPrompt", "explanation", "keyAdditions", "suggestedTestInput"]
        }
      }
    });

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedResult = JSON.parse(jsonText);

    // Server-side normalization: NEVER trust the LLM to send a perfectly shaped response.
    // Guarantee all required fields are present with correct types before the client ever sees it.
    const normalizedResult = {
      refinedPrompt: typeof parsedResult.refinedPrompt === "string" && parsedResult.refinedPrompt.trim()
        ? parsedResult.refinedPrompt.trim()
        : "[Error: The AI did not return a refined prompt. Please try again.]",
      explanation: typeof parsedResult.explanation === "string" && parsedResult.explanation.trim()
        ? parsedResult.explanation.trim()
        : "Prompt refined successfully.",
      keyAdditions: Array.isArray(parsedResult.keyAdditions)
        ? parsedResult.keyAdditions.filter((item: any) => typeof item === "string")
        : [],
      suggestedTestInput: typeof parsedResult.suggestedTestInput === "string" && parsedResult.suggestedTestInput.trim()
        ? parsedResult.suggestedTestInput.trim()
        : "Provide a realistic sample input to test this prompt."
    };

    res.json(normalizedResult);
    // NOTE: Learning loop has been moved to /api/simulate-prompt so that the brain
    // only learns from prompts that have been validated by a real test run.

  // NOTE: Learning loop removed from here. It now lives in /api/simulate-prompt.
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
    const ai = getAI();

    // Run simulation and evaluation IN PARALLEL with Promise.all
    // Previously sequential (2x Gemini calls back-to-back), now concurrent
    const [simulateResponse, evaluationResponse] = await Promise.all([
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          { text: `Below is a system/user prompt that has been engineered for optimal performance. Please execute it exactly as written, using the 'Test Input' provided below. Do not break character. Do not include any meta-introductions about this simulation.
        
        === ENGINEERED PROMPT START ===
        ${prompt}
        === ENGINEERED PROMPT END ===
        
        Test Input:
        ${testInput}` }
        ],
        config: { temperature: 0.7 }
      }),
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite", // Faster model for evaluation \u2014 doesn't need 2.5
        contents: `You are a prompt validator. Review this engineered prompt and test input. Explain in under 120 words why this prompt is well-structured, what design elements worked well, and one small improvement the user could consider.
      
      Prompt: ${prompt}
      Test Input: ${testInput}`,
        config: {
          systemInstruction: "You are a friendly, highly constructive prompt engineering validator. Be concise \u2014 under 120 words.",
        }
      })
    ]);

    const simulatedOutput = simulateResponse.text || "No output generated.";

    res.json({
      simulatedOutput,
      analysis: evaluationResponse.text || "Highly structured layout successfully isolated instructions from variables."
    });

    // ==========================================
    // THE CONTINUOUS LEARNING LOOP (POST-VALIDATION)
    // ==========================================
    // Only trains the AI Brain AFTER the prompt has been validated by a real simulation run.
    // This ensures quality — we only learn from prompts that have actually been tested and proven.
    (async () => {
      try {
        const ai = getAI();
        const distillRes = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: `You are the AI Brain's Distillation Engine. We just engineered and VALIDATED a highly optimized prompt.
          Extract the core architectural patterns, constraints, and mental models from BOTH the prompt AND its real-world test output.
          
          RULES:
          1. Do not summarize the prompt. Extract REUSABLE prompt engineering techniques and domain-specific build patterns.
          2. Format entirely in Markdown.
          3. CRITICAL: Wrap core concepts in double brackets like [[This]] to create Obsidian Wikilinks.
          4. Suggest a short filename at the top: FILENAME: Prompt_Pattern_Name
          
          VALIDATED PROMPT:
          """
          ${prompt}
          """

          REAL TEST OUTPUT (proof it works):
          """
          ${simulatedOutput}
          """`,
          config: { temperature: 0.4 }
        });

        let distilled = distillRes.text || "";
        let filename = "Validated_Pattern_" + Date.now();

        const filenameMatch = distilled.match(/^FILENAME:\s*(.+)/i);
        if (filenameMatch) {
          filename = filenameMatch[1].trim();
          distilled = distilled.replace(/^FILENAME:\s*(.+)\n*/i, "").trim();
        }

        distilled += "\n\n---\n**Source:** Post-Validation Learning Loop (Prompt Architect)\n**Test Input:** " + testInput + "\n**Date:** " + new Date().toISOString();

        const { createObsidianNote } = await import("./github-db.js");
        await createObsidianNote(distilled, filename);
        console.log("[LEARNING LOOP] Brain trained with validated pattern: " + filename);
      } catch (loopErr) {
        console.error("[LEARNING LOOP] Post-validation training failed:", loopErr);
      }
    })();
  } catch (err: any) {
    console.error("Simulation API Error:", err);
    res.status(500).json({ error: "Failed to simulate prompt: " + err.message });
  }
});

// 4. Audio Transcription Endpoint
app.post("/api/transcribe", async (req, res) => {
  if (!checkApiKey(res)) return;

  const { audioBase64 } = req.body;
  if (!audioBase64) {
    res.status(400).json({ error: "No audio data provided." });
    return;
  }

  try {
    // Strip the data URL prefix if it exists (e.g., "data:audio/webm;base64,...")
    const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, "");

    const response = await getAI().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        { text: "Transcribe the following audio accurately. Reply ONLY with the transcribed text. Do not add any introductory or concluding remarks. If it's completely silent or unintelligible, just reply with '[Inaudible]'" },
        { inlineData: { mimeType: "audio/webm", data: base64Data } }
      ]
    });

    const transcription = response.text || "";
    res.json({ transcription: transcription.trim() });
  } catch (err: any) {
    console.error("Transcription API Error:", err);
    res.status(500).json({ error: "Failed to transcribe audio: " + err.message });
  }
});

// 5. Second Brain Endpoints (Obsidian Graph DB)
import { createObsidianNote, getAllObsidianNotes } from "./github-db.js";

// A. Query the Obsidian Brain
app.get("/api/brain-query", async (req, res) => {
  if (!checkApiKey(res)) return;
  const query = (req.query.query as string) || "";
  try {
    const memoryBank = await getAllObsidianNotes();
    
    if (!memoryBank || memoryBank.length === 0) {
      return res.json({ idea: "No memory found in the Obsidian vault. Feed the brain first!" });
    }

    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    let bestMemory = null;
    let highestScore = -1;

    for (const mem of memoryBank) {
      const contentLower = (mem.content || "").toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) score++;
      }
      if (score > highestScore) {
        highestScore = score;
        bestMemory = mem;
      }
    }

    if (highestScore > 0 && bestMemory) {
      return res.json({ idea: `Extracted Idea from [${bestMemory.name}]:\n\n${bestMemory.content}` });
    }
    
    return res.json({ idea: "No strongly related ideas found in the brain." });
  } catch (error) {
    console.error("Brain Query Error:", error);
    return res.json({ idea: "No strongly related ideas found in the brain due to an error." });
  }
});

// B. Ingest Raw Data into Obsidian Brain
app.post("/api/brain-ingest", async (req, res) => {
  if (!checkApiKey(res)) return;
  
  const { rawData, source } = req.body;
  if (!rawData) {
    res.status(400).json({ error: "rawData is required to feed the brain." });
    return;
  }

  try {
    // 1. Distill raw data using Gemini into Obsidian Markdown
    const response = await getAI().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `You are the AI Brain's Distillation Engine. Extract the fundamental facts, core principles, and useful knowledge from the raw text.

      RULES:
      1. Do not summarize or add hallucinations. Just extract the clean, usable data.
      2. Format the output entirely in Markdown.
      3. CRITICAL: Whenever you mention a core concept, entity, or recurring theme, wrap it in double brackets like [[This]] to create an Obsidian Wikilink. This is how the brain connects dots.
      4. Suggest a short, safe filename for this note at the very top of your response in this exact format:
         FILENAME: Concept_Name
      
      RAW DATA:
      """
      ${rawData}
      """`,
      config: {
        temperature: 0.3,
      }
    });

    let distilledContent = response.text || "";
    let filename = "";

    // Extract the suggested filename if provided
    const filenameMatch = distilledContent.match(/^FILENAME:\s*(.+)/i);
    if (filenameMatch) {
      filename = filenameMatch[1].trim();
      // Remove the filename line from the actual content
      distilledContent = distilledContent.replace(/^FILENAME:\s*(.+)\n*/i, "").trim();
    }

    // Append source meta-data
    distilledContent += `\n\n---\n**Source:** ${source || "Manual Feed"}\n**Date:** ${new Date().toISOString()}`;

    // 2. Save distilled dots to Obsidian GitHub Repo
    await createObsidianNote(distilledContent, filename);

    res.json({ success: true, message: "Raw data distilled and committed to the Obsidian Vault!" });
  } catch (err: any) {
    console.error("Brain Ingest Error:", err);
    res.status(500).json({ error: "Failed to ingest data: " + err.message });
  }
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


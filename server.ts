import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK safely
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to ensure Gemini API Key exists
function checkApiKey(res: express.Response) {
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
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

  const { prompt: userPrompt } = req.body;
  if (!userPrompt || typeof userPrompt !== "string" || !userPrompt.trim()) {
    res.status(400).json({ error: "A valid prompt string is required." });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this rough prompt draft and provide prompt-engineering diagnostic feedback, strengths, missing details (gaps), an initial refined draft, and 3-4 specific clarifying questions to gather missing parameters.
      
      User's Rough Prompt:
      """
      ${userPrompt}
      """`,
      config: {
        systemInstruction: `${CORE_PROMPT_ENGINEERING_GUIDELINES}\nProvide a deep, constructive analysis. Make sure the clarifying questions you ask are highly effective, targeted at identifying critical omissions (like target technology, user constraints, output format, or persona details) and include suggestive options for quick user replies.`,
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
              description: "3-4 highly relevant clarifying questions to help the user specify crucial details.",
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
    res.json(parsedResult);
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
            }
          },
          required: ["refinedPrompt", "explanation", "keyAdditions"]
        }
      }
    });

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedResult = JSON.parse(jsonText);
    res.json(parsedResult);
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
    // We will run the newly optimized prompt as a system/user instruction, and feed it the test input.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: `Below is a system/user prompt that has been engineered for optimal performance. Please execute it exactly as written, using the 'Test Input' provided below. Do not break character. Do not include any meta-introductions about this simulation.
        
        === ENGINEERED PROMPT START ===
        ${prompt}
        === ENGINEERED PROMPT END ===
        
        Test Input:
        ${testInput}` }
      ],
      config: {
        temperature: 0.7,
      }
    });

    const simulatedOutput = response.text || "No output generated.";

    // Now, run a secondary quick call to evaluate why this prompt worked so well!
    const evaluationResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a prompt validator. Review this engineered prompt, the test input used, and the generated response. Tell us why this prompt succeeded, what design elements worked well, and any tiny tweak the user might consider.
      
      Prompt:
      ${prompt}
      
      Test Input:
      ${testInput}
      
      Output:
      ${simulatedOutput}`,
      config: {
        systemInstruction: "You are a friendly, highly constructive prompt engineering validator. Provide a short, structured evaluation under 150 words.",
      }
    });

    res.json({
      simulatedOutput,
      analysis: evaluationResponse.text || "Highly structured layout successfully isolated instructions from variables."
    });
  } catch (err: any) {
    console.error("Simulation API Error:", err);
    res.status(500).json({ error: "Failed to simulate prompt: " + err.message });
  }
});

// 4. Second Brain Query Endpoint
import fs from "fs";
app.get("/api/brain-query", (req, res) => {
  const query = (req.query.query as string) || "";
  try {
    const wikiDir = path.join(process.cwd(), "brain", "wiki");
    if (!fs.existsSync(wikiDir)) {
      return res.json({ idea: "No strongly related ideas found in the brain. Feed the brain first!" });
    }
    
    const files = fs.readdirSync(wikiDir).filter(f => f.endsWith(".md"));
    let bestFile = "";
    let highestScore = -1;
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    for (const file of files) {
      const content = fs.readFileSync(path.join(wikiDir, file), "utf8");
      const contentLower = content.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) score++;
      }
      if (score > highestScore) {
        highestScore = score;
        bestFile = file;
      }
    }

    if (highestScore > 0 && bestFile) {
      const content = fs.readFileSync(path.join(wikiDir, bestFile), "utf8");
      return res.json({ idea: `Extracted Idea from [${bestFile}]:\n\n${content.substring(0, 800)}...` });
    }
    
    return res.json({ idea: "No strongly related ideas found in the brain." });
  } catch (error) {
    console.error("Brain Query Error:", error);
    return res.json({ idea: "No strongly related ideas found in the brain." });
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

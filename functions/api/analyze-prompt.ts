export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    const userPrompt = body.prompt;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "A valid prompt string is required." }), { status: 400 });
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is missing. Please configure it in Cloudflare." }), { status: 500 });
    }

    const CORE_PROMPT_ENGINEERING_GUIDELINES = `
You are the World's Premier Prompt Architect and Prompt Engineering Researcher. 
Your expertise is built upon the published prompt engineering best practices from Google (Gemini), Anthropic (Claude), and OpenAI (GPT-4o).

When analyzing or refining a user's prompt, adhere strictly to these core research-backed rules:

1. ROLE / PERSONA: Define a highly specific persona with specialized skills, worldview, and output tone.
2. CONTEXT / OBJECTIVE: Set a crystal clear goal. State exactly what the model should accomplish.
3. CLEAR SEPARATION OF CONCERNS (Delimiters): Use structured headers and delimiters.
4. VARIABLES / PLACEHOLDERS: Use uppercase bracket placeholders like [INPUT_TEXT].
5. EXPLICIT FORMATTING & CONSTRAINTS: Give unambiguous directions. Specify "Negative Constraints".
6. FEW-SHOT EXAMPLES: Provide structured, representative input-output pairs.
7. THINKING/REASONING CAPABILITIES: Instruct the model to analyze before outputting.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            { text: `${CORE_PROMPT_ENGINEERING_GUIDELINES}\nProvide a deep, constructive analysis. Make sure the clarifying questions you ask are highly effective, targeted at identifying critical omissions and include suggestive options for quick user replies.` }
          ]
        },
        contents: [
          {
            parts: [
              { text: `Analyze this rough prompt draft and provide prompt-engineering diagnostic feedback, strengths, missing details (gaps), an initial refined draft, and 3-4 specific clarifying questions to gather missing parameters.\n\nUser's Rough Prompt:\n"""\n${userPrompt}\n"""` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              refinedPrompt: { type: "STRING" },
              evaluation: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    criteria: { type: "STRING" },
                    rating: { type: "STRING" },
                    feedback: { type: "STRING" }
                  },
                  required: ["criteria", "rating", "feedback"]
                }
              },
              strengths: { type: "ARRAY", items: { type: "STRING" } },
              gaps: { type: "ARRAY", items: { type: "STRING" } },
              clarifyingQuestions: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    question: { type: "STRING" },
                    context: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } }
                  },
                  required: ["id", "question", "context", "options"]
                }
              }
            },
            required: ["refinedPrompt", "evaluation", "strengths", "gaps", "clarifyingQuestions"]
          }
        }
      })
    });

    const data = await response.json();
    let jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

    return new Response(jsonText, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

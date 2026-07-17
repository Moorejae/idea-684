export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    const { originalPrompt, answers, style } = body;

    if (!originalPrompt || !style) {
      return new Response(JSON.stringify({ error: "Missing originalPrompt or style in request body." }), { status: 400 });
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is missing. Please configure it in Cloudflare." }), { status: 500 });
    }

    const answersText = (answers || [])
      .map((a) => `- Question: "${a.question}"\n  Answer: "${a.answer || 'Not specified'}"`)
      .join("\n\n");

    let styleDescription = "";
    if (style === "xml") {
      styleDescription = `STYLE MANDATE: ANTHROPIC (XML-Structured). Wrap distinct sections in XML-like tags (<role>, <context>, etc).`;
    } else if (style === "persona") {
      styleDescription = `STYLE MANDATE: DEEP PERSONA-DRIVEN. Spend 1-2 paragraphs building an expert background.`;
    } else if (style === "sequential") {
      styleDescription = `STYLE MANDATE: SEQUENTIAL CHAIN-OF-THOUGHT / FEW-SHOT. Break the task down into sequential numbered steps.`;
    } else {
      styleDescription = `STYLE MANDATE: STANDARD MARKDOWN-DELIMITED. Use clean Markdown headers.`;
    }

    const systemPrompt = `You will synthesize a masterpiece, production-ready, highly optimized prompt. Merge the user's original draft, their precise answers, and the requested style.\n${styleDescription}\nMake the resulting prompt extremely professional, including clear sections, variables, and strict rules.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          parts: [{ text: `Generate a fully refined, final, optimized prompt.\n\nOriginal User Draft:\n"""\n${originalPrompt}\n"""\n\nUser Answers to Clarifying Questions:\n${answersText}\n\nRequested Format Style: ${style.toUpperCase()}` }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              refinedPrompt: { type: "STRING" },
              explanation: { type: "STRING" },
              keyAdditions: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["refinedPrompt", "explanation", "keyAdditions"]
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

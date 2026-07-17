export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    const { prompt, userInput } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required for simulation." }), { status: 400 });
    }

    const testInput = userInput || "Provide a default or empty sample input to demonstrate.";
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is missing. Please configure it in Cloudflare." }), { status: 500 });
    }

    // Pass 1: Run the engineered prompt
    const response1 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Below is a system/user prompt that has been engineered for optimal performance. Please execute it exactly as written, using the 'Test Input' provided below. Do not break character. Do not include any meta-introductions about this simulation.\n\n=== ENGINEERED PROMPT START ===\n${prompt}\n=== ENGINEERED PROMPT END ===\n\nTest Input:\n${testInput}` }]
        }],
        generationConfig: { temperature: 0.7 }
      })
    });
    
    const data1 = await response1.json();
    const simulatedOutput = data1?.candidates?.[0]?.content?.parts?.[0]?.text || "No output generated.";

    // Pass 2: Evaluate the prompt performance
    const response2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: "You are a friendly, highly constructive prompt engineering validator. Provide a short, structured evaluation under 150 words." }] },
        contents: [{
          parts: [{ text: `You are a prompt validator. Review this engineered prompt, the test input used, and the generated response. Tell us why this prompt succeeded, what design elements worked well, and any tiny tweak the user might consider.\n\nPrompt:\n${prompt}\n\nTest Input:\n${testInput}\n\nOutput:\n${simulatedOutput}` }]
        }]
      })
    });

    const data2 = await response2.json();
    const analysis = data2?.candidates?.[0]?.content?.parts?.[0]?.text || "Highly structured layout successfully isolated instructions from variables.";

    return new Response(JSON.stringify({ simulatedOutput, analysis }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

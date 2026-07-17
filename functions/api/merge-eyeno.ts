export async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    const { mainPrompt, eyenoPrompt } = body;

    if (!mainPrompt || !eyenoPrompt) {
      return new Response(JSON.stringify({ error: "Both mainPrompt and eyenoPrompt are required." }), { status: 400 });
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key is missing." }), { status: 500 });
    }

    const systemPrompt = `You are the World's Premier Prompt Architect. 
Your task is to merge two highly-engineered prompts into ONE ultimate, unified masterpiece prompt.

PROMPT A (The User's Core Intent):
"""
${mainPrompt}
"""

PROMPT B (Eyeno's Support Perspective - derived from internal knowledge):
"""
${eyenoPrompt}
"""

Instructions:
1. Identify the core goal of Prompt A.
2. Identify the unique insights, structures, and knowledge embedded in Prompt B.
3. Seamlessly weave the unique knowledge from B into the structural framework of A.
4. Output ONLY the final, merged, highly-professional prompt without any introductory or concluding remarks. Make it cohesive.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.5 }
      })
    });

    const data = await response.json();
    const mergedPrompt = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(JSON.stringify({ mergedPrompt }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

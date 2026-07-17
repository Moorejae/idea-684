// Cloudflare Pages Function
import brainData from "./brain-data.json";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('query') || '';

  try {
    if (!brainData || brainData.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        idea: null 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let bestFile = '';
    let highestScore = -1;
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    for (const node of brainData) {
      const contentLower = node.content.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) score++;
      }
      if (score > highestScore) {
        highestScore = score;
        bestFile = node.file;
      }
    }

    if (highestScore > 0 && bestFile) {
      const bestNode = brainData.find(n => n.file === bestFile);
      const rawContext = bestNode.content.substring(0, 3000);
      
      const apiKey = context.env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ success: true, idea: "Eyeno is offline: No API Key." }), { headers: { 'Content-Type': 'application/json' }});
      }

      // Generate Eyeno's specialized prompt based on the context
      const systemPrompt = `You are 'Eyeno', the user's highly intelligent AI Second Brain.
Your goal is to act as a specialized support agent. The user is trying to write a prompt:
"${query}"

You have the following internal knowledge/context from your memory vault regarding this topic:
"""
${rawContext}
"""

Based strictly on your internal knowledge and the user's intent, generate a highly detailed, professional prompt. This is YOUR implementation plan/prompt. Make it structured, insightful, and entirely driven by the knowledge provided above. Do not introduce yourself, just output the prompt.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.4 }
        })
      });

      const data = await response.json();
      const eyenoPrompt = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Eyeno failed to generate a perspective.";

      return new Response(JSON.stringify({ 
        success: true, 
        idea: eyenoPrompt 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, idea: null }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: true, 
      idea: "Eyeno Engine offline." 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

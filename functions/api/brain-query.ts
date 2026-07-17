// Cloudflare Pages Function
import brainData from "./brain-data.json";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('query') || '';

  try {
    if (!brainData || brainData.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        idea: "No strongly related ideas found in the brain. Feed the brain first!" 
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
      return new Response(JSON.stringify({ 
        success: true, 
        idea: `Extracted Idea from [${bestFile}]:\n\n${bestNode.content.substring(0, 800)}...` 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, idea: "No strongly related ideas found in the brain." }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: true, 
      idea: "Brain Engine offline. Please rebuild the project to compile brain data." 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

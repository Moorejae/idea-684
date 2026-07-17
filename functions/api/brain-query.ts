// Cloudflare Pages Function
// Since fs is not available in edge workers natively, this is simulated for local dev or uses a bundled JSON.
// For true Cloudflare production, you would bind this to a KV namespace or D1 database.
// Here we use a dynamic import workaround or mock the response if fs fails.

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('query') || '';

  try {
    // Attempt local FS retrieval if running locally via wrangler dev
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    
    // In typical Pages setup, cwd is the project root during local dev
    const wikiDir = path.join(process.cwd(), 'brain', 'wiki');
    const files = await fs.readdir(wikiDir);
    
    let bestFile = '';
    let highestScore = -1;
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(wikiDir, file), 'utf8');
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
      const content = await fs.readFile(path.join(wikiDir, bestFile), 'utf8');
      return new Response(JSON.stringify({ 
        success: true, 
        idea: `Extracted Idea from [${bestFile}]:\n\n${content.substring(0, 800)}...` 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, idea: "No strongly related ideas found in the brain." }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Fallback for edge deployment where node:fs is disabled
    return new Response(JSON.stringify({ 
      success: true, 
      idea: "Brain Wiki is running in Edge Mode. (Please bind Cloudflare KV for production retrieval)." 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

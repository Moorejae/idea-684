import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

// Ensure you have GEMINI_API_KEY in your .env
const ai = new GoogleGenAI({});

const BRAIN_DIR = path.join(process.cwd(), 'brain');
const RAW_DIR = path.join(BRAIN_DIR, 'raw');
const RAW_IMAGES_DIR = path.join(BRAIN_DIR, 'raw_images');
const WIKI_DIR = path.join(BRAIN_DIR, 'wiki');

const MAX_IMAGES = 5;

/**
 * Intelligent appending without overriding existing knowledge.
 */
async function appendToWiki(topic: string, newInsights: string) {
    const safeTopic = topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filePath = path.join(WIKI_DIR, `${safeTopic}.md`);
    
    if (fs.existsSync(filePath)) {
        const existingContent = fs.readFileSync(filePath, 'utf8');
        // Synthesize existing and new insights
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `You are a knowledge synthesis engine. 
Existing knowledge:
${existingContent}

New insights to append:
${newInsights}

Task: Merge this knowledge intelligently. Do not destroy or override existing perspectives. Add the new insights logically, creating new sections or bullet points. Output the merged markdown.`,
        });
        const merged = response.text || '';
        fs.writeFileSync(filePath, merged);
        console.log(`[Brain] Appended and synthesized knowledge in ${safeTopic}.md`);
    } else {
        fs.writeFileSync(filePath, `# ${topic}\n\n${newInsights}`);
        console.log(`[Brain] Created new knowledge node: ${safeTopic}.md`);
    }
}

/**
 * Parses an image to extract structural UI builds or concepts.
 */
async function ingestImage(filePath: string, fileName: string) {
    console.log(`[Brain] Parsing image: ${fileName}`);
    try {
        const imagePart = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
                mimeType: "image/png" // assuming png/jpeg, can be improved
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                imagePart,
                "Analyze this image. If it's a UI build or mockup, describe its structural components, layout, and intent in detail. If it's a diagram, extract its concepts. Output a structured markdown description."
            ]
        });

        await appendToWiki(`Image_Analysis_${fileName.split('.')[0]}`, response.text || '');
        
    } catch (e) {
        console.error(`[Brain] Error parsing image ${fileName}`, e);
    }
}

/**
 * Ingests a text artifact.
 */
async function ingestText(filePath: string, fileName: string) {
    console.log(`[Brain] Parsing text artifact: ${fileName}`);
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Analyze the following raw data and extract the core concepts, entities, and architectural insights.
Return a JSON array of objects with 'topic' and 'insights' properties.
Data: ${content.substring(0, 15000)}`
        });

        // Strip markdown fences if present
        let jsonStr = response.text || '[]';
        if (jsonStr.startsWith('\`\`\`json')) {
            jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        } else if (jsonStr.startsWith('\`\`\`')) {
            jsonStr = jsonStr.replace(/\`\`\`/g, '');
        }

        const concepts = JSON.parse(jsonStr.trim());
        for (const concept of concepts) {
            await appendToWiki(concept.topic, concept.insights);
        }
    } catch (e) {
        console.error(`[Brain] Error parsing text ${fileName}`, e);
    }
}

/**
 * Automates storage management by clearing raw images.
 */
function manageStorage() {
    const images = fs.readdirSync(RAW_IMAGES_DIR).filter(f => f !== '.gitkeep');
    if (images.length > MAX_IMAGES) {
        console.log(`[Brain] Threshold reached (${images.length} > ${MAX_IMAGES}). Clearing raw images to save storage...`);
        for (const img of images) {
            fs.unlinkSync(path.join(RAW_IMAGES_DIR, img));
        }
        console.log('[Brain] Storage cleared. Extracted knowledge remains in wiki safely.');
    }
}

/**
 * Token-optimized Semantic Cache lookup (Retrieval).
 * For a given query, finds the most relevant knowledge node locally.
 */
export async function retrieveBrainIdea(query: string): Promise<string> {
    const files = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith('.md'));
    if (files.length === 0) return "No ingested knowledge available yet.";

    // Simplistic local semantic scoring: find matching keywords locally to save tokens
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    let bestFile = '';
    let highestScore = -1;

    for (const file of files) {
        const content = fs.readFileSync(path.join(WIKI_DIR, file), 'utf8');
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
        // Return exactly the relevant chunk to save LLM tokens
        const content = fs.readFileSync(path.join(WIKI_DIR, bestFile), 'utf8');
        return `Extracted Idea from ${bestFile}:\n${content.substring(0, 1500)}`;
    }

    return "No strongly related ideas found in the brain.";
}

/**
 * Main Ingestion Loop
 */
export async function runIngestion() {
    console.log('[Brain] Starting intensive brain ingestion engine...');
    
    // Process Images
    if (fs.existsSync(RAW_IMAGES_DIR)) {
        const images = fs.readdirSync(RAW_IMAGES_DIR).filter(f => f !== '.gitkeep');
        for (const img of images) {
            await ingestImage(path.join(RAW_IMAGES_DIR, img), img);
        }
        manageStorage();
    }

    // Process Text
    if (fs.existsSync(RAW_DIR)) {
        const texts = fs.readdirSync(RAW_DIR).filter(f => f !== '.gitkeep');
        for (const txt of texts) {
            await ingestText(path.join(RAW_DIR, txt), txt);
            // Optionally delete raw text after processing, or keep it.
        }
    }

    console.log('[Brain] Ingestion complete. Knowledge compounded.');
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runIngestion();
}

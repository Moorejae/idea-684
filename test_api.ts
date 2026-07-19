import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6IER17346RDS6I0NrvrQPBooQQSqHYQfSji8Uyv3jSv2A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" // I'll use the user's gemini key from the docx!
});

const CORE_PROMPT_ENGINEERING_GUIDELINES = `...`; // omitted for brevity

async function run() {
  const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this rough prompt draft and provide prompt-engineering diagnostic feedback, strengths, missing details (gaps), an initial refined draft, and 3-4 specific clarifying questions to gather missing parameters.
      
      User's Rough Prompt:
      """
      Make me a react component
      """`,
      config: {
        systemInstruction: "test",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedPrompt: { type: Type.STRING },
            evaluation: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criteria: { type: Type.STRING },
                  rating: { type: Type.STRING },
                  feedback: { type: Type.STRING }
                },
                required: ["criteria", "rating", "feedback"]
              }
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            clarifyingQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  context: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "question", "context", "options"]
              }
            }
          },
          required: ["refinedPrompt", "evaluation", "strengths", "gaps", "clarifyingQuestions"]
        }
      }
    });
    console.log(response.text);
}
run();

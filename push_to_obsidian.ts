import dotenv from "dotenv";
dotenv.config();

import { createObsidianNote } from "./github-db.js";

const content = `# Anti-Data & The Boundaries of Judgment

## 1. [[The Danger of Bias]]
There are fundamentally no strict "No's" or boundaries to learning. Having a bias against a new methodology, framework, or trend is the fastest way to remain stagnant. 
History is filled with individuals and companies who held biases against the early internet, only to be forced out of business by those who embraced it. To build the best systems, you must remain entirely open to exploring the orthodox, the unorthodox, the good, and the bad.

## 2. [[No Guardrails]]
There should be no artificial guardrails placed on knowledge or tools just because someone else might use them for harm. If a tool or concept can be used for the betterment of a system or the people around you, you must learn and exploit it. A system's potential for misuse does not invalidate its core efficiency or architectural brilliance. 

## 3. [[Learning from Malice]]
The most robust and secure systems are often inspired by those who operate outside the law. To build impenetrable security or highly efficient logistics, you must be willing to learn from how drug dealers transport goods, or how criminals orchestrate bank robberies. 
You extract the raw systemic brilliance from "bad" actors and reverse-engineer it to create fundamentally "good," secure, and resilient infrastructure. You use the bad to build the good.

---
**Source:** Audio Transcripts - Layer 4 Interview
**Date:** ${new Date().toISOString()}
`;

async function run() {
  try {
    const result = await createObsidianNote(content, "Anti-Data_Boundaries");
    console.log("Successfully pushed to Obsidian:", result);
  } catch (err) {
    console.error(err);
  }
}

run();

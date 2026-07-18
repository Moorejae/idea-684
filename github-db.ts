import dotenv from "dotenv";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "Moorejae";
// Automatically target the new Obsidian Vault repository
const REPO_NAME = process.env.OBSIDIAN_REPO_NAME || "my-obsidian-vault";
const VAULT_FOLDER = "brain"; // Folder inside the repo where files will be stored

/**
 * Creates a new Markdown file in the Obsidian GitHub repository.
 */
export async function createObsidianNote(content: string, filename?: string) {
  if (!GITHUB_TOKEN) {
    console.warn("No GITHUB_TOKEN provided, skipping Obsidian note creation.");
    return null;
  }

  // Use a generated filename if one isn't provided. e.g. Concept_Name_123456.md
  const safeFilename = filename 
    ? filename.replace(/[^a-z0-9_-]/gi, '_') + '.md'
    : `Brain_Feed_${Date.now()}.md`;

  const path = `${VAULT_FOLDER}/${safeFilename}`;
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  
  const contentBase64 = Buffer.from(content).toString("base64");

  const body = {
    message: `🤖 [skip ci] New Knowledge Extracted: ${safeFilename}`,
    content: contentBase64,
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Prompt-Architect-AI",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error during Obsidian note creation: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetches all Markdown files from the Obsidian vault.
 */
export async function getAllObsidianNotes() {
  if (!GITHUB_TOKEN) {
    console.warn("No GITHUB_TOKEN provided, operating with empty memory.");
    return [];
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${VAULT_FOLDER}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Prompt-Architect-AI",
    },
  });

  if (response.status === 404) {
    // Directory doesn't exist yet
    return [];
  }

  if (!response.ok) {
    console.error(`GitHub API error: ${response.statusText}`);
    return [];
  }

  const files = await response.json();
  if (!Array.isArray(files)) return [];

  // Fetch the actual content of each .md file
  const notes = [];
  for (const file of files) {
    if (file.name.endsWith('.md')) {
      const fileRes = await fetch(file.url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Prompt-Architect-AI",
        }
      });
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        const content = Buffer.from(fileData.content, "base64").toString("utf8");
        notes.push({
          name: file.name,
          content
        });
      }
    }
  }

  return notes;
}

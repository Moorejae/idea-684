import dotenv from "dotenv";

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
// Update these if your repository is under a different username or name
const REPO_OWNER = "Moorejae";
const REPO_NAME = "idea-684";
const MEMORY_FILE_PATH = "data/memory.json";

export async function getMemory() {
  if (!GITHUB_TOKEN) {
    console.warn("No GITHUB_TOKEN provided, operating with empty memory.");
    return { data: [], sha: null };
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${MEMORY_FILE_PATH}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Prompt-Architect-AI",
    },
  });

  if (response.status === 404) {
    return { data: [], sha: null };
  }

  if (!response.ok) {
    console.error(`GitHub API error: ${response.statusText}`);
    return { data: [], sha: null };
  }

  const result = await response.json();
  const content = Buffer.from(result.content, "base64").toString("utf8");
  return { data: JSON.parse(content), sha: result.sha };
}

export async function updateMemory(newData: any) {
  if (!GITHUB_TOKEN) {
    console.warn("No GITHUB_TOKEN provided, skipping memory save.");
    return null;
  }

  const { data: currentData, sha } = await getMemory();
  
  // Append new data
  const updatedData = [...currentData, {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...newData
  }];
  
  const contentBase64 = Buffer.from(JSON.stringify(updatedData, null, 2)).toString("base64");

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${MEMORY_FILE_PATH}`;
  
  const body = {
    message: "🤖 [skip ci] AI Memory Update",
    content: contentBase64,
    ...(sha && { sha }), // Only include sha if it exists (updating existing file)
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
    throw new Error(`GitHub API error during update: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

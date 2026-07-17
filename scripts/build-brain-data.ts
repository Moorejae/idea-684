import fs from "fs";
import path from "path";

const WIKI_DIR = path.join(process.cwd(), "brain", "wiki");
const OUT_FILE = path.join(process.cwd(), "functions", "api", "brain-data.ts");

let data = [];
if (fs.existsSync(WIKI_DIR)) {
  const files = fs.readdirSync(WIKI_DIR).filter(f => f.endsWith(".md"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(WIKI_DIR, file), "utf8");
    data.push({ file, content });
  }
}
fs.writeFileSync(OUT_FILE, `export default ${JSON.stringify(data, null, 2)};`);
console.log("[Build] Brain data compiled to brain-data.ts");

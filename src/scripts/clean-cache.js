import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const isAll = process.argv.includes("--all");

// Targets to clear on startup
const targets = [
  path.join(rootDir, ".next", "cache"),
  path.join(rootDir, ".next", "dev"),
];

if (isAll) {
  targets.push(path.join(rootDir, ".next"));
}

console.log("🧹 [Mahila Action] Clearing Next.js cache before startup...");

for (const target of targets) {
  try {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      console.log(`   ✓ Removed: ${path.relative(rootDir, target)}`);
    }
  } catch (err) {
    console.warn(`   ⚠️ Could not clear ${path.relative(rootDir, target)} (${err.message})`);
  }
}

console.log("✨ Cache clean complete! Starting application...\n");


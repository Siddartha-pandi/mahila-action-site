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

// Ensure directory structure exists on Windows to prevent sandbox mkdir EPERM race conditions
try {
  const baseDirs = [
    path.join(rootDir, ".next", "types"),
    path.join(rootDir, ".next", "server", "app"),
    path.join(rootDir, ".next", "server", "chunks"),
    path.join(rootDir, ".next", "server", "vendor-chunks"),
    path.join(rootDir, ".next", "server", "app", "_global-error.segments", "_global-error"),
    path.join(rootDir, ".next", "server", "app", "_not-found.segments", "_not-found"),
    path.join(rootDir, ".next", "static", "chunks", "app"),
    path.join(rootDir, ".next", "static", "chunks", "pages"),
    path.join(rootDir, ".next", "static", "css"),
    path.join(rootDir, ".next", "static", "media"),
  ];

  for (const d of baseDirs) {
    fs.mkdirSync(d, { recursive: true });
  }

  const srcApp = path.join(rootDir, "src", "app");
  if (fs.existsSync(srcApp)) {
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          const rel = path.relative(srcApp, fullPath);
          for (const prefix of [
            path.join(rootDir, ".next", "server", "app"),
            path.join(rootDir, ".next", "static", "chunks", "app"),
            path.join(rootDir, ".next", "types", "app"),
          ]) {
            fs.mkdirSync(path.join(prefix, rel), { recursive: true });
          }
          walk(fullPath);
        }
      }
    };
    walk(srcApp);
  }
} catch (err) {
  console.warn(`   ⚠️ Directory pre-creation warning: ${err.message}`);
}

console.log("✨ Cache clean complete! Starting application...\n");

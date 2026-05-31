const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const backendRoot = path.resolve(__dirname, "..");
const ignoredDirs = new Set(["node_modules"]);
const ignoredFiles = new Set(["package-lock.json"]);

const findJavaScriptFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...findJavaScriptFiles(fullPath));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js") && !ignoredFiles.has(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
};

const jsFiles = findJavaScriptFiles(backendRoot);
let hasError = false;

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    hasError = true;
  }
}

if (hasError) {
  console.error("Backend syntax check failed.");
  process.exit(1);
}

console.log(`Backend syntax check passed (${jsFiles.length} files).`);

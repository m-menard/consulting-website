const fs = require("fs");
const path = require("path");

const destDir = process.argv[2];
if (!destDir) {
  console.error("Usage: node clean-replit-refs.cjs <dest-dir>");
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  console.error(`Directory not found: ${destDir}`);
  process.exit(1);
}

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "package-lock.json"]);

const REPLIT_IMPORT_RE = /^.*(?:import|require)\s*\(?\s*['"]@replit\/[^'"]+['"]\s*\)?\s*;?\s*$/gm;

const REPLIT_ENV_RE = /(?:process\.env\.)?(?:REPL_SLUG|REPL_OWNER|REPLIT_DEV_DOMAIN|REPL_ID|REPLIT_DB_URL|REPLIT_DOMAINS)\b/g;

const REPLIT_PLUGIN_RE = /^\s*(?:import\s+.*from\s+['"]@replit\/[^'"]+['"];?\s*$)/gm;

const CARTOGRAPHER_USAGE_RE = /^\s*(?:cartographer|replitCartographer)\s*\(\s*\)\s*,?\s*$/gm;

let totalFiles = 0;
let modifiedFiles = 0;
let totalChanges = 0;

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  totalFiles++;
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  let modified = content;
  let changes = 0;
  const relPath = path.relative(destDir, filePath);

  modified = modified.replace(REPLIT_IMPORT_RE, (match) => {
    changes++;
    console.log(`   Removed @replit import in ${relPath}`);
    return "";
  });

  modified = modified.replace(REPLIT_PLUGIN_RE, (match) => {
    changes++;
    console.log(`   Removed @replit plugin import in ${relPath}`);
    return "";
  });

  modified = modified.replace(CARTOGRAPHER_USAGE_RE, (match) => {
    changes++;
    console.log(`   Removed cartographer plugin usage in ${relPath}`);
    return "";
  });

  if (REPLIT_ENV_RE.test(modified)) {
    const envMatches = modified.match(REPLIT_ENV_RE) || [];
    for (const m of envMatches) {
      console.log(`   ⚠️  Replit env var reference in ${relPath}: ${m}`);
    }
  }

  if (changes > 0) {
    modified = modified.replace(/\n{3,}/g, "\n\n");
    fs.writeFileSync(filePath, modified, "utf8");
    modifiedFiles++;
    totalChanges += changes;
  }
}

console.log(`   Scanning ${destDir} for Replit-specific references...`);
walkDir(destDir);

if (totalChanges > 0) {
  console.log(`   ✅ Cleaned ${totalChanges} Replit reference(s) across ${modifiedFiles} file(s) (scanned ${totalFiles} files)`);
} else {
  console.log(`   ✅ No Replit-specific code found (scanned ${totalFiles} files)`);
}

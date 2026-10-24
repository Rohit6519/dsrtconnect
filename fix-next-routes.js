// ============================================================
// fix-next-routes.js
// Scans the Next.js app directory, resolves all dynamic route
// parameter collisions ('id' !== 'slug'), and cleans up disk.
// ============================================================

const fs = require('fs');
const path = require('path');

function mergeDirectories(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      mergeDirectories(srcPath, destPath);
    } else {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`    [Copied] ${entry.name} -> ${destPath}`);
      } else {
        console.log(`    [Kept Existing] ${destPath}`);
      }
    }
  }
}

function scanAndFixConflicts(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const dynamicDirs = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        dynamicDirs.push({ name: entry.name, path: fullPath });
      }
      // Recurse first
      scanAndFixConflicts(fullPath);
    }
  }

  // If there are multiple dynamic directories at the same level (e.g. [id] and [slug])
  if (dynamicDirs.length > 1) {
    console.log(`\n⚠️  Route conflict detected in: ${dir}`);
    console.log(`   Conflicting dynamic folders: ${dynamicDirs.map(d => d.name).join(', ')}`);

    // Prefer [slug] as canonical, otherwise pick the first
    const canonical = dynamicDirs.find(d => d.name === '[slug]') || dynamicDirs[0];

    for (const d of dynamicDirs) {
      if (d.name !== canonical.name) {
        console.log(`   Merging ${d.name} into ${canonical.name}...`);
        mergeDirectories(d.path, canonical.path);
        
        try {
          fs.rmSync(d.path, { recursive: true, force: true });
          console.log(`   ✅ Deleted conflicting folder: ${d.path}`);
        } catch (err) {
          console.error(`   ❌ Failed to delete ${d.path}: ${err.message}`);
        }
      }
    }
  }
}

console.log('🚀 Starting Next.js dynamic route conflict cleanup...');
const appDir = path.join(process.cwd(), 'app');
const pagesDir = path.join(process.cwd(), 'pages');

scanAndFixConflicts(appDir);
scanAndFixConflicts(pagesDir);

console.log('\n✅ Route conflict cleanup complete!');
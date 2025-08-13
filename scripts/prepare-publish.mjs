import { promises as fs } from 'fs';
import path from 'path';

const rootDir = process.cwd();
const buildDir = path.join(rootDir, 'build');

async function main() {
  // Ensure build directory exists
  await fs.mkdir(buildDir, { recursive: true });

  // Read root package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);

  // Remove scripts to avoid running lifecycle hooks (e.g., prepare/husky) when publishing build/
  if (pkg.scripts) {
    delete pkg.scripts.prepare;
    // Optionally strip all scripts from the published manifest
    // Keep a minimal scripts object or remove entirely
    if (Object.keys(pkg.scripts).length === 0) {
      delete pkg.scripts;
    }
  }

  // Remove devDependencies from the published manifest
  if (pkg.devDependencies) delete pkg.devDependencies;

  // Write sanitized package.json into build/
  const outPkgPath = path.join(buildDir, 'package.json');
  await fs.writeFile(outPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // Copy docs into build/
  const filesToCopy = ['README.md', 'LICENSE.md', 'CHANGELOG.md'];
  for (const file of filesToCopy) {
    try {
      const src = path.join(rootDir, file);
      const dest = path.join(buildDir, file);
      await fs.copyFile(src, dest);
    } catch {
      // ignore if file missing
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});



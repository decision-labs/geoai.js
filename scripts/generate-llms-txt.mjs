#!/usr/bin/env node
/**
 * Generate LLM-readable docs artifacts:
 * - docs/public/llms.txt (curated index; written from template below if missing edits needed)
 * - docs/public/llms-full.txt (concatenated markdown from docs/pages/*.mdx)
 *
 * Usage: node scripts/generate-llms-txt.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pagesDir = path.join(root, 'docs', 'pages');
const publicDir = path.join(root, 'docs', 'public');
const DOCS_BASE = 'https://docs.geobase.app/geoai';

/** @param {string} dir */
function walkMdx(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMdx(full));
    } else if (entry.name.endsWith('.mdx') && !entry.name.startsWith('_')) {
      files.push(full);
    }
  }
  return files;
}

/** Prefer overview pages before nested ones; index first. */
function sortDocs(a, b) {
  const rel = (p) => path.relative(pagesDir, p).replace(/\\/g, '/');
  const score = (p) => {
    const r = rel(p);
    if (r === 'index.mdx') return '0';
    const depth = r.split('/').length;
    return `${depth}-${r}`;
  };
  return score(a).localeCompare(score(b));
}

/**
 * Strip MDX/JSX noise into plain-ish markdown for LLMs.
 * @param {string} source
 * @param {string} filePath
 */
function mdxToMarkdown(source, filePath) {
  let text = source;

  // Remove imports and JSX style blocks
  text = text.replace(/^import\s.+;$\n?/gm, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Drop self-closing / paired JSX components commonly used in these docs
  text = text.replace(/<VideoEmbed[\s\S]*?\/>/gi, '');
  text = text.replace(/<Callout[\s\S]*?>[\s\S]*?<\/Callout>/gi, (block) => {
    const inner = block.replace(/<\/?Callout[^>]*>/gi, '').trim();
    return inner ? `> ${inner.replace(/\n+/g, ' ')}\n` : '';
  });
  text = text.replace(/<(PackageName|NpmInstall|ImportStatement)\s*\/>/g, 'geoai');

  // Unwrap simple <div>...</div> / <a> keeping text and href when obvious
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
    const clean = label.replace(/<[^>]+>/g, '').trim();
    return clean ? `[${clean}](${href})` : href;
  });
  text = text.replace(/<\/?div[^>]*>/gi, '\n');
  text = text.replace(/<br\s*\/>/gi, '\n');

  // Remove remaining JSX tags but keep children
  text = text.replace(/<\/[A-Za-z][\w.-]*>/g, '');
  text = text.replace(/<[A-Za-z][\w.-]*(\s[^>]*)?\/>/g, '');
  text = text.replace(/<[A-Za-z][\w.-]*(\s[^>]*)?>/g, '');

  // Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  const rel = path.relative(pagesDir, filePath).replace(/\\/g, '/');
  const urlPath =
    rel === 'index.mdx'
      ? ''
      : rel.replace(/\.mdx$/, '').replace(/\/index$/, '');
  const url = urlPath ? `${DOCS_BASE}/${urlPath}` : DOCS_BASE;

  return { url, rel, text };
}

function main() {
  fs.mkdirSync(publicDir, { recursive: true });

  const files = walkMdx(pagesDir).sort(sortDocs);
  const parts = [
    '# GeoAI.js — full documentation',
    '',
    '> Auto-generated from `docs/pages/**/*.mdx` for LLM / agent ingestion.',
    `> Source: ${DOCS_BASE}`,
    `> Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    'For a curated link index see [llms.txt](https://docs.geobase.app/geoai/llms.txt).',
    '',
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const { url, rel, text } = mdxToMarkdown(source, file);
    parts.push('---');
    parts.push('');
    parts.push(`<!-- ${rel} -->`);
    parts.push(`<!-- ${url} -->`);
    parts.push('');
    parts.push(text);
    parts.push('');
  }

  const outPath = path.join(publicDir, 'llms-full.txt');
  fs.writeFileSync(outPath, parts.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${path.relative(root, outPath)} (${files.length} pages)`);

  const indexPath = path.join(publicDir, 'llms.txt');
  if (!fs.existsSync(indexPath)) {
    console.warn('Warning: docs/public/llms.txt is missing — create the curated index.');
  } else {
    console.log(`Found ${path.relative(root, indexPath)}`);
  }
}

main();

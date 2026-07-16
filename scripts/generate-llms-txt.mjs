#!/usr/bin/env node
/**
 * Generate LLM-readable docs artifacts:
 * - docs/public/llms.txt (curated index; maintained by hand)
 * - docs/public/llms-full.txt (concatenated markdown from docs/pages/*.mdx)
 *
 * Input is trusted first-party MDX. Output is plain text for LLM ingestion
 * (not rendered as HTML). Markup outside fenced code is removed with an
 * index-based scanner, then any leftover angle brackets are encoded.
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
 * Remove HTML/JSX tags and comments with an index scanner (not a single
 * incomplete regex replace). Leftover `<` / `>` are HTML-encoded.
 * @param {string} input
 */
function neutralizeMarkup(input) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const start = input.indexOf('<', i);
    if (start === -1) {
      out += input.slice(i);
      break;
    }
    out += input.slice(i, start);

    if (input.startsWith('<!--', start)) {
      const end = input.indexOf('-->', start + 4);
      i = end === -1 ? input.length : end + 3;
      continue;
    }

    const next = input[start + 1];
    if (!next || !/[A-Za-z/!]/.test(next)) {
      out += '&lt;';
      i = start + 1;
      continue;
    }

    const end = input.indexOf('>', start + 1);
    if (end === -1) {
      out += '&lt;';
      out += input.slice(start + 1);
      break;
    }

    const rawTag = input.slice(start, end + 1);
    if (/^<br\b/i.test(rawTag)) {
      out += '\n';
    } else if (/^<\/?div\b/i.test(rawTag)) {
      out += '\n';
    }
    // else: drop the tag (keep children by continuing after `>`)
    i = end + 1;
  }
  return out.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * Strip MDX/JSX noise into plain-ish markdown for LLMs.
 * Fenced code blocks are preserved verbatim.
 * @param {string} source
 * @param {string} filePath
 */
function mdxToMarkdown(source, filePath) {
  /** @type {string[]} */
  const fences = [];
  let text = source.replace(/```[\s\S]*?```/g, (block) => {
    fences.push(block);
    return `\0FENCE${fences.length - 1}\0`;
  });

  text = text.replace(/^import\s.+;$\n?/gm, '');

  // Known first-party MDX → markdown (closed set of tags we author)
  text = text.replace(/<Callout\b[^>]*>([\s\S]*?)<\/Callout>/gi, (_, inner) => {
    const clean = neutralizeMarkup(inner).trim();
    return clean ? `> ${clean.replace(/\n+/g, ' ')}\n` : '';
  });
  text = text.replace(
    /<(VideoEmbed|PackageName|NpmInstall|ImportStatement)\b[^>]*\/?>/gi,
    (_, name) => (name === 'VideoEmbed' ? '' : 'geoai')
  );
  text = text.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, label) => {
      const clean = neutralizeMarkup(label).trim();
      return clean ? `[${clean}](${href})` : href;
    }
  );

  text = neutralizeMarkup(text);
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  text = text.replace(/\0FENCE(\d+)\0/g, (_, i) => fences[Number(i)]);

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

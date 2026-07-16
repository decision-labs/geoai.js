#!/usr/bin/env node
/**
 * Generate LLM-readable docs artifacts:
 * - docs/public/llms.txt (curated index; maintained by hand)
 * - docs/public/llms-full.txt (concatenated markdown from docs/pages/*.mdx)
 *
 * Converts first-party MDX with remark + remark-mdx (AST), not regex stripping.
 *
 * Usage: node scripts/generate-llms-txt.mjs
 *        pnpm docs:llms
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pagesDir = path.join(root, 'docs', 'pages');
const publicDir = path.join(root, 'docs', 'public');
const DOCS_BASE = 'https://docs.geobase.app/geoai';

const PHRASING = new Set([
  'text',
  'emphasis',
  'strong',
  'delete',
  'inlineCode',
  'link',
  'linkReference',
  'image',
  'imageReference',
  'break',
  'footnoteReference',
  'html',
]);

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

function isPhrasing(node) {
  return PHRASING.has(node.type);
}

function jsxAttr(node, name) {
  const attr = node.attributes?.find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === name
  );
  return typeof attr?.value === 'string' ? attr.value : undefined;
}

/** Keep mdast valid: phrasing at flow level becomes a paragraph. */
function normalizeFlow(nodes) {
  const out = [];
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    out.push({ type: 'paragraph', children: buf });
    buf = [];
  };
  for (const n of nodes) {
    if (!n) continue;
    if (isPhrasing(n)) buf.push(n);
    else {
      flush();
      out.push(n);
    }
  }
  flush();
  return out;
}

function flattenToPhrasing(nodes) {
  /** @type {import('mdast').PhrasingContent[]} */
  const out = [];
  for (const n of nodes) {
    if (!n) continue;
    if (isPhrasing(n)) out.push(n);
    else if (n.type === 'paragraph' && Array.isArray(n.children)) {
      out.push(...flattenToPhrasing(n.children));
    }
  }
  return out;
}

function mapChildren(nodes) {
  return (nodes || []).flatMap((c) => {
    const t = transformNode(c);
    return t == null ? [] : Array.isArray(t) ? t : [t];
  });
}

/**
 * @param {import('unist').Node} node
 * @returns {import('unist').Node | import('unist').Node[] | null}
 */
function transformNode(node) {
  if (!node || typeof node !== 'object') return node;

  if (
    node.type === 'mdxjsEsm' ||
    node.type === 'mdxFlowExpression' ||
    node.type === 'mdxTextExpression'
  ) {
    return null;
  }

  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    const name = node.name;
    const kids = mapChildren(node.children);

    if (name === 'Callout') {
      const body = normalizeFlow(kids);
      return {
        type: 'blockquote',
        children: body.length
          ? body
          : [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }],
      };
    }
    if (name === 'VideoEmbed' || name === 'style') return null;
    if (
      name === 'PackageName' ||
      name === 'NpmInstall' ||
      name === 'ImportStatement'
    ) {
      return { type: 'text', value: 'geoai' };
    }
    if (name === 'a') {
      const href = jsxAttr(node, 'href') || '';
      const label = flattenToPhrasing(kids);
      return {
        type: 'link',
        url: href,
        children: label.length ? label : [{ type: 'text', value: href }],
      };
    }
    // Unwrap layout wrappers (div, etc.)
    return normalizeFlow(kids);
  }

  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: normalizeFlow(mapChildren(node.children)),
    };
  }
  return node;
}

function remarkStripMdx() {
  return (tree) => {
    const next = transformNode(tree);
    if (next && !Array.isArray(next) && Array.isArray(next.children)) {
      tree.children = next.children;
    }
  };
}

const processor = remark()
  .use(remarkMdx)
  .use(remarkStripMdx)
  .use(remarkStringify, {
    bullet: '-',
    fences: true,
    resourceLink: false,
  });

/**
 * @param {string} source
 * @param {string} filePath
 */
async function mdxToMarkdown(source, filePath) {
  const file = await processor.process({
    path: filePath,
    value: source,
  });
  const text = String(file).trim();

  const rel = path.relative(pagesDir, filePath).replace(/\\/g, '/');
  const urlPath =
    rel === 'index.mdx'
      ? ''
      : rel.replace(/\.mdx$/, '').replace(/\/index$/, '');
  const url = urlPath ? `${DOCS_BASE}/${urlPath}` : DOCS_BASE;

  return { url, rel, text };
}

async function main() {
  fs.mkdirSync(publicDir, { recursive: true });

  const files = walkMdx(pagesDir).sort(sortDocs);
  const parts = [
    '# GeoAI.js — full documentation',
    '',
    '> Auto-generated from `docs/pages/**/*.mdx` for LLM / agent ingestion.',
    `> Source: ${DOCS_BASE}`,
    '> Converter: remark + remark-mdx',
    '',
    'For a curated link index see [llms.txt](https://docs.geobase.app/geoai/llms.txt).',
    '',
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const { url, rel, text } = await mdxToMarkdown(source, file);
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
    console.warn(
      'Warning: docs/public/llms.txt is missing — create the curated index.'
    );
  } else {
    console.log(`Found ${path.relative(root, indexPath)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

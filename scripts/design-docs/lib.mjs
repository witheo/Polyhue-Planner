import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const STATUSES = ['draft', 'proposed', 'accepted', 'superseded'];

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TEMPLATE_SECTIONS = ['Context', 'Decision', 'Alternatives considered', 'Consequences', 'Open questions'];

export function localDate(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slugs become file names, so reject anything that could leave the docs directory. */
export function assertSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug "${slug}": use lowercase letters, digits and single hyphens.`);
  }
}

function docPath(dir, slug) {
  assertSlug(slug);
  return path.join(dir, `${slug}.md`);
}

// --- frontmatter -------------------------------------------------------------------------------

/** Parses the small `key: value` frontmatter these docs use. Returns `meta: null` if there is none. */
export function parseDoc(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { meta: null, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1).replace(/\\"/g, '"');
    meta[kv[1]] = value;
  }
  return { meta, body: m[2] };
}

function quoteIfNeeded(value) {
  return /[:#"'\n]|^\s|\s$/.test(value) ? JSON.stringify(value) : value;
}

export function formatDoc(meta, body) {
  const lines = [`title: ${quoteIfNeeded(meta.title)}`, `status: ${meta.status}`];
  if (meta.ticket !== undefined && meta.ticket !== null && meta.ticket !== '') {
    lines.push(`ticket: ${meta.ticket}`);
  }
  lines.push(`updated: ${meta.updated}`);
  return `---\n${lines.join('\n')}\n---\n${body.replace(/^\n+/, '')}`;
}

/** Returns a list of problems with a parsed doc's frontmatter (empty when valid). */
export function metaProblems(meta) {
  if (!meta) return ['missing frontmatter'];
  const problems = [];
  if (!meta.title) problems.push('missing title');
  if (!STATUSES.includes(meta.status)) {
    problems.push(`status must be one of ${STATUSES.join(', ')} (got "${meta.status ?? ''}")`);
  }
  if (meta.ticket !== undefined && !/^[1-9]\d*$/.test(meta.ticket)) {
    problems.push(`ticket must be an issue number (got "${meta.ticket}")`);
  }
  if (!DATE_RE.test(meta.updated ?? '')) problems.push('updated must be YYYY-MM-DD');
  return problems;
}

// --- sections ----------------------------------------------------------------------------------

/** Splits a body into a preamble and `## ` sections, ignoring headings inside fenced code. */
export function splitSections(body) {
  const lines = body.split('\n');
  const sections = [];
  const preamble = [];
  let current = null;
  let fence = null;
  for (const line of lines) {
    const fenceMatch = /^(```|~~~)/.exec(line);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1];
      else if (fence === fenceMatch[1]) fence = null;
    }
    const heading = fence === null ? /^##\s+(.+?)\s*$/.exec(line) : null;
    if (heading) {
      current = { heading: heading[1], lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble: preamble.join('\n'), sections };
}

function joinSections({ preamble, sections }) {
  const parts = [preamble.replace(/\n+$/, '')];
  for (const s of sections) {
    parts.push(`## ${s.heading}\n${s.lines.join('\n').replace(/^\n+|\n+$/g, '')}`);
  }
  return parts.filter((p, i) => i > 0 || p !== '').join('\n\n') + '\n';
}

export function headingsOf(body) {
  return splitSections(body).sections.map((s) => s.heading);
}

// --- storage -----------------------------------------------------------------------------------

async function writeAtomic(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, file);
}

async function load(dir, slug) {
  const file = docPath(dir, slug);
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error(`No design doc "${slug}".`);
    throw e;
  }
  const { meta, body } = parseDoc(text);
  if (!meta) throw new Error(`Design doc "${slug}" has no frontmatter; fix it by hand first.`);
  return { file, meta, body };
}

function summaryOf(slug, meta) {
  return {
    slug,
    title: meta.title ?? '',
    status: meta.status ?? '',
    ticket: meta.ticket ? Number(meta.ticket) : null,
    updated: meta.updated ?? '',
  };
}

async function slugsIn(dir) {
  let names;
  try {
    names = await readdir(dir);
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  return names
    .filter((n) => n.endsWith('.md') && n.toLowerCase() !== 'readme.md')
    .map((n) => n.slice(0, -3))
    .sort();
}

export async function listDocs(dir, { status } = {}) {
  const out = [];
  for (const slug of await slugsIn(dir)) {
    const { meta } = parseDoc(await readFile(path.join(dir, `${slug}.md`), 'utf8'));
    const summary = summaryOf(slug, meta ?? {});
    if (!status || summary.status === status) out.push(summary);
  }
  return out;
}

export async function readDoc(dir, slug) {
  const { meta, body } = await load(dir, slug);
  return { ...summaryOf(slug, meta), headings: headingsOf(body), body };
}

export async function createDoc(dir, { title, ticket, status = 'draft', summary = '', now = new Date() }) {
  if (!title?.trim()) throw new Error('A title is required.');
  if (!STATUSES.includes(status)) throw new Error(`status must be one of ${STATUSES.join(', ')}.`);
  const slug = slugify(title);
  assertSlug(slug);
  const file = docPath(dir, slug);
  try {
    await readFile(file, 'utf8');
    throw new Error(`Design doc "${slug}" already exists.`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const meta = { title: title.trim(), status, ticket, updated: localDate(now) };
  const intro = summary.trim() ? `${summary.trim()}\n\n` : '';
  const body = `# ${meta.title}\n\n${intro}${TEMPLATE_SECTIONS.map((h) => `## ${h}\n`).join('\n')}`;
  await writeAtomic(file, formatDoc(meta, body));
  return { slug, ...(await readDoc(dir, slug)) };
}

export async function updateSection(dir, slug, heading, content, { mode = 'replace', createIfMissing = false, now = new Date() } = {}) {
  if (!['replace', 'append'].includes(mode)) throw new Error('mode must be "replace" or "append".');
  const { file, meta, body } = await load(dir, slug);
  const parts = splitSections(body);
  const section = parts.sections.find((s) => s.heading.toLowerCase() === heading.trim().toLowerCase());
  if (!section) {
    if (!createIfMissing) {
      throw new Error(`No section "${heading}" in "${slug}". Sections: ${parts.sections.map((s) => s.heading).join(', ') || '(none)'}.`);
    }
    parts.sections.push({ heading: heading.trim(), lines: content.split('\n') });
  } else if (mode === 'append') {
    section.lines = [...section.lines.join('\n').replace(/\n+$/, '').split('\n'), '', ...content.split('\n')];
  } else {
    section.lines = content.split('\n');
  }
  await writeAtomic(file, formatDoc({ ...meta, updated: localDate(now) }, joinSections(parts)));
  return readDoc(dir, slug);
}

export async function updateMeta(dir, slug, { status, ticket } = {}, now = new Date()) {
  if (status === undefined && ticket === undefined) throw new Error('Provide a status and/or a ticket.');
  if (status !== undefined && !STATUSES.includes(status)) {
    throw new Error(`status must be one of ${STATUSES.join(', ')}.`);
  }
  if (ticket !== undefined && ticket !== null && !(Number.isInteger(ticket) && ticket > 0)) {
    throw new Error('ticket must be a positive issue number, or null to clear it.');
  }
  const { file, meta, body } = await load(dir, slug);
  const next = { ...meta, updated: localDate(now) };
  if (status !== undefined) next.status = status;
  if (ticket !== undefined) next.ticket = ticket;
  await writeAtomic(file, formatDoc(next, body));
  return readDoc(dir, slug);
}

export async function validateDocs(dir) {
  const problems = [];
  for (const slug of await slugsIn(dir)) {
    if (!SLUG_RE.test(slug)) problems.push({ slug, problem: 'file name is not a valid slug' });
    const { meta } = parseDoc(await readFile(path.join(dir, `${slug}.md`), 'utf8'));
    for (const problem of metaProblems(meta)) problems.push({ slug, problem });
  }
  return problems;
}

import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  assertSlug,
  createDoc,
  headingsOf,
  listDocs,
  parseDoc,
  readDoc,
  slugify,
  splitSections,
  updateMeta,
  updateSection,
  validateDocs,
} from './lib.mjs';

const NOW = new Date(2026, 9, 28);
const LATER = new Date(2026, 10, 2);

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'design-docs-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('slugs', () => {
  it('slugifies titles', () => {
    expect(slugify('  Multi-day plans: roadmap & design! ')).toBe('multi-day-plans-roadmap-design');
  });

  it.each(['../etc/passwd', 'a/b', 'A', 'a--b', '-a', '', 'a.md'])('rejects %j', (slug) => {
    expect(() => assertSlug(slug)).toThrow(/Invalid slug/);
  });
});

describe('createDoc', () => {
  it('writes frontmatter and the standard sections', async () => {
    const doc = await createDoc(dir, { title: 'Card faces', ticket: 17, summary: 'Why we are here.', now: NOW });

    expect(doc).toMatchObject({ slug: 'card-faces', title: 'Card faces', status: 'draft', ticket: 17, updated: '2026-10-28' });
    expect(doc.headings).toEqual(['Context', 'Decision', 'Alternatives considered', 'Consequences', 'Open questions']);
    const text = await readFile(path.join(dir, 'card-faces.md'), 'utf8');
    expect(text.startsWith('---\ntitle: Card faces\nstatus: draft\nticket: 17\nupdated: 2026-10-28\n---\n')).toBe(true);
    expect(text).toContain('Why we are here.');
  });

  it('omits the ticket line when there is none, and quotes titles that need it', async () => {
    await createDoc(dir, { title: 'Why: a test', now: NOW });
    const text = await readFile(path.join(dir, 'why-a-test.md'), 'utf8');
    expect(text).toContain('title: "Why: a test"');
    expect(text).not.toContain('ticket:');
    expect(parseDoc(text).meta.title).toBe('Why: a test');
  });

  it('refuses to overwrite an existing doc', async () => {
    await createDoc(dir, { title: 'Same', now: NOW });
    await expect(createDoc(dir, { title: 'Same', now: NOW })).rejects.toThrow(/already exists/);
  });

  it('rejects an unknown status and an empty title', async () => {
    await expect(createDoc(dir, { title: 'x', status: 'done' })).rejects.toThrow(/status must be/);
    await expect(createDoc(dir, { title: '  ' })).rejects.toThrow(/title is required/);
  });

  it('leaves no temp files behind', async () => {
    await createDoc(dir, { title: 'Tidy', now: NOW });
    expect(await readdir(dir)).toEqual(['tidy.md']);
  });
});

describe('listDocs / readDoc', () => {
  it('lists docs sorted by slug, skips README, and filters by status', async () => {
    await createDoc(dir, { title: 'Bravo', now: NOW });
    await createDoc(dir, { title: 'Alpha', status: 'accepted', ticket: 3, now: NOW });
    await writeFile(path.join(dir, 'README.md'), '# not a doc\n');

    expect((await listDocs(dir)).map((d) => d.slug)).toEqual(['alpha', 'bravo']);
    expect(await listDocs(dir, { status: 'accepted' })).toEqual([
      { slug: 'alpha', title: 'Alpha', status: 'accepted', ticket: 3, updated: '2026-10-28' },
    ]);
  });

  it('returns an empty list when the directory does not exist', async () => {
    expect(await listDocs(path.join(dir, 'missing'))).toEqual([]);
  });

  it('reports a missing doc clearly', async () => {
    await expect(readDoc(dir, 'nope')).rejects.toThrow(/No design doc "nope"/);
  });
});

describe('updateSection', () => {
  it('replaces a section and bumps updated', async () => {
    await createDoc(dir, { title: 'Doc', now: NOW });
    const doc = await updateSection(dir, 'doc', 'decision', 'We use SVG.', { now: LATER });

    expect(doc.updated).toBe('2026-11-02');
    expect(doc.body).toContain('## Decision\nWe use SVG.');
    expect(doc.headings).toHaveLength(5);
  });

  it('appends to a section without losing existing text', async () => {
    await createDoc(dir, { title: 'Doc', now: NOW });
    await updateSection(dir, 'doc', 'Context', 'First.');
    const doc = await updateSection(dir, 'doc', 'Context', 'Second.', { mode: 'append' });
    expect(doc.body).toContain('## Context\nFirst.\n\nSecond.');
  });

  it('errors on an unknown heading and lists the real ones, unless asked to create it', async () => {
    await createDoc(dir, { title: 'Doc', now: NOW });
    await expect(updateSection(dir, 'doc', 'Nope', 'x')).rejects.toThrow(/Sections: Context, Decision/);

    const doc = await updateSection(dir, 'doc', 'Nope', 'x', { createIfMissing: true });
    expect(doc.headings.at(-1)).toBe('Nope');
  });

  it('does not treat headings inside code fences as sections', () => {
    const body = '# T\n\n## Real\n```md\n## Fake\n```\nafter\n\n## Next\n';
    expect(headingsOf(body)).toEqual(['Real', 'Next']);
    expect(splitSections(body).sections[0].lines.join('\n')).toContain('## Fake');
  });

  it('preserves the title and preamble', async () => {
    await createDoc(dir, { title: 'Keep me', summary: 'Intro text.', now: NOW });
    const doc = await updateSection(dir, 'keep-me', 'Decision', 'Done.');
    expect(doc.body.startsWith('# Keep me\n\nIntro text.\n\n## Context')).toBe(true);
  });
});

describe('updateMeta', () => {
  it('changes status and ticket, and can clear the ticket', async () => {
    await createDoc(dir, { title: 'Doc', ticket: 8, now: NOW });
    expect(await updateMeta(dir, 'doc', { status: 'accepted' }, LATER)).toMatchObject({
      status: 'accepted',
      ticket: 8,
      updated: '2026-11-02',
    });
    expect((await updateMeta(dir, 'doc', { ticket: null }, LATER)).ticket).toBeNull();
  });

  it('rejects bad values', async () => {
    await createDoc(dir, { title: 'Doc', now: NOW });
    await expect(updateMeta(dir, 'doc', {})).rejects.toThrow(/status and\/or a ticket/);
    await expect(updateMeta(dir, 'doc', { status: 'done' })).rejects.toThrow(/status must be/);
    await expect(updateMeta(dir, 'doc', { ticket: 0 })).rejects.toThrow(/positive issue number/);
  });
});

describe('validateDocs', () => {
  it('passes for generated docs', async () => {
    await createDoc(dir, { title: 'Fine', ticket: 1, now: NOW });
    expect(await validateDocs(dir)).toEqual([]);
  });

  it('reports missing frontmatter and bad fields', async () => {
    await writeFile(path.join(dir, 'bare.md'), '# No frontmatter\n');
    await writeFile(path.join(dir, 'bad.md'), '---\ntitle: Bad\nstatus: wip\nticket: abc\nupdated: yesterday\n---\n# Bad\n');

    const problems = await validateDocs(dir);
    expect(problems).toContainEqual({ slug: 'bare', problem: 'missing frontmatter' });
    expect(problems.filter((p) => p.slug === 'bad').map((p) => p.problem)).toEqual([
      expect.stringMatching(/^status must be one of/),
      'ticket must be an issue number (got "abc")',
      'updated must be YYYY-MM-DD',
    ]);
  });
});

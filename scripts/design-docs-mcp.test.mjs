import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const server = path.join(path.dirname(fileURLToPath(import.meta.url)), 'design-docs-mcp.mjs');

let dir;
let client;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'design-docs-mcp-'));
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({ command: process.execPath, args: [server], env: { ...process.env, DESIGN_DOCS_DIR: dir } }),
  );
});

afterAll(async () => {
  await client.close();
  await rm(dir, { recursive: true, force: true });
});

async function call(name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  return { isError: Boolean(res.isError), text, json: res.isError ? null : JSON.parse(text) };
}

describe('design-docs MCP server (stdio)', () => {
  it('exposes the six tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'create_design_doc',
      'list_design_docs',
      'read_design_doc',
      'update_design_doc_meta',
      'update_design_doc_section',
      'validate_design_docs',
    ]);
  });

  it('creates, edits, re-statuses, lists and validates a doc end to end', async () => {
    const created = await call('create_design_doc', { title: 'Backup format', ticket: 5, summary: 'How backups look.' });
    expect(created.json).toMatchObject({ slug: 'backup-format', status: 'draft', ticket: 5 });

    const edited = await call('update_design_doc_section', {
      slug: 'backup-format',
      heading: 'Decision',
      content: 'Export `{ tasks, blocks }` as JSON.',
    });
    expect(edited.json.body).toContain('## Decision\nExport `{ tasks, blocks }` as JSON.');

    await call('update_design_doc_meta', { slug: 'backup-format', status: 'accepted' });

    expect((await call('list_design_docs', { status: 'accepted' })).json).toHaveLength(1);
    expect((await call('list_design_docs', { status: 'draft' })).json).toEqual([]);
    expect((await call('validate_design_docs')).json).toEqual([]);

    const onDisk = await readFile(path.join(dir, 'backup-format.md'), 'utf8');
    expect(onDisk).toContain('status: accepted');
  });

  it('returns tool errors instead of crashing', async () => {
    const missing = await call('read_design_doc', { slug: 'nope' });
    expect(missing).toMatchObject({ isError: true, text: 'No design doc "nope".' });

    const traversal = await call('read_design_doc', { slug: '../package' });
    expect(traversal.isError).toBe(true);
    expect(traversal.text).toMatch(/Invalid slug/);

    const badSection = await call('update_design_doc_section', { slug: 'backup-format', heading: 'Nope', content: 'x' });
    expect(badSection.isError).toBe(true);
    expect(badSection.text).toMatch(/Sections: Context, Decision/);
  });
});

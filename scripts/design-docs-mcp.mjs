// Local stdio MCP server for structured design docs in docs/design/ (see docs/design/README.md).
// Registered in .mcp.json. Set DESIGN_DOCS_DIR to point it somewhere else (used by the tests).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  STATUSES,
  createDoc,
  listDocs,
  readDoc,
  updateMeta,
  updateSection,
  validateDocs,
} from './design-docs/lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = process.env.DESIGN_DOCS_DIR
  ? path.resolve(process.env.DESIGN_DOCS_DIR)
  : path.resolve(here, '../docs/design');

const slug = z.string().describe('Doc slug, i.e. the file name without .md (see list_design_docs).');
const status = z.enum(STATUSES);

/** Wraps a handler so results come back as JSON text and failures as MCP tool errors. */
function tool(handler) {
  return async (args) => {
    try {
      return { content: [{ type: 'text', text: JSON.stringify(await handler(args), null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }] };
    }
  };
}

const server = new McpServer({ name: 'design-docs', version: '0.1.0' });

server.registerTool(
  'list_design_docs',
  {
    title: 'List design docs',
    description: 'List design docs in docs/design/ with title, status, linked ticket and last-updated date.',
    inputSchema: { status: status.optional().describe('Only docs with this status.') },
    annotations: { readOnlyHint: true },
  },
  tool(({ status }) => listDocs(dir, { status })),
);

server.registerTool(
  'read_design_doc',
  {
    title: 'Read a design doc',
    description: 'Read one design doc: metadata, the list of ## section headings, and the full body.',
    inputSchema: { slug },
    annotations: { readOnlyHint: true },
  },
  tool(({ slug }) => readDoc(dir, slug)),
);

server.registerTool(
  'create_design_doc',
  {
    title: 'Create a design doc',
    description:
      'Create docs/design/<slug>.md from the standard template (Context, Decision, Alternatives considered, ' +
      'Consequences, Open questions). The slug is derived from the title. Record decisions here, not exploration; ' +
      'exploration belongs in the ticket.',
    inputSchema: {
      title: z.string(),
      ticket: z.number().int().positive().optional().describe('GitHub issue number this doc belongs to.'),
      status: status.optional().describe('Defaults to draft.'),
      summary: z.string().optional().describe('One or two sentences placed under the title.'),
    },
  },
  tool(({ title, ticket, status, summary }) => createDoc(dir, { title, ticket, status, summary })),
);

server.registerTool(
  'update_design_doc_section',
  {
    title: 'Update a design doc section',
    description:
      'Replace or append to one "## " section, matched by heading (case-insensitive). Bumps the updated date. ' +
      'Errors with the real headings if the section does not exist, unless create_if_missing is set.',
    inputSchema: {
      slug,
      heading: z.string().describe('Section heading without the leading ##.'),
      content: z.string().describe('Markdown for the section body.'),
      mode: z.enum(['replace', 'append']).optional().describe('Defaults to replace.'),
      create_if_missing: z.boolean().optional(),
    },
  },
  tool(({ slug, heading, content, mode, create_if_missing }) =>
    updateSection(dir, slug, heading, content, { mode, createIfMissing: create_if_missing }),
  ),
);

server.registerTool(
  'update_design_doc_meta',
  {
    title: 'Update design doc metadata',
    description: 'Change a doc\'s status and/or linked ticket (null clears the ticket). Bumps the updated date.',
    inputSchema: { slug, status: status.optional(), ticket: z.number().int().positive().nullable().optional() },
  },
  tool(({ slug, status, ticket }) => updateMeta(dir, slug, { status, ticket })),
);

server.registerTool(
  'validate_design_docs',
  {
    title: 'Validate design docs',
    description: 'Check every doc\'s frontmatter (title, status, ticket, updated). Returns a list of problems; empty means all valid.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  tool(() => validateDocs(dir)),
);

await server.connect(new StdioServerTransport());

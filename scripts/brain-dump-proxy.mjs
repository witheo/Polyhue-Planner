#!/usr/bin/env node
/**
 * Local POST /brain-dump proxy: uses Cursor `@cursor/sdk` (local agent) with a
 * fixed system prompt so unstructured notes become JSON tasks (optional
 * subtasks with per-step minutes).
 *
 *   npm run brain-dump-proxy
 *
 * Env:
 *   VITE_BRAIN_DUMP_PROXY_URL — set in the app's .env.local (this script does not read it).
 *   BRAIN_DUMP_AI=0 — skip the model; return a single stub task (no API key needed).
 *   CURSOR_API_KEY — required when BRAIN_DUMP_AI is not 0 (user or service-account key).
 *   BRAIN_DUMP_PROXY_PORT — listen port (default 8787).
 *   BRAIN_DUMP_AGENT_TIMEOUT_MS — max wait for one SDK run (default 180000).
 *   BRAIN_DUMP_MAX_RAW_BYTES — max `raw` body size (default 96 KiB).
 *   BRAIN_DUMP_DEBUG=1 — verbose stderr logs when parse/normalize fails.
 *   BRAIN_DUMP_MODEL_ID — model id passed to the agent (default composer-2).
 */

import {
  Agent,
  AuthenticationError,
  ConfigurationError,
  CursorAgentError,
  NetworkError,
  RateLimitError,
} from '@cursor/sdk';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { json } from 'node:stream/consumers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const PORT = Number(process.env.BRAIN_DUMP_PROXY_PORT || 8787);
const MAX_RAW_BYTES = Number(process.env.BRAIN_DUMP_MAX_RAW_BYTES || 96 * 1024);
const AGENT_TIMEOUT_MS = Number(process.env.BRAIN_DUMP_AGENT_TIMEOUT_MS || 180_000);
const MODEL_ID = String(process.env.BRAIN_DUMP_MODEL_ID || 'composer-2').trim() || 'composer-2';

const SYSTEM_PROMPT = readFileSync(join(__dirname, 'brain-dump-system-prompt.txt'), 'utf8');

function brainDumpDebug() {
  const v = String(process.env.BRAIN_DUMP_DEBUG || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Log why assistant text did not become `{ tasks: [...] }` (always logs a short summary to the proxy terminal). */
function logModelOutputParseFailure(text, stderr) {
  const dbg = brainDumpDebug();
  const rawOut = typeof text === 'string' ? text : '';
  const stripped = stripJsonFences(rawOut.trim());
  console.error('[brain-dump-proxy] Parse failure: no usable { tasks: [...] } in model output.');
  if (stderr && String(stderr).trim()) {
    console.error('[brain-dump-proxy] stderr (first 4k chars):\n', String(stderr).slice(0, 4000));
  }
  console.error(
    `[brain-dump-proxy] output bytes: ${Buffer.byteLength(rawOut, 'utf8')}; after fence-strip: ${stripped.length} chars`,
  );
  if (!stripped) {
    console.error('[brain-dump-proxy] output is empty after trim / fence strip.');
    return;
  }
  console.error('[brain-dump-proxy] output head (500 chars):\n', stripped.slice(0, 500));
  if (stripped.length > 700) {
    console.error('[brain-dump-proxy] output tail (300 chars):\n', stripped.slice(-300));
  }

  let root = null;
  let parseErr = null;
  try {
    root = JSON.parse(stripped);
  } catch (e) {
    parseErr = e;
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        root = JSON.parse(stripped.slice(start, end + 1));
        console.error('[brain-dump-proxy] JSON.parse succeeded on substring from first { to last }.');
      } catch (e2) {
        console.error('[brain-dump-proxy] JSON.parse error:', parseErr.message);
        console.error(
          '[brain-dump-proxy] substring JSON.parse error:',
          e2 instanceof Error ? e2.message : String(e2),
        );
      }
    } else {
      console.error(
        '[brain-dump-proxy] JSON.parse error:',
        parseErr instanceof Error ? parseErr.message : String(parseErr),
      );
    }
  }

  if (root !== null && typeof root === 'object') {
    const keys = Array.isArray(root) ? ['<array>'] : Object.keys(root);
    console.error('[brain-dump-proxy] parsed top-level keys:', keys.join(', '));
    const payload = findTasksPayload(root);
    if (!payload) {
      console.error(
        '[brain-dump-proxy] No nested object with a "tasks" array found (see findTasksPayload).',
      );
    } else if (!Array.isArray(payload.tasks)) {
      console.error('[brain-dump-proxy] payload.tasks is not an array:', typeof payload.tasks);
    }
    if (dbg) {
      try {
        const preview = JSON.stringify(root);
        console.error(
          '[brain-dump-proxy] BRAIN_DUMP_DEBUG: parsed root preview:\n',
          preview.slice(0, 8000) + (preview.length > 8000 ? '\n… (truncated)' : ''),
        );
      } catch {
        console.error('[brain-dump-proxy] BRAIN_DUMP_DEBUG: could not stringify parsed root');
      }
    }
  }
}

function logNormalizeFailure(parsed) {
  const tasks = parsed?.tasks;
  console.error('[brain-dump-proxy] normalizeWireTasks: no valid tasks after normalization.');
  console.error(
    '[brain-dump-proxy] raw tasks array length:',
    Array.isArray(tasks) ? tasks.length : String(tasks),
  );
  if (brainDumpDebug() && Array.isArray(tasks) && tasks[0] !== undefined) {
    try {
      console.error(
        '[brain-dump-proxy] BRAIN_DUMP_DEBUG: first task element:',
        JSON.stringify(tasks[0]).slice(0, 2000),
      );
    } catch {
      /* ignore */
    }
  }
}

function stripJsonFences(text) {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

function findTasksPayload(obj, depth = 0) {
  if (depth > 12 || obj === null || typeof obj !== 'object') return null;
  if (!Array.isArray(obj.tasks)) {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'object' && v !== null) {
        const inner = findTasksPayload(v, depth + 1);
        if (inner) return inner;
      }
    }
    return null;
  }
  return obj;
}

/** Cursor CLI JSON envelope shape; model may still emit this inside assistant text. */
function tryParseEmbeddedJsonString(s) {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  if (t.length < 2) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function parseTasksFromModelText(stdout) {
  const stripped = stripJsonFences(stdout);
  let root;
  try {
    root = JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      root = JSON.parse(stripped.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  let payload = findTasksPayload(root);
  if (!payload && isRecord(root) && typeof root.result === 'string') {
    const inner = tryParseEmbeddedJsonString(root.result);
    if (inner) payload = findTasksPayload(inner);
  }
  if (!payload && isRecord(root) && root.result !== null && typeof root.result === 'object') {
    payload = findTasksPayload(root.result);
  }

  if (!payload || !Array.isArray(payload.tasks)) return null;
  return payload;
}

function isRecord(v) {
  return typeof v === 'object' && v !== null;
}

function clampMinutes(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 15;
  return Math.max(15, x);
}

function clampSubtaskMinutes(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, x);
}

function normalizeSubtasks(raw) {
  if (!Array.isArray(raw)) return undefined;
  const out = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const labelRaw = item.label ?? item.title ?? item.step;
    if (typeof labelRaw !== 'string') continue;
    const label = labelRaw.trim();
    if (!label) continue;
    out.push({ label, durationMinutes: clampSubtaskMinutes(item.durationMinutes) });
  }
  return out.length > 0 ? out : undefined;
}

function normalizeWireTasks(tasks) {
  if (!Array.isArray(tasks)) return null;
  const out = [];
  for (const t of tasks) {
    if (!isRecord(t)) continue;
    if (typeof t.title !== 'string') continue;
    const title = t.title.trim();
    if (!title) continue;
    let description;
    if (typeof t.description === 'string') {
      const d = t.description.trim();
      if (d !== '') description = d;
    }
    const subtasks = normalizeSubtasks(t.subtasks);
    let durationMinutes = clampMinutes(t.durationMinutes);
    if (subtasks?.length) {
      const sum = subtasks.reduce((a, s) => a + s.durationMinutes, 0);
      durationMinutes = Math.max(durationMinutes, sum);
    }
    let category;
    if (typeof t.category === 'string') {
      const c = t.category.trim().slice(0, 64);
      if (c) category = c;
    }
    out.push({
      title: title.slice(0, 500),
      durationMinutes,
      ...(description !== undefined ? { description } : {}),
      ...(subtasks !== undefined ? { subtasks } : {}),
      ...(category !== undefined ? { category } : {}),
    });
  }
  return out.length > 0 ? { tasks: out } : null;
}

/**
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
async function runSdkBrainDump(fullPrompt) {
  const apiKey = String(process.env.CURSOR_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('CURSOR_API_KEY is not set');
    err.code = 'missing_api_key';
    throw err;
  }

  const agent = await Agent.create({
    apiKey,
    model: { id: MODEL_ID },
    local: { cwd: REPO_ROOT },
    name: 'polyhue-brain-dump',
  });

  try {
    const run = await agent.send(fullPrompt);
    let timeoutId;
    try {
      timeoutId = setTimeout(async () => {
        try {
          if (run.supports('cancel')) await run.cancel();
        } catch {
          /* ignore */
        }
      }, AGENT_TIMEOUT_MS);

      const result = await run.wait();

      if (result.status === 'cancelled') {
        const err = new Error('Agent timed out');
        err.code = 'timeout';
        throw err;
      }
      if (result.status === 'error') {
        const err = new Error(result.result?.trim() || 'Agent run failed');
        err.code = 'run_error';
        throw err;
      }

      const text = typeof result.result === 'string' ? result.result : '';
      return { stdout: text, stderr: '' };
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  } finally {
    try {
      await agent[Symbol.asyncDispose]();
    } catch (e) {
      console.error('[brain-dump-proxy] agent dispose failed:', e instanceof Error ? e.message : String(e));
    }
  }
}

function httpStatusForSdkError(err) {
  if (err && typeof err === 'object' && err.code === 'missing_api_key') return [503, err.message];
  if (err && typeof err === 'object' && err.code === 'timeout') return [504, err.message];
  if (err && typeof err === 'object' && err.code === 'run_error') return [502, err.message];
  if (err instanceof AuthenticationError) return [401, err.message];
  if (err instanceof RateLimitError) return [429, err.message];
  if (err instanceof ConfigurationError) return [400, err.message];
  if (err instanceof NetworkError) return [503, err.message];
  if (err instanceof CursorAgentError) return [502, err.message];
  return [502, err instanceof Error ? err.message : String(err)];
}

function stubTasksFromRaw(raw) {
  const title = raw.split(/\r?\n/).find((l) => l.trim())?.trim().slice(0, 500) || 'Brain dump';
  const body = raw.trim().slice(0, 8000);
  return {
    tasks: [
      {
        title,
        durationMinutes: 30,
        ...(body.length > title.length ? { description: body } : {}),
      },
    ],
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/brain-dump') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /brain-dump' }));
    return;
  }

  try {
    const body = await json(req);
    const raw = typeof body?.raw === 'string' ? body.raw : '';
    if (!raw.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body must include non-empty "raw" string.' }));
      return;
    }
    const buf = Buffer.byteLength(raw, 'utf8');
    if (buf > MAX_RAW_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: `Notes too large (max ${MAX_RAW_BYTES} bytes).`,
        }),
      );
      return;
    }

    if (process.env.BRAIN_DUMP_AI === '0') {
      const stub = stubTasksFromRaw(raw);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stub));
      return;
    }

    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n## User notes (verbatim)\n\n${raw}\n`;

    let agentOut;
    try {
      agentOut = await runSdkBrainDump(fullPrompt);
    } catch (e) {
      const [status, msg] = httpStatusForSdkError(e);
      console.error('[brain-dump-proxy] SDK error:', msg);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: msg }));
      return;
    }

    const { stdout, stderr } = agentOut;
    if (brainDumpDebug()) {
      console.error('[brain-dump-proxy] BRAIN_DUMP_DEBUG: assistant text length:', stdout?.length ?? 0);
    }

    const parsed = parseTasksFromModelText(stdout);
    if (!parsed) {
      logModelOutputParseFailure(stdout, stderr);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error:
            'Model did not return valid JSON with a "tasks" array. Check the terminal where brain-dump-proxy is running for [brain-dump-proxy] logs; set BRAIN_DUMP_DEBUG=1 for more detail.',
        }),
      );
      return;
    }

    const normalized = normalizeWireTasks(parsed.tasks);
    if (!normalized) {
      logNormalizeFailure(parsed);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error:
            'Model output had no valid tasks after normalization. See proxy terminal logs; set BRAIN_DUMP_DEBUG=1 for the first raw task object.',
        }),
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(normalized));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `brain-dump proxy at http://127.0.0.1:${PORT} (POST /brain-dump; model ${MODEL_ID}; BRAIN_DUMP_AI=0 for stub; CURSOR_API_KEY for AI; BRAIN_DUMP_DEBUG=1 for verbose parse logs)`,
  );
});

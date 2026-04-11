#!/usr/bin/env node
/**
 * Dev-only mock for POST /brain-dump: one backlog-style task per non-empty line,
 * 30 minutes each. Replace with a real Cursor-CLI-backed proxy when ready.
 *
 *   npm run brain-dump-proxy
 *
 * Then set VITE_BRAIN_DUMP_PROXY_URL=http://127.0.0.1:8787 in .env.local
 */

import http from 'node:http';
import { json } from 'node:stream/consumers';

const PORT = Number(process.env.BRAIN_DUMP_PROXY_PORT || 8787);

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
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const tasks = lines.map((title) => ({
      title: title.slice(0, 500),
      durationMinutes: 30,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tasks }));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`brain-dump mock proxy at http://127.0.0.1:${PORT} (POST /brain-dump)`);
});

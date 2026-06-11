import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(join(__dirname, '../../femcycle-system-prompt-combined.txt'), 'utf8');

export default async function handler(req) {
  if (!ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model ?? 'claude-sonnet-4-6',
        max_tokens: body.max_tokens ?? 1024,
        system: systemPrompt,
        messages: body.messages,
      }),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error('[chat fn]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export const config = { path: '/api/chat' };

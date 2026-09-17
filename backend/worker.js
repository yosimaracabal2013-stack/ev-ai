export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-EV-Token', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    const auth = request.headers.get('Authorization') || '';
    const token = request.headers.get('X-EV-Token') || '';
    const authorized = auth === `Bearer ${env.API_TOKEN}` || (env.EV_BACKEND_TOKEN && token === env.EV_BACKEND_TOKEN);

    if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true, service: 'E.V. backend', time: new Date().toISOString(), features: ['reminders', 'tts', 'scheduled-jobs'] });
    if (url.pathname.startsWith('/reminders') && request.method !== 'GET' && !authorized) return json({ error: 'unauthorized' }, 401);
    if (url.pathname === '/tts' && request.method === 'POST') {
      if (!authorized) return json({ error: 'unauthorized' }, 401);
      const body = await request.json().catch(() => null);
      const text = String(body?.text || '').trim().slice(0, 5000);
      if (!text) return json({ error: 'text is required' }, 400);
      try {
        const provider = String(body.provider || 'fish').toLowerCase();
        if (provider === 'fish') return await fishTts(text, body, env, cors);
        if (provider === 'elevenlabs' || provider === 'eleven') return await elevenTts(text, body, env, cors);
        if (provider === 'custom') return await customTts(text, body, env, cors);
        return json({ error: 'unsupported remote voice provider' }, 400);
      } catch (e) { return json({ error: String(e?.message || e) }, 502); }
    }

    if (url.pathname === '/reminders' && request.method === 'GET') {
      const deviceId = url.searchParams.get('deviceId') || 'default';
      const list = await env.REMINDERS.list({ prefix: `${deviceId}:` });
      const reminders = [];
      for (const k of list.keys) { const v = await env.REMINDERS.get(k.name, 'json'); if (v) reminders.push(v); }
      reminders.sort((a, b) => a.dueAt - b.dueAt);
      return json({ reminders });
    }

    if (url.pathname === '/reminders' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body?.id || !body?.dueAt || !body?.subscription) return json({ error: 'id, dueAt, and subscription are required' }, 400);
      const deviceId = body.deviceId || 'default';
      const reminder = { id: String(body.id), deviceId, title: String(body.title || 'E.V. Reminder'), body: String(body.body || ''), dueAt: Number(body.dueAt), subscription: body.subscription, createdAt: Date.now() };
      await env.REMINDERS.put(`${deviceId}:${reminder.id}`, JSON.stringify(reminder));
      return json({ ok: true, reminder }, 201);
    }

    if (url.pathname.startsWith('/reminders/') && request.method === 'DELETE') {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const deviceId = url.searchParams.get('deviceId') || 'default';
      await env.REMINDERS.delete(`${deviceId}:${id}`);
      return json({ ok: true });
    }

    if (url.pathname === '/push/test' && request.method === 'POST') {
      if (!authorized) return json({ error: 'unauthorized' }, 401);
      const body = await request.json().catch(() => null);
      return await sendPush(body, env, json);
    }

    if (url.pathname === '/background/queue' && request.method === 'POST') {
      if (!authorized) return json({ error: 'unauthorized' }, 401);
      const body = await request.json().catch(() => null);
      const id = crypto.randomUUID();
      const item = { id, kind: String(body?.kind || 'general').slice(0, 80), prompt: String(body?.prompt || '').slice(0, 4000), createdAt: Date.now(), status: 'queued' };
      if (!env.REMINDERS) return json({ error: 'KV binding missing' }, 500);
      await env.REMINDERS.put(`job:${id}`, JSON.stringify(item), { expirationTtl: 60 * 60 * 24 * 30 });
      return json({ ok: true, job: item }, 201);
    }

    return json({ service: 'E.V. Backend', ok: true });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processDue(env));
    ctx.waitUntil(processJobs(env));
  }
};

async function fishTts(text, body, env, cors) {
  if (!env.FISH_API_KEY) throw Error('Fish API key is not configured');
  const model = body.model || 's2.1-pro';
  const payload = { text, model, format: body.format || 'mp3' };
  if (body.referenceId) payload.reference_id = String(body.referenceId);
  const r = await fetch('https://api.fish.audio/v1/tts', { method: 'POST', headers: { 'Authorization': `Bearer ${env.FISH_API_KEY}`, 'Content-Type': 'application/json', model }, body: JSON.stringify(payload) });
  if (!r.ok) throw Error(`Fish HTTP ${r.status}`);
  return new Response(r.body, { status: 200, headers: { ...cors, 'Content-Type': r.headers.get('content-type') || 'audio/mpeg' } });
}

async function elevenTts(text, body, env, cors) {
  if (!env.ELEVENLABS_API_KEY) throw Error('ElevenLabs API key is not configured');
  const voiceId = String(body.voiceId || env.ELEVENLABS_VOICE_ID || '').trim();
  if (!voiceId) throw Error('ElevenLabs voice ID is not configured');
  const model = body.model || 'eleven_flash_v2_5';
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, model_id: model }) });
  if (!r.ok) throw Error(`ElevenLabs HTTP ${r.status}`);
  return new Response(r.body, { status: 200, headers: { ...cors, 'Content-Type': r.headers.get('content-type') || 'audio/mpeg' } });
}

async function customTts(text, body, env, cors) {
  const url = String(body.url || env.CUSTOM_TTS_URL || '').trim();
  if (!/^https:\/\//i.test(url)) throw Error('CUSTOM_TTS_URL must use HTTPS');
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voiceId: body.voiceId || null }) });
  if (!r.ok) throw Error(`Custom TTS HTTP ${r.status}`);
  return new Response(r.body, { status: 200, headers: { ...cors, 'Content-Type': r.headers.get('content-type') || 'audio/mpeg' } });
}

async function processDue(env) {
  const now = Date.now();
  const list = await env.REMINDERS.list();
  for (const k of list.keys) {
    if (k.name.startsWith('job:')) continue;
    const reminder = await env.REMINDERS.get(k.name, 'json');
    if (!reminder || reminder.dueAt > now) continue;
    const result = await push(reminder, env);
    if (result.ok || result.permanentFailure) await env.REMINDERS.delete(k.name);
  }
}

async function processJobs(env) {
  const list = await env.REMINDERS.list({ prefix: 'job:' });
  for (const k of list.keys) {
    const job = await env.REMINDERS.get(k.name, 'json');
    if (!job || job.status !== 'queued') continue;
    // Deliberately only marks the job as available. An AI task executor can be attached here later.
    job.status = 'ready'; job.readyAt = Date.now();
    await env.REMINDERS.put(k.name, JSON.stringify(job), { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

async function sendPush(body, env, json) {
  if (!body?.subscription) return json({ error: 'subscription is required' }, 400);
  const result = await push({ title: body.title || 'E.V. Reminder', body: body.body || '', subscription: body.subscription }, env);
  return json(result, result.ok ? 200 : 502);
}

async function push(reminder, env) {
  if (!env.PUSH_ENDPOINT || !env.PUSH_AUTH) return { ok: false, permanentFailure: false, error: 'PUSH_ENDPOINT and PUSH_AUTH are not configured' };
  const response = await fetch(env.PUSH_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': env.PUSH_AUTH }, body: JSON.stringify({ subscription: reminder.subscription, title: reminder.title, body: reminder.body, data: { reminderId: reminder.id || null, url: 'https://yosimaracabal2013-stack.github.io/ev-ai/' } }) });
  const text = await response.text();
  return { ok: response.ok, status: response.status, providerResponse: text.slice(0, 500), permanentFailure: response.status === 400 || response.status === 404 || response.status === 410 };
}

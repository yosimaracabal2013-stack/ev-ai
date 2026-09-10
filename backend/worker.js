export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    const auth = request.headers.get('Authorization') || '';
    const authorized = auth === `Bearer ${env.API_TOKEN}`;
    if (url.pathname.startsWith('/reminders') && request.method !== 'GET' && !authorized) return json({ error: 'unauthorized' }, 401);

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

    return json({ service: 'E.V. Reminder Backend', ok: true });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processDue(env));
  }
};

async function processDue(env) {
  const now = Date.now();
  const list = await env.REMINDERS.list();
  for (const k of list.keys) {
    const reminder = await env.REMINDERS.get(k.name, 'json');
    if (!reminder || reminder.dueAt > now) continue;
    const result = await push(reminder, env);
    if (result.ok || result.permanentFailure) await env.REMINDERS.delete(k.name);
  }
}

async function sendPush(body, env, json) {
  if (!body?.subscription) return json({ error: 'subscription is required' }, 400);
  const result = await push({ title: body.title || 'E.V. Reminder', body: body.body || '', subscription: body.subscription }, env);
  return json(result, result.ok ? 200 : 502);
}

async function push(reminder, env) {
  if (!env.PUSH_ENDPOINT || !env.PUSH_AUTH) return { ok: false, permanentFailure: false, error: 'PUSH_ENDPOINT and PUSH_AUTH are not configured' };
  const response = await fetch(env.PUSH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': env.PUSH_AUTH },
    body: JSON.stringify({ subscription: reminder.subscription, title: reminder.title, body: reminder.body, data: { reminderId: reminder.id || null, url: 'https://yosimaracabal2013-stack.github.io/ev-ai/' } })
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, providerResponse: text.slice(0, 500), permanentFailure: response.status === 400 || response.status === 404 || response.status === 410 };
}

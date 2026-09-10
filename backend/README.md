# E.V. Cloud Reminder Backend

This folder is a deployable Cloudflare Worker backend for E.V. reminders.

## What it does

- Stores reminder records in Cloudflare KV.
- Exposes a small JSON API for creating, listing, and deleting reminders.
- Runs on a scheduled Worker trigger and sends due reminders through a push provider webhook.
- Keeps secrets on the server; no VAPID private key or webhook secret is placed in GitHub Pages code.

## Required Cloudflare setup

1. Create a KV namespace named `REMINDERS`.
2. Deploy `worker.js` as a Cloudflare Worker.
3. Add a Cron Trigger that runs every minute.
4. Add these Worker secrets:
   - `PUSH_ENDPOINT`: your push provider endpoint (for example, a OneSignal or self-hosted Web Push gateway endpoint).
   - `PUSH_AUTH`: bearer token or provider authorization value.
   - `API_TOKEN`: random token used by the E.V. frontend when calling this backend.
5. Bind the KV namespace to the Worker using the binding name `REMINDERS`.

## API

- `POST /reminders` with `{ "id", "title", "body", "dueAt", "subscription" }`
- `GET /reminders?deviceId=...`
- `DELETE /reminders/:id`
- `POST /push/test` with `{ "subscription", "title", "body" }`

All write endpoints require `Authorization: Bearer <API_TOKEN>`.

## Important limitation

The Worker is cloud-backed and can run while the phone is offline, but the push provider still has to be configured. The repository now contains the backend contract and implementation; deployment and provider credentials remain account-specific steps outside GitHub Pages.

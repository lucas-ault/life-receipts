# Agents

Life receipts is a long-running Next.js app on the same LAN as an ESC/POS receipt printer. The printed wordmark is Roundup. The package name is `life-receipts`.

## Run

```bash
npm install
npm run dev
```

The app listens on port 3000. `npm test` runs Vitest. `npx tsc --noEmit` typechecks. Do not add `"type": "module"` to `package.json`.

`next.config.ts` sets `agentRules: false` so Next does not replace this file. Leave that flag in place.

## Data

SQLite lives at `data/roundup.sqlite` and is gitignored. Tables are created in `lib/db.ts` with `CREATE TABLE IF NOT EXISTS`, then small `ALTER TABLE` checks for columns added later. Put new columns in both `db/schema.ts` and `ensureTodoColumns` (or a sibling ensure function) so an existing database picks them up without a separate migration runner.

`.env` is gitignored. Do not print secrets from it. `APP_URL`, Google OAuth, `SESSION_SECRET`, and `TUNNEL_TOKEN` are documented in `.env.example`.

## Accounts

There is one owner and any number of members. The session cookie is `roundup_session` and carries the user id and role. Members can open `/notes` and `/todos` only. Member-created to-dos start as `pending` and must not be included in `listOpenTodos` or `listUnprintedTodoCards`.

If `settings.password_hash` exists and `users` is empty, startup copies that hash onto the username `owner`.

## Printing

Do not send a job to the printer while checking a change. Morning print may already be turned on, and a manual print or “Print card” hits the real device. Do not leave sample to-dos in the database: an approved card with `card_printed_at` null prints after the next roundup.

A failed card must not mark the roundup job failed. That job is already successful, and flipping it would print the whole slip again.

The printer host and port are rows in SQLite, not constants in the repo.

## Tunnel

`cloudflared` is an optional Compose profile named `tunnel`. It does not replace the local process. Do not put Cloudflare Access in front of the hostname. Phone codes and the public note link need to reach this app’s own sign-in.

## UI

Check changed screens in the browser: sign in, the user list, a member’s limited nav, the to-do board on a narrow viewport, and a card opened from the board and from `/todos/[id]`. Do not click Print now, Save and test print, or Print card unless the person asked for a real print.

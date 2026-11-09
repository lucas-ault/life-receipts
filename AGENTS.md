# Agents

Life Receipts is a long-running Next.js app on the same LAN as an ESC/POS receipt printer. The printed wordmark is Life Receipts. The package name is `life-receipts`.

## Run

Docker Compose is the way to run it. `./data` is bind-mounted, so the database and session secret survive restarts, `docker compose down`, and image rebuilds.

```bash
cp .env.example .env
docker compose up --build -d
```

`APP_URL` should be this computer’s LAN address when phones need to open the slip. `npm run dev` is for working on the code. Stop the container first. Both want port 3000.

`npm test` runs Vitest. `npx tsc --noEmit` typechecks. Do not add `"type": "module"` to `package.json`.

`next.config.ts` sets `agentRules: false` so Next does not replace this file. Leave that flag in place.

## Data

SQLite lives at `data/roundup.sqlite` and is gitignored. Tables are created in `lib/db.ts` with `CREATE TABLE IF NOT EXISTS`, then small `ALTER TABLE` checks for columns added later. Put new columns in both `db/schema.ts` and `ensureTodoColumns` (or a sibling ensure function) so an existing database picks them up without a separate migration runner.

Do not open that file from the host while the container is running. On Docker Desktop, a second SQLite connection on the bind mount can detach the file the server is writing.

`.env` is gitignored. Do not print secrets from it. `APP_URL`, Google OAuth, `SESSION_SECRET`, and `TUNNEL_TOKEN` are documented in `.env.example`.

## Accounts

There is one owner and any number of members. The session cookie is `roundup_session` and carries the user id and role. Members can open `/notes` and `/todos` only. Member-created to-dos start as `pending` and must not be included in `listOpenTodos` or `listUnprintedTodoCards`.

If `settings.password_hash` exists and `users` is empty, startup copies that hash onto the username `owner`.

## Printing

Do not send a job to the printer while checking a change. Morning print may already be turned on, and a manual print or “Print card” hits the real device. A documentation print is only for a session where the person asked for paper. After that session, remove the extra person and mark sample to-dos done with `card_printed_at` set, so the morning job does not feed a stack of test cards.

Do not leave a new approved card with `card_printed_at` null in the database. It prints after the next morning slip.

A failed card must not mark the slip job failed. That job is already successful, and flipping it would print the whole slip again.

The printer host and port are rows in SQLite, not constants in the repo. Paper width goes back to 80 mm after any 58 mm test on a household that uses 80 mm rolls.

## Tunnel

`cloudflared` is an optional Compose profile named `tunnel`. It does not replace the local process. Do not put Cloudflare Access in front of the hostname. Phone codes and the public note link need to reach this app’s own sign-in.

## UI

Check changed screens in the browser: sign in, the user list, a member’s limited nav, the to-do board on a narrow viewport, and a card opened from the board and from `/todos/[id]`. Do not click Print now, Save and test print, or Print card unless the person asked for a real print.

# Life Receipts process notes

Temporary. This is a working history of how the app was designed and built, through the evening of 8 November 2026. It is not part of the public guide. Delete it when it has served its purpose.

Nothing in here is a secret from `.env`. The Google client secret, the session secret, account passwords, and the public note token are omitted on purpose.

## What it is now

Life Receipts is a self-hosted Next.js app that draws a morning slip and sends it to a thermal receipt printer on the local network. The household copy runs on the homelab cluster, which pulls the published image. This laptop is the working checkout, not the process that prints. The cluster is on the printer’s network, so it can open a TCP socket to the printer. The printed and on-screen name is Life Receipts. The npm package is `life-receipts`. The GitHub repository is `lucas-ault/life-receipts`. The folder on disk is still `morning-roundup-receipt`.

The slip can include:

- one Google Calendar, read-only, for the local day
- weather for several places, with drawn condition icons
- a few headlines per place, from RSS
- notes from the owner, from other signed-in people, and from an unlisted shared page
- open to-dos, which stay on the slip past their due date until they are marked done

After a successful slip, each approved to-do that has never had a card prints as its own tear-off. The card shows the title, a short description, and the due date on the left, and a QR code on the right that opens `/todos/[id]`. The slip itself prints a QR to `/todos` only when at least one to-do is open.

There is one owner and any number of members. The owner has the full dashboard. Members can open notes and to-dos only. A member’s new to-do starts as pending and stays off the slip and off the tear-off cards until the owner approves it.

State is SQLite at `data/roundup.sqlite`, bind-mounted into Docker as `./data`. That folder also holds the session secret when one is not set in the environment. `docker compose down` does not delete it. A backup is a copy of `data/`.

## Starting request

The original ask was a public, self-hosted project:

- pull one Google Calendar for the day
- weather for any number of places
- notes, including a page someone outside the household can use
- a web UI that works on a phone and on a desktop
- a printable receipt image
- a scheduled print to a printer already on the network

The printer in this house is at `192.168.10.46`, port `9100`. The UI was to be React or Next, with a household feel rather than a generic dashboard. The printer address was to live in the local database, not as a constant in the repo. High-importance calendar look-ahead was explicitly deferred. Headlines were in the first version.

A plan was written and then implemented. The plan files themselves were left untouched.

## Phase 1: the morning slip

Stack that landed:

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4
- SQLite through `better-sqlite3` and Drizzle
- schema applied at startup in `lib/db.ts` with `CREATE TABLE IF NOT EXISTS`, then small `ALTER TABLE` checks for columns added later, so an existing database picks up new columns without a migration runner
- receipt drawing with `@napi-rs/canvas`
- Google Calendar OAuth, read-only
- weather from Open-Meteo, no API key, with the CC BY 4.0 credit printed on the slip
- headlines from RSS, defaulting to a Google News search for the place name, capped per place
- ESC/POS over TCP 9100

The receipt is drawn at 576 dots for 80 mm paper and 384 dots for 58 mm. Fonts shipped in the repo are Newsreader (including italic) and IBM Plex Mono, both OFL. The preview in the browser is the same PNG the printer receives. For the printer, pixels darker than a luminance threshold become black. The bitmap is sent with `GS v 0` in strips, then a feed and a partial cut.

Empty sections are omitted. A section that fails becomes a line on the slip instead of failing the whole job. Section order: masthead, weather, calendar, headlines, notes, to-dos, Open-Meteo credit, then the to-do QR when the list is not empty.

A scheduler starts from `instrumentation.ts` except during the image build. It ticks on a short interval, prints once per local date after the configured time when morning print is on, and can catch up later the same day. A mutex keeps two jobs from using the printer at once. Notes are marked printed only after a successful manual or scheduled slip. A test slip does not mark notes printed and does not count as the morning slip. Stale jobs left in “running” are marked failed.

Early fixes that shaped the code:

- OAuth state had to be set on the redirect response, or the callback could not see the cookie.
- Open-Meteo’s multi-location response is an array, not one object.
- Next 16 uses `proxy.ts`. Having `middleware.ts` beside it is an error. The proxy sets the path so a login can return to the URL that was scanned.
- The database file must not be opened from the host while the container is writing it. On Docker Desktop a second connection on the bind mount can detach the file the server still has open. That showed up later as inserts that returned new ids and then vanished from `./data`.

The first calendar connection used a Google OAuth web client. The redirect is `${APP_URL}/api/calendar/callback`. The refresh token stays in SQLite. Changing `APP_URL` does not require reconnecting. A new connect does require the new redirect URI in Google Cloud. The consent screen, while in testing, only allows accounts listed as test users.

Tomorrow was added as a preview page. It uses the next local day’s weather and calendar. Headlines stay on the current feed. Open to-dos and notes that have not printed are included. At this point the page had no print button. That button came later, in phase 8.

The slip layout was then tightened, and weather conditions became drawn icons from WMO codes rather than text alone.

## Phase 2: to-dos and tear-off cards

To-dos were added with due dates and the statuses new, in progress, and done. An open item stays on the slip after its due date until it is done. The due label can say overdue.

The QR on the slip was then limited to slips that actually have open to-dos. A morning with nothing open does not print a code to an empty board.

The next request was a separate ticket after the slip. Status is not printed on the ticket. A small QR opens that to-do. New cards wait for the next successful slip, or print immediately if the owner asks for that at creation. A card that fails after the slip has already succeeded must not flip the slip job back to failed, because that would print the whole slip again. A manual print still surfaces the card error to the owner.

Pending was not part of this phase yet. Cards were for items already on the board.

## Phase 3: people, a board, and a tunnel scaffold

The repo had been renamed `life-receipts`. The work after that was accounts, a Cloudflare Tunnel option, and docs.

Accounts are individual, not one shared household password. The owner creates people and either types a password or generates one. The password is shown once. Members can add notes and to-dos. A member-created to-do starts as `pending`. The owner approves it into `new`. Members cannot approve, print, change a to-do after approval, or open the printer, calendar, places, settings, or user list. The layout sends a member who requests those pages back to `/todos`. Owner-only APIs reject them.

If an older install still had a single password hash and an empty user table, startup copies that hash onto the username `owner`. That is how this household’s existing password became the owner login.

The board is four columns from a medium width up: Pending, New, In progress, Done. On a phone, one column shows at a time, chosen with a tab list. The default column is Pending when anything is waiting, otherwise New. Opening a card is a modal on the board and the same editor at `/todos/[id]`. The card has the printed title and short description, the due date, and a longer notes thread that does not print on the tear-off.

The tear-off lays text on the left and the QR on the right, with the caption “Scan to update”. It is not centered under the text. Pending items are excluded from the open-todo query and from the unprinted-card query.

The public note page at `/p/[token]` stayed unlisted and did not require an account. Dismissing a note and rotating the token are owner-only. Members can add notes. A blank author becomes the signed-in person’s display name. The public page is rate limited.

The tunnel is an optional Compose profile named `tunnel`. It runs `cloudflared` with a remotely managed token. The public hostname is configured in the Cloudflare dashboard, not in a local config file. The worked example is `receipts.ault.cc` pointing at `http://life-receipts:3000` on the Compose network. Cloudflare Access must not sit in front of that hostname, because a scanned QR and the shared note link have to reach this app’s own sign-in. Printing stays on the LAN.

Docs at that point were a README, `AGENTS.md`, `docs/architecture.md` with mermaid diagrams, and `docs/hosting.md` for the tunnel. `next.config.ts` sets `agentRules: false` so Next does not replace `AGENTS.md`. The package name, the HTTP user-agent, and the Compose service became `life-receipts`. The workspace folder was not renamed.

A hot-process bug in this phase: the SQLite connection was cached from before the users table existed, so `ensureOwner` ran before `CREATE TABLE users` and `/places` and a to-do page threw `no such table: users`. `getDb()` now applies the schema and the column checks on every call, not only the first open.

## Phase 4: local addresses, Docker, and a photographed guide

The next request was an end-to-end pass of every feature, screenshots, and real prints of each slip and card, then a public getting-started guide that uses those pictures. Upcoming events and to-dos were allowed to reflect this household: La Verne, Whistler, and the real calendar.

Local addresses were to be used for now, not `receipts.ault.cc`. This computer’s LAN address at the time was `192.168.10.62`. `APP_URL` was set to `http://192.168.10.62:3000` so QR codes and the share link used that origin. The public README uses a placeholder such as `http://192.168.1.20:3000` and does not treat this house’s address as the only example. Private LAN addresses in the screenshots were acceptable.

Docker Compose became the supported run path. `./data` is a bind mount, not a named volume, because `docker compose down -v` would delete a named volume. The image does not contain the database. `.dockerignore` excludes `node_modules`, `.next`, `data`, `.git`, and env files. The Dockerfile is multi-stage. The build stage is `node:22-bookworm-slim` plus `python3`, `make`, and `g++`, because `better-sqlite3` failed `npm ci` when Python was missing. The runtime stage copies the built app and runs `npm start`. The first image build failed on the missing compiler toolchain. The second succeeded.

The dev server that had been on port 3000 was stopped so Compose could bind it. A later notification that the dev-server shell had aborted is that stop. The container reached the printer at `192.168.10.46:9100`. Login over the LAN returned 200.

Getting started was allowed to include Google Calendar as written steps only: OAuth web client, Calendar API enabled, redirect `APP_URL/api/calendar/callback`, client id and secret in `.env`, restart, connect, read-only scope, and the testing consent screen requiring the Google account as a test user. No Google Cloud screenshots. The in-app Calendar page could be photographed already connected.

Guide examples use the generated PNGs, the same images sent to the printer, not photos of the paper. The paper was still printed so it matched.

The print set, all of which completed with a successful response from the app:

1. Short 80 mm test slip from the printer page.
2. One card printed at creation, with a short description (“Call the dentist” / “Ask about the crown”).
3. One card with a title and due date only (“Renew the library card”).
4. One full slip: both places and weather icons, headlines, an owner note, a member note, a shared-page note, and open to-dos in new, in progress, and overdue. No calendar section that day, because nothing was on the calendar for 8 November. The bottom QR was present because the list was open. Unprinted cards followed the slip.
5. One reprint from Print card.
6. One slip after those to-dos were marked done, so the list and the QR were absent. Notes were already marked printed by the successful slip, so that second slip was weather and headlines only.
7. One 58 mm test slip, then paper width set back to 80 mm.

Morning print on this household was already on at 07:00. Manual prints do not cancel the next scheduled slip. After the session, the extra person (Sam) was removed. The sample to-dos were marked done with `card_printed_at` set, including the pre-existing done item titled “Test”, so 07:00 does not feed a stack of test cards. Places, the calendar connection, the owner account, the printer address, and the morning schedule were left in place. The sample to-dos remain in the Done column.

Screenshots saved under `docs/images/` cover sign-in, today, tomorrow, places, calendar (email redacted to `you@example.com` in the picture), notes (the share token replaced with dots), printer, users, the one-time password with the password covered, the member-only nav, a member note, the pending to-do on the member board, the owner approval modal, `/todos/[id]`, the phone-width board and card, and the signed-out shared note page. Member attempts to open Printer, Places, Calendar, and Users were confirmed to land back on `/todos`.

The first-run setup screen was described from `components/setup-form.tsx` instead of wiping the live database to reach `/setup`.

A Docker Desktop SQLite incident happened in the middle of creating the print-set to-dos. The server process still held a deleted inode of `roundup.sqlite` after the file on the bind mount was replaced. API calls returned new ids that were not in the file `./data` showed. Restarting the container reattached it to the real file. Further writes went through the HTTP API while the container was up, and the PNG exporter ran only while the container was stopped. `AGENTS.md` now says not to open that file from the host while the container is running.

The printer page had a sentence that named this house’s printer address. That was changed to a generic line about port 9100 before the screenshot, so the public UI does not instruct people to use `192.168.10.46`.

## Phase 5: the name

Partway through the screenshots, the visible name was changed from Roundup to Life Receipts. That replaced an earlier decision to keep Roundup as the printed wordmark.

Changed:

- page titles in `app/layout.tsx`
- the header wordmark
- the italic wordmark on sign-in, setup, the public note page, and the not-found page
- the printed masthead in `lib/receipt/raster.ts` (slightly smaller than the old one-word mark so “Life Receipts” fits, and it wraps if it does not)
- user-facing copy that said “the next roundup”, which became “the next morning slip”
- the `AGENTS.md` wordmark sentence

Left as internal names: `data/roundup.sqlite`, the `roundup_session` cookie, the OAuth state cookie, and the `printRoundup` function. Renaming those would invalidate the live database and existing sessions for no change a reader can see.

The running image was rebuilt before the replacement screenshots and before any of the Life Receipts paper was printed. The earlier screenshots that said Roundup were retaken.

## Phase 6: the guides

`README.md` is the Docker getting-started path a new person follows, with pictures beside the later steps. It covers Docker, a computer on the printer’s network, `APP_URL`, `docker compose`, the owner account, persistence of `./data`, the printer and test slip, places, today, tomorrow, Google Calendar as text, notes, adding a person, the board, the card, the QR rules, a phone on the same Wi-Fi, a short `npm run dev` note, and a pointer to `docs/hosting.md`.

`docs/architecture.md` keeps the mermaid diagrams for sign-in, the to-do flow, and the print pipeline, and adds the slip, the board, a tear-off, and the bind-mounted data file.

`docs/hosting.md` stays the tunnel guide for the `receipts.ault.cc` example.

`AGENTS.md` says Compose is how to run it, the printed wordmark is Life Receipts, a documentation print is only when someone asked for paper, and sample rows are cleared afterward so the morning job does not print them.

Git, as of this writing:

- `598f209` Initial commit, a one-line README.
- `fe104bb` The application, Dockerfile, and the first docs.
- `4c3d18c` The Life Receipts rename, the Docker get-started README, and the screenshot and slip images.
- `origin/main` is one commit ahead of this checkout: `df924ab` “Publish the container image from main.” That commit adds `.github/workflows/container.yml` only. This working tree does not contain that commit yet.

## Phase 7: a published image, then stopping the local app

The request was a GitHub Action that builds the container and pushes it to this repo’s GHCR, so someone can clone the repo and run it without compiling.

On the remote, that landed as `.github/workflows/container.yml`. It runs on a push to `main` and on `workflow_dispatch`. It logs into `ghcr.io` with `GITHUB_TOKEN`, tags `latest` on the default branch plus a short commit SHA, and pushes `ghcr.io/lucas-ault/life-receipts`. It builds on the GitHub runner’s architecture. It does not declare `linux/arm64`. The commit message says a cluster pulls `:latest` the same way as the other production apps.

This checkout, which has not pulled that commit, also has an uncommitted workflow at `.github/workflows/publish-image.yml` and matching uncommitted edits:

- `docker-compose.yml` sets `image: ghcr.io/lucas-ault/life-receipts:latest` and keeps `build: .`
- the README tells a new person to `docker compose pull` and `docker compose up -d`, and mentions `--build` for a local image
- `AGENTS.md` and `docs/hosting.md` follow that pull path

The uncommitted workflow is broader than the one already on `main`: it also runs on `v*` tags, builds `linux/amd64` and `linux/arm64`, adds semver tags, and tries to mark the GHCR package public. Those two workflow files would both publish on a push to `main` if the local file is committed beside the remote one. They should be reconciled before that.

Compose behavior with both `image` and `build`: it pulls the published image first and builds from this checkout only if the image is not available, or when `--build` is passed. `latest` is refreshed on `up`.

After that, Compose on this laptop was stopped with `docker compose down`. The container and its network on this machine were removed. `./data` on this laptop was not deleted. That stop does not affect the homelab cluster. The cluster is the copy that prints.

## Phase 8: tomorrow’s slip, and the Google redirect

Two changes, still uncommitted in this checkout. The cluster does not have them until this work is published and that node pulls a new image.

Tomorrow gained a **Print tomorrow** button. It posts to `/api/print/tomorrow`, which calls `printTomorrowSlip`. That draws the same document as the preview: tomorrow’s weather and calendar, the current headlines, open to-dos, and notes that have not printed. The job is stored with trigger `tomorrow` on tomorrow’s date key. Today’s status line labels that trigger “Tomorrow’s slip”. It does not mark notes printed, does not print tear-off cards, and does not count as the scheduled morning job, so 07:00 still prints. The button was not pressed from this checkout.

After Google returned from consent, the callback built the next Location from the incoming request URL. Inside the container that host is `0.0.0.0`, so the browser was sent to `http://0.0.0.0:3000` instead of `APP_URL`. The URI registered with Google, `${APP_URL}/api/calendar/callback`, was already correct. The follow-up redirects now use `browserOrigin`, which prefers the origin of `APP_URL` when that host is not `0.0.0.0` or `::`. If `APP_URL` is missing and the request host is the bind address, it rewrites that host to `localhost`. Calendar connect and sign-out use the same helper. `lib/origin.test.ts` covers the bind-address case, and those tests passed. Google was not connected again from this checkout. A reconnect on the running app is what shows the browser landing on `APP_URL`.

## Household state

The running app is the homelab cluster. This laptop’s container is stopped on purpose.

This checkout’s `data/roundup.sqlite` is the laptop copy from the photo session:

- owner account only
- places for La Verne and Whistler, weather and headlines on, three headlines each
- Google Calendar still connected
- printer `192.168.10.46:9100`, paper 80 mm
- morning print on at 07:00, timezone `America/Los_Angeles`, Fahrenheit
- the sample to-dos in Done, with cards already printed
- notes from the photo session marked printed, so they will not appear on the next slip from this file

The cluster has its own data directory. Morning print there follows whatever that node is running.

## How a slip is produced

`lib/receipt/build.ts` assembles a document for a local day: forecasts, headlines, calendar events, pending notes, and open to-dos. Tomorrow is the same function one local day ahead.

`lib/receipt/raster.ts` measures and wraps text, draws the masthead, rules, weather icons, and the QR codes, and returns both a PNG and raw pixels.

`lib/print-job.ts` turns those pixels into ESC/POS and sends them with `lib/printer.ts`. A today print, manual or scheduled, marks the captured notes printed, records the job, then prints unprinted approved cards. `printTomorrowSlip` sends the tomorrow document only. `printTodoCard` refuses anything that is not `new` or `in_progress`.

`lib/scheduler.ts` calls the same slip function on the schedule and only treats a successful job with trigger `schedule` as the morning print. Test slips and tomorrow prints do not mark notes or print cards.

## Accounts and pages

Owner pages: Today, Tomorrow, Places, Calendar, To-dos, Notes, Printer, Users.

Member pages: To-dos and Notes. The logo link goes to `/todos` for a member and `/` for the owner.

Setup collects a display name, username, password, confirmation, timezone, and units.

Users: one owner, who cannot be deleted. Removing a member nulls `created_by` on their to-dos and the user id on card notes. Usernames are stored lowercase.

To-do limits used by the validators: title 140, printed description 200, card note 1000, password at least 8 characters.

## What was decided and then changed

- High-importance look-ahead: deferred, still not built.
- Headlines: in from the first version.
- Printed wordmark: first kept as Roundup after the repo rename, then changed to Life Receipts before the final screenshots and prints.
- Public hostname: scaffolded as `receipts.ault.cc`, then the photographed guide and `APP_URL` used the LAN address. The tunnel doc remains for later.
- Run path: first `npm run dev`, then Compose on this laptop, then the homelab cluster pulling the published image. This laptop is for working on the code. `npm run dev` is documented for that, and only after nothing else wants port 3000.
- Guide pictures: generated PNGs, with the paper printed to confirm them.
- Persistence: bind-mounted `./data`, not a named volume.

## Current files that matter

Application code is the `app/`, `components/`, `lib/`, and `db/` trees listed by the repo. Fonts are in `assets/fonts/`. The container is `Dockerfile` and `docker-compose.yml`. Guides are `README.md`, `AGENTS.md`, `docs/architecture.md`, and `docs/hosting.md`. Pictures are in `docs/images/`.

Uncommitted in this checkout, on top of a `main` that is one commit behind `origin/main`:

- `.github/workflows/publish-image.yml` (untracked here; origin already has a different file, `container.yml`)
- `docker-compose.yml`, `README.md`, `AGENTS.md`, `docs/hosting.md` (the GHCR pull instructions)
- Tomorrow print: `app/(app)/tomorrow/page.tsx`, `components/print-button.tsx`, `app/(app)/page.tsx`, `lib/print-job.ts`, `app/api/print/tomorrow/route.ts`
- Google redirect: `lib/origin.ts`, `lib/origin.test.ts`, `app/api/calendar/callback/route.ts`, `app/api/calendar/connect/route.ts`, `app/api/auth/logout/route.ts`
- this file

`.env` and `data/` are gitignored.

## Not done

- This checkout has not pulled `df924ab`, so the published workflow and the local workflow are not the same file.
- The household process is the homelab cluster. This laptop’s container stays stopped. The cluster keeps running whatever image it last pulled, which does not yet include tomorrow’s print or the `APP_URL` redirect.
- The GHCR image is only produced when that workflow runs on GitHub. If GitHub creates the package as private, anonymous `docker compose pull` fails until the package is made public.
- The Done column still contains the documentation to-dos.
- The workspace directory name is still `morning-roundup-receipt`.
- Internal identifiers still say roundup.
- High-importance calendar look-ahead was never built.
- This file is the temporary process note. It should not be treated as the public README.

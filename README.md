# Life Receipts

A self-hosted morning slip. It gathers the day’s calendar, the weather, a few headlines, notes, and open to-dos, draws them as a receipt, and sends that image to a thermal printer on your network. Approved to-dos also print as their own tear-off cards.

The app runs on a computer that can reach the printer. A cloud host cannot open a socket to a printer on your LAN. Docker Compose is the way to run it. Your household data stays in `./data` on that computer.

```mermaid
flowchart LR
  app[LifeReceipts] --> slip[ReceiptImage]
  slip --> printer[LanPrinter]
  slip --> phone[PhoneQr]
  phone --> app
```

## What you need

- Docker, with Compose
- A computer on the same network as the printer
- That computer’s LAN address, such as `192.168.1.20`
- A receipt printer that accepts raw ESC/POS on TCP, usually port 9100

Weather comes from [Open-Meteo](https://open-meteo.com/) and does not need a key. Headlines come from an RSS feed. Adding a city fills in a Google News search feed, which you can replace with any other feed.

## Start

Find this computer’s LAN address. On a Mac, System Settings, Network, shows it. The examples below use `192.168.1.20`. Use yours.

```bash
cp .env.example .env
```

Set `APP_URL` in `.env` to the address you will open in a browser, including the port:

```bash
APP_URL=http://192.168.1.20:3000
```

Phones and the codes printed on the paper use that address. Then pull the published image and start:

```bash
docker compose pull
docker compose up -d
```

The image is [ghcr.io/lucas-ault/life-receipts](https://github.com/lucas-ault/life-receipts/pkgs/container/life-receipts). `docker compose up --build -d` builds from this checkout instead.

Open `http://192.168.1.20:3000`. The first visit asks you to create the owner: a display name, a username, a password, the same password again, a timezone, and Fahrenheit or Celsius.

![Sign in](docs/images/sign-in.png)

The database and the session secret live in `./data` next to this repo. Restarting the container, `docker compose down`, and rebuilding or re-pulling the image all leave that folder in place. Leave it as a normal folder on the host. A backup is a copy of `data/`. Deleting that folder deletes the household.

## Printer

Open Printer. Enter the printer’s address and port, choose 80 mm or 58 mm paper, and save. “Save and test print” sends a short slip. If the socket connects and the paper is blank or garbled, the printer is speaking a different raster dialect than ESC/POS `GS v 0`.

![Printer](docs/images/printer.png)

![Test slip](docs/images/slip-test.png)

Morning print stays off until you turn on “Print every morning” and set a time. The clock uses the timezone on this page. When that time passes, the app prints once for that local date. A failed print is retried later the same day. A test slip does not clear notes, and it does not take the place of the morning slip.

## Places, today, and tomorrow

Add each city on Places. Weather and headlines print in that order. “Headlines each” is how many items to take from each feed.

![Places](docs/images/places.png)

Today shows the slip that the next morning print will send, and a Print now button. Tomorrow previews the next local day and can print that copy. Printing it does not clear notes or print to-do cards, and it does not replace the morning slip. Weather and calendar on that page are tomorrow’s. Headlines are the current feed.

![Today](docs/images/today.png)

![Tomorrow](docs/images/tomorrow.png)

The image on those pages is the same PNG the printer receives. A full morning slip looks like this:

![Morning slip](docs/images/slip-full.png)

Tomorrow’s preview, with the next day’s weather and calendar:

![Tomorrow slip](docs/images/slip-tomorrow.png)

## Google Calendar

Calendar is optional. These are the Cloud steps. The pictures in this guide stay inside the app.

1. In Google Cloud, create a project and enable the Google Calendar API.
2. Configure the OAuth consent screen. While it is in testing, add the Google account you will connect as a test user.
3. Create an OAuth client of type Web application.
4. Add the redirect URI `APP_URL/api/calendar/callback`. With the example address that is `http://192.168.1.20:3000/api/calendar/callback`.
5. Put the client id and secret in `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. Restart so the container picks up `.env`: `docker compose up -d`.
7. Open Calendar and connect. The scope is calendar read-only.
8. Pick one calendar. The slip lists that calendar’s events for the local day.

![Calendar](docs/images/calendar.png)

Changing `APP_URL` later means adding the new redirect URI in Google Cloud before you connect again. A calendar that is already connected keeps working.

## Notes

Notes stay on the slip until a print succeeds. The owner, someone else with an account, and anyone with the shared link can add one.

![Notes](docs/images/notes.png)

The shared page is unlisted. Anyone with the link can leave a note and see notes that are still waiting. The owner can replace the link. The page allows five notes per ten minutes from one network.

![Shared note page](docs/images/public-note.png)

## People

The owner manages places, the calendar, the printer, and the user list. From Users, add a person with a display name and a username, then either type a password or generate one. The password is shown once.

![Users](docs/images/users.png)

![Password shown once](docs/images/password-once.png)

That person can sign in only to add notes and to-dos. Printer, Places, Calendar, and Users send them back to the to-do board.

![A member’s board](docs/images/member-board.png)

![A note from a member](docs/images/member-notes.png)

A to-do they add stays in Pending until the owner approves it. Pending items stay off the slip and off the tear-off cards.

![Approve a to-do](docs/images/approve-todo.png)

## To-dos

The board has Pending, New, In progress, and Done. Open items stay on the slip past their due date. Done items leave the slip. On a phone, one column shows at a time.

![To-dos](docs/images/todos.png)

![To-dos on a phone](docs/images/phone-board.png)

Open a card for the title, the short description that prints, the due date, and a longer notes thread. The same editor is at `/todos/[id]`, which is where a code on the paper opens.

![To-do card](docs/images/todo-card.png)

![To-do card on a phone](docs/images/phone-card.png)

A card printed when you add it includes the short description:

![Card with a description](docs/images/card-10.png)

A card with only a title and a due date:

![Card with a title and due date](docs/images/card-7-title.png)

The code sits on the right. “Scan to update” is under the code, and it opens that card. Leave “Print a card now” off and the card prints after the next successful morning slip, once the to-do is approved.

The morning slip lists open to-dos and prints a code at the bottom only when that list is not empty. After those items are done, the list and the code are left off:

![Slip with nothing open](docs/images/slip-clear.png)

A 58 mm test is the same short slip, narrower:

![58 mm test](docs/images/slip-test-58.png)

Set the paper width back to 80 mm when that is the roll in the printer. The morning slip uses whatever width is saved.

## Phone

A phone on the same Wi-Fi opens the address in `APP_URL`, for example `http://192.168.1.20:3000`. Sign in there to update a card after scanning it.

## Later: a public hostname

A Cloudflare Tunnel can publish this same local process. Printing still uses the LAN address on the Printer page. The steps are in [docs/hosting.md](docs/hosting.md). Do not put Cloudflare Access in front of the hostname. A scanned code and the shared note link have to reach this app’s own sign-in.

## Environment

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Origin you open in a browser, and the origin printed on the slip |
| `GOOGLE_CLIENT_ID` | OAuth client id. Optional until you connect a calendar |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `SESSION_SECRET` | Optional. If empty, the app writes `data/session-secret` |
| `TUNNEL_TOKEN` | Optional token for a remotely managed Cloudflare Tunnel |

## Working on the app

Compose is the path that prints. `npm run dev` is for changing the app on the same machine. Stop the container first so port 3000 is free.

```bash
docker compose stop
npm install
npm run dev
```

```bash
npm test
npm run build
```

How the pieces fit is in [docs/architecture.md](docs/architecture.md). Notes for agents working in this repo are in [AGENTS.md](AGENTS.md).

Fonts for the printed slip are Newsreader and IBM Plex Mono, both under the SIL Open Font License. Copies of the license are in `assets/fonts/`. Weather data is credited on the slip (Open-Meteo, CC BY 4.0).

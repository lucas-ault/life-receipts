# Hosting behind a Cloudflare Tunnel

The app stays on the machine that can reach the receipt printer. The tunnel only publishes that process. Printing still uses the LAN address stored on the Printer page.

Do not put Cloudflare Access in front of this hostname. A phone scanning a code, and anyone opening the shared note link, has to reach the app’s own sign-in. Access would ask for a second login before the app can see the request.

These steps use `receipts.ault.cc` as the example. Another hostname is the same work with that name in `APP_URL`, DNS, and the Google redirect.

## 1. Create a remotely managed tunnel

In the Cloudflare dashboard, open the account that owns `ault.cc`, then Zero Trust, Networks, Tunnels. Create a tunnel and choose the remotely managed, token-based connector. Copy the token into `.env`:

```bash
TUNNEL_TOKEN=the-token-from-the-dashboard
APP_URL=https://receipts.ault.cc
```

For everyday use, `APP_URL` is this computer’s LAN address, as in the README. Use `http://localhost:3000` only when you are developing with `npm run dev`. The token is not required until you start the tunnel.

## 2. Route the hostname

On the tunnel, add a public hostname:

- Hostname: `receipts.ault.cc`
- Service: `http://life-receipts:3000` when the connector runs in Docker Compose with the app
- Service: `http://localhost:3000` when `cloudflared` runs on the host and the app is `npm run dev` or `npm start`

The dashboard publishes the route. This repo does not keep a local tunnel config file. Save the hostname, then add the DNS record Cloudflare offers for that route. For a zone on the same account that is a CNAME from `receipts` to the tunnel. If `ault.cc` is on another account, create that CNAME there.

## 3. Start the connector

From this directory, with `.env` filled in:

```bash
docker compose --profile tunnel up --build
```

The `cloudflared` service is on the Compose profile `tunnel`, so a plain `docker compose up` does not need a token and does not start the connector. The app service is named `life-receipts`. The connector joins the same Compose network and uses the service name above.

To run the connector on the host instead:

```bash
cloudflared tunnel run --token "$TUNNEL_TOKEN"
```

Point the public hostname at `http://localhost:3000` in that case.

## 4. Point Google at the new origin

Add this authorized redirect URI on the OAuth client:

```text
https://receipts.ault.cc/api/calendar/callback
```

Restart the app after changing `APP_URL`. The next calendar connect uses the new redirect. Codes on the slip use `https://receipts.ault.cc` because that origin is not loopback.

Sign-in cookies are Secure when `APP_URL` is `https://`. Open the site at that HTTPS URL, not at the raw LAN port, once the tunnel is the address you want phones to use.

## 5. Check

- `https://receipts.ault.cc` shows the sign-in page.
- An owner can open Today, and the preview image loads.
- A phone on the public internet can open `/todos` and is sent through sign-in.
- The printer test still runs from the machine on the LAN. The tunnel is not on that path.

If the hostname loads but the printer does not, the app process is no longer on a network that can reach the printer. Keep the process where it is and fix the tunnel route, rather than moving the app to a cloud host.

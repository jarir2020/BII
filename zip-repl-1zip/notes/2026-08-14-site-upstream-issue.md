# Site Upstream Incident Note

Date: 2026-08-14

Observed symptoms:
- `ping` succeeded, but browser and `curl` requests to both HTTP and HTTPS were resetting.
- The site returned `502 Bad Gateway` during one live check.
- Public API requests sometimes returned data, but later reset during TLS/HTTP handshake.
- The issue looked more like a domain/upstream/web-server instability than empty data tables.

Likely cause:
- Upstream proxy, Passenger, Apache, or backend process instability.
- Not a DNS-only issue, because name resolution and ping still worked.

Useful next check:
- Run `./scripts/check-site.sh`
- For protected endpoints, set `ADMIN_EMAIL` and `ADMIN_PASSWORD`


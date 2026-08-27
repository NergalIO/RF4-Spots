# HTTPS and host firewall

## Reverse proxy

1. Point a DNS name at the VPS (Let's Encrypt does not issue for a raw IP).
2. In the repo-root `.env` set `DOMAIN=spots.example.com`, `ACME_EMAIL=you@example.com`,
   `TRUST_PROXY=1`, `REQUIRE_HTTPS=1`, `ALLOW_REGISTER=false` (recommended on the public host).
3. `docker compose --profile https up -d --build`

Caddy listens on 80/443 and proxies to the API on the Docker network. The API is bound to
`127.0.0.1:3780` on the host, so it is not reachable from the internet.

## Firewall

```bash
sudo bash deploy/ufw.sh
```

Keep SSH on keys only (`PasswordAuthentication no`). Optionally restrict port 22 to your IP.

## Client installer

Pack with the public HTTPS origin (never commit that URL if you do not want it in git):

```bash
cd client
set VITE_SERVER_URL=https://spots.example.com
npm run pack
```

Existing JWTs become invalid after you rotate `JWT_SECRET`. Users sign in again. Changing a password or disabling an account also invalidates that user's tokens.

Postgres password in `.env` is applied only on first volume create. To rotate later, change
the role inside Postgres or recreate the `pgdata` volume (this wipes data).

## Backups

Postgres data is the `pgdata` Docker volume; screenshots are the `uploads` volume.

```bash
docker compose exec db pg_dump -U rf4 rf4spots > backup.sql
docker run --rm -v rf4spots_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads.tgz -C /data .
```

Restore with `psql` / extract the tarball into the uploads volume. After a restore run `npx prisma migrate deploy` if the schema might be behind.

Seed guide tables only when you want it: `docker compose exec api npm run db:seed`.

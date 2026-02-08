# Plan: GitHub Hosting + Web-Deployment

## Stack
| Service | Zweck | Free Tier |
|---------|-------|-----------|
| **Vercel** | Next.js Hosting + Cron | 100GB BW, 100h Compute/Mo |
| **Neon** | PostgreSQL Datenbank | 0.5GB Storage, always-on |
| **GitHub** | Source Code + CI | Unlimited public repos |

## Fortschritt

### Phase 1: GitHub Setup + Docker Dev-DB
- [x] `docker-compose.yml` erstellen (PostgreSQL für lokale Entwicklung)
- [x] `.env` anpassen: `DATABASE_URL` auf Docker-DB
- [x] `.env.example` erstellen (Template ohne Secrets)
- [x] `.github/workflows/ci.yml` erstellen (Build + Lint Check)
- [ ] GitHub Repo erstellen + Code pushen

### Phase 2: Datenbank-Migration (SQLite → PostgreSQL)
- [x] `prisma/schema.prisma`: Provider auf `postgresql` geändert
- [x] `package.json`: `postinstall: prisma generate` hinzugefügt
- [x] `prisma/export-data.ts` erstellt (Datenmigration)
- [x] SQLite-Daten exportiert (1 Round, 5 Holdings, 98 Transactions, 163 Snapshots)
- [ ] Neon-Account erstellen + Projekt anlegen
- [ ] `npx prisma migrate dev --name init` ausführen (benötigt laufende PostgreSQL)
- [ ] Daten in PostgreSQL importieren

### Phase 3: Scheduler → Vercel Cron
- [x] Cron-Endpoint erstellt: `src/app/api/cron/trade/route.ts`
- [x] `vercel.json` erstellt mit Cron-Config (`*/5 * * * *`)
- [x] Scheduler-Status-Endpoint angepasst (Vercel vs. lokal)

### Phase 4: Vercel Deployment
- [ ] Vercel-Account erstellen (GitHub-Login)
- [ ] Projekt importieren
- [ ] Environment Variables setzen:
  - `OPENROUTER_API_KEY`
  - `DATABASE_URL` (Neon Connection String)
  - `CRON_SECRET` (generieren: `openssl rand -base64 32`)
  - `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (optional)
- [ ] Deployen + testen

### Phase 5: Verifizierung
- [ ] Dashboard im Browser aufrufen
- [ ] 5 Min warten → prüfen ob Cron-Tick ausgeführt wird
- [ ] Portfolio/Transaktionen/Charts prüfen
- [ ] Vercel Logs auf Fehler checken

## Hinweise
- Docker ist aktuell nicht installiert → für lokale Entwicklung Docker Desktop installieren
- Alternativ: Neon DB auch lokal verwenden (einfacher, aber Internet nötig)

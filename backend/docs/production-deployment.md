# Déploiement en production — FILWORK Backend

> **État au 2026-11-12** : le backend n'a pas encore été déployé en production. Ce document décrit la procédure réelle appliquée lors du premier déploiement, la configuration du projet Vercel, les variables d'environnement, la vérification des endpoints de santé et la procédure de redéploiement. **Ne pas prétendre que ce déploiement est déjà fait.**

## 1. Architecture cible

```
[React/Vite SPA] ──HTTPS──► [Vercel Functions : backend/api/index.js] ──► [Neon PostgreSQL (branche production)]
                                    │
                                    └──► [EmailOutbox] ──► [Déclencheur externe 5 min] (obligatoire pour e-mails transactionnels)
                                    └──► [SasPay API] (REPORTÉ — SASPAY_ENABLED=false)
```

- Le frontend reste un projet Vercel séparé (racine du dépôt `FILWORK/`).
- Le backend est exporté par `backend/api/index.js` et invoqué comme Vercel Function ; il n'ouvre aucune écoute réseau.
- `src/server.js` reste le point d'entrée hors serverless (`npm start`, port `PORT`/`HOST`).

## 2. Déploiement sur Vercel

### Création/liaison du projet

1. Brancher le dépôt `Houinsoujonas/FILWORK` sur Vercel.
2. Configurer le projet :
   - **Root Directory** : `backend/`
   - **Framework preset** : Other / Node.js
   - **Node.js version** : 24.x (engine `node` = `24.x` dans `package.json`)
   - **Build Command** : `npm install && npm run build` (`build` = `prisma generate`)
   - **Install Command** : `npm install` (ou `npm ci` si l'on préfère un lock strict ; `npm install` conserve la compatibilité actuelle)
   - **Output Directory** : à laisser vide (Function serverless, pas de site statique)
3. Le fichier `backend/vercel.json` versionné déclare : la fonction, les réécritures `/api/* → /api/index.js`, et le cron quotidien 06:00 UTC.

### Aucun secret dans le dépôt

Les variables se configurent dans **Vercel → Settings → Environment Variables** (Production). Les secrets ne sont **jamais** écrits dans le dépôt ni fournis dans une conversation.

### Variables d'environnement de production

#### Requises (le démarrage échoue sinon)

| Variable | Exemple / règle |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://<domaine-du-frontend>` (HTTPS obligatoire) |
| `JWT_SECRET` | ≥ 32 caractères aléatoires (ex. `openssl rand -hex 48`) |
| `CORS_ORIGINS` | uniquement HTTPS non locales, aucune locale, chaque origine validée au démarrage |
| `DATABASE_URL` | Neon **pooler** : `...-pooler...aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=5` |
| `DATABASE_URL_UNPOOLED` | Neon **directe** (sans `-pooler`) : même branche, même base, `sslmode=require` |

#### Emails (obligatoires pour un lancement réel)

| Variable | Valeur |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` / `SMTP_PASS` | identifiants SMTP Brevo (Dashboard → SMTP) |
| `MAIL_FROM` | adresse vérifiée chez Brevo |
| `EMAIL_OUTBOX_ENABLED` | `true` |
| `CRON_SECRET` | ≥ 16 caractères (ex. `openssl rand -hex 32`) |
| `EMAIL_OUTBOX_BATCH_SIZE` | `3` (ou plus si l'offre le permet) |

#### Stockage et paiements

| Variable | Valeur |
|---|---|
| `STORAGE_PROVIDER` | `none` (aucun fournisseur encore configuré) |
| `SASPAY_ENABLED` | `false` |
| `FILWORK_COMMISSION_BPS` | `0` |

#### Variables qui ne doivent PAS être renseignées dans Vercel

- `FILWORK_ADMIN_EMAIL` / `FILWORK_ADMIN_PASSWORD` : utilisés uniquement en local par `scripts/createAdmin.js`. Créer l'administrateur en ops, pas dans le pipeline de déploiement.
- `TEST_*` : n'existent que dans `.env.test`.
- `FILWORK_ADMIN_*` : absent de la config serverless.

## 3. Vérifications post-déploiement

1. `GET https://<domaine-backend>/api/health`
   Attendu : `200`, `{"success":true,"message":"Le serveur FILWORK fonctionne correctement."}`.
2. `GET https://<domaine-backend>/api/health/database`
   Attendu : `200` avec `{"database":"connected"}`. 503 si la base est indisponible.
   **Note** : tant que les migrations ne sont pas appliquées sur `production`, certaines routes métier dépendantes des tables ne fonctionneront pas ; c'est attendu et ne doit pas être interprété comme un échec de déploiement.
3. Route interdite sans secret : `GET /api/internal/cron/process-emails` → `401` sans `Authorization: Bearer <CRON_SECRET>`, `503` si `CRON_SECRET` manquant ou < 16 caractères.
4. Surveiller les logs de la première heure (erreurs HTTP 5xx, `[EmailOutbox]`, latence `/api/health/database`).
5. Aucun e-mail ne part tant que Brevo n'est pas configuré ; le cron quotidien 06:00 sur Hobby est **insuffisant** pour les e-mails transactionnels (notamment les codes de réinitialisation avec TTL 15 min) : un **déclencheur externe toutes les 5 minutes** est obligatoire (`POST /api/internal/cron/process-emails`, `Authorization: Bearer <CRON_SECRET>`), voir `docs/vercel-deployment.md` et `docs/production-operations.md`.

## 4. Redéploiement après modification de code

```sh
git add <fichiers>
git commit -m "backend: <description>"
git push origin main
```

Vercel redéploie automatiquement sur push. Après redéploiement : vérifier les deux health checks.

## 5. Retour arrière

- Redéployer la version précédente depuis l'UI Vercel (onglet Deployments → Redeploy).
- Une migration Prisma ne s'annule pas automatiquement : rollback = dump restauré, ou migration de correction. Ne jamais `migrate reset` en production.

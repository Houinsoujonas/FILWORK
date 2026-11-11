# Variables d'environnement — FILWORK backend

## Règles

- Aucune valeur réelle n'est commitée. Les exemples ci-dessous sont des valeurs fictives.
- `.env` (application) et `.env.test` (tests) sont **ignorés par Git** (`backend/.gitignore`).
- Les variables de test (`TEST_DATABASE_URL`) n'appartiennent qu'à `.env.test`.
- Les secrets se configurent dans l'interface Vercel / Render, jamais dans le dépôt.
- `JWT_SECRET` : au moins 32 caractères aléatoires.

## Variables obligatoires

| Variable | Environnement | Rôle | Exemple |
| - | - | - | - |
| `NODE_ENV` | Tous | Mode (development/production/test) | `production` |
| `DATABASE_URL` | Tous | Connexion poolée Prisma/`pg` | `postgresql://USER:PASS@HOST-pooler/DB?sslmode=require&pgbouncer=true` |
| `DATABASE_URL_UNPOOLED` | Tous | Connexion directe (Prisma CLI, generate, migrate) | `postgresql://USER:PASS@HOST/DB?sslmode=require` |
| `JWT_SECRET` | Tous | Signature des access tokens | `replace-with-random-32-bytes` |
| `FRONTEND_URL` | Tous (HTTPS en production) | URL du frontend (liens e-mail) | `https://filwork.com` |
| `CORS_ORIGINS` | Tous | Origines autorisées (production : chaque origine HTTPS non locale, sinon démarrage refusé) | `https://filwork.com` |
| `SMTP_HOST` | Tous | Relais SMTP (Brevo : `smtp-relay.brevo.com`) | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Tous | Port STARTTLS (587) ou SSL (465) | `587` |
| `SMTP_SECURE` | Tous | `true` pour SMTPS, `false`/vide pour STARTTLS | `false` |
| `SMTP_USER` | Tous | Identifiant SMTP Brevo | `brevo-smtp-user` |
| `SMTP_PASS` | Tous | Mot de passe SMTP Brevo | `replace-with-smtp-pass` |
| `MAIL_FROM` | Tous | Expéditeur vérifié chez le fournisseur | `FILWORK <no-reply@filwork.com>` |

## Variables facultatives

| Variable | Défaut | Rôle |
| - | - | - |
| `PORT` | `5000` (dev), `5051` (test) | Port HTTP |
| `HOST` | `0.0.0.0` (hors test) | Interface d'écoute |
| `JWT_EXPIRES_IN` | `1d` | Durée de l'access token |
| `EMAIL_OUTBOX_ENABLED` | `true` (hors test) | Worker de file d'e-mails actif (jamais actif en test) |
| `EMAIL_OUTBOX_POLL_INTERVAL` | `30000` | Intervalle ms (hors Vercel Cron) |
| `EMAIL_OUTBOX_BATCH_SIZE` | `3` | Taille des lots |
| `EMAIL_OUTBOX_MAX_ATTEMPTS` | `5` | Tentatives max par e-mail |
| `CRON_SECRET` | — | Secret Bearer pour `/api/internal/cron/*` (≥ 16 chars, sinon 503) |
| `SASPAY_ENABLED` | `false` | Interrupteur général SasPay — `true` + `SASPAY_API_KEY` requis ; toute autre combinaison ⇒ 503 partout |
| `SASPAY_BASE_URL` | `https://api.saspay.me/api/v1` | URL de l'API SasPay |
| `SASPAY_API_KEY` | — | Clé API SasPay (`sk_live_…` production) |
| `SASPAY_WEBHOOK_SECRET` | — | Secret de signature du webhook (dashboard SasPay) |
| `FILWORK_COMMISSION_BPS` | `0` | Commission FILWORK en points de base (0 = 0 %) |
| `STORAGE_PROVIDER` | `none` | `none` / `vercel-blob` / `s3` |
| `STORAGE_TOKEN` | — | Token du fournisseur de stockage |
| `STORAGE_BASE_URL` | — | Préfixe public des URL |
| `STORAGE_MAX_UPLOAD_BYTES` | `5242880` | Taille max par fichier (5 Mo) |
| `TEST_DATABASE_URL` | — | `.env.test` uniquement |
| `TEST_ALLOW_NON_TEST_NAMED_DB` | — | Autoriser une base non nommée "test" en local (`true`) |
| `TEST_ALLOW_REMOTE_API` | — | Autoriser une API distante pour les tests (`true`) |
| `TEST_ALLOW_OTHER_PORT` | — | Autoriser un port autre que 5051 en test |
| `TEST_CREATOR_EMAIL`, `TEST_CREATOR_PASSWORD`, `TEST_COMPANY_EMAIL`, `TEST_COMPANY_PASSWORD`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_CAMPAIGN_ID`, `TEST_OWNERSHIP_CAMPAIGN_ID` | — | Comptes et jeux de données de test (`.env.test`) |
| `FILWORK_ADMIN_EMAIL`, `FILWORK_ADMIN_PASSWORD` | — | Création du premier admin (`scripts/createAdmin.js`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | Alternative lue par le même script |

## Validation au démarrage

- `JWT_SECRET` manquant ou de moins de 32 caractères en production → démarrage refusé.
- En production : `CORS_ORIGINS` doit contenir au moins une origine, et **chaque origine** doit être une URL HTTPS non locale (sinon démarrage refusé) ; aucune origine locale (`localhost`, `127.0.0.1`, `::1`, `[::1]`, `0.0.0.0`) n'est tolérée même mixée à une origine valide.
- `FRONTEND_URL` présent et HTTPS en production (sinon démarrage refusé).
- La validation est centralisée dans `src/config/productionEnv.js` et exécutée par les deux points d'entrée : `src/server.js` (serveur classique, `process.exit(1)`) et `api/index.js` (Vercel Functions, exception au chargement).
- En mode test : `.env.test` chargé exclusivement ; la base applicative est refusée par les gardes de ciblage.
- `CRON_SECRET` manquant ou < 16 caractères → `/api/internal/cron/*` refuse tout (503).
- `SASPAY_ENABLED` différent de `true` → toutes les fonctions SasPay répondent 503 sans aucun appel réseau, même avec `SASPAY_API_KEY` présente.

## Configuration Vercel

1. Root Directory : `backend/`
2. Framework : Other / Node.js
3. Build : `npm install && npm run build`
4. Variables : toutes les obligatoires ci-dessus + `NODE_ENV=production`.
5. `CRON_SECRET` : généré alétairement (ex. `openssl rand -hex 32`), jamais partagé.
6. `SASPAY_ENABLED` reste `false` pour cette phase ; le webhook SasPay n'est reconfiguré vers `https://<domaine>/api/webhooks/saspay` que si la mission d'activation de SasPay est livrée ultérieurement (dashboard SasPay, avec `SASPAY_WEBHOOK_SECRET`).

## N'oublier jamais

- `DATABASE_URL_UNPOOLED` doit utiliser le **pooler DÉSACTIVÉ** (endpoint direct), car Prisma CLI et `prisma generate`/`migrate` ne supportent pas pgBouncer pour certaines opérations.
- La production n'accepte aucun fichier `.env` versionné.


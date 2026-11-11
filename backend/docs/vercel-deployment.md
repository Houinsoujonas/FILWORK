# Déploiement du backend FILWORK sur Vercel

## Architecture cible

```
[React/Vite SPA] ──HTTPS──► [Vercel Functions: api/index.js] ──► [Neon PostgreSQL]
                                    │
                                    └──► [EmailOutbox] ──► [Vercel Cron quotidien 06:00] (nettoyage)
                                    └──► [Déclencheur EXTERNE 5 min] ──► /api/internal/cron/process-emails
                                    └──► [SasPay API] (REPORTÉ — désactivé, SASPAY_ENABLED=false)
```

- Le frontend reste un build statique (React + Vite) hébergé sur Vercel en tant que projet séparé.
- Le backend Express est exporté par `backend/api/index.js` et invoqué par Vercel Functions (pas d'écoute réseau dans les fonctions).
- `src/server.js` reste le point d'entrée hors serverless (`npm start`, port `PORT`).
- Les deux points d'entrée passent par la **même validation centralisée** (`src/config/productionEnv.js`) : en `NODE_ENV=production`, un `JWT_SECRET` de moins de 32 caractères, un `FRONTEND_URL` non HTTPS, une origine CORS HTTP ou une origine locale (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`) empêche le démarrage (erreur côté serverless, `process.exit(1)` côté serveur classique).

## Compatibilité Express / serverless

- `api/index.js` appelle `validateProductionEnvironment()` puis exporte `module.exports = require("../src/app")`.
- `src/app.js` construit l'application Express (helmet, CORS, JSON, routes, health checks) sans `.listen()`.
- `src/config/prisma.js` met le client Prisma et l'adaptateur `PrismaPg` en cache **ensemble** sur `globalThis` : si l'un manque ou si le couple est incohérent, les deux sont recréés. Aucun client inutile n'est créé par invocation.
- Les routes internes `/api/internal/cron/*` remplacent le worker Node permanent de `emailOutboxWorker` par des appels Vercel Cron (Bearer `CRON_SECRET`).

## Configuration Vercel (projet backend)

- Root directory : `backend/`
- Build command : `npm install && npm run build` (`prisma generate`)
- Framework preset : Other / Node.js
- Node.js version : 24.x (`engines` dans `package.json`)
- Le fichier `backend/vercel.json` déclare la fonction, les réécritures `/api/*` et la tâche Cron quotidienne.
- Aucun secret ne doit être versionné : les variables se configurent dans l'onglet Environment Variables de Vercel.

### Variables nécessaires (valeurs hors dépôt)

- `NODE_ENV=production`
- `DATABASE_URL` (Neon, pooler `pgbouncer=true`) et `DATABASE_URL_UNPOOLED` (directe, pour les migrations manuelles)
- `JWT_SECRET` (32+ caractères), `JWT_EXPIRES_IN`
- `FRONTEND_URL` (HTTPS), `CORS_ORIGINS` (uniquement des origines HTTPS non locales — chaque origine est vérifiée au démarrage)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (Brevo)
- `EMAIL_OUTBOX_BATCH_SIZE` (facultatif ; par défaut 3 pour respecter le budget d'exécution)
- `CRON_SECRET` (16+ caractères)
- `SASPAY_ENABLED=false` — conserver tel quel pour cette phase (voir `docs/payment-manual.md`)
- `FILWORK_COMMISSION_BPS=0`
- `STORAGE_*` (facultatif ; aucun fournisseur installé à ce stade)

## Déclencheur externe EmailOutbox — **OBLIGATOIRE sur Vercel Hobby**

> Sans ce déclencheur, la mise en production est incomplète : les e-mails transactionnels de FILWORK (bienvenue, réinitialisation de mot de passe, notifications de collaboration, annonces) sont retardés de ~24 h et limités à 3 e-mails/jour. Les codes de réinitialisation ont un TTL de **15 minutes** : ils arrivent systématiquement expirés.

Comment fonctionne la mise en file :

1. Un utilisateur s'inscrit ou demande une réinitialisation de mot de passe.
2. FILWORK ajoute immédiatement l'e-mail dans `EmailOutbox` (statut `PENDING`).
3. Un service externe appelle périodiquement `POST /api/internal/cron/process-emails` avec `Authorization: Bearer <CRON_SECRET>`.
4. Le backend réclame les e-mails `PENDING` (atomique, `FOR UPDATE SKIP LOCKED`), les envoie via SMTP (Brevo) et les marque `SENT` / `PENDING` (backoff) / `FAILED`.
5. Brevo assure l'expédition — **le déclencheur ne remplace pas le SMTP ; les deux sont nécessaires**.

**À configurer AVANT la mise en production (solution retenue : déclencheur toutes les 5 minutes) :**

1. `CRON_SECRET` généré aléatoirement (≥ 16 caractères, ex. `openssl rand -hex 32`) et renseigné dans Vercel — jamais commité.
2. Créer le déclencheur chez un hébergeur de ping : [cron-job.org](https://cron-job.org), UptimeRobot, ou GitHub Actions (voir exemple ci-dessous, à placer dans un dépôt d'ops ou le dépôt frontend — pas dans `backend/`).
   - Méthode : `POST` (ou `GET`), URL : `https://<votre-domaine>/api/internal/cron/process-emails`
   - En-tête : `Authorization: Bearer <CRON_SECRET>`
   - Fréquence : toutes les 5 minutes
   - Notification d'échec : activer l'alerte si statut ≠ 200
3. Vérifier manuellement que l'endpoint répond comme attendu :

   ```sh
   curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<votre-domaine>/api/internal/cron/process-emails
   # attendu : {"success":true,"processed":<nombre>}
   curl -H "Authorization: Bearer <CRON_SECRET>" https://<votre-domaine>/api/internal/cron/daily
   ```

4. S'assurer que Brevo est opérationnel (variables `SMTP_*`/`MAIL_FROM` renseignées ; voir `docs/brevo-setup.md`). Sinon, l'endpoint répond 200 mais les e-mails échouent et finissent en `FAILED` après 5 tentatives.
5. Surveiller les logs pendant 7 jours : alerte sur toute réponse non-200 du déclencheur et sur les erreurs `[EmailOutbox]`.

Exemple de workflow GitHub Actions (à copier dans un fichier `.github/workflows/email-trigger.yml` d'un dépôt d'ops ou du frontend, et à compléter avec le secret `CRON_SECRET` — jamais en clair) :

```yaml
name: email-outbox-trigger
on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: process-emails
        run: |
          code=$(curl -s -o /tmp/resp.json -w "%{http_code}" \
            -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://<votre-domaine>/api/internal/cron/process-emails)
          cat /tmp/resp.json
          test "$code" = "200"
```

Notes :

- Le déclencheur externe **n'est pas** un Vercel Cron : il ne consomme pas le quota Hobby d'un cron par jour.
- Sans pinger (ni l'offre Pro), le seul traitement garanti est le cron quotidien (`process-emails` 1×/jour, lot de 3 au défaut) : suffisant pour le nettoyage des jetons, insuffisant pour l'UX.
- Sur l'offre Pro, l'alternative est un Vercel Cron plus fréquent, en conservant le déclencheur externe ou en le remplaçant.
- En cas de doute : `GET /api/internal/cron/process-emails` répond en ~2 s, avec `{"success":true,"processed":N}`.

## Cron quotidien (Vercel Hobby)

- `vercel.json` déclare **un** cron par jour (06:00 UTC) → `GET /api/internal/cron/daily`.
- Le plan Hobby n'autorise qu'un seul cron ; la configuration respecte cette limite.
- Le job exécute en un appel le traitement d'un lot EmailOutbox et le nettoyage des jetons révoqués/expirés.
- Le worker `setInterval` n'est PAS actif sur Vercel : les e-mails sont traités par le cron **et/ou le déclencheur externe** (obligatoire, voir ci-dessus).
- Les lots sont bornés (par défaut 3 e-mails), avec timeouts SMTP de 8 s, backoff 1/5/15/30/60 min, et reprise des tâches bloquées en `PROCESSING` depuis plus de 10 minutes. Le mécanisme de réservation atomique `FOR UPDATE SKIP LOCKED` empêche les doublons entre exécutions concurrentes.

## Routes internes Cron

- `GET|POST /api/internal/cron/process-emails` : traite **un lot** d'e-mails en attente. Auth : `Authorization: Bearer <CRON_SECRET>`.
- `GET|POST /api/internal/cron/cleanup-tokens` : nettoie les JWT révoqués expirés et les jetons de réinitialisation expirés/utilisés. Même auth.
- `GET|POST /api/internal/cron/daily` : exécute les deux ci-dessus en un appel (utilisé par le cron Hobby).

Si `CRON_SECRET` n'est pas défini (ou inférieur à 16 caractères), ces routes renvoient systématiquement 503. Elles ne sont jamais ouvertes sans secret.

## Limites serverless à connaître

- Durée maximale par invocation : 30 s (`functions.api/index.js.maxDuration` ; l'offre Hobby peut imposer un plafond plus bas).
- Mémoire : 512 Mo.
- Pas de processus permanent : tout travail récurrent passe par le cron **ou le déclencheur externe** (obligatoire pour les e-mails, voir ci-dessus).
- **Vercel Hobby autorise un seul cron par jour — insuffisant seul pour les e-mails transactionnels.**
- Réponses rapides obligatoires : le webhook SasPay répond immédiatement (et est actuellement désactivé, 503) ; le traitement différé passe par la file, le cron quotidien ou le déclencheur externe.
- La concurrence est gérée côté PostgreSQL par les verrous `FOR UPDATE SKIP LOCKED` de l'outbox et par des revendications atomiques `updateMany`.

## Contrôles de sécurité en production

- JWT HS256, refresh tokens rotatifs avec rejeu détecté, `tokenVersion`.
- `helmet()`, CORS restreint et validé, rate limiting sur les routes sensibles.
- Routes admin sous `requireAdmin` ; routes internes sous Bearer `CRON_SECRET` ; webhook SasPay signé HMAC-SHA256 (inactif tant que `SASPAY_ENABLED=false`).
- `NODE_ENV=production` invalide le démarrage si la configuration est incorrecte (voir ci-dessus).
- Les erreurs Prisma 5xx ne doivent pas être exposées telles quelles ; la réponse renvoyée est générique et l'erreur complète est journalisée sans secrets.

## Déploiement (futur)

1. Créer le projet Vercel pointant sur `backend/`.
2. Renseigner les variables d'environnement (voir `environment-variables.md`).
3. Vérifier que `FRONTEND_URL` et `CORS_ORIGINS` pointent vers le domaine de production (chaque origine HTTPS non locale).
4. Déployer, puis vérifier `/api/health` et `/api/health/database`.
5. Vérifier `/api/internal/cron/process-emails` avec `curl` (voir la section déclencheur externe) et recevoir une réponse 200.
6. **Configurer le déclencheur externe 5 minutes** (obligatoire avant ouverture aux utilisateurs) ; contrôler ses alertes et les logs pendant 48 h.
7. Vérifier que l'e-mail de bienvenue et l'e-mail de réinitialisation de mot de passe sont reçus en moins de 5 minutes après inscription/demande.
8. Ne PAS appliquer les migrations pendant le build : lancer `prisma migrate deploy` manuellement depuis un poste de confiance après validation.

## Health checks

- `/api/health` : liveness (Vercel peut l'utiliser).
- `/api/health/database` : readiness, 503 si Neon indisponible.

## Retour arrière

- Redéployer la version précédente depuis l'UI Vercel (rollback).
- Une migration Prisma ne s'annule pas automatiquement : restaurer un dump ou appliquer une migration de correction. Ne jamais exécuter `migrate reset` en production.

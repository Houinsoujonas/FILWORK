# Déploiement du backend FILWORK sur Render

> **Document historique — ancienne préparation de déploiement.**
> La cible de déploiement actuelle est **Vercel** (voir `docs/vercel-deployment.md`).
> Ce document est conservé comme référence utile ; il ne correspond plus au plan de démarrage retenu et ne doit pas être utilisé sans réévaluation préalable. Il ne contredit pas la cible Vercel : les deux plateformes exécutent le même backend, mais les variables et la commande de démarrage diffèrent.

Ce document décrit la procédure de mise en production du backend FILWORK sur Render.
Il ne contient aucun secret. Les valeurs des variables d'environnement sont à renseigner
directement dans l'interface Render.

## 1. Prérequis Render

- Un service Web (Node Web Service) créé depuis le dépôt Git.
- Une base PostgreSQL Render (ou externe), avec `DATABASE_URL` correctement configurée.
- Le dossier de déploiement pointé sur `backend/`.
- La branche de déploiement validée (ex. `main`).

## 2. Build

Commande de build :

```sh
npm install && npm run build
```

`npm run build` exécute `prisma generate`, ce qui génère le client Prisma adapté
à la plateforme cible (Linux).

## 3. Démarrage

Commande de démarrage :

```sh
npm start
```

`npm start` exécute `node src/server.js`. Le serveur :
- lit `process.env.PORT` (fourni automatiquement par Render),
- écoute sur `0.0.0.0` en mode production,
- démarre le processeur de la file d'e-mails (sauf si `EMAIL_OUTBOX_ENABLED=false`),
- gère proprement SIGTERM/SIGINT pour la fermeture.

## 4. Version Node

Node.js 24.x (voir `package.json` -> `engines`).

## 5. Variables d'environnement

| Variable | Obligatoire | Utilité | Défaut sûr |
|---|---|---|---|
| `NODE_ENV` | Oui | Mode production / développement / test | `development` |
| `PORT` | Oui (fourni par Render) | Port d'écoute HTTP | `5000` en dev, `5051` en test |
| `HOST` | Non | Interface d'écoute | `0.0.0.0` en prod, `127.0.0.1` en test |
| `DATABASE_URL` | Oui | URL de connexion PostgreSQL (poolée si disponible) | Aucun |
| `DATABASE_URL_UNPOOLED` | Non | URL directe si Prisma/pg requiert une connexion non poolée | Aucun |
| `JWT_SECRET` | Oui | Signature des access tokens (min 32 caractères) | Aucun |
| `JWT_EXPIRES_IN` | Non | Durée de vie de l'access token | `1d` |
| `FRONTEND_URL` | Oui | URL HTTPS du frontend (liens emails, CORS implicite) | Aucun en production |
| `CORS_ORIGINS` | Oui | Origines autorisées (ex. `https://filwork.example`) | `http://localhost:5173` en dev |
| `SMTP_HOST` | Oui* | Serveur SMTP | Aucun |
| `SMTP_PORT` | Oui* | Port SMTP (ex. 587) | Aucun |
| `SMTP_SECURE` | Non | `true` si SMTPS (port 465), `false` pour STARTTLS | `false` |
| `SMTP_USER` | Oui* | Utilisateur SMTP | Aucun |
| `SMTP_PASS` | Oui* | Mot de passe SMTP | Aucun |
| `MAIL_FROM` | Non | Expéditeur des e-mails | `SMTP_USER` |
| `EMAIL_OUTBOX_ENABLED` | Non | Activer/désactiver le worker outbox | `true` |
| `EMAIL_OUTBOX_BATCH_SIZE` | Non | Taille des lots traités | `3` |
| `EMAIL_OUTBOX_MAX_ATTEMPTS` | Non | Nombre maximum de tentatives par e-mail | `5` |
| `EMAIL_OUTBOX_POLL_INTERVAL` | Non | Fréquence de traitement de la file (ms) | `30000` |

*Obligatoire pour l'envoi effectif des e-mails. Sans SMTP valide, les e-mails sont mis en
file et marqués `FAILED` après épuisement des tentatives, sans faire échouer les opérations métier.

## 6. Procédure de déploiement

1. Créer le service Web dans Render avec le dossier racine `backend/`.
2. Renseigner les variables d'environnement ci-dessus (ne jamais copier de secrets dans le dépôt).
3. Associer une base PostgreSQL Render et renseigner `DATABASE_URL`.
4. Build : `npm install && npm run build`.
5. Démarrage : `npm start`.
6. Vérifier `https://<service>.onrender.com/api/health` (doit retourner 200).
7. Vérifier `https://<service>.onrender.com/api/health/database` (doit retourner 200 avec `database: connected`).
8. Appliquer les migrations Prisma avec une commande distincte, **jamais au démarrage du service** :

```sh
# Depuis un environnement de confiance, avec DATABASE_URL pointant vers la base de production ciblée :
npx prisma migrate deploy
```

9. Créer le premier compte ADMIN via le script `scripts/createAdmin.js` avec les variables d'environnement
   `ADMIN_EMAIL` et `ADMIN_PASSWORD` (ne jamais commiter ces valeurs).

## 7. Health checks Render

- `/api/health` : endpoint léger, ne dépend pas de la base. À utiliser pour le health check principal.
- `/api/health/database` : vérifie la connexion PostgreSQL. Retourne 503 si la base est indisponible.
  À utiliser comme test de readiness, pas comme test de liveness permanent si la DB est surveillée ailleurs.

## 8. Sécurité HTTP et CORS

- `helmet()` active les en-têtes de sécurité.
- `express-rate-limit` est configuré pour login, register, forgot-password, reset-password et refresh.
- `app.set("trust proxy", 1)` est déjà configuré pour Render (un seul saut de proxy).
- CORS n'autorise que les origines listées dans `CORS_ORIGINS`. En production, au moins une origine
  non-locale est obligatoire (le backend refuse de démarrer sinon).
- Les routes d'administration utilisent `authenticateToken` + `requireAdmin`.

## 9. Attention aux migrations

Migrations appliquées sur `filwork_test` (validées localement, jamais modifiées après application) :

- `20261109000000_add_communication_system`
- `20261111000000_add_refresh_tokens_and_user_is_active`
- `20261111220000_fix_refresh_token_fk_on_update_cascade` (correction de la contrainte `RefreshToken_userId_fkey` : `ON UPDATE CASCADE`)
- `20261111230000_add_saspay_integration`
- `20261111233000_fix_saspaytransaction_updatedat_default`
- `20261112220000_add_campaign_published_notifications`

> Note : la cible actuelle est Vercel (`docs/vercel-deployment.md`) ; ce document est conservé à titre historique.

Règles :

- Ne jamais exécuter `prisma migrate deploy` automatiquement dans la commande de démarrage.
- Les migrations doivent d'abord être validées sur `filwork_test` avec autorisation explicite.
- Une fois validées, elles peuvent être appliquées sur la production via `npx prisma migrate deploy`.
- Ne jamais exécuter `prisma db push` ni `prisma migrate reset` sur une base partagée ou de production.
- Ne jamais modifier le contenu d'une migration déjà appliquée (une correction se fait via une nouvelle migration).

## 10. Emails de test et protection anti-envoi accidentel

`filwork_test` contient des e-mails en attente destinés à des adresses de test (`@filwork.local`, `@example.com`).

Protections en place (dans le code, pas seulement en configuration) :

- Le worker outbox n'est pas démarré lorsque `NODE_ENV=test`.
- `processEmailOutboxBatch` refuse de traiter quoi que ce soit lorsque `NODE_ENV=test`.
- `sendSmtpEmail` refuse tout envoi lorsque `NODE_ENV=test`.
- Tout destinataire dont le domaine est `filwork.local`, `example.com`, `example.org`, `example.net` ou `localhost` est refusé par le worker, même hors environnement de test.

En production sur Render, le worker (`EMAIL_OUTBOX_ENABLED=true`, cadence 30 s) assure la livraison des e-mails en quasi-temps réel. Sur la cible actuelle **Vercel**, ce worker n'est pas actif : un **déclencheur externe toutes les 5 minutes est obligatoire** avant la mise en production — voir `docs/vercel-deployment.md`.

En production, le worker ne doit être démarré que si la configuration SMTP est validée et si les e-mails destinés à des utilisateurs réels doivent effectivement être envoyés.

Ne jamais activer le worker `EMAIL_OUTBOX_ENABLED=true` pour purger ou "nettoyer" les e-mails de test : ils seraient marqués comme échecs ou, pire, distribués.

## 11. Configuration SMTP

Le code utilise `nodemailer` avec `host`, `port`, `secure` et `auth`.

- Port 587 avec `SMTP_SECURE=false` : STARTTLS (soumission standard). C'est la configuration attendue pour la plupart des fournisseurs (SendGrid, Mailgun, Amazon SES, Brevo, Postmark, Ethereal).
- Port 465 avec `SMTP_SECURE=true` : SMTPS.
- Port 25 : à éviter en production.

`MAIL_FROM` doit être une adresse e-mail syntaxiquement valide (ex. `FILWORK <noreply@filwork.com>` ou `noreply@filwork.com`). **Une URL de preview Ethereal n'est pas une adresse valide et rend l'envoi impossible / incohérent.**

Diagnostic technique de l'erreur `535 Authentication failed` : elle signifie que le serveur SMTP rejette les identifiants fournis au moment de l'authentification (AUTH), avant tout envoi de message. Causes possibles, sans secret exposé :

1. Identifiants du compte invalides ou expirés (les comptes Ethereal sont éphémères).
2. Mot de passe incorrect (le secret est peut-être obsolète).
3. Fournisseur exigeant un mot de passe d'application (compte Gmail avec validation en deux étapes) ou une clé API au lieu du mot de passe du compte.
4. Fournisseur exigeant OAuth2 plutôt qu'un mot de passe simple.
5. Compte désactivé, quota atteint, ou authentification refusée depuis une IP non autorisée.

Action requise du propriétaire des secrets :

1. Choisir un fournisseur SMTP de production (Amazon SES, SendGrid, Mailgun, Brevo, Postmark…) ou recréer un compte Ethereal de test si l'objectif est uniquement de prévisualiser des emails.
2. Renseigner `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_SECURE=false`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (adresse valide) dans Render.
3. Vérifier le domaine expéditeur chez le fournisseur (enregistrement SPF/DKIM) si l'envoi doit être réellement délivré.
4. Tester ensuite un envoi réel avec un destinataire de test que vous contrôlez, hors production.

Ne jamais modifier les identifiants sans l'accord du propriétaire, et ne jamais les copier dans un fichier versionné.

## 12. Sauvegarde, restauration et retour arrière

### Sauvegarde

```sh
pg_dump -h <hôte> -p <port> -U <utilisateur> -d <base> -Fc -f <fichier>.dump
```

Toujours utiliser `-Fc` (format custom) et vérifier la sauvegarde après création (`pg_restore -l <fichier>.dump | wc -l` ≥ nombre d'entrées attendu ; empreinte SHA-256 enregistrée à part).

### Restauration

```sh
pg_restore --clean --if-exists -h <hôte> -p <port> -U <utilisateur> -d <base_cible> <fichier>.dump
```

La restauration doit cibler une base nominative vérifiée. Ne jamais restaurer sur une base sans confirmation explicite de son identité.

### Retour arrière d'un déploiement Render

1. Dans Render, redéployer la version précédente du service (rollback).
2. Les migrations appliquées ne sont pas automatiquement annulées ; si une migration a été appliquée, restaurer le dump de la base au point précédent OU appliquer une migration de correction (jamais `migrate reset` en production).
3. Vérifier `/api/health` et `/api/health/database` après le retour arrière.
4. Surveiller les logs pendant 15 minutes.

### Migration de la base de production

1. Créer un dump de la base de production.
2. Appliquer `npx prisma migrate deploy` depuis un environnement de confiance.
3. Vérifier `npx prisma migrate status` (toutes appliquées).
4. Vérifier `npx prisma migrate diff --exit-code` (« No difference detected »).
5. Redémarrer le service Render.
6. Vérifier les health checks.

## 13. Surveillance et incidents

- Surveiller `/api/health` (liveness) et `/api/health/database` (readiness).
- Surveiller les logs pour les erreurs HTTP 5xx et les erreurs `[EmailOutbox]`.
- En cas d'indisponibilité PostgreSQL : le backend répond 503 sur `/api/health/database` ; Render doit redémarrer le service.
- En cas d'échec SMTP : les emails restent en file (PENDING) avec backoff ; rien n'est perdu, aucun email ne part. Si `EMAIL_OUTBOX_ENABLED=false`, le worker est arrêté et les emails restent en attente jusqu'à réactivation explicite.
- En cas d'incident sécurité (suspicion de fuite de `JWT_SECRET`) : régénérer `JWT_SECRET` sur Render (invalide toutes les sessions), redéployer, puis auditer les logs d'accès.
- Les logs ne doivent jamais contenir de mots de passe, de JWT, de secrets SMTP ni d'adresses e-mail en clair.

## 10. Logs et surveillance

Les logs applicatifs ne doivent pas contenir :
- de mots de passe,
- de secrets SMTP,
- de JWT,
- d'adresses personnelles en clair (le worker outbox journalise l'identifiant du message, pas le destinataire).

En cas d'erreur non interceptée, le processus logue le message d'erreur sans détail secret et sort en code 1,
permettant à Render de redémarrer le service.


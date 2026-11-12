# FILWORK — Backend

API Node.js + Express + Prisma 7 + PostgreSQL pour FILWORK (mise en relation entreprises / créateurs de contenu).

## Démarrage local

Prérequis : Node.js 24.x, PostgreSQL local (ou service équivalent) sur `127.0.0.1:55432`.

```sh
cd backend
cp .env.example .env   # renseigner JWT_SECRET, DATABASE_URL, FRONTEND_URL, CORS_ORIGINS, SMTP_*
npm install
npm run build          # prisma generate
npm start              # écoute sur PORT (défaut 5000)
```

Vérifications :

```sh
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/database
```

Mode développement : `npm run dev` (auto-recharge, via `node --watch`).

## Scripts

| Script | Rôle |
| - | - |
| `npm start` | Démarre le serveur HTTP |
| `npm run build` | `prisma generate` |
| `npm run dev` | Démarrage avec rechargement |
| `npm test` | Tests unitaires (sans base) |
| `npm run test:integration` | Tests d'intégration API (nécessite `filwork_test`) |
| `npm run test:reviews` | Tests du module Avis |
| `npm run test:communication` | Tests du module Communication |
| `npm run test:refresh-admin` | Tests refresh tokens + administration |
| `npm run test:payment-permissions` | Permissions et transitions de paiement (`filwork_test`) |
| `npm run test:payment-notifications` | Notifications livrées/ignorées selon l'issue des transitions |
| `npm run test:campaign-notifications` | Notifications de publication de campagne |
| `npm run test:saspay` | Tests unitaires du service SasPay (mocks, aucun réseau) |
| `npm run test:saspay-disabled` | Isolation SasPay (désactivé même avec une clé présente) |
| `npm run test:outbox` | Tests EmailOutbox (sans envoi réel) |
| `npm run test:cron` | Tests des routes internes cron (protégées) |
| `npm run test:production-env` | Validation des variables d'environnement de production |
| `npm run test:prisma-cache` | Cohérence du cache client/adaptateur Prisma |
| `npm run test:all` | Toutes les suites (177 tests) |

`test:all` et les suites d'intégration sont dirigés exclusivement vers `filwork_test` via `.env.test` ; les garde-fous refusent de démarrer sur toute autre base.

## Rôles et principales fonctionnalités

- **CREATOR** : profil créateur, portfolio, réseaux sociaux, candidatures, collaborations, livrables, avis, paiements (lecture), notifications, messagerie.
- **COMPANY** : profil entreprise, campagnes, candidatures/invitations (acceptation/refus), collaborations, livrables (examen), déclaration manuelle de paiement, notifications, messagerie.
- **ADMIN** : tableau de bord, annonces, listes globales, activation/désactivation de comptes, protection du dernier ADMIN actif.

Flux financier actuel : **déclaration manuelle**. L'entreprise paie le créateur hors plateforme puis déclare le paiement (PLANNED → PENDING → PAID). FILWORK n'intervient dans aucun transfert. Voir `docs/payment-manual.md`. SasPay est préparé mais reporté (`SASPAY_ENABLED=false`).

Flux de publication de campagne : **notifications automatiques**. Lorsqu'une entreprise publie une campagne, tous les créateurs actifs et éligibles sont notifiés dans leur tableau de bord **et** reçoivent un e-mail (si `campaignEmails=true` dans leurs préférences). La notification est dédupliquée (aucune création en double lors d'une republication) et respecte les préférences utilisateurs. Voir `docs/campaign-notifications.md`.

## Environnements

- `.env` : application (jamais commité, ignoré par `backend/.gitignore`).
- `.env.test` : tests — `TEST_DATABASE_URL` cible exclusivement `filwork_test`.
- `.env.example` : modèle sans valeurs réelles.

## Documentation

- `docs/production-deployment.md` — déploiement Vercel, variables d'environnement, health checks.
- `docs/production-migration-runbook.md` — procédure de migration de production, vérifications et rollback.
- `docs/production-operations.md` — opérations quotidiennes (e-mails, cron, SasPay, paiements manuels, stockage, surveillance).
- `docs/campaign-notifications.md` — notifications de publication de campagne, ciblage, préférences, déduplication.
- `docs/vercel-deployment.md` — architecture et limites Vercel.
- `docs/neon-production.md` — Neon + pooling + migrations.
- `docs/brevo-setup.md` — e-mails via Brevo SMTP.
- `docs/environment-variables.md` — inventaire des variables.
- `docs/storage-provider.md` — abstraction de stockage.
- `docs/payment-flow.md` — modèle de paiement automatisé (SasPay), **gelé et non activé** ; ne décrit pas le fonctionnement actuel. Le paiement en vigueur est la déclaration manuelle (`docs/payment-manual.md`).
- `docs/payment-manual.md` — déclaration manuelle temporaire, permissions et limites.
- `docs/saspay-integration.md` — SasPay (préparée, isolée et désactivée par défaut).
- `docs/production-readiness.md` — checklist et verdicts.
- `docs/dev-baseline.md` — procédure de baseline pour `filwork_dev`.
- `docs/api-contract.md` — contrat API (historique).
- `docs/deploy-render.md` — ancienne préparation de déploiement (historique ; la cible actuelle est Vercel).

## Sécurité

- JWT HS256, refresh tokens rotatifs, révocation, `tokenVersion`.
- `helmet()`, CORS restreint, rate limiting sur toutes les routes publiques sensibles.
- Routes admin sous `requireAdmin` ; routes internes sous Bearer `CRON_SECRET` ; webhook SasPay signé HMAC-SHA256.
- Aucun secret versionné.

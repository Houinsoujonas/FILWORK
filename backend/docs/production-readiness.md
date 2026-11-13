# FILWORK — État de préparation production

> Établi le 2026-11-12 (révisé). Le backend n'est **pas déployé** et n'a **jamais été connecté à une production réelle**.
> Toute affirmation ci-dessous est vérifiée sur le code, la base de test (`filwork_test`) et les tests automatisés.

## Légende

- **OPÉRATIONNEL ET TESTÉ** — fonctionne en `filwork_test`, couvert par des tests.
- **PRÉPARÉ, NON TESTÉ EN CONDITIONS RÉELLES** — code écrit et testé unitairement/avec mocks ; jamais exercé contre un prestataire réel.
- **BLOQUÉ PAR DÉCISION/AUTORISATION** — attend un choix métier, un compte externe ou une autorisation.
- **NON IMPLÉMENTÉ** — absent du code.

## État du dépôt et des migrations

- Le dépôt `main` est à `38d3c14f6e4be478a685ca6289a9517f667ffdd8`, identique à `origin/main`.
- Les 22 migrations sont versionnées dans `backend/prisma/migrations/`.

### État documenté par base de données (ne pas mélanger)

| Base de données | Migrations réussies distinctes | Tentatives annulées | Non appliquées | Tables applicatives |
|---|---|---|---|---|
| **filwork_test** (local, `127.0.0.1:55432/filwork_test`) | **22** (`2000-20261111230000_add_saspay_integration`, `300-20261111233000_fix_saspaytransaction_updatedat_default`, `220-20261112220000_add_campaign_published_notifications` inclus) | **0** | **0** | 22 tables physiques (21 métier + `_prisma_migrations`) |
| **Neon `migration-test`** (`br-jolly-dew-b4ggr9n4`) | **21** (jusqu'à `20261111233000_fix_saspaytransaction_updatedat_default`) | **1** (`20261109000000_add_communication_system`, tentative annulée conservée) | `20261112220000_add_campaign_published_notifications` **n'est pas appliquée** — total physique attendu : 21 réussies distinctes + 1 annulée = 22 lignes | construite mais `add_campaign_published_notifications` absente |
| **Neon `production`** (`br-wandering-meadow-b4vnko5f`) | **0** | 0 | 22 | **0** |
| **Neon `production-backup-before-migrations`** (`br-crimson-morning-b4jxxg4x`) | **0** | 0 | 22 | **0** (point de restauration structurel, pas une sauvegarde de données) |

- Les tests (186) sont dirigés **exclusivement** vers `filwork_test` ; aucun test n'utilise une base Neon.

## Fonctionnalités opérationnelles et testées

- Sécurité : rate limiting global (`generalLimiter`) + rate limiting lecture publique (`publicReadLimiter` sur `/api/campaigns` et `/api/reviews`) + rate limiting auth + webhook SasPay. Journalisation structurée (JSON Lines) des événements sensibles sans PII/tokens.
- Health checks : `/api/health` (liveness 200), `/api/health/database` (distingue connected vs schema-not-ready vs unavailable).


- Authentification : inscription (CREATOR/COMPANY), connexion, déconnexion, rotation des refresh tokens (rejeu détecté, révocation globale), réinitialisation de mot de passe (code 6 chiffres, TTL 15 min, anti-énumération), invalidation après changement de rôle/e-mail/désactivation (`tokenVersion`).
- Profils : Créateur (bio, niche, disponibilité, note de profil) et Entreprise (logo, secteur, contact, taux) avec visibilité sélective (profils incomplets/démonstration non découvrables).
- Réseaux sociaux et Portfolio (CRUD), avis & réponses.
- Campagnes : création, modification, publication, pause, clôture, suppression de brouillons, recherche publique/découvrable, filtrage (statut, localisation, budget, plateforme).
- Candidatures & Invitations : dépôt, retrait, acceptation/refus, création de collaboration, empêchement candidature + invitation simultanée.
- Collaborations : consultation, clôture (idempotente), annulation (entreprise avec motif ; créateur si sans engagement).
- Livrables : création, soumission, examen (validation / demande de révision), notifications.
- Paiements (suivi manuel, temporaire) : création, consultation, transitions strictes contrôlant la propriété de la collaboration, notifications — historique conservé, aucune suppression possible. Voir `docs/payment-manual.md`. **SasPay est reporté à une mission distincte.**
- Notifications, Annonces administratives, Préférences (booléens e-mails, désactivables via l'API).
- **Notifications de publication de campagne** : à la publication, chaque créateur éligible (`role=CREATOR`, `isActive=true`, profil existant) reçoit une notification in-app `CAMPAIGN_PUBLISHED` et un e-mail (si `campaignEmails=true` dans ses préférences). Déduplication par contrainte unique partielle. Voir `docs/campaign-notifications.md`.
- EmailOutbox : file persistante, backoff, reprise des tâches bloquées, protection anti-envoi accidentel en test.
- Administration : dashboard, listes utilisateurs/campagnes/collaborations/livrables/paiements, modification/désactivation/réactivation de comptes, protection du dernier ADMIN actif (verrou `FOR UPDATE`).
- Tests : **186/186 OK** sur `filwork_test` (unitaires 22, saspay 10, saspay-disabled 6, outbox 4, cron 4, production-env 12, prisma-cache 3, health-check 4, rate-limit 3, upload 2, integration 86, reviews 7, communication 13, refresh-admin 6, payment-permissions 1, payment-notifications 2, campaign-notifications 1). Voir `npm run test:all`.
  - Le nombre de messages en attente dans `filwork_test` varie selon les exécutions : toute citation d'un nombre exact serait obsolète dès la prochaine exécution. La file y contient exclusivement des adresses de test (`@filwork.local`/`@example.com`) protégées contre l'envoi réel par `NODE_ENV=test`.

## Préparé, non testé en conditions réelles

- **SasPay (encaissement + reversement)** — `src/services/sasPayService.js`, `sasPayController.js`, `sasPayWebhookController.js`, `sasPayPayoutController.js`. Code conservé et isolé, **désactivé par défaut** : `SASPAY_ENABLED=false` empêche toute activation, même en présence d'une clé API accidentellement configurée (`isConfigured()` exige les deux). Les routes/webhooks concernés répondent 503 sans contacter SasPay. Aucun appel réel effectué. Réactivation à traiter dans une mission distincte après vérification du compte marchand et des conditions applicables.
- **EmailOutbox worker** — testé en file ; envoi réel non testé (pas de SMTP de production configuré). Batch par défaut borné à 3 (`EMAIL_OUTBOX_BATCH_SIZE`) pour rester sous le budget d'exécution serverless.
- **Vercel Functions** — `api/index.js`, `vercel.json` (fonction, réécritures, cron quotidien 06:00), client Prisma mis en cache (`globalThis`, couple client/adaptateur recréé ensemble), routes internes `/api/internal/cron/*` protégées par `CRON_SECRET`. Non déployé. **Sur Vercel Hobby, le cron quotidien seul est insuffisant pour les e-mails transactionnels : un déclencheur externe à 5 minutes est obligatoire avant la mise en production** (voir `docs/vercel-deployment.md`), sinon les e-mails de bienvenue, de collaboration et surtout de réinitialisation de mot de passe (TTL 15 min) seront systématiquement expirés ou retardés de plusieurs heures/jours.
- **Cron `process-emails` & `cleanup-tokens`** — endpoints prêts, verrouillés par secret, jamais exécutés hors tests.
- **Stockage abstrait** - `src/services/storage/index.js` : interface prête, route `/api/uploads` (JSON base64) avec validation MIME et taille ; fournisseur `STORAGE_PROVIDER=none` par défaut, 12 SDK non installé tant qu'un provider sûr et compatible n'est pas disponible (`@vercel/blob` dépend de versions vulnérables de `zod` <4.6.6 / `@vercel/oidc`).

## Bloqué par décision ou autorisation

- **Paiements automatisés SasPay** — **reportés** à une mission distincte. Nécessitent un compte marchand actif (KYC, clé `sk_live_`), webhook créé depuis le dashboard, IP whitelistée, et décision métier sur la mécanique de reversement.
- **Taux de commission FILWORK** : non fixé - `FILWORK_COMMISSION_BPS=0` tant que le métier ne décide pas.
- **Fournisseur SMTP (Brevo)** : nécessite compte + identifiants SMTP Brevo.
- **Fournisseur de stockage** : `STORAGE_PROVIDER=none` par défaut. Un SDK Vercel Blob sûr (zero vulnerabilities sur `npm audit`) n'est pas disponible à ce stade (`@vercel/blob@2.9.0` → `@vercel/oidc → @vercel/cli-config → zod <4.6.6` — **High severity**). Aucun upload actif n'est revendiqué.
- **Migrations en production** : nécessite autorisation explicite + `prisma migrate deploy` (voir `docs/production-migration-runbook.md`).
- **Déploiement Vercel** : nécessite autorisation explicite + variables de production configurées (`FRONTEND_URL` HTTPS réel, `CORS_ORIGINS` de production, `JWT_SECRET` 32+ caractères).
- **`filwork_dev`** : registre des migrations vide — nécessite une procédure de baseline dédiée si des migrations doivent y tourner ultérieurement (voir `docs/dev-baseline.md`).

## Non implémenté

- Upload de fichiers binaires (route `/api/uploads` active, mais `STORAGE_PROVIDER=none` par défaut — aucun stockage actif par absence de fournisseur sûr et configuré).
- Intégration de paiement dans le frontend (hors périmètre backend).
- Envoi réel d'e-mails en production (aucun fournisseur validé).
- Paiement automatisé SasPay opérationnel (code préparé et gelé, activation reportée).
- Paiement SaaS interne (facturation des abonnements FILWORK) — hors scope actuel.

## Anomalies et limites connues

- `.gitignore` racine n'exclut pas `*.dump` (aucun dump ne réside dans le dépôt ; `backend/.gitignore` les exclut).
- Le statut « payé » repose sur la **déclaration manuelle de l'entreprise autorisée** ; ce n'est pas une preuve indépendante que les fonds ont été reçus par le créateur (limite connue, assumée pour la phase manuelle).
- Le worker `processEmailOutboxBatch` ne doit jamais être activé en `NODE_ENV=test` ; cette protection est dans le code source.
- Les e-mails de `filwork_test` ne doivent pas être purgés par envoi accidentel.
- `test:all` a présenté une reprise `ECONNREFUSED` une fois (non reproduite) — limitation d'infrastructure de test, pas du produit.
- Le registre de migrations de `filwork_dev` est vide (constat) — ne pas lancer de migration s'y sans baseline préalable.
- La déclaration manuelle ne déclenche aucun flux financier ; elle ne doit pas être présentée comme un reversement.

## Checklist avant production

1. [ ] Déclencheur externe configuré et vérifié : `POST https://<domaine>/api/internal/cron/process-emails` appelé **toutes les 5 minutes** avec `Authorization: Bearer <CRON_SECRET>` (hébergeur de ping externe, ex. cron-job.org/UptimeRobot/GitHub Actions). Réponse 200 confirmée, alerte sur 4xx/5xx.
2. [ ] SMTP Brevo opérationnel (voir `docs/brevo-setup.md`) : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` renseignés dans Vercel ; envoi de test via un compte de contrôle réussi.
3. [ ] Décision métier documentée sur la poursuite du suivi manuel ou l'activation de SasPay (mission distincte, compte marchand KYC validé).
4. [ ] `SASPAY_ENABLED` laissé à `false` tant que la mission d'activation n'est pas livrée ; toute valeur durcie à `true` exige une validation explicite.
5. [ ] Taux de commission FILWORK fixé par le métier (si reversements automatisés un jour activés).
6. [ ] `JWT_SECRET` ≥ 32 caractères ; `FRONTEND_URL` HTTPS réel ; `CORS_ORIGINS` exclusivement HTTPS hors-local (chaque origine validée au démarrage : HTTPS obligatoire, aucune origine locale).
7. [ ] `DATABASE_URL` Neon avec `pgbouncer=true` ; `DATABASE_URL_UNPOOLED` directe.
8. [ ] Dump de production ; `prisma migrate deploy` ; `prisma migrate status` ; `migrate diff` = 0.
9. [ ] Variables Vercel renseignées (webhook secret si SasPay activé un jour, cron, SMTP).
10. [ ] `/api/health`, `/api/health/database` contrôlés après déploiement ; e-mail de test automatique reçu en moins de 5 minutes.
11. [ ] Aucun e-mail de test, aucun jeu de données de démonstration en production.
12. [ ] Surveillance (logs 4xx/5xx, `emailOutbox`, alerte sur non-200 du déclencheur) pendant 7 jours.
13. [ ] Rollback préparé : dump restauré, version précédente redéployée en 1 commande.
14. [ ] Autorisation explicite du client avant toute mise en ligne.

## Verdicts

- **PRÊT TECHNIQUEMENT POUR VERCEL : oui, SOUS CONDITIONS.** Le code build, démarre et passe les tests. Mais la mise en production n'est possible que si **toutes** les conditions suivantes sont remplies : (1) un **déclencheur externe toutes les 5 minutes** appelle `/api/internal/cron/process-emails` (sans lui, les e-mails transactionnels — dont les codes de réinitialisation, TTL 15 min — sont retardés de ~24 h et rendus inutilisables) ; (2) Brevo opérationnel et vérifié ; (3) variables de production validées (HTTPS, CORS exclusivement HTTPS non local) ; (4) autorisation explicite. Sans ces conditions, FILWORK n'est pas prêt pour la production.
- **AUTORISÉ POUR LA PRODUCTION** : **non**, blocages externes listés plus haut.

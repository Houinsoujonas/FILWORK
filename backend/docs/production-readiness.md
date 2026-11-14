# FILWORK - État de préparation production

> **Révisé le 2026-11-14** (stockage Vercel Blob, pipeline E-mails, `filwork_dev`, 239 tests).
> Le backend n'est **pas déployé** et n'a **jamais été connecté à une production réelle**.
> Toute affirmation ci-dessous est vérifiée sur le code, la base locale identifiée et les tests automatisés.

## Légende

- **OPÉRATIONNEL ET TESTÉ** — fonctionne en `filwork_test`, couvert par des tests.
- **PRÉPARÉ, NON TESTÉ EN CONDITIONS RÉELLES** — code écrit et testé avec mocks ; jamais exercé contre un prestataire réel.
- **BLOQUÉ PAR DÉCISION/AUTORISATION** — attend un choix métier, un compte externe ou une autorisation.
- **NON IMPLÉMENTÉ** — absent du code.

## État du dépôt et des migrations

- Le dépôt `main` (commit local `dae4fa5`, `feat(backend): harden security uploads and health checks`) contient les 22 migrations versionnées.
- **Le travail du 2026-11-14 n'est pas commité** (stockage Vercel Blob, pipeline EmailOutbox avec transport simulé injectable, cron externe documenté, `filwork_dev` alignée, `productionEnv` renforcée, 239 tests).

### État documenté par base de données (ne pas mélanger)

| Base de données | Migrations réussies distinctes | Tentatives annulées | Non appliquées | Tables applicatives |
|---|---|---|---|---|
| **filwork_test** (local, `127.0.0.1:55432/filwork_test`) | **22** | **0** | **0** | 22 tables physiques (21 métier + `_prisma_migrations`) |
| **filwork_dev** (local, `127.0.0.1:55432/filwork_dev`) | **22** (registre reconstruit le 2026-11-14 via `migrate resolve --applied`, schéma aligné via `migrate diff` ; dump JSON hors dépôt) | **0** | **0** | 21 tables métier + `_prisma_migrations` ; `User.isActive` présente |
| **Neon `migration-test`** (`br-jolly-dew-b4ggr9n4`) | **21** (jusqu'à `20261111233000_fix_saspaytransaction_updatedat_default`) | **1** (`20261109000000_add_communication_system`, tentative annulée conservée) | `20261112220000_add_campaign_published_notifications` **n'est pas appliquée** | construite mais `add_campaign_published_notifications` absente |
| **Neon `production`** (`br-wandering-meadow-b4vnko5f`) | **0** | 0 | 22 | **0** |
| **Neon `production-backup-before-migrations`** (`br-crimson-morning-b4jxxg4x`) | **0** | 0 | 22 | **0** (point de restauration structurel, pas une sauvegarde de données) |

- **Les 239 tests (23 suites)** sont dirigés **exclusivement** vers `filwork_test` ; aucun test n'utilise une base Neon.

## Fonctionnalités opérationnelles et testées

- Sécurité : rate limiting global (`generalLimiter`) + rate limiting lecture publique (`publicReadLimiter` sur `/api/campaigns` et `/api/reviews`) + rate limiting auth + webhook SasPay. Journalisation structurée (JSON Lines) des événements sensibles sans PII/tokens.
- Health checks : `/api/health` (liveness 200), `/api/health/database` (distingue `ready` / `not_ready` / `unavailable`), 200 + `x-request-id` vérifiés.
- Authentification : inscription (CREATOR/COMPANY), connexion, déconnexion, rotation des refresh tokens (rejeu détecté, révocation globale), réinitialisation de mot de passe (code 6 chiffres, TTL 15 min, anti-énumération), invalidation après changement de rôle/e-mail/désactivation (`tokenVersion`).
- Profils : Créateur (bio, niche, disponibilité, note de profil) et Entreprise (logo, secteur, contact, taux) avec visibilité sélective.
- Réseaux sociaux et Portfolio (CRUD), avis & réponses.
- Campagnes : création, modification, publication, pause, clôture, suppression de brouillons, recherche publique/découvrable, filtrage.
- Candidatures & Invitations : dépôt, retrait, acceptation/refus, création de collaboration.
- Collaborations : consultation, clôture (idempotente), annulation.
- Livrables : création, soumission, examen (validation / demande de révision), notifications.
- Paiements (suivi manuel, temporaire) : création, consultation, transitions strictes (`PLANNED → PENDING → PAID/FAILED/CANCELLED`), notifications in-app. **SasPay est reporté à une mission distincte.**
- Notifications, Annonces administratives, Préférences (booléens e-mails, désactivables via l'API).
- **Notifications de publication de campagne** : à la publication, chaque créateur éligible reçoit une notification in-app `CAMPAIGN_PUBLISHED` et un e-mail (si `campaignEmails=true`). Déduplication par contrainte unique partielle. Voir `docs/campaign-notifications.md`.
- EmailOutbox : file persistante, claim atomique (`FOR UPDATE SKIP LOCKED`), backoff exponentiel, reprise des tâches bloquées (>10 min), échec définitif après `maxAttempts`, protection anti-envoi accidentel en test. **Tests d'intégration du pipeline complet** (transport SMTP simulé) : acceptation, refus 535, timeout, reprise après échec, `FAILED` définitif, récupération des bloqués, déduplication des notifications (`tests/email-worker.test.js`).
- Administration : dashboard, listes, modification/désactivation/réactivation, protection du dernier ADMIN actif.
- Tests : **239/239 OK** (unitaires 22, saspay 10, saspay-disabled 6, outbox 4, email-worker 14, cron 4, production-env 18, prisma-cache 3, health-check 6, health-db-http 2, health-db-unreachable 1, storage-validation 17, storage-vercel-blob 6, rate-limit-general 2, rate-limit-public 3, upload 5, integration 86, reviews 7, communication 13, refresh-admin 6, payment-permissions 1, payment-notifications 2, campaign-notifications 1). Voir `npm run test:all`.

## Préparé, non testé en conditions réelles

- **SasPay (encaissement + reversement)** — code conservé et isolé, **désactivé par défaut**. `SASPAY_ENABLED=false` empêche toute activation même en présence d'une clé accidentellement configurée. Aucun appel réel effectué. Doc officielle (docs.saspay.me, 2026-11-14) : endpoints utilisés et signature webhook HMAC-SHA256 (`timestamp.rawbody`) conformes ; reversements soumis à IP whitelistée côté marchand. Voir `docs/saspay-integration.md`.
- **EmailOutbox worker** — le pipeline (claim, envoi via transporter, backoff, `FAILED` définitif, reprise des bloqués) est **testé de bout en bout avec un transport simulé**. **Aucun envoi réel Brevo n'a été testé** (identifiants absents). Batch borné à 3 (`EMAIL_OUTBOX_BATCH_SIZE`) pour rester sous le budget serverless.
- **Vercel Functions** — `api/index.js`, `vercel.json` (fonction 512 Mo / 30 s, rewrites, cron quotidien 06:00 Hobby), Prisma en cache global (couple client/adaptateur), routes internes `/api/internal/cron/*` sous `CRON_SECRET`. **Non déployé.** Sur Vercel Hobby, le cron quotidien seul est insuffisant pour les e-mails transactionnels : un **déclencheur externe toutes les 5 minutes** est obligatoire (voir `docs/cron-external.md` et `docs/vercel-deployment.md`).
- **Cron `process-emails` & `cleanup-tokens`** — endpoints prêts, verrouillés par secret (`timingSafeEqual`, 503 si secret manquant, 401 si invalide). Jamais exécutés hors tests.
- **Stockage (Vercel Blob)** — SDK `@vercel/blob` 2.9.0 **installé** ; `overrides` npm forçant `@vercel/cli-config@0.4.0` → `zod@4.6.7` (**0 vulnérabilité**, `npm audit`). Adaptateur implémenté (`put`/`del`, OIDC ou `BLOB_READ_WRITE_TOKEN`, `addRandomSuffix`, erreurs upstream encapsulées en 502). Route `POST /api/uploads` complète : JWT + MIME + magic bytes + 5 Mo + nom validé. Tests hors ligne passants (`tests/storage-vercel-blob.test.js`) et tests HTTP existants (`401/400/413`). **Store réel non créé : upload/lecture/suppression jamais exercés.** Activation : `docs/storage-provider.md` (checklist).
- **Production startup validation** — en production : `JWT_SECRET` ≥ 32, `FRONTEND_URL` HTTPS, `CORS_ORIGINS` HTTPS non locales, **`DATABASE_URL` et `DATABASE_URL_UNPOOLED` PostgreSQL valides, `CRON_SECRET` ≥ 16, `SMTP_*`/`MAIL_FROM` valides exigés** (sauf `EMAIL_OUTBOX_ENABLED=false` explicite).

## Bloqué par décision ou autorisation

- **Paiements automatisés SasPay** — reportés à une mission distincte. Compte marchand (KYC, clé `sk_live_`), webhook depuis le dashboard, IP whitelistée, décision métier sur la mécanique de reversement.
- **Taux de commission FILWORK** : non fixé — `FILWORK_COMMISSION_BPS=0` tant que le métier ne décide pas.
- **Fournisseur SMTP (Brevo)** : compte + identifiants SMTP requis. Sans eux, pas d'e-mail réel.
- **Stockage réel (Vercel Blob)** : compte Vercel + store lié au projet (OIDC) ou `BLOB_READ_WRITE_TOKEN` — action humaine requise. Un upload/delete réel reste à valider après liaison.
- **Migrations en production** : autorisation explicite + `prisma migrate deploy` (voir `docs/production-migration-runbook.md`).
- **Déploiement Vercel** : autorisation explicite + variables de production configurées (dont stockage, SMTP, `CRON_SECRET`).
- **`filwork_dev`** — base alignée le 2026-11-14 (voir `docs/dev-baseline.md`).

## Non implémenté

- Upload de **documents** (PDF/contrats/factures) — seuls les formats image (jpeg/png/webp/gif) sont acceptés ; les documents exigeraient un store **privé** ou des URLs signées.
- Partage automatique DB↔blob (suppression des orphelins lors du changement d'avatar) — `deleteImage` existe côté serveur, pas d'exposition REST (volontaire).
- Intégration de paiement dans le frontend (hors périmètre backend).
- Envoi réel d'e-mails en production (fournisseur Brevo non validé).
- Paiement automatisé SasPay opérationnel (code préparé et gelé).
- Paiement SaaS interne (facturation des abonnements FILWORK) — hors scope actuel.

## Anomalies et limites connues

- Le statut « payé » repose sur la **déclaration manuelle de l'entreprise autorisée** ; ce n'est pas une preuve indépendante que les fonds ont été reçus (limite assumée pour la phase manuelle).
- Le worker `processEmailOutboxBatch` ne doit jamais être activé en `NODE_ENV=test` ; la protection est dans le code (`sendSmtpEmailForTests` d'injection explicite uniquement).
- Les e-mails de `filwork_test` contiennent ~3 500 entrées PENDING/PROCESSING historiques (adresses réservées) — jamais envoyées (worker bloqué) ; illustratif des dettes de données de test, non bloquantes.
- `test:all` a présenté une reprise `ECONNREFUSED` une fois (non reproduite) — limitation d'infrastructure de test, pas du produit.
- Les routes `/api/health/database` divulguent l'état de connectivité DB (volontaire pour le monitoring, public avec rate limit général).
- La déclaration manuelle ne déclenche aucun flux financier ; elle ne doit pas être présentée comme un reversement.

## Checklist avant production

1. [ ] Déclencheur externe configuré et vérifié : `POST https://<domaine>/api/internal/cron/process-emails` appelé **toutes les 5 minutes** avec `Authorization: Bearer <CRON_SECRET>` (`docs/cron-external.md`). Réponse 200 confirmée, alerte sur 4xx/5xx.
2. [ ] SMTP Brevo opérationnel (`docs/brevo-setup.md`) : variables Vercel renseignées ; envoi de test via un compte de contrôle réussi (< 5 min) ; `EMAIL_OUTBOX_ENABLED` laissé à `true` ou mis à `false` en connaissance de cause.
3. [ ] Décision métier documentée sur la poursuite du suivi manuel ou l'activation de SasPay (mission distincte).
4. [ ] `SASPAY_ENABLED` laissé à `false` tant que la mission d'activation n'est pas livrée.
5. [ ] Taux de commission FILWORK fixé par le métier (si reversements automatisés un jour activés).
6. [ ] `JWT_SECRET` ≥ 32 ; `FRONTEND_URL` HTTPS réel ; `CORS_ORIGINS` exclusivement HTTPS hors-local (validés au démarrage) ; `DATABASE_URL` (pgbouncer) + `DATABASE_URL_UNPOOLED` (directe).
7. [ ] Dump de production ; `prisma migrate deploy` ; `migrate status` OK ; `migrate diff` = 0 (`docs/production-migration-runbook.md`).
8. [ ] Variables Vercel renseignées : `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CRON_SECRET`, `SMTP_*`, `MAIL_FROM`, `EMAIL_OUTBOX_ENABLED`, `NODE_ENV=production`.
9. [ ] Store Vercel Blob lié (OIDC) ou `BLOB_READ_WRITE_TOKEN` + `STORAGE_PROVIDER=vercel-blob` ; upload de validation (`docs/storage-provider.md`) ; suppression vérifiée ; URLs publiques non listables.
10. [ ] `/api/health`, `/api/health/database` contrôlés après déploiement ; e-mail de test automatique reçu en moins de 5 minutes.
11. [ ] Aucun e-mail de test, aucun jeu de données de démonstration en production (y compris `filwork_test` — jamais touchée en production).
12. [ ] Surveillance (logs 4xx/5xx, `EmailOutbox`, alerte sur non-200 du déclencheur) pendant 7 jours.
13. [ ] Rollback préparé : dump restauré, version précédente redéployée en 1 commande.
14. [ ] Autorisation explicite du client avant toute mise en ligne.

## Verdicts

- **PRÊT TECHNIQUEMENT POUR VERCEL : oui, SOUS CONDITIONS.** Le code build, démarre, passe les 239 tests. La mise en production n'est possible que si **toutes** les conditions suivantes sont remplies : (1) un **déclencheur externe toutes les 5 minutes** appelle `/api/internal/cron/process-emails` ; (2) Brevo opérationnel et vérifié ; (3) stockage réel (Vercel Blob) lié et testé ; (4) variables de production validées (HTTPS/CORS/SMTP/CRON_SECRET/DATABASE_URLs) ; (5) autorisation explicite. Sans ces conditions, FILWORK n'est pas prêt pour la production.
- **AUTORISÉ POUR LA PRODUCTION** : **non**, blocages externes listés plus haut (et aucun déploiement ne doit être tenté sans les lever).

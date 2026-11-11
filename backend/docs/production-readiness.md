# FILWORK — État de préparation production

> Établi le 2026-11-11. Le backend n'est **pas déployé** et n'a **jamais été connecté à une production réelle**.
> Toute affirmation ci-dessous est vérifiée sur le code, la base de test (`filwork_test`) et les tests automatisés.

## Légende

- **OPÉRATIONNEL ET TESTÉ** — fonctionne en `filwork_test`, couvert par des tests.
- **PRÉPARÉ, NON TESTÉ EN CONDITIONS RÉELLES** — code écrit et testé unitairement/avec mocks ; jamais exercé contre un prestataire réel.
- **BLOQUÉ PAR DÉCISION/AUTORISATION** — attend un choix métier, un compte externe ou une autorisation.
- **NON IMPLÉMENTÉ** — absent du code.

## Fonctionnalités opérationnelles et testées

- Authentification : inscription (CREATOR/COMPANY), connexion, déconnexion, rotation des refresh tokens (rejeu détecté, révocation globale), réinitialisation de mot de passe (code 6 chiffres, TTL 15 min, anti-énumération), invalidation après changement de rôle/e-mail/désactivation (`tokenVersion`).
- Profils : Créateur (bio, niche, disponibilité, note de profil) et Entreprise (logo, secteur, contact, taux) avec visibilité sélective (profils incomplets/démonstration non découvrables).
- Réseaux sociaux et Portfolio (CRUD), avis & réponses.
- Campagnes : création, modification, publication, pause, clôture, suppression de brouillons, recherche publique/découvrable, filtrage (statut, localisation, budget, plateforme).
- Candidatures & Invitations : dépôt, retrait, acceptation/refus, création de collaboration, empêchement candidature + invitation simultanée.
- Collaborations : consultation, clôture (idempotente), annulation (entreprise avec motif ; créateur si sans engagement).
- Livrables : création, soumission, examen (validation / demande de révision), notifications.
- Paiements (suivi manuel, temporaire) : création, consultation, transitions strictes contrôlant la propriété de la collaboration, notifications — historique conservé, aucune suppression possible. Voir `docs/payment-manual.md`. **SasPay est reporté à une mission distincte.**
- Notifications, Annonces administratives, Préférences (booléens e-mails).
- EmailOutbox : file persistante, backoff, reprise des tâches bloquées, protection anti-envoi accidentel en test.
- Administration : dashboard, listes utilisateurs/campagnes/collaborations/livrables/paiements, modification/désactivation/réactivation de comptes, protection du dernier ADMIN actif (verrou `FOR UPDATE`).
- Tests : **176/176 OK** sur `filwork_test` (unitaires 22, saspay 10, saspay-disabled 6, outbox 4, cron 4, production-env 12, prisma-cache 3, integration 86, reviews 7, communication 13, refresh-admin 6, payment-permissions 1, payment-notifications 2). Voir `npm run test:all`.
  - Le nombre de messages en attente dans `filwork_test` varie selon les exécutions : toute citation d'un nombre exact serait obsolète dès la prochaine exécution. La file y contient exclusivement des adresses de test (`@filwork.local`/`@example.com`) protégées contre l'envoi réel par `NODE_ENV=test`.

## Préparé, non testé en conditions réelles

- **SasPay (encaissement + reversement)** — `src/services/sasPayService.js`, `sasPayController.js`, `sasPayWebhookController.js`, `sasPayPayoutController.js`. Code conservé et isolé, **désactivé par défaut** : `SASPAY_ENABLED=false` empêche toute activation, même en présence d'une clé API accidentellement configurée (`isConfigured()` exige les deux). Les routes/webhooks concernés répondent 503 sans contacter SasPay. Aucun appel réel effectué. Réactivation à traiter dans une mission distincte après vérification du compte marchand et des conditions applicables.
- **EmailOutbox worker** — testé en file ; envoi réel non testé (pas de SMTP de production configuré). Batch par défaut borné à 3 (`EMAIL_OUTBOX_BATCH_SIZE`) pour rester sous le budget d'exécution serverless.
- **Vercel Functions** — `api/index.js`, `vercel.json` (fonction, réécritures, cron quotidien 06:00), client Prisma mis en cache (`globalThis`, couple client/adaptateur recréé ensemble), routes internes `/api/internal/cron/*` protégées par `CRON_SECRET`. Non déployé. **Sur Vercel Hobby, le cron quotidien seul est insuffisant pour les e-mails transactionnels : un déclencheur externe à 5 minutes est obligatoire avant la mise en production** (voir `docs/vercel-deployment.md`), sinon les e-mails de bienvenue, de collaboration et surtout de réinitialisation de mot de passe (TTL 15 min) seront systématiquement expirés ou retardés de plusieurs heures/jours.
- **Cron `process-emails` & `cleanup-tokens`** — endpoints prêts, verrouillés par secret, jamais exécutés hors tests.
- **Stockage abstrait** — `src/services/storage/index.js` : interface prête, aucune intégration fournisseur (aucun SDK installé).

## Bloqué par décision ou autorisation

- **Paiements automatisés SasPay** — **reportés** à une mission distincte. Nécessitent un compte marchand actif (KYC, clé `sk_live_`), webhook créé depuis le dashboard, IP whitelistée, et décision métier sur la mécanique de reversement.
- **Taux de commission FILWORK** : non fixé — `FILWORK_COMMISSION_BPS=0` tant que le métier ne décide pas.
- **Fournisseur SMTP (Brevo)** : nécessite compte + identifiants SMTP Brevo.
- **Fournisseur de stockage** : nécessite choix (Vercel Blob recommandé) + compte + SDK installé.
- **Migrations en production** : nécessite dump + `prisma migrate deploy` manuel.
- **Déploiement Vercel** : nécessite autorisation explicite + variables de production configurées (`FRONTEND_URL` HTTPS réel, `CORS_ORIGINS` de production, `JWT_SECRET` 32+ caractères).
- **`filwork_dev`** : registre des migrations vide — nécessite une procédure de baseline dédiée si des migrations doivent y tourner ultérieurement (voir `docs/dev-baseline.md`).

## Non implémenté

- Upload de fichiers binaires (le modèle actuel n'utilise que des URL).
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

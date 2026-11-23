# Rapport de tests du backend FILWORK

## 1. Environnement d'exécution des tests

- Date : 2026-11-23
- Node.js : v24.15.0
- Base de test : PostgreSQL local (`filwork_test` sur port 55432)
- Runner de test : `node:test` natif de Node.js avec exécution via `scripts/runIntegrationTests.js`

## 2. Résultats de la suite complète (`npm run test:all`)

Tous les tests configurés dans le projet ont été exécutés avec succès sans aucune défaillance :

1. `tests/backend-sanity.test.js` & `tests/email-templates.test.js` :
   - 10 tests unitaires réussis.
2. `tests/http.test.js` :
   - 22 tests HTTP réussis (gestion des en-têtes, sécurité, validation, erreurs Prisma, gestion des permissions).
3. `tests/saspay.test.js` & `tests/saspay-disabled.test.js` :
   - 13 tests réussis validant que l'intégration SasPay reste inactive et sécurisée par défaut.
4. `tests/email-outbox.test.js` & `tests/email-worker.test.js` :
   - 13 tests validant la file d'attente d'e-mails et le traitement par lots.
5. `tests/internal-cron.test.js` :
   - 5 tests validant la sécurité et l'exécution des routes cron internes.
6. `tests/production-env.test.js` :
   - 19 tests validant les contraintes strictes des variables de production (interdiction des hôtes locaux, exigence HTTPS, validité des URLs PostgreSQL).
7. `tests/prisma-cache.test.js` :
   - 2 tests validant la persistance de l'adaptateur Prisma sur `globalThis` en mode serverless.
8. `tests/health-check.test.js`, `health-database-http.test.js` & `health-database-unreachable.test.js` :
   - 11 tests sur les endpoints de santé applicative et de base de données.
9. `tests/storage-validation.test.js` & `tests/storage-vercel-blob.test.js` :
   - 16 tests validant la gestion et le refus sécurisé des téléversements en mode `none`.
10. `tests/rate-limit-general.test.js` & `tests/rate-limit-public.test.js` :
    - 6 tests validant la limitation de débit (rate limiting) sur les routes publiques et protégées.
11. `tests/email-utf8.test.js` & `verifyEmailUtf8.js` :
    - 2 tests vérifiant l'encodage strict UTF-8 sur l'ensemble des gabarits d'e-mails.
12. Tests d'intégration de bout en bout :
    - `tests/upload.test.js` (2 tests)
    - `tests/api.test.js` (116 tests)
    - `tests/reviews.test.js` (8 tests)
    - `tests/communication.test.js` (13 tests)
    - `tests/creator-content-permissions.test.js` (1 test)
    - `tests/refresh-admin.test.js` (6 tests)
    - `tests/payment-permissions.test.js` (1 test)
    - `tests/payment-notifications.test.js` (2 tests)
    - `tests/campaign-notifications.test.js` (1 test)

**Total des tests réussis** : 253 tests passés avec succès (0 échec).

## 3. Compilation et vérification Prisma

- Commande : `npm run build` (`prisma generate`)
- Résultat : Succès (génération de Prisma Client v7.10.1 sans erreur de schéma).

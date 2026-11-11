# SasPay — Intégration de paiement FILWORK

## Statut : **PRÉPARÉE, GELÉE ET DÉSACTIVÉE PAR DÉFAUT**

> Décision de 2026-11 : le paiement automatisé est **reporté** à une mission distincte.
> Aucune configuration SasPay n'a été fournie (compte marchand, clé API `sk_live_…`, webhook, whitelist IP). Le code est écrit et les tests unitaires passent, mais **aucun paiement, reversement ni webhook n'a été exécuté en conditions réelles**. Ne pas affirmer le contraire.
>
> `SASPAY_ENABLED=false` par défaut. `isConfigured()` exige `SASPAY_ENABLED=true` **et** `SASPAY_API_KEY` : une clé accidentellement présente dans l'environnement ne réactive rien. Toutes les routes SasPay et le webhook répondent **503** sans aucun appel réseau lorsque SasPay est désactivé. L'isolation est couverte par `tests/saspay-disabled.test.js`.
>
> Le fonctionnement de paiement actuel est la **déclaration manuelle** documentée dans `docs/payment-manual.md`.

## Décision métier

SasPay est **la** solution de paiement retenue pour FILWORK (entreprise paie FILWORK, puis FILWORK reverse au créateur), mais son **activation est reportée** à une mission distincte après vérification des informations du compte marchand et des conditions applicables. Aucune intégration FedaPay/KKiaPay/CinetPay n'est réalisée ni prévue. En attendant, l'entreprise déclare manuellement le paiement effectué hors plateforme et FILWORK enregistre ce statut (voir `docs/payment-manual.md`).

## Sources et documentation consultées (2026-11-11)

- Site officiel : https://saspay.me (compte marchand)
- Documentation : https://docs.saspay.me (version lue le 2026-11-11)
- Page afro.tools/providers/saspay (référence non officielle, indiquant les vérifications empiriques — notamment l'absence de sandbox fonctionnelle)
- OpenAPI : https://docs.saspay.me/api-reference/openapi.json

Base URL : `https://api.saspay.me/api/v1`. Authentification : `Authorization: Bearer sk_test_…|sk_live_…` (serveur uniquement, jamais côté client). Enveloppe de réponse : `{ success, data | error, code }`.

## Capacités RÉELLES vérifiées (Bénin, XOF)

- Encaissement : `POST /payments/softpay/` (push mobile money ou `checkout_url` hébergée selon réseau), `POST /checkout-sessions/` (page hébergée), `GET /payments/{id}/verify/`.
- Réseaux Bénin : `mtn_bj` (MTN MoMo), `moov_bj` (Moov Money), `celtiis_bj` (Celtiis Cash), plus `card` (USD, Stripe) et `crypto` (IziChange). Devise : XOF, pays : BJ, indicatif +229.
- Payouts (reversements) : `POST /payouts/initialize/` (IP whitelistée requise, scope clé `PAYOUT` ou `BOTH`), `GET /payouts/{id}/verify/`. Minimum 200 XOF. Devise = pays du bénéficiaire (pas de conversion). Payout **désactivé par défaut** : activation manuelle par SasPay pour chaque marchand.
- Webhooks : `transaction.success|failed|created`, `settlement.*`, `wallet_transfer.*`. Création/gestion des webhooks **uniquement depuis le dashboard** ; seuls la consultation et la lecture sont en API. Signature HMAC-SHA256 hex sur `{timestamp}.{body}`, header `X-Webhook-Signature`, `X-Webhook-Timestamp` (Unix, tolérance 5 min), `X-Webhook-Event`. 5 tentatives (immédiat, +30s, +5min, +30min, +2h), timeout 15 s, puis FAILED définitif.
- Idempotence : header `Idempotency-Key` (unique par intention, réutilisable sur retry) sur softpay, retry, payouts, settlements, wallet-transfers. Sans lui, un retry réseau crée un second débit.

## Limites et points de vigilance concrets

1. **Pas de sandbox fonctionnelle** : les clés `sk_test_…` débitent le circuit de production. Les tests réels déplacent de l'argent — ne jamais tester en production sans consentement explicite.
2. **Reversements bloqués** pour tout nouveau marchand : `payout_not_enabled` ou `ip_not_whitelisted` jusqu'à activation SasPay + whitelist IP.
3. **Confirmation d'encaissement** : la redirection navigateur n'est jamais une preuve. Toujours revérifier auprès de `GET /payments/{id}/verify/` (le code le fait côté backend pour chaque webhook et chaque appel au statut).
4. **Commission FILWORK** : le taux n'est pas fixé. `FILWORK_COMMISSION_BPS` (points de base) est la variable porteuse ; défaut 0 (aucune commission) — jamais une valeur métier arbitraire.
5. **Licence/KYC** : l'ouverture d'un compte marchand SaaS est soumise aux conditions SasPay (§1, "éditeurs de logiciels SaaS"). À confirmer avant de dépendre des payouts.
6. **Conservation des fonds** : FILWORK ne doit pas agir comme portefeuille réglementé sans validation juridique. Le reversement est donc déclenché manuellement par un administrateur après validation de la prestation — jamais automatiquement.

## Ce que le code fait aujourd'hui

- `SASPAY_ENABLED=false` (défaut) : toutes les routes SasPay (`/api/payments/:paymentId/saspay/initialize|status`, `/api/payouts/:paymentId/saspay/initialize|verify`, webhook `POST /api/webhooks/saspay`) répondent **503** sans aucun appel réseau. Le service ne fait aucune requête sortante.
- `src/services/sasPayService.js` : appels HTTP (timeout 15 s), validation des montants décimaux, vérification de la signature de webhook (HMAC-SHA256 + tolérance 5 min + `timingSafeEqual`), calculs de commission en points de base (sans flottants). `isConfigured()` exige `SASPAY_ENABLED=true` **et** `SASPAY_API_KEY`.
- `src/controllers/sasPayController.js` : initiation softpay, revérification côté serveur du statut (jamais le webhook seul pour marquer PAID), application atomique en transaction, création des notifications et e-mails de confirmation.
- `src/controllers/sasPayWebhookController.js` : endpoint public `POST /api/webhooks/saspay` ; signature vérifiée sur le corps brut ; idempotence par statut local (déjà SUCCESS → no-op) ; transaction inconnue → 200 ignoré silencieusement.
- `src/controllers/sasPayPayoutController.js` : reversement réservé aux **administrateurs** (`requireAdmin`), uniquement pour une collaboration `COMPLETED` et un paiement `PAID` ; coordonnées du créateur requises (`payoutMsisdn`, `payoutNetwork`, `payoutCountry` — ajoutées au schéma `CreatorProfile`) ; montant = part créateur après commission.
- Routes : `POST /api/payments/:paymentId/saspay/initialize`, `GET /api/payments/:paymentId/saspay/status` (entreprise, propriétaire), `POST /api/payouts/:paymentId/saspay/initialize`, `GET /api/payouts/:paymentId/saspay/verify` (admin), `POST /api/webhooks/saspay` (public, signé).

## Ce qui reste à confirmer avec SasPay / le client

- Activation des payouts pour le marchand et whitelist IP du serveur Vercel.
- Le besoin réel de `Celtiis Cash` (`celtiis_bj`) pour les utilisateurs test.
- Le taux de commission définitif de FILWORK.
- La procédure KYC et l'éligibilité "éditeurs de logiciels SaaS".
- Si SasPay refuse ou limite les reversements : l'architecture devra brancher un PSP payout distinct (conforme à la réglementation) sans modifier le parcours entreprise → paiement.

## Variables d'environnement

- `SASPAY_ENABLED=false` (obligatoirement `false` pour cette phase)
- `SASPAY_BASE_URL=https://api.saspay.me/api/v1`
- `SASPAY_API_KEY=sk_live_…` (ou `sk_test_…` pour un compte de test SasPay valide) — ignorée si `SASPAY_ENABLED` n'est pas `true`
- `SASPAY_WEBHOOK_SECRET=…` (secret affiché une fois à la création du webhook) — ignoré si `SASPAY_ENABLED` n'est pas `true`
- `FILWORK_COMMISSION_BPS=0` (0 tant que le taux métier n'est pas fixé)

Voir `environment-variables.md`.

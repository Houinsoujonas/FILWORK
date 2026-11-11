# Parcours financier FILWORK

> **Situation actuelle (2026-11) — phase manuelle.** Aucune fonction de paiement automatisé n'est active.
> L'entreprise paie le créateur hors plateforme, puis déclare le paiement sur FILWORK.
> FILWORK n'intervient dans aucun transfert d'argent. Voir **`docs/payment-manual.md`** pour les détails, et `docs/saspay-integration.md` pour le code SasPay reporté.
> Le présent document décrit le modèle de paiement automatisé **préparé mais non activé**. Il ne décrit pas ce qui tourne en production aujourd'hui.

## Chaîne de paiement

```
Entreprise                     FILWORK / SasPay                  Créateur
    │                                │                                 │
    │  1. Choisit un créateur       │                                 │
    │  2. Collaboration créée        │                                 │
    │  3. Conditions financières     │  agreedAmount figé au contrat   │
    │  4. Paie FILWORK (softpay) ───► Notification → saut
    │                                │  5. FILWORK vérifie auprès de SasPay
    │                                │     (jamais le navigateur, jamais le webhook seul)
    │                                │  6. Transaction enregistrée (Payment.status = PAID)
    │                                │  7. Créateur réalise la prestation
    │  8. Livrables soumis ◄─────────┤                                 │
    │  9. Entreprise valide ─────────┤                                 │
    │                                │ 10. Commission + rémunération calculées (FILWORK_COMMISSION_BPS)
    │                                │ 11. Reversement initié par un ADMIN (manuel, jamais automatique)
    │                                └───────────────► 12. Payout au créateur (si SasPay l'autorise)
    │                                │ 13. Reversement vérifiable et traçable
```

## États du paiement (modèle `Payment`)

| Statut | Signification | Qui écrit |
| - | - | - |
| `PLANNED` | Paiement prévu/échéance posée | L'entreprise (`POST /api/payments/collaborations/:id`) |
| `PENDING` | Paiement initié auprès de SasPay, en attente | SasPay (via webhook ou revérification) |
| `PAID` | Paiement confirmé côté SasPay, crédité | Backend uniquement après vérification serveur (`verify`) |
| `FAILED` | Paiement échoué ou annulé | Backend uniquement |
| `CANCELLED` | Paiement annulé | Backend uniquement |

`Payment.provider` : `MANUAL` (historique, aucun SasPay) ou `SASPAY`. `Payment.providerTransactionId`, `providerReference`, `commissionBps`, `commissionAmount`, `creatorAmount` sont remplis lors du passage à `PAID`.

## États du reversement (`SasPayTransaction`, direction PAYOUT)

| Statut | Signification |
| - | - |
| `PENDING` | Payout initié auprès de SasPay, en attente |
| `SUCCESS` | Créateur crédité |
| `FAILED` | Payout refusé/échoué |

Le reversement n'est **jamais** déclenché automatiquement : un administrateur choisit explicitement `POST /api/payouts/:paymentId/saspay/initialize`. Conditions vérifiées : collaboration `COMPLETED`, paiement `PAID`, créateur avec coordonnées de reversement (`payoutMsisdn`, `payoutNetwork`, `payoutCountry`), SasPay prêt (IP whitelistée + payouts activés).

## Commission

- Stockée en **points de base** : `FILWORK_COMMISSION_BPS` (0 = 0 %, 1000 = 10 %).
- Calculée côté serveur : `commission = floor(amount × bps / 10000)` (aucun flottant).
- `creatorAmount = amount − commissionAmount`, enregistré sur le paiement à la confirmation puis recalculé au reversement.
- Le taux **n'est pas fixé** en code ; il appartient au métier.

## Webhooks

SasPay → `POST /api/webhooks/saspay` (public, signé). Vérification : signature HMAC-SHA256 (`X-Webhook-Signature` sur `{timestamp}.{body}`, `X-Webhook-Timestamp` ≤ 5 min), puis **revérification obligatoire de l'état réel auprès de SasPay** avant d'écrire en base. Un webhook rejoué ne produit aucun effet (idempotence par `status SUCCESS` local). Un webhook inconnu est acquitté en 200 (ignoré).

## Traçabilité et audit

- `Payment` : montant, statut, dates, référence SasPay.
- `SasPayTransaction` : chaque interaction (PAYIN/PAYOUT), avec `idempotencyKey` unique, `providerId`, `payload` brut.
- `Notification` : événements `PAYMENT_STATUS_UPDATED` pour les deux parties, `COLLABORATION_*` pour le cycle de vie.
- `EmailOutbox` : confirmations et alertes, toujours idempotentes côté worker.

## Frontières légales

FILWORK ne conserve pas les fonds de tiers comme un portefeuille. L'entreprise paie, FILWORK enregistre, le créateur est payé sur autorisation admin. Toute évolution (automatisation du reversement, conservation des fonds, second PSP) exige une validation juridique et l'accord du client avant d'être mise en œuvre.

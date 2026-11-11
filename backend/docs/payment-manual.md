# Paiement manuel FILWORK — phase temporaire

> État au 2026-11-11. Aucun flux de paiement automatisé n'est actif ni autorisé dans cette phase.
> FILWORK **n'intervient dans aucun transfert d'argent**. La plateforme sert à suivre et enregistrer des déclarations de paiement effectuées hors ligne.

## Fonctionnement

1. Une entreprise et un créateur réalisent une collaboration (candidature/invitation, acceptation, collaboration `ACTIVE`).
2. L'entreprise effectue le paiement du créateur par le moyen de paiement convenu entre eux (mobile money, banque, espèces, autre).
3. L'entreprise revient sur FILWORK et **déclare manuellement** le paiement : création du paiement, puis transitions de statut.
4. FILWORK enregistre cette déclaration et affiche le statut correspondant aux espaces concernés (entreprise, créateur, administration).
5. L'administration conserve ses capacités de supervision et de contrôle conformément aux permissions existantes.

La plateforme enregistre **une déclaration**, pas une preuve bancaire. Le statut « payé » ne signifie pas que les fonds ont été effectivement reçus par le créateur : il signifie que l'entreprise autorisée a déclaré le paiement comme effectué.

## Permissions

- **COMPANY (propriétaire de la collaboration)** : peut créer le paiement, modifier ses champs autorisés (`amount`, `currency`, `dueDate`, `notes`) et changer le statut. Implémenté : `requireRole("COMPANY")` + vérification d'appartenance dans le contrôleur (`paymentController.js`).
- **CREATOR** : peut **consulter** les paiements de sa collaboration ; **ne peut pas** créer de paiement ni changer le statut (`requireRole("COMPANY")`, 403 vérifié par tests).
- **Autre entreprise** : ne peut ni consulter, ni créer, ni modifier le paiement d'une autre entreprise (403/404 vérifiés par tests).
- **ADMIN** : consultation/supervision via les routes d'administration ; aucun débit possible via SasPay (désactivé).
- Le créateur ne peut pas s'attribuer lui-même le statut `PAID` (vérifié par test).

## Statuts du modèle `Payment`

| Statut | Signification | Qui écrit |
| - | - | - |
| `PLANNED` | Paiement prévu (échéance posée) | Entreprise autorisée |
| `PENDING` | Entreprise déclare le paiement engagé/en cours | Entreprise autorisée |
| `PAID` | Entreprise déclare le paiement effectué | Entreprise autorisée (transition `PENDING → PAID` uniquement) |
| `FAILED` | Paiement échoué/annulé déclaré | Entreprise autorisée |
| `CANCELLED` | Paiement annulé | Entreprise autorisée |

Transitions autorisées (`allowedTransitions` dans `paymentController.js`) :

```
PLANNED  → PENDING, CANCELLED
PENDING  → PAID, FAILED, CANCELLED
FAILED   → PENDING, CANCELLED
PAID     → (terminal)
CANCELLED→ (terminal)
```

- `PAID` direct depuis `PLANNED` est refusé (409). Depuis `PAID`, toute transition est refusée (409).
- `FAILED → PENDING` est autorisé (nouvelle tentative). Les autres retours arrière sont refusés.
- Les transitions sont appliquées dans une transaction avec verrou de la collaboration et un `updateMany({ where: { id, status: <attendu> } })` : deux requêtes concurrentes vers la même cible ne produisent qu'un seul gagnant (l'autre reçoit 409).
- La notification `PAYMENT_STATUS_UPDATED` au créateur est créée **dans la même transaction**, après validation effective du changement — jamais avant.

## Limites de la déclaration manuelle

- Pas de vérification bancaire ou opérateur : FILWORK ne sait pas si l'argent a transité.
- Pas de conservation de fonds, pas de portefeuille, pas de commission débitée.
- `FILWORK_COMMISSION_BPS` reste à `0` ; aucun calcul de commission n'est utilisé pour déclencher un transfert (aucun transfert n'existe).
- Pas d'automatisation des relances ni de pénalités.
- Un statut `PAID` erroné ou abusif relève de la supervision administrative et du litige commercial, pas d'une vérification technique de FILWORK.
- Les champs `provider`, `providerTransactionId`, etc. existent pour la phase SasPay (`MANUAL` par défaut en création manuelle) ; ils ne doivent pas être détournés pour simuler un flux SasPay.

## SasPay : reporté

Le code SasPay est **conservé mais gelé** :

- `SASPAY_ENABLED=false` par défaut. `isConfigured()` exige `SASPAY_ENABLED=true` **et** `SASPAY_API_KEY` : une clé accidentellement présente dans l'environnement ne réactive rien.
- Toutes les routes SasPay (`/api/payments/:id/saspay/*`, `/api/payouts/*`, webhook `/api/webhooks/saspay`) répondent **503** sans aucun appel réseau lorsque SasPay est désactivé.
- L'isolation est vérifiée par la suite `tests/saspay-disabled.test.js` (6 tests, aucun trafic sortant).
- Aucune requête réseau vers SasPay n'est effectuée pendant cette phase.
- Les migrations SasPay déjà appliquées sur `filwork_test` sont conservées ; rien n'est supprimé.

## Prérequis avant une future activation de paiements automatisés

1. Décision métier sur le modèle (prise de fonds par FILWORK vs. agrégation vs. autre).
2. Validation juridique (conservation de fonds, LCB/KYC, CGV, responsabilités).
3. Compte marchand SasPay actif et vérifié (KYC), clé `sk_live_`, IP du déploiement whitelistée.
4. Payouts activés côté SasPay (aujourd'hui `payout_not_enabled`).
5. Webhook SasPay créé au dashboard (URL + secret) ; politique de revérification serveur définie.
6. `FILWORK_COMMISSION_BPS` fixé par le métier.
7. Tests end-to-end sur sandbox SasPay avec vrais comptes de contrôle (montants symboliques).
8. Procédure de rollback et de reprise manuelle documentée.
9. Revue de sécurité indépendante, puis autorisation explicite du client avant mise en ligne.
10. `SASPAY_ENABLED` passé à `true` uniquement dans le cadre de la mission d'activation, avec PR dédiée et revue.

## Références

- `backend/src/controllers/paymentController.js` — création, consultation, transitions, notification.
- `backend/src/routes/paymentRoutes.js` — `requireRole("COMPANY")` sur POST et PATCH.
- `backend/tests/payment-permissions.test.js` — permissions, transitions, concurrence.
- `backend/tests/saspay-disabled.test.js` — isolation SasPay.
- `docs/payment-flow.md` — modèle automatisé préparé (non actif).
- `docs/saspay-integration.md` — détails techniques SasPay.

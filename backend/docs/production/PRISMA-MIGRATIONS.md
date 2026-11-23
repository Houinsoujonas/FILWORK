# Gestion et vérification des migrations Prisma

## 1. Inventaire des migrations

Le projet contient exactement 22 migrations ordonnées dans `backend/prisma/migrations` :

1. `20261021152421_init`
2. `20261021163717_add_creator_company_profiles`
3. `20261021172540_add_campaigns`
4. `20261021180226_add_applications`
5. `20261021183733_add_notifications`
6. `20261022120746_add_collaborations_deliverables_payments`
7. `20261022175407_add_password_reset_tokens`
8. `20261022192121_add_revoked_tokens`
9. `20261022195606_complete_creator_company_profiles`
10. `20261022234250_add_campaign_location`
11. `20261023155926_add_invitations_and_collaboration_origin`
12. `20261024192546_add_user_token_version`
13. `20261027203922_add_collaboration_notifications`
14. `20261030120000_add_collaboration_closure_fields`
15. `20261101120000_add_reviews`
16. `20261101130000_collaboration_application_restrict`
17. `20261109000000_add_communication_system`
18. `20261111000000_add_refresh_tokens_and_user_is_active`
19. `20261111220000_fix_refresh_token_fk_on_update_cascade`
20. `20261111230000_add_saspay_integration`
21. `20261111233000_fix_saspaytransaction_updatedat_default`
22. `20261112220000_add_campaign_published_notifications`

Le fichier de verrouillage `backend/prisma/migrations/migration_lock.toml` définit le fournisseur cible :
`provider = "postgresql"`

## 2. Cohérence du schéma

- Les 22 migrations définissent l'intégralité du modèle métier présent dans `backend/prisma/schema.prisma`.
- Modèles couverts :
  - Utilisateurs, profils créateurs et entreprises.
  - Campagnes, candidatures, invitations.
  - Collaborations, livrables, paiements manuels.
  - Avis (reviews) et signalements.
  - Système de communication (messages, pièces jointes, conversations).
  - Gestion des jetons de rafraîchissement (`RefreshToken`), révocations et réinitialisation de mot de passe.
  - Notifications système et transactionnelles.
  - Transactions SasPay (désactivées par défaut).
  - File d'attente d'e-mails (`EmailOutbox`).

## 3. Règle absolue de déploiement des migrations

- **Jamais dans la commande de build Vercel** : La commande `npm run build` sur Vercel exécute exclusivement `prisma generate`. Elle ne doit jamais exécuter `prisma migrate deploy`.
- **Exécution séparée** : Le déploiement des migrations sur Neon s'effectue hors de la phase de compilation Vercel, soit depuis la machine d'administration, soit via une étape de pipeline contrôlée, à l'aide de l'URL directe non poolée `DATABASE_URL_UNPOOLED`.

## 4. Procédure pour Jonas pour appliquer les migrations sur Neon

Avant le premier lancement en production, Jonas doit exécuter les commandes suivantes depuis le dossier `backend` :

```powershell
cd backend
$env:DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@HOST.us-east-2.aws.neon.tech/neondb?sslmode=require"
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
```

Si le statut confirme que les 22 migrations sont appliquées, la base est prête.

# Baseline de `filwork_dev` (registre des migrations vide)

## Constat

`filwork_dev` est à jour pour le schéma (19 tables, données, `prisma migrate diff` → « No difference detected ») mais `_prisma_migrations` est **vide**. Le schéma a donc été appliqué hors registre (probablement `db push` ou restauration d'un dump).

## Pourquoi c'est dangereux d'appliquer `prisma migrate deploy` tel quel

`migrate deploy` essaierait de rejouer les 21 migrations depuis l'origine. Les premières (`20261021152421_init`, etc.) ne sont **pas rejouables** (`CREATE TABLE` sans garde-fous) : elles échoueraient sur une base qui contient déjà les objets.

## Procédure sûre (NON exécutée — nécessite autorisation)

1. `pg_dump -Fc` de `filwork_dev` (sauvegarde obligatoire, hors dépôt), par exemple :

   ```sh
   pg_dump -Fc -h 127.0.0.1 -U postgres -d filwork_dev -f filwork_dev_YYYYMMDD_HHMMSS.dump
   ```

2. Vérifier que `prisma migrate diff` retourne « No difference detected » :

   ```sh
   npx prisma migrate diff --config prisma7.config.ts --from-config-datasource --to-schema prisma/schema.prisma --exit-code
   ```

3. Marquer toutes les migrations existantes comme appliquées **sans les exécuter** (liste complète, une commande par migration) :

   ```sh
   # À exécuter uniquement après validation explicite et dump vérifié :
   npx prisma migrate resolve --applied 20261021152421_init --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261021163717_add_creator_company_profiles --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261021172540_add_campaigns --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261021180226_add_applications --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261021183733_add_notifications --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261022120746_add_collaborations_deliverables_payments --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261022175407_add_password_reset_tokens --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261022192121_add_revoked_tokens --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261022195606_complete_creator_company_profiles --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261022234250_add_campaign_location --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261023155926_add_invitations_and_collaboration_origin --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261024192546_add_user_token_version --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261027203922_add_collaboration_notifications --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261030120000_add_collaboration_closure_fields --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261101120000_add_reviews --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261101130000_collaboration_application_restrict --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261109000000_add_communication_system --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261111000000_add_refresh_tokens_and_user_is_active --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261111220000_fix_refresh_token_fk_on_update_cascade --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261111230000_add_saspay_integration --config prisma7.config.ts
   npx prisma migrate resolve --applied 20261111233000_fix_saspaytransaction_updatedat_default --config prisma7.config.ts
   ```

   (Les séparer en deux lots — avant et après le dump — ne change rien ; toutes doivent être marquées.)

4. `npx prisma migrate status --config prisma7.config.ts` → « Database schema is up to date! ».
5. Toute migration future peut alors être appliquée normalement via `prisma migrate deploy`.

## Ce qu'il faut savoir

- `migrate resolve --applied` n'exécute aucune migration et n'altère aucun objet ; il écrit uniquement la ligne correspondante dans `_prisma_migrations`.
- Cette opération est **irréversible** pour les 21 migrations listées (on ne peut pas « annuler » un marquage appliqué sans supprimer la ligne du registre).
- `filwork_dev` ne doit recevoir aucune migration tant que ce baseline n'a pas été effectué avec votre accord.
- `filwork_test` est déjà baseline (21 migrations enregistrées, diff vide).
- La base Neon de production sera créée neuve : `migrate deploy` s'y appliquera proprement sans baseline.

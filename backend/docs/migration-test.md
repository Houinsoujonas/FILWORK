# Procédure sûre de migration de filwork_test

Cette procédure décrit comment appliquer les migrations préparées sur la base de test
uniquement, sans toucher à `filwork_dev`, à Neon production, ni aux sauvegardes existantes.

## État connu (vérifié le 2026-11-11, après migrations)

`filwork_test` est maintenant entièrement migrée et cohérente avec `prisma/schema.prisma` :

- 19 migrations enregistrées dans `_prisma_migrations`, dont :
  - `20261109000000_add_communication_system` (appliquée le 2026-11-11),
  - `20261111000000_add_refresh_tokens_and_user_is_active` (appliquée le 2026-11-11),
  - `20261111220000_fix_refresh_token_fk_on_update_cascade` (correction `ON UPDATE CASCADE` sur `RefreshToken_userId_fkey`, appliquée le 2026-11-11).
- `prisma migrate status --config prisma.test.config.js` → `Database schema is up to date!`
- `prisma migrate diff` → `No difference detected.`
- Client Prisma régénéré avec succès (`npm run build`).

Sauvegardes créées avant les migrations (conservées hors du dépôt, dans un dossier sécurisé) :

- `<BACKUP_DIR>/filwork_test-pre-migration-*/`
- `<BACKUP_DIR>/filwork_test-pre-fix-*/` (avant la migration corrective)

Historique important : la migration `20261109000000_add_communication_system` était déjà
présente sous forme d'objets dans cette base (appliquée hors registre) ; elle est volontairement
rejouable (`IF NOT EXISTS`, catalogues PostgreSQL vérifiés).

## Prérequis

- Service PostgreSQL FILWORK démarré (127.0.0.1:55432).
- `filwork_test` accessible et intacte.
- Sauvegarde récente de `filwork_test` créée avant toute migration.
- Aucune modification des fichiers `.env` ou `.env.test`.

## Étapes

1. Vérifier la cible de test et qu'elle n'est pas une cible de production :

   ```sh
   npm run db:test:status
   ```

   La sortie doit indiquer `filwork_test` et confirmer que la production n'est pas ciblée.

2. Sauvegarder `filwork_test` :

   ```sh
   pg_dump -h 127.0.0.1 -p 55432 -U filwork_test -d filwork_test -Fc -f filwork_test-avant-migration.dump
   ```

   (Utiliser le compte PostgreSQL applicatif ou un superuser si les droits sont insuffisants.
   Conserver le dump hors du dépôt Git.)

3. Appliquer les migrations préparées :

   ```sh
   npm run db:test:deploy
   ```

   Cette commande exécute d'abord `checkTestDatabase.js --connect`, puis
   `prisma migrate deploy --config prisma.test.config.js`. Elle ne doit jamais être exécutée
   sur `filwork_dev` ni sur Neon.

4. Vérifier que toutes les migrations sont appliquées :

   ```sh
   npx prisma migrate status --config prisma.test.config.js
   ```

   La sortie doit indiquer `Database schema is up to date!` ou 18 migrations appliquées.

5. Vérifier l'absence de différence entre le schéma et la base :

   ```sh
   npx prisma migrate diff \
     --config prisma.test.config.js \
     --from-config-datasource \
     --to-schema prisma/schema.prisma \
     --exit-code
   ```

   La commande doit retourner `No difference detected.` et exit 0.

6. Régénérer le client Prisma :

   ```sh
   npm run build
   ```

## Tests à exécuter après cette migration

```sh
npm test                  # unitaires sans DB
npm run test:integration  # tests/api.test.js
npm run test:reviews      # tests/reviews.test.js
npm run test:communication # tests/communication.test.js
npm run test:refresh-admin # tests/refresh-admin.test.js (refresh tokens, révocation, admin concurrent)
npm run test:all          # les cinq suites combinées
```

État constaté après la migration corrective : **134 tests passés** (22 + 86 + 7 + 13 + 6).

## Points de vigilance

- Ne jamais exécuter `prisma migrate deploy` avec `prisma7.config.ts` (production/dev) : le
  registre de `filwork_dev` est vide et `migrate deploy` essaierait de réappliquer toutes les
  migrations depuis le début, ce qui échouerait sur des objets existants.
- En cas d'échec, restaurer `filwork_test` à partir de la sauvegarde la plus récente
  (`<BACKUP_DIR>/filwork_test-pre-migration-*/` ou `<BACKUP_DIR>/filwork_test-pre-fix-*/`) avant
  toute autre action. La restauration doit être validée explicitement par l'utilisateur.
- Après migration, `prisma generate` est obligatoire pour que le client connaisse `RefreshToken`,
  `isActive` et le nouveau modèle.
- Les tests d'intégration modifient `filwork_test` ; ils ne doivent être lancés que lorsque la
  base est effectivement migrée et la sauvegarde est en place.
- Les e-mails en attente dans `filwork_test` (`@filwork.local`, `@example.com`) sont des données
  de test. Ils ne doivent jamais être envoyés. Le worker outbox refuse tout envoi lorsque
  `NODE_ENV=test` et refuse tout destinataire sur ces domaines (code, pas seulement configuration).
  Ne jamais activer `EMAIL_OUTBOX_ENABLED=true` pour "nettoyer" ces e-mails.

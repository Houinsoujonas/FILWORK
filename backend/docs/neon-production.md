# Neon PostgreSQL en production

## État du cluster

- Le développement tourne sur `filwork_dev` (PostgreSQL 17.6 local, service `FilworkPostgreSQL`, `127.0.0.1:55432`).
- La base de test est `filwork_test` (vérification en lecture seule via `scripts/checkTestDatabase.js` : `127.0.0.1:55432/filwork_test`).
- **Neon ne doit être utilisée qu'avec votre autorisation expresse.** Ni `filwork_dev` ni une branche Neon ne doivent recevoir de dump ou de `prisma db push` sans feu vert.
- Le backend contrôle explicitement, à chaque démarrage, que la base applicative n'est pas la base de test (`src/config/databaseTarget.js`). Toute incohérence bloque le démarrage.

## État des branches Neon (vérifié)

- `migration-test` (migration `br-jolly-dew-b4ggr9n4`) : **21 migrations réussies distinctes** jusqu'à `20261111233000_fix_saspaytransaction_updatedat_default`, plus 1 tentative annulée (`20261109000000_add_communication_system`). La migration `20261112220000_add_campaign_published_notifications` **n'est pas appliquée**. C'est la référence de validation. **Ne pas présenter ce profil comme identique à `filwork_test`.**
- `production` (`br-wandering-meadow-b4vnko5f`) : **0 table applicative**, **aucune entrée Prisma** — **pas encore migrée**.
- `production-backup-before-migrations` (`br-crimson-morning-b4jxxg4x`, parent `production`, créée 2026-11-11) : **0 table applicative** — c'est un point de restauration structurel, pas une sauvegarde de données.

## Ordre de travail

1. Vérification lecture seule `migration-test` (référence de validation).
2. Vérification lecture seule `production` et `production-backup-before-migrations`.
3. Configuration Vercel (variables d'environnement) et premier déploiement technique.
4. Migration production (uniquement après autorisation séparée explicite).
5. Vérifications post-migration (status, diff, SQL).
6. Déclencheur externe 5 minutes et vérification e-mails réels.

## Pooling

- `DATABASE_URL` : utiliser le pooler Neon (`pgbouncer=true` sur le host `-pooler`). Exemple : `postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require&pgbouncer=true&connection_limit=5`.
- `DATABASE_URL_UNPOOLED` : connexion directe (hors pooler) utilisée par Prisma CLI et `prisma generate` via `prisma7.config.ts` (`url: env("DATABASE_URL_UNPOOLED")`).
- `PrismaPg` utilise le driver `pg` côté adapter : en serverless, le client est mis en cache sur `globalThis` pour réutiliser les connexions (voir `src/config/prisma.js`).

## Timeouts et limites

- Neon plan gratuit : 5 connexions simultanées, endpoints suspendus après inactivité (premier appel lent).
- Toujours passer `sslmode=require`.
- Limiter `connection_limit` à 5 sur le pooler en serverless.
- Ne pas lancer de migrations dans la commande de build ; les exécuter manuellement.

## Migrations

Procédure de production (après validation sur `filwork_test`) :

1. `pg_dump -Fc` de la base (obligatoire).
2. `npx prisma migrate deploy` (commande distincte, jamais dans le build).
3. `npx prisma migrate status` → toutes appliquées.
4. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → « No difference detected ».
5. Redéployer le service, vérifier `/api/health/database`.
6. En cas d'échec : restaurer le dump, puis corriger. Ne jamais `migrate reset`.

## Séparation des environnements

- `filwork_dev` : développement local.
- `filwork_test` : tests automatisés et vérifications (déployée).
- Neon `production` : réservé à la production — jamais `db push`, jamais d'import de données de test.

## Données de démonstration

La base de production doit rester vide de comptes/campagnes/collaborations de démonstration. Aucune migration n'injecte de données de démonstration. Seul le schéma est déployé.

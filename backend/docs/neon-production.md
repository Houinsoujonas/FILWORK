# Neon PostgreSQL en production

## État du cluster

- Le développement tourne sur `filwork_dev` (PostgreSQL 17.6 local, service `FilworkPostgreSQL`, `127.0.0.1:55432`).
- La base de test est `filwork_test`.
- **Neon ne doit être utilisée qu'avec votre autorisation expresse.** Ni `filwork_dev` ni une branche Neon ne doivent recevoir de dump ou de `prisma db push` sans feu vert.
- Le backend contrôle explicitement, à chaque démarrage, que la base applicative n'est pas la base de test (`src/config/databaseTarget.js`). Toute incohérence bloque le démarrage.

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

# Runbook de migration de production — FILWORK

> **État au 2026-11-12** : le dépôt contient **22 migrations versionnées**. En application sur `filwork_test` : **22 migrations réussies, 0 annulée, 22 tables physiques**. La branche Neon `migration-test` (`br-jolly-dew-b4ggr9n4`) a reçu **21 migrations réussies distinctes + 1 tentative annulée**. La migration `20261112220000_add_campaign_published_notifications` **n'est pas encore appliquée sur `migration-test`**. La branche `production` (`br-wandering-meadow-b4vnko5f`, base `neondb`, PostgreSQL 18.6) est **vierge** ; `production-backup-before-migrations` (`br-crimson-morning-b4jxxg4x`, parent `production`) est également **vierge**. **Aucune migration n'est autorisée aujourd'hui sur production.** Ce document prépare le jour où vous l'autoriserez.

## 1. Préconditions

1. Autorisation explicite de l'utilisateur pour appliquer les 22 migrations sur `production`.
2. Compte Neon : branche `production` confirmée (projet `orange-hat-70343865`, US East 2) et branche `production-backup-before-migrations` existante et vérifiée (parent = `production`, 0 table).
3. Ce runbook, lu et compris. **Aucune étape ne doit être exécutée dans le build Vercel.**

## 2. Vérification lecture seule avant migration

Dans la console Neon SQL Editor (lecture seule) :

```sql
SELECT current_database(), current_schema(), version();
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') AS has_prisma_migrations;
SELECT COUNT(*) FROM "User";
```

Valeurs obligatoires avant migration :
- base `neondb`, schéma `public` ;
- `_prisma_migrations` **absente** ;
- aucune table applicative ;
- aucun utilisateur (table `User` absente, donc `COUNT(*)` impossible — utiliser l'existence).

Vérifier aussi la branche de sauvegarde : 0 table, identité confirmée.

## 3. Exécution (sur autorisation distincte uniquement)

Depuis `backend/`, avec un `DATABASE_URL_UNPOOLED` **direct** pointant sur la branche `production` (jamais la pooler, jamais `migration-test`) :

```powershell
# Dans un shell neuf, avec la variable pointant sur l'endpoint DIRECT de production
$env:DATABASE_URL_UNPOOLED = "<endpoint direct production - NE JAMAIS journaliser, NE JAMAIS COMMITTER>"
npx prisma migrate deploy --config prisma7.config.ts
```

Ordre exact attendu des migrations appliquées :

1. `20261111000000_add_refresh_tokens_and_user_is_active`
2. `20261111220000_fix_refresh_token_fk_on_update_cascade`
3. `20261111230000_add_saspay_integration`
4. `20261111233000_fix_saspaytransaction_updatedat_default`

Résultat attendu : `All migrations have been successfully applied.` + exit code 0.

**En cas d'échec** : arrêter, ne pas utiliser `resolve` ni `db push` ni `reset`, ne pas modifier une migration versionnée, ne pas toucher à une autre branche. Restaurer la branche de sauvegarde `production-backup-before-migrations` via la console Neon (restore à partir de cette branche), puis analyser avant toute nouvelle tentative.

## 4. Vérifications après migration

```powershell
npx prisma migrate status --config prisma7.config.ts
# Attendu : Database schema is up to date!

npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --config prisma7.config.ts --exit-code
# Attendu : This is an empty migration. + exit code 0
```

SQL lecture seule (console Neon) :

```sql
-- Registre
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS ok,
       COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS rolled_back,
       COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS unfinished
FROM "_prisma_migrations";
-- Attendu : total=22, ok=21, rolled_back=1, unfinished=0

SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at;

SELECT COUNT(*) AS users FROM "User";                    -- Attendu : 0
SELECT COUNT(*) AS refresh FROM "RefreshToken";         -- Attendu : 0
SELECT COUNT(*) AS saspay FROM "SasPayTransaction";     -- Attendu : 0
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
SELECT typname FROM pg_type WHERE typtype='e' ORDER BY typname;    -- SasPayDirection, SasPayStatus, ...
```

Valeurs obligatoires après migration :
- 22 migrations réussies distinctes, 22 enregistrements physiques, 0 tentative annulée ;
- 21 tables applicatives + `_prisma_migrations` = 22 tables physiques ;
- Tables `RefreshToken` et `SasPayTransaction` présentes et vides ;
- `User.isActive` présent, `DEFAULT true`, `NOT NULL` ;
- `Payment.provider` `DEFAULT 'MANUAL'`, `providerTransactionId` nullable, `commissionBps INT DEFAULT 0` ;
- `CreatorProfile.payoutMsisdn/Network/Country` présents ;
- Enums `SasPayDirection` et `SasPayStatus` créés.

## 5. Création du premier administrateur

Après migration, éventuellement créer le premier compte ADMIN via `scripts/createAdmin.js` en local contre la base de production :

```powershell
$env:NODE_ENV = "production"
$env:DATABASE_URL = "<URL PROD directe ou poolée selon l'OS>"
$env:FILWORK_ADMIN_EMAIL = "<email admin>"
$env:FILWORK_ADMIN_PASSWORD = "<password temporaire>"
node scripts/createAdmin.js
```

**Ne jamais** définir ces variables dans Vercel. Changer le mot de passe temporaire après création. N'utiliser que des comptes de contrôle.

## 6. Rollback

1. Si une erreur se produit **avant** le `commit` de la migration : `restore` depuis `production-backup-before-migrations` via la console Neon.
2. Après migration et avant mise en service : ne pas supprimer la branche de sauvegarde ; conservation indéfinie recommandée.
3. Si en production avec données : restauration ciblée (dump + `pg_restore` vers une branche de sauvegarde
   puis promotion), jamais `migrate reset`.

## 7. SasPay

Les migrations créent les structures SasPay, **elles n'activent pas le paiement**. `SASPAY_ENABLED=false` reste obligatoire ; aucune activation automatique. La mise en production de SasPay exige une mission distincte et un compte marchand vérifié.

# Audit technique du backend FILWORK

## 1. Contexte et état du dépôt

- Dépôt : `Houinsoujonas/FILWORK`
- Branche de travail : `feature/backend-complete-vercel`
- Dernier commit : `bee6f8a` (`test(backend): stabilize integration runner and add utf8/permissions checks`)
- Moteur d'exécution : Node.js 24.15.0 / npm 11.14.0
- Cadre applicatif : Express 5.3.0
- ORM et pilote SQL : Prisma 7.10.1 (`@prisma/client`, `@prisma/adapter-pg`, pilote `pg` 8.23.1)

## 2. Analyse de la configuration PostgreSQL et cause du problème signalé

### Problème rapporté
« La communication frontend → backend fonctionne. C’est PostgreSQL qui bloque : backend/.env contient encore HOST, une valeur d’exemple. »

### Constat technique
1. Le fichier modèle `backend/.env.example` présentait la ligne suivante :
   `DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler/DATABASE?sslmode=require&pgbouncer=true&connection_limit=5`
   Cette ligne contient le placeholder `HOST-pooler`.
2. Sur la machine de développement, `backend/.env` pointait vers l'instance locale PostgreSQL (`127.0.0.1:55432/filwork_dev`) avec `NODE_ENV=development`.
3. Les fichiers `.env` et `.env.test` sont ignorés par Git (`.gitignore`).
4. Lorsque Jonas récupère la branche sur son environnement ou déploie sur Vercel, aucun fichier `.env` n'est importé depuis Git. Si les variables d'environnement de production ne sont pas saisies sur Vercel, ou si une copie brute de `.env.example` contenant `HOST` est injectée, la connexion réseau échoue immédiatement avec l'erreur `getaddrinfo ENOTFOUND HOST-pooler` ou `HOST`.
5. Le code de démarrage (`src/config/productionEnv.js` et `src/config/prisma.js`) est conçu pour exiger une chaîne valide et refuser tout hôte local en production. Le backend ne possède aucune dépendance absolue vers PostgreSQL local : il se connecte à la chaîne fournie par `DATABASE_URL` et `DATABASE_URL_UNPOOLED`.

## 3. Architecture et composants examinés

- `backend/package.json` :
  - `engines` : `node: "24.x"`
  - `scripts.build` : `prisma generate` (exécute la génération du client avec le schéma Prisma)
  - `scripts.start` : `node src/server.js` (démarrage du serveur autonome avec écoute réseau)
- `backend/api/index.js` :
  - Point d'entrée pour Vercel Functions.
  - Valide l'environnement de production (`validateProductionEnvironment()`).
  - Exporte directement l'application Express `app` sans appeler `app.listen()`.
- `backend/vercel.json` :
  - `functions."api/index.js"` : mémoire 512 Mo, durée max 30s.
  - Réécriture `/api/(.*)` vers `/api/index.js`.
  - Cron Vercel programmé sur `/api/internal/cron/daily` à `0 6 * * *`.
- `backend/src/config/prisma.js` :
  - Utilise l'adaptateur `PrismaPg` sur la chaîne `DATABASE_URL`.
  - Met en cache l'instance sur `globalThis` pour optimiser le pooling de connexions en environnement serverless.
- `backend/src/config/databaseTarget.js` :
  - Garde-fou strict interdisant le mélange entre base de test (`filwork_test`) et base applicative (`DATABASE_URL`).
- `backend/prisma7.config.ts` :
  - Configuration Prisma 7 pointant sur `DATABASE_URL_UNPOOLED` pour les commandes de migration CLI.

## 4. Bilan de l'audit
Le code applicatif est sain, modulaire et prêt pour Vercel. Il ne nécessite aucune modification de code fonctionnel, mais requiert la fourniture des variables réelles de production Neon dans le tableau de bord Vercel.

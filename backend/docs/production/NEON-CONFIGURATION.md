# Configuration de la base de données Neon

## 1. Topologie du projet Neon

- Projet : `filwork`
- Base de données : `neondb`
- Région : AWS US East 2 (`us-east-2`, Ohio)
- Branches identifiées dans le projet :
  - `production` (`br-wandering-meadow-b4vnko5f`) : Branche active cible pour la production. Historiquement sans tables applicatives.
  - `migration-test` (`br-jolly-dew-b4ggr9n4`) : Branche de test isolée ayant validé l'application de la chaîne de migrations.
  - `production-backup-before-migrations` (`br-crimson-morning-b4jxxg4x`) : Point de sauvegarde structurel avant migration.

## 2. Les deux chaînes de connexion requises

Neon fournit deux modes de connexion. Pour FILWORK, les deux variables doivent cibler la **même branche** et la **même base** (`neondb`) :

### A. Connexion poolée (`DATABASE_URL`)
Utilisée par le serveur Express et le client Prisma en exécution normale (via `@prisma/adapter-pg`).
Elle passe par le pooler PgBouncer de Neon pour absorber les démarrages serverless sans saturer le nombre de connexions PostgreSQL.

- **Nom d'hôte** : contient le suffixe `-pooler` (exemple : `ep-xxxx-pooler.us-east-2.aws.neon.tech`).
- **Paramètres d'URL obligatoires** :
  - `sslmode=require`
  - `pgbouncer=true`
  - `connection_limit=5`
- **Format attendu** :
  `postgresql://[USER]:[PASSWORD]@[ENDPOINT]-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=5`

### B. Connexion directe non poolée (`DATABASE_URL_UNPOOLED`)
Utilisée exclusivement par Prisma CLI (`prisma migrate deploy`, `prisma migrate status`, `prisma migrate diff`) via le fichier `prisma7.config.ts`.
PgBouncer ne prend pas en charge les commandes de migration complexes (`LISTEN/NOTIFY`, verrous de session, transactions étendues). Une connexion directe est donc obligatoire pour les migrations.

- **Nom d'hôte** : sans `-pooler` (exemple : `ep-xxxx.us-east-2.aws.neon.tech`).
- **Paramètres d'URL** :
  - `sslmode=require`
- **Format attendu** :
  `postgresql://[USER]:[PASSWORD]@[ENDPOINT].us-east-2.aws.neon.tech/neondb?sslmode=require`

## 3. Précautions de sécurité et gestion serverless

- **Gestion des secrets** : Les identifiants (`USER`, `PASSWORD`) ne doivent jamais être inscrits en clair dans le dépôt Git.
- **Réutilisation de connexion** : Dans `src/config/prisma.js`, l'adaptateur et l'instance Prisma sont mémorisés sur `globalThis` afin d'éviter la multiplication des sockets réseau lors des invocations de fonctions Vercel.
- **Mise en veille Neon** : Sur le plan gratuit Neon, le compute se met en veille après inactivité. La première requête HTTP après une mise en veille peut accuser un temps de latence de démarrage (cold start de 1 à 3 secondes).

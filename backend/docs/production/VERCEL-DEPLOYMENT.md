# Configuration et déploiement Vercel du backend FILWORK

## 1. Paramètres du projet Vercel

Lors de la création ou configuration du projet sur Vercel :

- **Framework Preset** : Other
- **Root Directory** : `backend`
- **Node.js Version** : `24.x` (conforme au champ `engines.node` dans `backend/package.json`)
- **Install Command** : `npm ci`
- **Build Command** : `npm run build` (génère le client Prisma via `prisma generate`)
- **Output Directory** : Laisser vide (Vercel Functions utilise la structure `api/`)

## 2. Architecture Serverless

- **Point d'entrée** : `backend/api/index.js`
- **Configuration** : `backend/vercel.json`
  - Alloue 512 Mo de mémoire et 30 secondes de temps d'exécution maximal à `api/index.js`.
  - Réécrit tous les appels `/api/(.*)` vers `api/index.js`.
  - Définit la tâche planifiée quotidienne (`crons`) :
    - Chemin : `/api/internal/cron/daily`
    - Fréquence : `0 6 * * *` (tous les jours à 06:00 UTC)

## 3. Dépouillement des routes et gestion du cycle de vie

- En mode serverless, aucun processus Node.js ne reste actif en permanence.
- Les requêtes entrantes activent la fonction Vercel qui délègue l'exécution à Express.
- La validation des variables d'environnement de production s'exécute à l'initialisation de l'instance via `validateProductionEnvironment()`.
- La connexion à la base de données Neon est réutilisée d'une invocation à l'autre grâce à la persistance du client Prisma sur `globalThis`.

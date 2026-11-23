# Actions réservées à Jonas pour le déploiement Vercel

Ce document répertorie uniquement les opérations qui nécessitent l'accès au compte personnel Vercel ou aux identifiants secrets Neon de Jonas.

---

### Étape 1 : Récupérer les identifiants Neon de la base `production`
1. Connectez-vous à la console Neon (projet `filwork`).
2. Sélectionnez la branche `production` et la base `neondb`.
3. Récupérez les deux chaînes de connexion :
   - **Mode Pooled** : Copiez l'URL contenant `-pooler`.
     Vérifiez qu'elle se termine par `?sslmode=require&pgbouncer=true&connection_limit=5`.
     Ce sera la valeur de `DATABASE_URL`.
   - **Mode Direct (Unpooled)** : Copiez l'URL directe (sans `-pooler`).
     Vérifiez qu'elle comporte `?sslmode=require`.
     Ce sera la valeur de `DATABASE_URL_UNPOOLED`.

---

### Étape 2 : Appliquer les migrations sur la base Neon
Depuis votre terminal local, dans le dossier `backend` :

```powershell
cd backend
$env:DATABASE_URL_UNPOOLED="postgresql://[USER]:[PASS]@[HOST].us-east-2.aws.neon.tech/neondb?sslmode=require"
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
```

*Résultat attendu : « Database is up to date ».*

---

### Étape 3 : Créer le premier compte administrateur sur Neon (optionnel mais recommandé)
Dans le même terminal configuré avec l'accès à la base de production :

```powershell
$env:DATABASE_URL="postgresql://[USER]:[PASS]@[HOST]-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=5"
$env:FILWORK_ADMIN_EMAIL="admin@filwork.fr"
$env:FILWORK_ADMIN_PASSWORD="[VotreMotDePasseTresSecurise]"
node scripts/createAdmin.js
```

---

### Étape 4 : Configurer le projet sur Vercel
1. Rendez-vous sur votre tableau de bord Vercel et importez le dépôt `Houinsoujonas/FILWORK`.
2. Configurez les paramètres généraux :
   - **Root Directory** : cliquez sur *Edit* et sélectionnez `backend`.
   - **Framework Preset** : `Other`.
   - **Build Command** : `npm run build` (activé par défaut).
   - **Install Command** : `npm ci` (ou laisser la valeur par défaut Vercel).
3. Allez dans la section **Environment Variables** et saisissez les valeurs de production :
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = *l'URL poolée Neon obtenue à l'étape 1*
   - `DATABASE_URL_UNPOOLED` = *l'URL directe Neon obtenue à l'étape 1*
   - `JWT_SECRET` = *une clé aléatoire d'au moins 32 caractères*
   - `FRONTEND_URL` = *l'adresse HTTPS de votre frontend (ex: https://filwork.fr)*
   - `CORS_ORIGINS` = *l'adresse HTTPS autorisée (ex: https://filwork.fr)*
   - `CRON_SECRET` = *un mot de passe secret d'au moins 16 caractères pour les crons*
   - `SASPAY_ENABLED` = `false`
   - `STORAGE_PROVIDER` = `none`
   - *(Optionnel si e-mails souhaités)* `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
4. Cliquez sur **Deploy**.

---

### Étape 5 : Vérification post-déploiement
Une fois le déploiement terminé sur Vercel, testez les points de terminaison :

1. **Vérification de base** :
   ```bash
   curl -i https://[VOTRE-DOMAINE-VERCEL]/api/health
   ```
   *Réponse attendue : `200 OK` avec `{"status":"ok",...}`.*

2. **Vérification de la connectivité Neon** :
   ```bash
   curl -i https://[VOTRE-DOMAINE-VERCEL]/api/health/database
   ```
   *Réponse attendue : `200 OK` avec `{"status":"ok","database":"connected",...}`.*

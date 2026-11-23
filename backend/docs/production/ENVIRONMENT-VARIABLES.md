# Référentiel des variables d'environnement de production

Toutes les variables ci-dessous doivent être configurées dans l'interface de Vercel (**Settings** → **Environment Variables**), pour l'environnement **Production** (et Preview si souhaité).

| Variable | Obligatoire | Utilité | Format attendu |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Oui | Définit le mode d'exécution | `production` |
| `DATABASE_URL` | Oui | Connexion poolée Neon (application) | `postgresql://USER:PASS@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=5` |
| `DATABASE_URL_UNPOOLED` | Oui | Connexion directe Neon (migrations CLI) | `postgresql://USER:PASS@HOST.REGION.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Oui | Signature des jetons JWT (min 32 caractères) | Chaîne aléatoire sécurisée de 64 caractères hexadécimaux |
| `JWT_EXPIRES_IN` | Recommandé | Durée de validité du token d'accès | `15m` ou `1d` (défaut : `1d`) |
| `FRONTEND_URL` | Oui | URL HTTPS du client web (sans slash final) | `https://filwork.fr` (ou domaine Vercel du frontend) |
| `CORS_ORIGINS` | Oui | Origines autorisées par le navigateur (HTTPS) | `https://filwork.fr,https://www.filwork.fr` |
| `CRON_SECRET` | Oui | Clé secrète protégeant les endpoints `/api/internal/*` | Chaîne aléatoire d'au moins 16 caractères |
| `EMAIL_OUTBOX_ENABLED` | Recommandé | Active ou désactive le traitement des e-mails | `true` (ou `false` si pas de SMTP configuré) |
| `SMTP_HOST` | Si e-mails actifs | Serveur SMTP transactionnel (ex. Brevo) | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Si e-mails actifs | Port SMTP | `587` |
| `SMTP_SECURE` | Si e-mails actifs | Activation SSL direct | `false` |
| `SMTP_USER` | Si e-mails actifs | Identifiant de connexion SMTP | Chaîne fournie par le prestataire |
| `SMTP_PASS` | Si e-mails actifs | Mot de passe ou clé API SMTP | Chaîne fournie par le prestataire |
| `MAIL_FROM` | Si e-mails actifs | Adresse expéditeur visible | `FILWORK <contact@filwork.fr>` |
| `STORAGE_PROVIDER` | Optionnel | Système de téléversement de fichiers | `none` (défaut) ou `vercel-blob` |
| `BLOB_READ_WRITE_TOKEN`| Si `vercel-blob` | Jeton d'accès au store Vercel Blob | Injecté automatiquement si lié dans Vercel |
| `SASPAY_ENABLED` | Oui | Intégration de paiement SasPay | `false` (les paiements restent manuels) |

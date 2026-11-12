# Opérations de production — FILWORK Backend

> Ce document décrit comment le backend fonctionne en production, ce qui surveille, ce qui est désactivé, ce qui est manuel, et ce qui déclenche une escalade. Il reflète la configuration réelle actuelle.

## 1. Santé du service

- `GET /api/health` → 200 si le processus fonctionne.
- `GET /api/health/database` → 200 si connexion PostgreSQL opérationnelle ; 503 sinon.
- Monitoring Vercel : utiliser ces deux points comme liveness/readiness.

## 2. Cron Vercel quotidien et déclencheur externe

- `vercel.json` versionne : `functions.api/index.js`, rewrites `/api/*`, cron `0 6 * * *` (06:00 UTC) vers `/api/internal/cron/daily`.
- **Le cron quotidien Hobby ne suffit pas pour les e-mails.** Avant l'ouverture aux utilisateurs, configurer un **déclencheur externe toutes les 5 minutes** :
  - `POST https://<domaine-api>/api/internal/cron/process-emails`
  - Header : `Authorization: Bearer <CRON_SECRET>`
  - Vérification de réponse : `200` + alerte sur non-2xx.
  - Fournisseurs : `cron-job.org`, `UptimeRobot`, GitHub Actions.
- Aucune offre payante requise.

## 3. E-mails Brevo

- Tous les e-mails passent par la table `EmailOutbox`.
- Aucun contrôleur n'envoie directement ; l'envoi réel se fait par le déclencheur.
- **Les e-mails ne partent pas sans SMTP configuré.** Pas d'envoi avant `BREVO` vérifié.
- En test (`NODE_ENV=test`), aucun envoi n'est effectué (protection codée).
- En production, le domaine expéditeur vérifié chez Brevo doit correspondre à `MAIL_FROM`.

## 4. SasPay désactivé

- Par défaut : `SASPAY_ENABLED=false`. Même en présence d'une clé API accidentellement configurée, le service reste inactif.
- Toute route/webhook SasPay répond 503 sans contacter SasPay.
- Paiement en production = **manuel** : l'entreprise paie hors plateforme puis déclare le paiement (PLANNED → PENDING → PAID) via les routes FILWORK.
- Les champs `provider`/`providerTransactionId`/`commissionBps` existent pour une future mission distincte ; ils ne déclenchent aucun transfert.

## 5. Paiements manuels — comportement en production

- `COMPANY` propriétaire de la collaboration peut créer et faire transiter le paiement (transitions strictes, `FOR UPDATE`, `updateMany` sur statut attendu).
- `CREATOR` peut consulter, mais **pas** marquer payé.
- Une entreprise tierce ne peut pas intervenir sur un paiement qui ne lui appartient pas.
- Les notifications `PAYMENT_STATUS_UPDATED` sont créées dans la même transaction que la transition validée ; un refus (409/400/403) ne crée aucune notification.
- Aucun transfert financier n'est effectué par FILWORK ; aucun webhook de paiement n'est actif.

## 6. Stockage

- `STORAGE_PROVIDER=none` : aucune URL d'upload n'est acceptée ; aucun fournisseur actif.
- Les livrables et médias sont uniquement des URLs externes, validées côté contrôleur (`https?://…`).
- Aucun fichier n'est conservé par FILWORK.

## 7. Rôles et autorisations

- `CREATOR` : profil, candidatures, livrables, avis, paiements (lecture), notifications, messagerie.
- `COMPANY` : profil, campagnes, candidatures/invitations, collaborations, livrables (examen), déclaration manuelle de paiement, notifications, messagerie.
- `ADMIN` : supervision globale, annonces, protection du dernier ADMIN actif.
- Aucune élévation de privilège possible par défaut ; routes admin sous `requireAdmin` ; routes internes sous Bearer `CRON_SECRET`.

## 8. Sécurité

- JWT HS256, refresh tokens rotatifs avec révocation, `tokenVersion`.
- `helmet()`, CORS limité à la liste HTTPS non locale en production, rate limiting sur les routes sensibles.
- Erreurs de production : corps générique + `requestId` dans l'en-tête et la réponse.
- Logs : aucune adresse e-mail, aucun JWT, aucun mot de passe.
- `JWT_SECRET` ≥ 32 caractères en production.

## 9. Surveillance

- `[EmailOutbox]` : messages `Échec de l'envoi`, `remise en file`. Surveiller dans les logs Vercel.
- Taux d'échec SMTP : après 5 tentatives, l'e-mail est `FAILED` et ne part jamais.
- Latence `/api/health/database` : fuite de connexions si maintenue élevée.
- 4xx/5xx inhabituels ou brute-force sur `/api/auth/login` → bloquer via WAF ou rate-limit additionnel.
- `requestId` dans chaque réponse d'erreur : permet la traçabilité log ↔ client.

## 10. Rollback

- Redéploiement de la dernière version connue bonne via Vercel (Deployments → Redeploy).
- Base de données : voir `docs/production-migration-runbook.md`.
- Variables d'environnement : modifier depuis Vercel Settings → Environment Variables ; redéploiement automatique.
- Ne jamais `migrate reset`, jamais `db push` en production.

## 11. Escalade

| Symptôme | Cause probable | Réponse |
|---|---|---|
| `/api/health/database` = 503 | Neon endpoints suspendus, ou `DATABASE_URL` incorrect | Vérifier env vars Vercel ; réactiver Neon ; vérifier pooler |
| `[EmailOutbox] Échec de l'envoi` | `SMTP_*` incorrect | Vérifier Brevo + `MAIL_FROM` vérifié |
| 401 sur `/api/internal/cron/*` | `CRON_SECRET` absent/trop court | Générer secret ≥ 16, ajouter dans `Authorization: Bearer` |
| 503 sur `process-emails` | idem | idem |
| 401 sur `/api/auth/login` en boucle | brute force | activer WAF/rate-limit supplémentaire |
| 500 immédiat après déploiement | config production invalide | voir logs `[FILWORK] Configuration refusée : …` |

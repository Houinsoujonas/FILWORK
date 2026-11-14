# Déclencheur externe pour la file d'e-mails (5 minutes)

**Objectif** : Vercel Hobby ne permet qu'un seul cron par jour (actuellement `0 6 * * *` → `/api/internal/cron/daily`, nettoyage des jetons + petit lot de mails). Ce rythme **ne suffit pas** pour les e-mails transactionnels (code de réinitialisation : TTL 15 minutes — un e-mail mis en file à 06:05 n'arriverait qu'environ 24 h plus tard).

La production nécessite donc un **déclencheur externe** qui appelle la route de traitement de la file toutes les 5 minutes. **Ce document décrit la configuration à mettre en place — il ne crée aucun service par lui-même.**

## Ce qui doit être configuré

| Élément | Valeur |
|---|---|
| **URL** | `https://<votre-domaine-backend>/api/internal/cron/process-emails` |
| **Méthode** | `POST` ou `GET` (la route accepte les deux — `router.all`) |
| **En-tête** | `Authorization: Bearer <CRON_SECRET>` (secret de l'environnement Vercel, ≥ 16 caractères) |
| **Fréquence** | Toutes les 5 minutes |
| **Timeout attendu** | < 10 s (budget 30 s, `maxDuration: 30` dans `vercel.json`) |
| **Réponse attendue** | HTTP 200 `{ "success": true, "processed": <nombre> }` |
| **Échec attendu** | HTTP 401 si le secret est absent/invalide ; HTTP 503 si `CRON_SECRET` non configuré côté Vercel |

## Options de service (aucune à souscrire en dehors de ce document)

### Option 1 — GitHub Actions (gratuit pour dépôt public, quota mensuel pour privé)

Fichier `.github/workflows/email-cron.yml` dans le dépôt (exemple à adapter) :

```yaml
name: email-outbox-5min

on:
  schedule:
    - cron: "*/5 * * * *"   # toutes les 5 minutes, UTC
  workflow_dispatch: {}      # déclenchement manuel pour tester

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger EmailOutbox processing
        run: |
          http_code=$(curl -s -o response.json -w "%{http_code}" \
            -X POST "https://<votre-domaine-backend>/api/internal/cron/process-emails" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}")
          cat response.json
          echo "HTTP ${http_code}"
          test "$http_code" = "200"
```

- Ajouter le secret `CRON_SECRET` dans **Settings → Secrets and variables → Actions** du dépôt GitHub — identique à celui de Vercel.
- GitHub Actions peut avoir un jitter sur les schedules ; pour les codes de réinitialisation (TTL 15 min) c'est généralement acceptable mais pas garanti au déclenchement le plus proche. Surveillance recommandée.

### Option 2 — cron-job.org (offre gratuite, pas de carte bancaire)

1. Créer un compte sur cron-job.org.
2. Créer un cronjob : URL `https://<votre-domaine-backend>/api/internal/cron/process-emails`, schedule `*/5 * * * *`, méthode `POST`.
3. Ajouter le header `Authorization: Bearer <CRON_SECRET>` dans les options avancées.
4. Activer les notifications en cas d'échec.

### Option 3 — UptimeRobot (offre gratuite ~5 min d'intervalle)

Monitor HTTP(s), intervalle 5 minutes, en-tête `Authorization: Bearer`. Utile comme solution simple ; l'intervalle peut varier selon l'offre.

### Option 4 — VPS / machine toujours allumée (cron système)

Si une machine est déjà disponible :

```cron
*/5 * * * * curl -fsS -X POST https://<votre-domaine-backend>/api/internal/cron/process-emails -H "Authorization: Bearer $CRON_SECRET"
```

**Ne créez pas de machine payante pour cela.** Aucune offre payante n'est requise.

## Ce qui reste géré par Vercel Hobby (sans service externe)

- `0 6 * * *` → `/api/internal/cron/daily` : nettoyage des jetons expirés (`cleanupExpiredTokens`) **plus** un petit passage dans la file d'e-mails (3 e-mails max par exécution) — en secours, jamais comme mécanisme principal.

## Vérification après mise en place

1. Déclenchement manuel : `curl -X POST https://<votre-domaine-backend>/api/internal/cron/process-emails -H "Authorization: Bearer <CRON_SECRET>"` → `{ "success": true, "processed": <n> }`.
2. Dashboard du service choisi : historique 200 OK.
3. Côté base (production uniquement, jamais `filwork_test`) : `SELECT status, count(*) FROM "EmailOutbox" GROUP BY status;` — la file `PENDING` diminue, `SENT` augmente.
4. End-to-end : inscription d'un compte de test en production (e-mail réel d'activation) → l'e-mail arrive en moins de 5–10 minutes.

## Sécurité

- `CRON_SECRET` n'est jamais exposé côté client, jamais commité, jamais affiché dans les logs. Le logger structuré enregistre uniquement un `code` (`CRON_TOKEN_INVALID`) — jamais la valeur.
- En l'absence de `CRON_SECRET`, les routes répondent **503** (pas de chute en ouvert).
- `Authorization` est comparé en temps constant (`crypto.timingSafeEqual`).
- Les e-mails vers des domaines réservés aux tests (`example.com`, `filwork.local`, `localhost`, etc.) sont **refusés par le worker** — ils n'atteignent jamais un relais SMTP.
- En `NODE_ENV=test`, l'envoi SMTP est complètement désactivé.

## Coût

0 €. Aucune souscription n'est nécessaire ; ne pas en créer.

## Automatisation autorisée

La livraison automatique des e-mails **ne fonctionne pas** tant que ce déclencheur externe n'est pas configuré. Le reste de l'application fonctionne normalement (notifications in-app, sauf e-mails).
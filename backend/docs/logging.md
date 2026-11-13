# Journalisation structurée

> État au 2026-11-12.

Le backend FILWORK utilise depuis la mission de finalisation un logger structuré JSON Lines via `src/utils/logger.js`, compatible Vercel Logs.

## Format

Chaque entrée est une ligne JSON avec les champs :
- `level` : `error` / `warn` / `info` / `debug`
- `timestamp` : ISO 8601 (UTC)
- `message` : libellé court (jamais de secret)
- `code` : code interne additionnel (optionnel, jamais de PII)
- `method`, `path`, `status`, `errorCode`, `name` si applicable (erreurs requête)

## Comportements

### Authentification (`src/middlewares/authMiddleware.js`)
- Token invalide/expiré → `warn` `AUTH_TOKEN_INVALID`.
- Token révoqué → `warn` `AUTH_TOKEN_REVOKED`.
- Compte désactivé → `warn` `AUTH_USER_DISABLED`.

### Administration (`src/middlewares/adminMiddleware.js`)
- Rôle non-ADMIN sur route admin → `warn` `ADMIN_ACCESS_DENIED` (avec `role` exposé pour debug, jamais de PII/token).

### Routes internes (`src/routes/internalRoutes.js`)
- `CRON_SECRET` absent/trop court → `error` `CRON_SECRET_MISSING`.
- Bearer token manquant/invalide → `warn` `CRON_TOKEN_INVALID`.

### Gestion des erreurs HTTP (`src/middlewares/errorMiddleware.js`)
- Toute réponse générée par le middleware d'erreur émet un événement structuré `error`/`warn` avec code `UNHANDLED_ERROR`/`REQUEST_ERROR` incluant requestId.

## Garanties de confidentialité

- Aucun token (JWT) n'est jamais journalisé.
- Aucun mot de passe n'est jamais journalisé.
- Aucune adresse e-mail n'est journalisée.
- Aucun secret d'environnement n'est journalisé.

## Mode silencieux

En production, seuls `warn` et `error` sont émis par `requestIdMiddleware`.
Pour activer les logs `info`/`debug`, définir `LOG_LEVEL=info` (en local uniquement ; ne pas définir en production sauf besoin ponctuel).

## Test

```sh
curl -i -X POST https://<domaine-api>/api/auth/login -d '{"email":"wrong@example.com","password":"x"}' -H 'Content-Type: application/json'
```

Vous devez voir un log JSON sur la sortie du serveur (ou dans Vercel Logs sous `Levels: warn`).

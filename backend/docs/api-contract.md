# Contrat API FILWORK

Ce document décrit le contrat réellement exposé par le backend, vérifié
contre les contrôleurs et les réponses de la base de test locale.

- Base locale de test : `http://localhost:5051`
- Préfixe : `/api`
- Format : JSON UTF-8
- Authentification : `Authorization: Bearer <jwt>`

## 1. Conventions

### Succès

La majorité des réponses contient `success: true`. Les listes exposent
`count` et, selon les routes, `total`, `page`, `limit`, `totalPages` ou
`pagination`.

### Erreur

```json
{
  "success": false,
  "message": "Message lisible par l'utilisateur."
}
```

Codes utilisés :

| Code | Signification |
| --- | --- |
| 400 | Données invalides, champ inconnu, paramètre incorrect |
| 401 | Jeton absent, invalide, expiré ou révoqué |
| 403 | Rôle insuffisant ou ressource appartenant à un autre compte |
| 404 | Ressource inexistante ou non visible |
| 409 | Conflit métier (doublon, statut incompatible, transition refusée) |
| 429 | Limite de requêtes atteinte |
| 500 / 503 | Erreur serveur ou base indisponible |

### Rôles

- `CREATOR` : créer un profil créateur, candidater, répondre aux invitations,
  consulter ses collaborations, soumettre des livrables, répondre aux avis.
- `COMPANY` : gérer ses campagnes, consulter l'annuaire, inviter, traiter les
  candidatures, créer livrables et paiements, clôturer ou annuler, publier un
  avis.
- `ADMIN` : consulter les statistiques et les listes de la plateforme.

Le rôle est toujours lu depuis le jeton, jamais depuis le corps de la requête.

### Montants et dates

- Les montants (`budget`, `startingRate`, `amount`, `proposedAmount`) sont
  sérialisés en **chaînes décimales** par Prisma (`"250000"`).
- Les dates sont des chaînes ISO 8601 (`"2026-11-02T20:41:36.186Z"`).
- Les devises sont des codes à trois lettres (`XOF`, `EUR`, `USD`).

---

## 2. Authentification

### `POST /api/auth/register`

Public. Limité en production.

```json
{
  "email": "vous@exemple.com",
  "password": "motdepasse8+",
  "role": "CREATOR"
}
```

`role` accepte uniquement `CREATOR` ou `COMPANY`.

Réponse `201` :

```json
{
  "success": true,
  "message": "Votre compte a été créé avec succès.",
  "user": { "id": "...", "email": "...", "role": "CREATOR", "createdAt": "..." },
  "token": "<jwt>"
}
```

> L'inscription ne crée **aucun profil**. Le frontend doit appeler
> `PUT /api/profile/me` juste après pour fournir `displayName` (créateur) ou
> `companyName` (entreprise).

### `POST /api/auth/login`

Public. Limité en production.

```json
{ "email": "vous@exemple.com", "password": "motdepasse8+" }
```

Réponse `200` : même forme que l'inscription (`user`, `token`).

### `GET /api/auth/me`

Authentifié. Réponse : `{ success, message, user }`.

### `POST /api/auth/logout`

Authentifié. Révoque le jeton courant. Réponse `{ success, message }`.

### `POST /api/auth/forgot-password`

Public. Corps : `{ email }`. La réponse ne révèle pas si le compte existe.

### `POST /api/auth/reset-password`

Public. Corps : `{ token, password }` (le jeton est celui reçu par e-mail).

---

## 3. Profils

### `GET /api/profile/me`

Authentifié. Retourne l'utilisateur et son profil selon le rôle :

```json
{
  "success": true,
  "user": { "id": "...", "email": "...", "role": "CREATOR", "createdAt": "..." },
  "profile": { "...": "creatorProfile ou companyProfile, ou null" }
}
```

Le profil créateur inclut `creatorSocials` et `portfolioItems`.

### `PUT /api/profile/me`

Authentifié. Crée ou met à jour le profil du rôle courant.

Champs créateur autorisés :

`displayName`, `bio`, `niche`, `location`, `profileImageUrl`, `mediaKitUrl`,
`instagramUrl`, `tiktokUrl`, `youtubeUrl`, `country`, `city`, `startingRate`,
`rateCurrency`, `availabilityStatus`.

Champs entreprise autorisés :

`companyName`, `industry`, `description`, `websiteUrl`, `logoUrl`, `location`,
`contactEmail`, `contactPhone`, `country`, `city`.

Règles :

- `displayName` / `companyName` obligatoires.
- `availabilityStatus` : `AVAILABLE`, `LIMITED`, `UNAVAILABLE`.
- `rateCurrency` : trois lettres.
- Les URL doivent être `http` ou `https`.
- Tout champ inconnu provoque une erreur `400`.

Réponse : `{ success, message, profile }`.

### Réseaux sociaux (créateur)

- `GET /api/profile/me/socials` → `{ success, socials }`
- `POST /api/profile/me/socials`
  Corps : `{ platform, profileUrl, followerCount? }`
  `platform` ∈ `INSTAGRAM`, `TIKTOK`, `YOUTUBE`, `LINKEDIN`, `FACEBOOK`,
  `TWITCH`.
- `PUT /api/profile/me/socials/:socialId`
- `DELETE /api/profile/me/socials/:socialId`

### Portfolio (créateur)

- `GET /api/profile/me/portfolio` → `{ success, items }`
- `POST /api/profile/me/portfolio`
  Corps : `{ type, title, description?, url, campaignName? }`
  `type` ∈ `IMAGE`, `VIDEO`, `LINK`.
- `PUT /api/profile/me/portfolio/:itemId`
- `DELETE /api/profile/me/portfolio/:itemId`

---

## 4. Campagnes

### `GET /api/campaigns`

Public. Campagnes `PUBLISHED` uniquement.

Paramètres : `search`, `platform`, `location`, `minBudget`, `maxBudget`,
`page` (défaut 1), `limit` (défaut 20, max 100).

Réponse :

```json
{
  "success": true,
  "count": 2,
  "total": 2,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "campaigns": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "objectives": "...",
      "deliverables": "...",
      "location": "...",
      "platforms": ["INSTAGRAM"],
      "budget": "250000",
      "currency": "XOF",
      "startDate": null,
      "endDate": null,
      "status": "PUBLISHED",
      "publishedAt": "...",
      "companyProfile": {
        "id": "...",
        "companyName": "...",
        "logoUrl": null,
        "location": "..."
      }
    }
  ]
}
```

### `GET /api/campaigns/:id`

Public. Retourne uniquement une campagne `PUBLISHED`.

Réponse `{ success, campaign }`, avec en plus pour `companyProfile` :
`description`, `country`, `city`, `websiteUrl`. Une campagne brouillon,
suspendue, clôturée ou inexistante renvoie `404`.

### `GET /api/campaigns/my-campaigns`

`COMPANY`. Toutes les campagnes de l'entreprise connectée.
Réponse `{ success, count, campaigns }`.

### `POST /api/campaigns`

`COMPANY`. Corps :

`title` (obligatoire, ≤ 200), `description` (obligatoire), `objectives?`,
`deliverables?`, `location?`, `platforms?` (tableau), `budget?`, `currency?`,
`startDate?`, `endDate?`.

La campagne est créée en `DRAFT`.

### `PUT /api/campaigns/:id`

`COMPANY`, propriétaire uniquement. Mêmes champs que la création.

### Actions de statut

- `PATCH /api/campaigns/:id/publish` : `DRAFT`/`PAUSED` → `PUBLISHED`.
- `PATCH /api/campaigns/:id/pause` : `PUBLISHED` → `PAUSED`.
- `PATCH /api/campaigns/:id/close` : `DRAFT`/`PUBLISHED`/`PAUSED` → `CLOSED`.
- `DELETE /api/campaigns/:id` : brouillon sans candidature uniquement.

---

## 5. Annuaire des créateurs

### `GET /api/creators`

`COMPANY`.

Paramètres : `search`, `niche`, `location`, `platform`, `availabilityStatus`,
`minRate`, `maxRate`, `minFollowers`, `page`, `limit` (défaut 12, max 50).

Réponse : `{ success, count, total, page, limit, totalPages, creators }`.

Chaque créateur contient : `id`, `displayName`, `bio`, `niche`, `location`,
`country`, `city`, `profileImageUrl`, `mediaKitUrl`, `startingRate`,
`rateCurrency`, `availabilityStatus`, `createdAt`, `creatorSocials`,
`portfolioItems`.

### `GET /api/creators/:id`

`COMPANY`. Réponse `{ success, creator }` avec les mêmes relations, plus
`updatedAt` et `createdAt` sur les réseaux.

---

## 6. Candidatures

### `POST /api/applications/:campaignId`

`CREATOR`. Corps : `{ message? }` (≤ 5000). Le profil créateur doit exister et
la campagne doit être `PUBLISHED`.

Réponse `201` : `{ success, message, application }`.

### `GET /api/applications/my-applications`

`CREATOR`. Réponse `{ success, count, applications }`.

### `GET /api/applications/campaigns/:campaignId`

`COMPANY`, propriétaire de la campagne.
Réponse `{ success, campaign, count, applications }`.

### `PATCH /api/applications/:applicationId/status`

`COMPANY`. Corps : `{ status: "ACCEPTED" | "REJECTED", amount? }`.

`amount` est obligatoire et strictement positif pour une acceptation. Une
acceptation crée la collaboration.

### `PATCH /api/applications/:applicationId/withdraw`

`CREATOR`. Retire sa propre candidature encore `PENDING`.
Réponse `{ success, message, application }`.

---

## 7. Invitations

### `POST /api/campaigns/:campaignId/invitations`

`COMPANY`, propriétaire d'une campagne `PUBLISHED`. Corps :

```json
{
  "creatorProfileId": "...",
  "message": "Optionnel",
  "proposedAmount": 150000,
  "currency": "XOF"
}
```

`proposedAmount` doit être strictement positif.

### `GET /api/invitations/received`

`CREATOR`. Réponse `{ success, count, invitations }`.

### `GET /api/invitations/sent`

`COMPANY`. Réponse `{ success, count, invitations }`.

### `PATCH /api/invitations/:invitationId/respond`

`CREATOR`. Corps : `{ status: "ACCEPTED" | "REJECTED" }`.
Une acceptation crée la collaboration.

### `PATCH /api/invitations/:invitationId/withdraw`

`COMPANY`. Retire une invitation encore `PENDING`.

---

## 8. Collaborations

Statuts : `ACTIVE`, `COMPLETED`, `CANCELLED`.

### `GET /api/collaborations`

Authentifié. Retourne les collaborations de l'utilisateur, quelle que soit
l'origine (candidature acceptée ou invitation acceptée).
Réponse `{ success, count, collaborations }`.

Chaque collaboration inclut :

- `application` ou `invitation` avec le créateur et la campagne ;
- `deliverables` (ordre chronologique) ;
- `payments` (ordre antéchronologique).

### `GET /api/collaborations/:id`

Authentifié, participants uniquement. Réponse `{ success, collaboration }`.

### `PATCH /api/collaborations/:id/complete`

`COMPANY` participante. Passe la collaboration `ACTIVE` → `COMPLETED`.
Idempotent si déjà clôturée. Réponse `{ success, message, collaboration }`.

### `PATCH /api/collaborations/:id/cancel`

Participant. Corps :

- entreprise : `{ reason: "motif obligatoire" }`
- créateur : `{ reason? }` uniquement s'il n'a soumis aucun livrable et
  qu'aucun paiement n'est en attente ou payé.

Réponse `{ success, message, collaboration }`.

---

## 9. Livrables

### `POST /api/deliverables/collaborations/:collaborationId`

`COMPANY` participante. Corps : `{ title, description?, dueDate? }`.
La collaboration doit être `ACTIVE`.

### `GET /api/deliverables/collaborations/:collaborationId`

Participants. Réponse `{ success, count, deliverables }`.

### `PATCH /api/deliverables/:id/submit`

`CREATOR` participant. Corps : `{ assetUrl }` (URL obligatoire, ≤ 2000).
Statuts autorisés : `PENDING` ou `REVISION_REQUESTED`.

### `PATCH /api/deliverables/:id/review`

`COMPANY` participante. Corps :

```json
{ "status": "APPROVED" | "REVISION_REQUESTED", "feedback": "..." }
```

`feedback` obligatoire pour une demande de révision.

---

## 10. Paiements

Statuts : `PLANNED`, `PENDING`, `PAID`, `FAILED`, `CANCELLED`.

### `POST /api/payments/collaborations/:collaborationId`

`COMPANY` participante. Corps : `{ amount, currency?, dueDate?, notes? }`.
Créé en `PLANNED`.

### `GET /api/payments/collaborations/:collaborationId`

Participants. Réponse `{ success, count, totalPaid, payments }`.

### `PATCH /api/payments/:id/status`

`COMPANY` participante. Corps : `{ status, reference?, notes? }`.

Transitions autorisées :

- `PLANNED` → `PENDING`, `CANCELLED`
- `PENDING` → `PAID`, `FAILED`, `CANCELLED`
- `FAILED` → `PENDING`, `CANCELLED`

Le passage à `PAID` exige une référence et notifie le créateur.

---

## 11. Notifications

### `GET /api/notifications`

Authentifié. Réponse :

```json
{
  "success": true,
  "count": 5,
  "unreadCount": 2,
  "notifications": [
    {
      "id": "...",
      "collaborationId": "...",
      "type": "PAYMENT_STATUS_UPDATED",
      "title": "...",
      "message": "...",
      "isRead": false,
      "readAt": null,
      "createdAt": "...",
      "application": null,
      "invitation": null
    }
  ]
}
```

### `PATCH /api/notifications/:id/read`

Marque une notification comme lue.

### `PATCH /api/notifications/read-all`

Marque toutes les notifications comme lues.

---

## 12. Avis

### `GET /api/reviews`

Public. Paramètres : `creatorProfileId`, `companyProfileId`,
`collaborationId`, `page`, `limit` (max 100).

Réponse : `{ success, count, total, page, limit, totalPages, reviews }`.

Chaque avis inclut `companyProfile`, `creatorProfile`, `response` (ou `null`)
et `collaboration` (`id`, `status`, `startDate`, `endDate`).

### `GET /api/reviews/:id`

Public. Réponse `{ success, review }`.

### `POST /api/reviews`

`COMPANY`. Corps : `{ collaborationId, rating, comment }`.

- collaboration `COMPLETED` uniquement ;
- entreprise participante uniquement ;
- `rating` entier de 1 à 5 ;
- un seul avis par collaboration.

### `POST /api/reviews/:id/response`

`CREATOR` destinataire de l'avis. Corps : `{ content }`. Une seule réponse.

### `PATCH /api/reviews/:id/response`

`CREATOR` auteur de la réponse. Corps : `{ content }`.

---

## 13. Administration

Toutes les routes exigent `ADMIN`.

- `GET /api/admin/dashboard` → `{ success, message, stats }`
- `GET /api/admin/users?role=&search=&page=&limit=`
- `GET /api/admin/campaigns?status=&search=&page=&limit=`
- `GET /api/admin/collaborations?status=&origin=&search=&page=&limit=`
- `GET /api/admin/deliverables?status=&search=&page=&limit=`
- `GET /api/admin/payments?status=&origin=&search=&page=&limit=`

Les listes paginées renvoient :

```json
{
  "success": true,
  "count": 20,
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 },
  "users": []
}
```

La clé de collection varie : `users`, `campaigns`, `collaborations`,
`deliverables`, `payments`.

---

## 14. Points d'intégration frontend

1. **Inscription** : `POST /api/auth/register` puis `PUT /api/profile/me`.
2. **Session** : conserver `token` puis vérifier avec `GET /api/auth/me`.
3. **Profil incomplet** : `PUT /api/profile/me` crée le profil ; c'est le
   mécanisme normal après inscription.
4. **Campagne publique** : utiliser `GET /api/campaigns/:id` (nouvel endpoint).
5. **Détail créateur** : `GET /api/creators/:id` est réservé aux entreprises.
   Un visiteur non connecté doit être invité à se connecter.
6. **Montants** : convertir avec `Number(...)` pour l'affichage, renvoyer des
   nombres ou des chaînes numériques dans les corps de requête.
7. **Candidature** : exige un profil créateur existant.
8. **Invitation** : exige le `creatorProfileId` renvoyé par l'annuaire.
9. **Collaboration** : toujours recharger après une action de statut.
10. **Erreurs** : afficher `data.message` ; ne jamais masquer un `403`.

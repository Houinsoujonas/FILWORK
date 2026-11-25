# Matrice frontend et API

Cette matrice compare les appels présents dans `src/` avec les routes montées
par `backend/src/app.js` et leurs contrôleurs. « Connecté » décrit le code
frontend, pas une validation avec une base de test.

| Fonctionnalité | Endpoint(s) backend | Méthodes | État frontend |
| --- | --- | --- | --- |
| Inscription et connexion | `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout` | POST, GET | Connecté, renouvellement rotatif ajouté |
| Mot de passe | `/api/auth/forgot-password`, `/api/auth/reset-password` | POST | Connecté |
| Profil créateur et entreprise | `/api/profile/me` | GET, PUT | Connecté |
| Réseaux sociaux créateur | `/api/profile/me/socials`, `/api/profile/me/socials/:socialId` | GET, POST, PUT, DELETE | Lecture via le profil, ajout, modification et suppression dans l’interface |
| Portfolio créateur | `/api/profile/me/portfolio`, `/api/profile/me/portfolio/:itemId` | GET, POST, PUT, DELETE | Lecture via le profil, ajout, modification et suppression dans l’interface |
| Campagnes publiques et entreprise | `/api/campaigns`, `/api/campaigns/:id`, `/api/campaigns/my-campaigns` | GET | Connecté |
| Création et gestion des campagnes entreprise | `/api/campaigns`, `/api/campaigns/:id`, `/api/campaigns/:id/{publish,pause,close}` | POST, PUT, PATCH, DELETE | Connecté selon les actions offertes par l’API |
| Annuaire créateurs | `/api/creators`, `/api/creators/:id` | GET | Connecté, accès réservé à `COMPANY` par le backend |
| Candidatures | `/api/applications/:campaignId`, `/api/applications/my-applications`, `/api/applications/campaigns/:campaignId`, `/api/applications/:applicationId/{status,withdraw}` | GET, POST, PATCH | Connecté selon le rôle et la propriété vérifiés côté backend |
| Invitations | `/api/campaigns/:campaignId/invitations`, `/api/invitations/{received,sent}`, `/api/invitations/:invitationId/{respond,withdraw}` | GET, POST, PATCH | Connecté |
| Collaborations | `/api/collaborations`, `/api/collaborations/:id`, `/api/collaborations/:id/{complete,cancel}` | GET, PATCH | Connecté |
| Livrables | `/api/deliverables/collaborations/:collaborationId`, `/api/deliverables/:id/{submit,review}` | GET, POST, PATCH | Connecté |
| Paiements manuels | `/api/payments/collaborations/:collaborationId`, `/api/payments/:id/status` | GET, POST, PATCH | Connecté, aucun transfert de fonds exécuté par le frontend |
| Notifications | `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all` | GET, PATCH | Connecté |
| Préférences de communication | `/api/preferences` | GET, PATCH | Connecté |
| Annonces publiques et administration | `/api/announcements`, `/api/admin/announcements` et actions par identifiant | GET, POST, PATCH | Connecté |
| Tableau de bord administrateur | `/api/admin/dashboard` | GET | Connecté aux statistiques du backend |
| Comptes administrateur | `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/:id/{deactivate,reactivate}` | GET, PATCH | Recherche, changement de rôle et état du compte connectés |
| Listes administrateur | `/api/admin/campaigns`, `/api/admin/applications`, `/api/admin/collaborations`, `/api/admin/deliverables`, `/api/admin/payments` | GET | Lecture connectée, candidatures filtrées par statut et recherche |
| Avis et réponses | `/api/reviews`, `/api/reviews/:id`, `/api/reviews/:id/response` | GET, POST, PATCH | Connecté |
| Upload d’images | `/api/uploads` | POST | Connecté pour la photo du créateur, le logo d’entreprise et les réalisations de type image ; disponibilité conditionnée au fournisseur configuré côté backend |
| Gestion administrative des candidatures | `/api/admin/applications` | GET | Lecture ADMIN avec filtres de statut, recherche et pagination. La route ne permet pas de prendre une decision |
| SasPay | Routes backend présentes, désactivation contrôlée côté backend | — | Non appelé par le frontend, conformément au périmètre |

Les listes de campagnes, créateurs, candidatures, collaborations, livrables,
paiements, annonces et notifications sont chargées depuis l’API. Les tableaux
de bord affichent des états d’erreur séparés d’une réponse vide. Les sections
éditoriales et les illustrations statiques du site ne sont pas des données
métier.

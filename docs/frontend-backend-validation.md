# Validation frontend et backend

État de l’audit local au 16 novembre 2026. Ce rapport décrit le code et les
tests exécutés dans le dépôt. Il ne valide aucun déploiement distant.

## Résultats

| Domaine | État | Preuve ou réserve |
| --- | --- | --- |
| Client API centralisé | VALIDÉ | `VITE_API_URL`, proxy Vite, JSON, réponses vides, délais, erreurs réseau, Bearer, renouvellement après 401 et déduplication GET couverts par les tests frontend. |
| Build frontend | VALIDÉ | `npm run build` réussit. Vite signale un chunk `HeroScene` de 532 Ko minifié. |
| Tests frontend | VALIDÉ | `npm test` : 24 tests réussis, aucun échec ni test ignoré. |
| Lint ciblé | VALIDÉ | ESLint passe sur les pages modifiées, le contrôleur/routes admin et les tests adaptés. |
| Lint global | VALIDÉ AVEC RÉSERVES | `npm run lint` trouve 11 erreurs préexistantes dans `sasPayController.js`, `uploadRoutes.js`, `services/storage/index.js`, `campaign-notifications.test.js` et `payment-permissions.test.js`. Ces fichiers ne font pas partie des changements de reconnexion. |
| Contrats API backend | VALIDÉ | Les routes montées, rôles, méthodes et paramètres utilisés sont récapitulés dans `frontend-backend-matrix.md` et `backend/docs/api-contract.md`. |
| Tests API avec rôles | VALIDÉ | `npm run test:integration` sur PostgreSQL temporaire isolé : 90 réussis, 0 échec, 0 ignoré. Le serveur a été démarré en mode test, e-mails désactivés, stockage `none`. |
| Tests HTTP backend | VALIDÉ | `npm test` : 22 réussis. |
| Limitation de débit | VALIDÉ | Limiteurs général 2/2 et public 3/3 avec URL PostgreSQL de test locale. Les appels de données qui nécessitent la base indisponible restent refusés sans faire échouer le test de limite. |
| Comptes fictifs côté frontend | VALIDÉ PAR INSPECTION | Les vues métier principales lisent l’API. Aucun tableau de créateurs, entreprises ou campagnes de démonstration détecté. Les tableaux statiques vérifiés sont des filtres, étapes éditoriales, catégories de métiers ou illustrations. |
| Statistiques ADMIN | VALIDÉ | Le contrôleur calcule chaque compteur depuis PostgreSQL. Les compteurs sont donc nuls si les tables correspondantes sont vides. |
| SasPay, SMTP et paiement | VALIDÉ AVEC RÉSERVES | Aucun paiement réel ni envoi SMTP effectué. Tests de désactivation SasPay 6/6 ; tests EmailOutbox 4/4. |
| Stockage de fichiers | VALIDÉ AVEC RÉSERVES | Validation de fichiers 17/17. Envoi d’une image de test sur l’API locale : `/api/uploads` renvoie 503 `STORAGE_NOT_CONFIGURED` avec `STORAGE_PROVIDER=none`. Aucun stockage distant activé. |
| Serveur frontend local | VALIDÉ | Le 16 novembre 2026, `http://127.0.0.1:5173/createurs` répond HTTP 200. Le proxy `/api/health` échoue tant que le backend local n’est pas démarré. |
| Frontend vers backend | VALIDÉ | API locale démarrée avec une base PostgreSQL jetable migrée ; `/api/health` répond via le proxy Vite et `/api/health/database` confirme `connected` et `ready`. |
| Liste publique vide | VALIDÉ | `GET /api/campaigns?page=1&limit=10` via Vite renvoie `total: 0` et `campaigns: []` sur la base jetable vide. |
| Autorisation CREATOR / COMPANY | VALIDÉ | Deux comptes d’essai enregistrés dans la base jetable : `GET /api/creators` renvoie 403 au créateur et 200 avec `total: 0` à l’entreprise. |
| Autorisation ADMIN | VALIDÉ | Compte ADMIN de test créé dans la base jetable puis authentifié via `/api/auth/login` ; `/api/admin/dashboard` et `/api/admin/applications` répondent 200. CREATOR et COMPANY reçoivent 403 sur `/api/admin/dashboard`. |
| Cycle de session | VALIDÉ | Appels réels sur la base jetable : inscription CREATOR, connexion, rotation du refresh token, `/api/auth/me`, déconnexion, puis rejet du jeton révoqué (401). |
| Notifications et préférences | VALIDÉ | Compte neuf : notifications avec `unreadCount: 0`, lecture des préférences puis modification réussie de `collaborationEmails` via PATCH. |
| Réseaux sociaux et portfolio | VALIDÉ | Sur un profil CREATOR de test : création, lecture, modification et suppression d’un réseau social et d’un élément portfolio via les routes `/profile/me/socials` et `/profile/me/portfolio`. |
| Cycle campagne et candidature | VALIDÉ | Après complétion des profils COMPANY et CREATOR, le backend accepte la création/publication, la candidature, l’acceptation à 15 000 XOF et crée une collaboration ACTIVE. Les deux contrôles de profil incomplet ont d’abord répondu par un refus métier attendu. |
| Inspection visuelle | NON VALIDÉ | Le navigateur accessible via l’outil d’inspection a expiré. Aucune capture fiable desktop/mobile n’a été obtenue. |
| Parcours frontend complets par rôle | VALIDÉ AVEC RÉSERVES | Les tests backend vérifient l’authentification, les refus inter-rôles, la propriété et plusieurs cycles métier. Les formulaires et transitions ne sont pas tous exécutés dans un navigateur E2E. |
| Configuration de production | NON VALIDÉ | L’URL HTTPS réelle du backend et le domaine frontend de production ne sont pas fournis. Aucun paramètre distant n’a été modifié. |

## Connexion frontend

Le client partagé se trouve dans `src/lib/api.js`. En développement, Vite relaie
`/api` vers l’origine indiquée par `VITE_API_URL`, avec `http://localhost:5000`
comme valeur locale par défaut. En preview et production, le client exige une
URL HTTPS. Aucun secret backend n’est utilisé dans le bundle frontend.

Le client transmet les jetons Bearer. Il tente un renouvellement rotatif après
un 401, efface la session si le renouvellement échoue, ne renouvelle pas après
un 403 et rejoue une seule fois la requête. Les requêtes GET identiques en cours
sont partagées.

## Routes principales relevées

| Espace | Fonctionnalités reliées |
| --- | --- |
| CREATOR | `/api/auth/*`, `/api/profile/me`, `/api/profile/me/socials`, `/api/profile/me/portfolio`, `/api/campaigns`, `/api/applications/*`, `/api/invitations/received`, `/api/collaborations`, `/api/deliverables/*`, `/api/payments/*`, `/api/notifications`, `/api/preferences`, `/api/uploads`. |
| COMPANY | `/api/profile/me`, `/api/campaigns/my-campaigns`, `/api/campaigns`, `/api/creators`, `/api/applications/campaigns/:campaignId`, `/api/campaigns/:campaignId/invitations`, `/api/invitations/sent`, `/api/collaborations`, `/api/deliverables/*`, `/api/payments/*`, `/api/notifications`, `/api/preferences`, `/api/uploads`. |
| ADMIN | `/api/admin/dashboard`, `/api/admin/users`, `/api/admin/campaigns`, `/api/admin/applications`, `/api/admin/collaborations`, `/api/admin/deliverables`, `/api/admin/payments`, `/api/admin/announcements`. |

L’administration des candidatures est en lecture seule : `GET
/api/admin/applications` prend en charge pagination, statut et recherche. Le
backend ne fournit pas de mutation de statut destinée aux administrateurs ; les
décisions restent dans le flux entreprise.

## Changements liés à la validation

Les tests backend de santé, cache Prisma et limiteurs utilisaient un ancien
chemin Windows absolu. Ils résolvent maintenant le dossier backend depuis
`__dirname`. Trois affectations d’environnement redondantes ont aussi été
retirées. Les vues de listes distinguent désormais les erreurs API d’une liste
vide, afin de ne pas présenter une panne comme une absence de données.

Les fonctionnalités de profil, campagnes, candidatures, invitations,
collaborations, livrables, paiements, notifications, préférences et annonces
utilisent les routes recensées. Le nouveau formulaire d’upload couvre la photo
du créateur, le logo d’entreprise et les réalisations image. Sa disponibilité
dépend du fournisseur de stockage configuré côté backend.

## À terminer avant validation complète

- Renseigner localement une base de développement isolée et non la base de
  l’application avant de démarrer le backend en mode développement.
- Fournir l’URL HTTPS de l’API et les origines frontend prévues pour vérifier la
  configuration Preview/production.
- Refaire une inspection visuelle desktop et mobile quand l’outil navigateur
  sera disponible.
- Ajouter ou exécuter des parcours E2E navigateur couvrant inscription,
  connexion, restauration de session, actions de chaque rôle et états d’erreur.
- Décider si l’administration doit pouvoir modifier le statut des candidatures.
  Cela demanderait d’abord un contrat backend explicite et justifié.

Aucun push, merge, déploiement, changement de variables distantes, migration de
la base applicative, envoi SMTP ou transaction réelle n’a été effectué.

L’instance PostgreSQL jetable utilisée pour les contrôles en direct a été arrêtée puis supprimée après les essais. Les serveurs locaux de test ont aussi été arrêtés.

# Stockage de fichiers

## État actuel

FILWORK n'accepte **aucun fichier binaire en upload**. Tous les médias sont des **URL** fournies par les utilisateurs/entreprises :

- `CreatorProfile.profileImageUrl`, `mediaKitUrl`, `instagramUrl`, `tiktokUrl`, `youtubeUrl`
- `CompanyProfile.logoUrl`, `websiteUrl`
- `Campaign` : pas de champ image
- `Deliverable.assetUrl`
- `CreatorSocial.profileUrl`
- `PortfolioItem.url`

Aucun avatar n'est reçu via `multipart/form-data`, aucun champ `File` n'existe dans le schéma, aucun endpoint d'upload n'est exposé. Le backend valide déjà les URL saisies côté client (syntaxe `https?://…`).

## Limites du modèle actuel

- URL externes : les utilisateurs doivent héberger eux-mêmes leurs images/vidéos ou utiliser un CDN tiers.
- Pas de contrôle du contenu réel, pas de validation de taille ou de type de fichier, pas de suppression de fichiers orphelins.
- Pour des livrables professionnels, un stockage géré est recommandé.

## Options comparées (sans engagement)

| Critère | Vercel Blob | Cloudinary | S3 compatible |
| - | - | - | - |
| Coût | Offre gratuite généreuse (1 Go), puis payant | Plan gratuit généreux (25 crédits/mois) | Variable selon fournisseur |
| Upload côté client | SDK officiel `@vercel/blob` | SDK officiel | SDK AWS ou compatible |
| CDN/transformations | Intégrées (image optimization) | Très complètes | Via CloudFront/CDN |
| Auth d'accès | Tokens serveur, URLs publiques signées ou publiques | Publics/privés via signature | IAM, URLs signées |
| Adapté Vercel | Natif | Bon | Bon |

Recommandation : **Vercel Blob** (natif avec Vercel Functions, aucune infrastructure à gérer) ou **Cloudinary** (transformations d'images automatiques) si le budget le permet. Les deux exigent un compte externe — aucune décision n'est imposée par le code.

## Abstraction fournie

`src/services/storage/index.js` expose :
- `validateImageUpload({ contentType, sizeBytes })` — valide type (jpeg/png/webp/gif) et taille (défaut 5 Mo, `STORAGE_MAX_UPLOAD_BYTES`).
- `isConfigured()` — `true` si `STORAGE_PROVIDER != none`.
- `getStorageProvider()` — lève une erreur explicite tant que le fournisseur n'est pas installé (SDK ajouté au `package.json` au moment du choix).

Le jour du choix :
1. Installer le SDK (`@vercel/blob` ou `@aws-sdk/client-s3`).
2. Renseigner `STORAGE_PROVIDER`, `STORAGE_TOKEN`, éventuellement `STORAGE_BASE_URL`.
3. Implémenter dans `getStorageProvider()` le wrapper `upload/delete/getUrl` au contrat défini.
4. Ajouter des routes d'upload (`POST /api/uploads` en multipart via `multer`), avec contrôle d'accès selon le rôle.

## Sécurité

- Validation stricte du type MIME et de la taille (déjà prête dans le service).
- Nom de fichier généré côté serveur (UUID), jamais le nom fourni par le client.
- URLs publiques non listables ; liens signés pour les documents privés (contrats, factures).
- Suppression des fichiers orphelins lors de la suppression du compte.
- Pas de stockage local éphémère : tout doit vivre dans le fournisseur choisi (Vercel Functions ne conserve rien entre invocations).

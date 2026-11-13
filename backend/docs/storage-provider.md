# Stockage de fichiers

## État actuel

FILWORK écoute une route **`POST /api/uploads`** (authentifiée) qui accepte une image encodée en base64 (`{ filename, data }`). La route :
- valide l'authentification ;
- valide le type MIME (jpeg/png/webp/gif) et la taille ;
- délègue à un fournisseur via `STORAGE_PROVIDER` ;
- retourne l'URL publique une fois uploadée.

**Par défaut** : `STORAGE_PROVIDER=none` → la route renvoie `503 STORAGE_NOT_CONFIGURED`. Aucun upload n'est accepté. Les médias existants restent des URLs externes fournies côté client.

Aucun SDK n'est encore installé côté backend, car **`@vercel/blob@2.9.0` dépend d'une chaîne `@vercel/oidc → @vercel/cli-config → zod <4.6.6` avec une vulnérabilité HIGH** (GHSA-mrhx-c7xc-m3w5). Voir `npm audit`.

## Variables d'environnement prévues

| Variable | Défaut | Rôle |
|---|---|---|
| `STORAGE_PROVIDER` | `none` | `none` \| `vercel-blob` \| `s3` |
| `STORAGE_TOKEN` | — | Token du fournisseur. Obligatoire si provider != `none`. |
| `STORAGE_BASE_URL` | — | Préfixe public éventuel des URLs |
| `STORAGE_MAX_UPLOAD_BYTES` | `5242880` (5 Mo) | Taille maximale par image |

## Roadmap d'activation

1. Attendre la publication d'une version de `@vercel/blob` ne tirant pas une versions vulnérable de `zod` (<4.6.6).
2. `npm install @vercel/blob` ; valider avec `npm audit` → 0 vulnérabilité.
3. Définir `STORAGE_PROVIDER=vercel-blob` + `STORAGE_TOKEN=<token Vercel Blob>` dans Vercel.
4. Tester `POST /api/uploads` avec une image jpeg ≤ 5 Mo.
5. Documenter chaque URL publiée dans les champs `creatorProfile.mediaKitUrl`, `profileImageUrl`, `CompanyProfile.logoUrl`, `portfolioItems.url`.

## Sécurité

- Validation MIME uniquement image/*.
- Taille max 5 Mo par défaut (`STORAGE_MAX_UPLOAD_BYTES`).
- `uploadImage`/`deleteImage` sont isolées dans `src/services/storage/index.js` et paramétrables.
- Aucun fichier n'est conservé par FILWORK ; chaque image est hébergée par le fournisseur configuré.
- `validateImageUpload` est testée.

- `CreatorProfile.profileImageUrl`, `mediaKitUrl`, `instagramUrl`, `tiktokUrl`, `youtubeUrl`
- `CompanyProfile.logoUrl`, `websiteUrl`
- `Campaign` : pas de champ image
- `Deliverable.assetUrl`
- `CreatorSocial.profileUrl`
- `PortfolioItem.url`

Aucun avatar n'est reçu via `multipart/form-data`, aucun champ `File` n'existe dans le schéma, aucun endpoint d'upload n'est exposé. Le backend valide déjà les URL saisies côté client (syntaxe `https?://…`).

## Limites du modèle (avant activation du provider)

- Aucun fichier n'est accepté tant que `STORAGE_PROVIDER=none`.
- Les utilisateurs doivent fournir des URLs déjà hébergées ailleurs (CDN tiers) tant que `/api/uploads` n'est pas activée.
- Une fois le provider activé, la route `/api/uploads` retourne 201 avec `{url, pathname}`.

## Fournisseur recommandé

**Vercel Blob** (natif avec Vercel Functions, aucun serveur supplémentaire) ou **Cloudinary** (transformations d'images intégrées).
- Actuellement aucun fournisseur installé pour éviter d'injecter une version npm contenant une vulnérabilité.
- Activation future dès publication d'une version sûre de `@vercel/blob`.

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

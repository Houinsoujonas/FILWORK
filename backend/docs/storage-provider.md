# Stockage de fichiers (Vercel Blob)

**État 2026-11-14 : fournisseur intégré et testé hors ligne. Pas encore activé en réel.**

FILWORK accepte des images téléchargées via **`POST /api/uploads`** (JWT requis) ou des URL
externes saisies côté client (champs `http(s)?://…` existants). La route upload :

- exige une authentification (`authenticateToken`) ;
- valide le type MIME déclaré (jpeg/png/webp/gif uniquement) ;
- valide la taille (max 5 Mo par défaut, `STORAGE_MAX_UPLOAD_BYTES`) ;
- valide la **signature binaire** (magic bytes) du contenu décodé ;
- valide le nom de fichier (aucun chemin, aucune traversée, ≤ 180 caractères) ;
- délègue au fournisseur configuré via `STORAGE_PROVIDER`.

**Défaut** : `STORAGE_PROVIDER=none` → la route répond `503 STORAGE_NOT_CONFIGURED`.
Aucun fichier n'est accepté tant que le fournisseur n'est pas configuré.
C'est volontaire : la fonctionnalité est prête à activer, jamais à moitié ouverte.

## Fournisseur retenu : Vercel Blob

Choix retenu après analyse des options (2026-11) :

| Option | Pour | Contre |
|---|---|---|
| **Vercel Blob** | Natif Vercel Functions/OIDC (pas de secret à gérer), CDN intégré, aucun serveur tiers, coût d'usage faible à ce stade, delete sans frais | Compte Vercel nécessaire, URLs publiques pour médias publics |
| S3 compatible (AWS/R2/Backblaze) | Écosystème le plus riche, contrôle fin IAM | Plus de configuration (IAM, bucket, région, CORS), pas d'OIDC natif Vercel |
| Cloudinary | Transformations d'images intégrées (resize/crop) | Vendor lock-in, coût, complexité inutile pour des images de profil/campagne |

Décision : **Vercel Blob, store public**, adapté aux avatars, logos, images de campagnes et
médias publiés par l'application. L'authentification se fait **à l'upload** (route protégée) ;
la consultation des URLs publiques est libre par nature (contenu déjà destiné au public).

## SDK et sécurité des dépendances

`@vercel/blob@^2.9.0` est installé (dépendance directe de `backend/package.json`).

Chaîne résolue : `@vercel/blob@2.9.0 → @vercel/oidc@3.8.10 → @vercel/cli-config@0.3.1 → zod@4.1.11` (vulnérable, GHSA-mrhx-c7xc-m3w5).

Le dépôt applique donc un **`overrides`** npm ciblé (`package.json`) :

```json
"overrides": { "@vercel/cli-config": "0.4.0" }
```

→ `@vercel/cli-config@0.4.0 → zod@4.6.7` (**corrigé**). `npm audit` : **0 vulnérabilité**.
Le SDK charge et fonctionne (exports `put`/`del` vérifiés) ; la suite `storage-vercel-blob`
vérifie le comportement par injection d'un faux SDK (aucune requête réseau réelle dans les tests).

Si `npm audit` redevient rouge après une mise à jour future de `@vercel/blob`, ne pas déployer :
options — réinstaller une version saine, ou revenir temporairement à `STORAGE_PROVIDER=none`.

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `STORAGE_PROVIDER` | `none` | `none` \| `vercel-blob` |
| `BLOB_READ_WRITE_TOKEN` | — | Token statique du store (env Production/Preview selon choix). Préférer OIDC quand le store est **lié** au projet Vercel |
| `STORAGE_TOKEN` | — | Alias rétro-compatible accepté (même usage que `BLOB_READ_WRITE_TOKEN`) |
| `STORAGE_BASE_URL` | — | Préfixe public éventuel (information, non utilisé par le SDK v2) |
| `STORAGE_MAX_UPLOAD_BYTES` | `5242880` | Taille maximale par image |

**Authentification, dans l'ordre de résolution du SDK :**

1. **OIDC automatique** — store Vercel Blob lié au projet (Vercel injecte `BLOB_STORE_ID`,
   `VERCEL_OIDC_TOKEN`, `BLOB_WEBHOOK_PUBLIC_KEY`) : rien à configurer, rotation automatique,
   pas de secret longue durée. **Recommandé.**
2. **Token statique** — `BLOB_READ_WRITE_TOKEN` (ou `STORAGE_TOKEN`) ; généré depuis le store
   (dashboard Vercel → Blob → « Add a read-write token env var to this connection »).
   Réservé aux environnements hors-Vercel et aux besoins de client-upload.
3. Aucune des deux → `503 STORAGE_NOT_CONFIGURED` (erreur explicite, aucune écriture).

## État réel (vérifié 2026-11-14)

| Élément | État |
|---|---|
| SDK installé, audit npm propre | ✅ |
| Route `POST /api/uploads` | ✅ implémentée, authentifiée, testée (401/400/413/503/201) |
| Validation MIME + magic bytes + nom de fichier | ✅ testée (`tests/storage-validation.test.js`) |
| Adaptateur Vercel Blob (`put`/`del`) | ✅ implémenté, testé avec SDK simulé (`tests/storage-vercel-blob.test.js`) |
| Store Vercel Blob réel créé / lié au projet | ❌ **non fait — action humaine** |
| `BLOB_READ_WRITE_TOKEN` (ou liaison OIDC) en Preview/Production Vercel | ❌ **non fait — action humaine** |
| Test réel : upload → lecture de l'URL publique → delete → URL morte | ❌ **non fait — après liaison du store** |

**Tests automatisés** : `storage-vercel-blob.test.js` vérifie l'appel SDK (URL, pathname,
`addRandomSuffix`), la traduction d'erreur upstream en 502 `STORAGE_UPSTREAM_ERROR`, le delete
via `sdk.del`, le rejet d'URL non-HTTPS (400 `STORAGE_INVALID_URL`) et l'échec `503` en l'absence
d'authentification. **Ces tests ne créent aucun blob réel.**

## Activation (checklist)

1. Dashboard Vercel → projet `filwork-backend` → Storage → Create Database → **Blob**.
2. Choisir un **nom** (ex. `filwork-media`) et une **région proche** des Functions (`fra1` recommandé).
3. **Connect** le store au projet, environnements Production + Preview.
4. Soit laisser OIDC agir (par défaut à la liaison), soit générer `BLOB_READ_WRITE_TOKEN`
   et l'ajouter dans Settings → Environment Variables (Production + Preview).
5. Ajouter `STORAGE_PROVIDER=vercel-blob` (Production + Preview) — **pas** en Development si
   vous voulez garder `none` en local.
6. Redéployer, puis exécuter le **test réel** (image JPEG ≤ 5 Mo) :
   ```
   POST /api/uploads
   Authorization: Bearer <jeton d'un compte de l'environnement cible>
   Content-Type: application/json

   { "filename": "smoke.jpg", "data": "data:image/jpeg;base64,<…>" }
   ```
   → `201 { success: true, url, pathname }` ; ouvrir `url` dans un navigateur ;
   → `deleteImage(url)` (script d'admin) ou test manuel ; `url` doit expirer en 404.
7. Relever les consommations du store (operations, storage, bandwidth) après 7 jours.

## Sécurité

- MIME + magic bytes + taille + nom validés **avant** tout appel réseau.
- `addRandomSuffix: true` : noms uniques, aucun écrasement accidentel ; chemins d'origine conservés immuables.
- Aucun accès public au bucket en listage : seules les URLs complètes sont consommables.
- Erreurs upstream encapsulées (`502 STORAGE_UPSTREAM_ERROR`) — jamais de fuite de token/corps dans la réponse ni les logs.
- 5 Mo max par image, 8 Mo de JSON utile, compteurs de rate limit appliqués à `/api/*`.
- Les tokens restent hors dépôt (`.env.example` ne contient que des placeholders).

## Limites connues

- **Pas de endpoint public DELETE** : la suppression existe côté serveur (`deleteImage`), sans
  exposition REST — volontairement. Retirer l'image de profil ne supprime pas encore l'objet du store.
- **Fichiers orphelins** : si un upload réussit puis que l'utilisateur abandonne le formulaire,
  le blob reste (pas de lien bidirectionnel DB↔blob). À traiter avant la mise en production publique
  si le volume devient significatif (endpoint de republication / tâche de GC).
- **Aucune image de campagne** n'existe dans le schéma Prisma (champs URL seulement pour
  avatars/logo/socials/portfolio/deliverable). L'upload s'adresse aux images ; pas encore aux PDF.
- Aucun chargement de documents sensibles (contrats, factures) : reviendrait à un store **privé**
  ou à des URLs signées — non prévu dans cette itération.

## Problèmes connus

- Le README historique mentionnait des endpoints multipart : **supprimé** — la route est en JSON base64,
  pas en multipart (pas de dépendance `multer`).
- `STORAGE_BASE_URL` est documenté pour traçabilité ; le SDK v2 n'en dépend pas.

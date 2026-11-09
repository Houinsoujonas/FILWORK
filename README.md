# FILWORK

FILWORK met en relation les créateurs et les entreprises autour de campagnes et de collaborations. L’application comprend un site public, un annuaire, des pages de campagne, l’authentification et des espaces dédiés aux rôles.

## Démarrage

Installez les dépendances et lancez le serveur Vite :

```sh
npm install
npm run dev
```

Ouvrez l’adresse locale affichée par Vite.

## Environnements API

Le serveur Vite proxifie `/api` vers `http://localhost:5000` par défaut, l’API de développement branchée sur la base applicative (`backend/.env`, démarrée par `npm run dev` dans `backend/`).

Pour travailler sur la base de test isolée, démarrez `npm run start:test` dans `backend/` (port `5051`) puis lancez Vite avec :

```sh
VITE_API_PROXY_TARGET=http://localhost:5051 npm run dev
```

Sous PowerShell :

```powershell
$env:VITE_API_PROXY_TARGET="http://localhost:5051"; npm run dev
```

La base de test n’est jamais utilisée par défaut : elle sert uniquement aux tests automatisés et aux vérifications locales explicites.

## Commandes

- `npm run dev` lance le serveur de développement.
- `npm run build` génère la version de production dans `dist/`.
- `npm run preview` sert la version de production localement.
- `npm run lint` vérifie le code avec ESLint.

## Organisation

- `src/Pages/` regroupe les pages et les vues.
- `src/Components/` regroupe les composants réutilisables.
- `src/assets/` contient les images, vidéos et autres médias importés par l’application.
- `public/` contient les ressources servies directement, dont le logo et le favicon.
- `src/App.jsx` définit les routes ; `src/main.jsx` démarre React.
- `src/index.css` est le point d’entrée des styles : il importe les feuilles des pages et composants, puis définit les règles globales et les ajustements communs.
- `src/styles/finitions.css` est chargée juste après `index.css` (dans `src/main.jsx`) : elle porte les finitions de la refonte visuelle (rythme des sections, aperçu produit du hero, cartes créateur, pied de page, contact, 404, inscription) et prime sur les couches précédentes.
- `src/Pages/AppData.css` regroupe les composants des espaces connectés (panneaux, statistiques, listes, formulaires, notifications).
- `src/App.css` reste volontairement vide afin d’éviter une seconde couche de styles globaux.

Les choix de couleurs, de typographie, d’interaction et de médias sont décrits dans [`docs/IDENTITE_VISUELLE.md`](docs/IDENTITE_VISUELLE.md).

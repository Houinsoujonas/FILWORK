# FILWORK

FILWORK met en relation les créateurs et les entreprises autour de campagnes et de collaborations. L’application comprend un site public, un annuaire, des pages de campagne, l’authentification et des espaces dédiés aux rôles.

## Démarrage

Installez les dépendances et lancez le serveur Vite :

```sh
npm install
npm run dev
```

Ouvrez l’adresse locale affichée par Vite.

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
- `src/index.css` est le point d’entrée unique des styles : il importe les feuilles des pages et composants, puis définit les règles globales et les ajustements communs.
- `src/App.css` reste volontairement vide afin d’éviter une seconde couche de styles globaux.

Les choix de couleurs, de typographie, d’interaction et de médias sont décrits dans [`docs/IDENTITE_VISUELLE.md`](docs/IDENTITE_VISUELLE.md).

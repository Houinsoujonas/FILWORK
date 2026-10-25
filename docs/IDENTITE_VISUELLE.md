# Identité visuelle FILWORK

## Intention

L’interface aide les créateurs et les entreprises à comprendre rapidement les campagnes, les profils et les prochaines étapes. Chaque écran suit une hiérarchie simple : un titre explicite, un contexte bref, une action principale identifiable, puis les détails utiles. Les vues restent cohérentes avec leur usage, du site public aux formulaires et espaces de travail.

## Couleurs et typographie

- Fond général ivoire : `#f6f5f0` ; surfaces de contenu blanches : `#ffffff`.
- Texte principal presque noir : `#171814` ; texte secondaire : `#62645d`.
- Accent vert doux : `#d5f36a`, réservé aux repères et aux mises en évidence courtes.
- Les sections peuvent reprendre les accents doux du visuel FILWORK : bleu `#5d79c7`, violet `#806db8`, corail `#dc896a`, rose `#d990aa`, vert `#91ad63` et jaune `#d5b15d`.
- Choisir une seule couleur secondaire par section, en petite touche sur une icône, un repère, une illustration ou un détail de carte. Garder les fonds ivoire ou blancs et les textes en encre sombre ; ne pas utiliser ces accents pour colorer de longs paragraphes ou remplacer les couleurs de statut.
- Les grandes sections peuvent recevoir une teinte pastel associée : bleu très clair pour le fonctionnement, corail pâle pour les campagnes, lavande pour les catégories, vert pâle pour les entreprises et jaune doux pour l’appel à l’action. Les pages Créateur et À propos suivent la même alternance, avec des surfaces blanches pour les cartes et les formulaires.
- L’espace Entreprise conserve son fond clair ; son en-tête et ses actions utilisent des nuances vertes et bleues discrètes pour distinguer les groupes d’actions.
- Les couleurs de statut restent sémantiques et conservent un contraste suffisant.
- Manrope sert aux titres ; Inter sert au texte courant, aux champs et aux contrôles.
- Les titres restent courts et hiérarchisés. Les paragraphes gardent une largeur de lecture modérée et un contraste net.

## Surfaces, images et mouvements

Les cartes utilisent une bordure discrète, un fond clair et une ombre légère. Les arrondis restent réguliers et ne masquent pas la structure des formulaires ou des tableaux. Les photos illustrent le contexte du bloc — profil, campagne ou équipe — avec un cadrage adapté ; elles ne remplacent pas les titres ni les informations.

La vidéo d’ambiance de l’appel à l’action reste muette, en boucle et recouverte d’un voile clair pour préserver la lisibilité du texte. Les animations respectent `prefers-reduced-motion`.

## Boutons et survol

Chaque bouton possède une bordure visible, un libellé lisible au repos, une hauteur cohérente et un état clavier `:focus-visible`. L’action principale utilise un fond presque noir et un texte blanc. Les actions secondaires utilisent un fond blanc, une bordure grise et un texte sombre. Au survol, le fond et la bordure évoluent légèrement sans réduire le contraste du texte. Les contrôles désactivés sont visiblement inactifs.

## Styles dans le projet

- `src/main.jsx` charge `src/index.css`, point d’entrée CSS de l’application.
- `src/index.css` importe les feuilles des pages et composants avant les règles communes.
- `src/App.css` ne porte aucun style afin d’éviter les thèmes globaux concurrents.
- Toute nouvelle règle globale est ajoutée à `src/index.css` ; une règle locale reste limitée à son composant ou à sa page.

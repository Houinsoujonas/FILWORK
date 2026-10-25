# Identité visuelle FILWORK

## Intention

L’interface aide créateurs et entreprises à comprendre rapidement les campagnes, les profils et les prochaines étapes. Chaque écran garde une hiérarchie simple : titre explicite, contexte bref, action principale identifiable, puis détails utiles. Les vues restent cohérentes avec leur usage, qu’il s’agisse du site public, d’un formulaire ou d’un espace de travail.

## Couleurs et typographie

- Fond général ivoire : `#f6f5f0` ; surfaces de contenu blanches : `#ffffff`.
- Texte principal presque noir : `#171814` ; texte secondaire : `#62645d`.
- Accent vert doux : `#d5f36a`, réservé aux repères et aux mises en évidence courtes.
- Les couleurs de statut restent sémantiques et conservent un contraste suffisant.
- Manrope sert aux titres ; Inter sert au texte courant, aux champs et aux contrôles.
- Les titres sont courts et hiérarchisés. Les paragraphes privilégient une largeur de lecture modérée et un contraste net.

## Surfaces, images et mouvements

Les cartes utilisent une bordure discrète, un fond clair et une ombre légère. Les arrondis sont réguliers et ne masquent pas la structure des formulaires ou des tableaux. Les photos illustrent le contexte du bloc (profil, campagne, équipe) avec un cadrage adapté ; elles ne remplacent pas les titres ou informations. La vidéo d’ambiance de l’appel à l’action reste muette, en boucle et recouverte d’un voile clair pour préserver le contraste du texte. Les animations respectent `prefers-reduced-motion`.

## Boutons et survol

Chaque bouton a une bordure visible, un libellé lisible sans survol, une hauteur cohérente et un état clavier `:focus-visible`. L’action principale utilise un fond presque noir et un texte blanc. Les actions secondaires utilisent un fond blanc, une bordure grise et un texte sombre. Au survol, la bordure et le fond changent légèrement ; le texte conserve son contraste. Les contrôles désactivés sont visiblement inactifs et ne donnent pas l’impression d’être cliquables.

## Styles dans le projet

`src/main.jsx` charge `src/index.css`, seul point d’entrée CSS. Celui-ci importe les feuilles des pages et composants avant d’appliquer les variables et règles communes. `src/App.css` ne porte aucun style afin d’éviter les thèmes globaux concurrents. Toute nouvelle règle globale est ajoutée à `src/index.css` ; une règle locale reste limitée à son composant ou sa page.

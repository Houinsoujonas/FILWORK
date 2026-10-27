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

Les cartes utilisent une bordure discrète, un fond clair et une ombre légère. Les arrondis restent réguliers et ne masquent pas la structure des formulaires ou des tableaux. Les photos illustrent le contexte du bloc — profil, campagne ou équipe — avec un cadrage adapté ; elles ne remplacent pas les titres ni les informations. Une photo sombre appelle un texte clair ; une photo claire appelle un texte sombre. Un voile n’est ajouté que si le contraste de l’image ne suffit pas.

### Direction artistique

FILWORK montre des collaborations réelles et accessibles : créateurs, marques, équipes et coulisses de production. La photographie reste la matière principale ; la 3D et les illustrations ponctuent le parcours quand elles expliquent une idée ou donnent du rythme. Les accents vert citron et les tons pastel existants servent de lien entre les médias, sans recolorer toute une image ni ajouter des bandeaux systématiques.

- **Accueil** : une image forte pour l’idée de collaboration, puis des visuels distincts pour les campagnes, les entreprises et les catégories.
- **Créateurs** : portraits, portfolios et gestes de production ; éviter de reprendre les mêmes photos que l’accueil.
- **Entreprises** : briefs, produits et équipes en préparation de campagne.
- **À propos** : équipe FILWORK identifiée et crédits exacts ; distinguer les personnes qui développent la plateforme de celles qui représentent Clemiz Agency.
- **Connexion et inscription** : une seule identité de marque visible par écran ; les images accompagnent le formulaire et ne dupliquent pas le logo.
- **Vidéo et animation** : lecture muette, boucle seulement si le mouvement apporte quelque chose, image de remplacement disponible, chargement différé hors du premier écran et respect de `prefers-reduced-motion`.

Chaque visuel doit avoir une fonction unique dans le parcours. Réutiliser un fichier est acceptable seulement si le contexte et le cadrage sont réellement différents ; sinon, choisir un autre média. Les images de personnes ne doivent pas laisser croire à un partenariat, un témoignage ou une équipe qui n’existe pas.

### Inventaire des médias actuellement référencés

| Fichier | Usage repéré | Vérification à conserver |
| --- | --- | --- |
| `hero1.jpg`, `entr.jpg` | À propos ; `entr.jpg` aussi dans la section Entreprises | `entr.jpg` est réutilisé entre deux pages ; attribuer une image distincte à À propos lors de la prochaine sélection. |
| `creator.jpg`, `creat2.jpg`, `creat3.jpg` | Hero et galerie de la page Créateurs ; galerie de la section créateurs sur l’accueil | Répétitions entre accueil et page Créateurs, à éliminer en attribuant les visuels à un seul emplacement. |
| `creat4.jpg` | Galerie de la section créateurs sur l’accueil | Vérifier la pertinence de l’image (capture d’un profil social) avant de la garder comme image éditoriale. |
| `hero2a.jpg`, `hero3.jpg`, `hero4.jpg` | Étapes de fonctionnement | Visuels dédiés à cette séquence. |
| `camp.jpg` | Campagnes à la une | Visuel dédié à la section campagnes. |
| `cat1.jpg` à `cat6.jpg` | Catégories de créateurs | Série dédiée au carrousel des catégories. |
| `connect.jpg` | Page de connexion | Visuel de formulaire ; vérifier qu’il ne duplique pas l’image d’inscription. |
| `collaboration.mp4` | Fond de l’appel à l’action | Vidéo fournie par le client, 640 × 640, 8,9 s ; piste audio retirée pour un fond muet. |
| `equipe/*` | Portraits de l’équipe projet et identité Clemiz Agency | Images fournies pour la page À propos. |

**État de provenance :** les chemins des fichiers locaux sont recensés, mais les pages d’origine, les photographes et les licences des photos déjà présentes ne sont pas documentés dans le dépôt. Ne pas présenter ces fichiers comme venant d’Unsplash, Pexels, Burst ou Nappy sans retrouver leur page source. Les fichiers `creator.jpg`, `creat2.jpg`, `creat3.jpg` et `creat4.jpg` restent employés à la fois sur l’accueil et la page Créateurs dans des blocs distincts ; prévoir des images de remplacement avant de revendiquer l’absence totale de doublons. Ajouter à chaque nouvel asset une ligne de registre avec URL source, auteur, licence, date de vérification, usage et texte alternatif. Pour les photos d’équipe, obtenir l’accord des personnes avant publication.

### Sources et conditions d’utilisation

- [Unsplash — licence](https://unsplash.com/license) : usage commercial permis sous conditions ; ne pas compiler les images pour bâtir un service concurrent. Vérifier aussi les droits des personnes, marques et œuvres visibles.
- [Pexels — licence](https://www.pexels.com/license/) : photos et vidéos utilisables gratuitement, attribution facultative ; pas de fausse approbation par une personne ou une marque photographiée.
- [Burst by Shopify — conditions](https://www.shopify.com/stock-photos/legal/terms) : usage gratuit commercial et non commercial, modification autorisée, attribution encouragée ; pas de revente du contenu non modifié.
- [Nappy — licence](https://nappy.co/license/) : photos sous CC0 selon les conditions publiées par Nappy ; crédit recommandé. Vérifier l’étiquette de licence de chaque contenu et ne pas republier les fichiers comme une banque d’images.
- [unDraw — licence](https://undraw.co/license) : usage commercial autorisé ; pas de redistribution en packs ni d’utilisation pour entraîner des systèmes d’IA.
- [Storyset — FAQ](https://storyset.com/faqs) et [conditions](https://storyset.com/terms) : les illustrations gratuites demandent un crédit Storyset ; suivre les conditions liées à chaque téléchargement.
- [Humaaans](https://www.humaaans.com/) : bibliothèque d’illustrations à consulter pour des compositions modulaires ; vérifier la licence affichée au moment du téléchargement et consigner le crédit éventuel.

Ces pages de licence sont des repères de production, pas une garantie de droits sur les personnes, marques ou objets représentés. Revérifier les conditions au moment d’intégrer chaque média.

La vidéo d’ambiance de l’appel à l’action reste muette, en boucle et recouverte d’un voile clair pour préserver la lisibilité du texte. Les animations respectent `prefers-reduced-motion`.

## Boutons et survol

Chaque bouton possède une bordure visible, un libellé lisible au repos, une hauteur cohérente et un état clavier `:focus-visible`. L’action principale utilise un fond presque noir et un texte blanc. Les actions secondaires utilisent un fond blanc, une bordure grise et un texte sombre. Au survol, le fond et la bordure évoluent légèrement sans réduire le contraste du texte. Les contrôles désactivés sont visiblement inactifs.

## Styles dans le projet

- `src/main.jsx` charge `src/index.css`, point d’entrée CSS de l’application.
- `src/index.css` importe les feuilles des pages et composants avant les règles communes.
- `src/App.css` ne porte aucun style afin d’éviter les thèmes globaux concurrents.
- Toute nouvelle règle globale est ajoutée à `src/index.css` ; une règle locale reste limitée à son composant ou à sa page.

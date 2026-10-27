# Rapport d’audit visuel FILWORK

**Date :** 27 octobre 2026  
**Périmètre :** médias locaux référencés, sections publiques, animations et provenance connue.

## Changements réalisés

- Retrait de la section complète `CreatorSection` dans la page Créateurs : elle répétait le même contenu, les mêmes cartes et les mêmes images déjà présentés sur l’accueil. La page conserve son hero, ses étapes, ses domaines, son guide et sa galerie dédiée.
- Remplacement de la galerie de la page Créateurs par trois photos distinctes sur cette page, sans répéter l’image du hero dans sa galerie.
- Intégration de la vidéo fournie dans la section d’appel à l’action. Sa piste audio a été retirée : le fichier final `src/assets/collaboration.mp4` fait environ 783 Ko au lieu de 4,1 Mo pour l’ancienne vidéo de cette section.
- Suppression de l’ancien `src/assets/video.mp4`, devenu inutilisé après remplacement.
- Mise à jour de la charte dans `IDENTITE_VISUELLE.md` : direction artistique, règle de contraste selon la luminosité, rôle des médias par page, inventaire et liens vers les licences des sources recommandées.

## Direction artistique retenue

Garder la photographie au service des personnes et des collaborations réelles. Utiliser la 3D déjà présente dans le hero pour illustrer les idées et réserver les illustrations à des explications où elles apportent davantage de clarté qu’une photo. Employer les vidéos comme ambiance discrète, avec texte contrasté, audio désactivé et mouvement réduit respecté. Le vert citron reste un accent de marque ; les couleurs secondaires restent ponctuelles et les bandeaux ne sont utilisés que si l’image ne permet pas une lecture nette.

## Points à suivre

- Les photos `creator.jpg`, `creat2.jpg`, `creat3.jpg` et `creat4.jpg` apparaissent encore sur l’accueil et la page Créateurs dans des sections différentes. Le doublon de section a été supprimé ; ces images partagées devront être remplacées par des visuels distincts pour atteindre la règle « aucun visuel répété sur la plateforme ».
- `entr.jpg` est utilisé sur l’accueil et la page À propos. Prévoir un visuel spécifique pour l’une de ces deux sections.
- La provenance et les licences des photos préexistantes ne sont pas documentées. Les sources suggérées par le client sont répertoriées dans la charte, mais les images déjà téléchargées ne peuvent pas leur être attribuées sans retrouver leurs pages sources.
- Les portraits de l’équipe et le logo Clemiz ont été fournis pour la page À propos. Confirmer l’accord de publication des personnes représentées avant mise en production.
- Les captures partagées dans le message sont des exemples de direction artistique, pas une preuve de licence ni une demande de reproduire leur mise en page. Le fichier vidéo a, lui, été intégré comme média fourni.

## Contrôles

Le projet embarque déjà Framer Motion, GSAP et Three.js. Les animations existantes couvrent le mouvement UI et la scène 3D du hero ; aucune nouvelle dépendance n’a été ajoutée. `npm run build`, `npm run lint` et `git diff --check` passent. Vite signale encore un chunk JavaScript supérieur à 500 Ko, principalement lié à la scène Three.js ; c’est une piste d’optimisation séparée du travail de direction artistique.

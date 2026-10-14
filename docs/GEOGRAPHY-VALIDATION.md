# Référence géographique du globe VoyageGo

## Cause exacte de la dérive corrigée

La texture ETOPO utilisée par la sphère est une projection équirectangulaire standard : longitude `-180°` au bord gauche, méridien de Greenwich au centre et longitude `+180°` au bord droit. La géométrie Three.js, après son décalage UV historique de `0.25`, affichait cette texture correctement.

Les frontières et le raycasting utilisaient toutefois une conversion cartésienne avec un axe est-ouest inversé (`x = -cos(latitude) × sin(longitude)`). Les polygones et les clics étaient donc cohérents entre eux, mais réfléchis horizontalement par rapport aux continents visibles. Le Maroc pouvait ainsi être détecté sur une zone située à l'est de sa position réelle.

La convention unique est maintenant :

```text
x = cos(latitude) × sin(longitude)
y = sin(latitude)
z = cos(latitude) × cos(longitude)
```

La conversion inverse, les frontières, les contours sélectionnés et le raycasting utilisent tous cette même référence est-positive. L'orientation initiale de caméra est réglée séparément et ne modifie plus les données géographiques.

## Antiméridien et anneaux

L'ancien test point-dans-polygone normalisait chaque sommet indépendamment autour du clic. Cette opération pouvait replier un polygone ordinaire à travers l'antiméridien et provoquer des correspondances lointaines — par exemple l'Inde vers le Mexique ou l'océan Pacifique vers le Kenya.

Chaque anneau est désormais déroulé séquentiellement, la longitude testée est alignée sur l'intervalle de l'anneau, puis une boîte englobante est vérifiée avant le ray casting. Les trous des polygones et les multipolygones restent pris en compte.

## Références et couverture testée

- Relief : texture ETOPO équirectangulaire locale.
- Frontières : [Natural Earth Admin 0 — 1:50m](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries/), version 5.1.2.
- Pays de référence automatisés : Maroc, Algérie, Tunisie, Libye, Égypte, Afrique du Sud, Madagascar, France, Espagne, Portugal, Italie, Allemagne, Royaume-Uni, Chine, Inde, Thaïlande, Japon, Indonésie, Canada, États-Unis, Mexique, Brésil, Argentine, Australie et Nouvelle-Zélande.
- Cas particuliers : Fidji à l'antiméridien et points océaniques de l'Atlantique, du Pacifique et de l'océan Indien.
- Validation navigateur réelle : Maroc, Thaïlande, Brésil, Fidji et océan Atlantique après rotation et zoom.


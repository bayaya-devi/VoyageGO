# VoyageGo — Portail international V1

VoyageGo est le portail central de destinations nationales. La V1 présente le Maroc avec un lien fonctionnel vers [MarocoGO](https://bayaya-devi.github.io/MarocoGO/) et signale France, Espagne, Italie et Portugal comme destinations à venir. Les sites nationaux restent indépendants.

## Déploiement

Le projet est un site statique sans étape de compilation. Dans GitHub, ouvrir **Settings → Pages**, choisir **Deploy from a branch**, puis `main` et `/ (root)`. Le dépôt utilise déjà cette méthode de publication. Le site est servi à l’adresse `https://bayaya-devi.github.io/VoyageGO/`.

## Architecture

- `index.html` choisit la langue initiale : préférence manuelle mémorisée, langue du navigateur, puis français.
- `fr/`, `en/` et `ar/` fournissent des URL linguistiques stables, avec `lang`, direction, métadonnées et balises alternatives adaptés.
- `app.js` assemble les interfaces, interactions et pages d’information.
- `ordinateur-*.js` et `telephone-*.js` conservent les six points d’entrée de présentation; `locales/` centralise les ressources propres à chaque langue.
- `data/countries.js` est le registre centralisé des plateformes nationales (identifiants ISO, noms traduits, URL, état, coordonnées et style).
- `geography/europe-north-africa.geojson` contient la géométrie régionale simplifiée issue de Natural Earth via le dépôt `datasets/geo-countries`. Les données géographiques sont embarquées : la carte ne dépend pas d’une requête vers un tiers à l’exécution.
- `styles.css` définit les thèmes système clair/sombre, la mise en page responsive, les états de focus et les mouvements réduits.
- `FRONTEND-CONSTITUTION.md` reste la référence produit et design.

## Fonctionnalités et limites V1

- La carte vectorielle régionale permet de sélectionner le Maroc et la France; une liste de destinations offre une alternative clavier/tactile.
- MarocoGO ouvre son site indépendant. FrancoGO, Espagne, Italie et Portugal sont explicitement annoncés comme à venir.
- Le bouton de connexion n’invente pas d’authentification; il indique que le compte central n’est pas encore disponible.
- Aucun outil d’analyse ou cookie publicitaire n’est intégré. La préférence de langue est conservée dans `localStorage` sur le domaine VoyageGo; elle n’est pas partagée automatiquement avec les domaines nationaux.
- Les pages légales sont structurées et traduites, mais contiennent des champs à compléter pour l’identité et les coordonnées de l’entité exploitante. Elles ne constituent pas une validation juridique et sont exclues de l’indexation tant que ces données restent à confirmer.
- La carte est une projection SVG interactive avec relief visuel stylisé et ombrage; elle n’est pas un globe WebGL ni un modèle numérique d’élévation. Le rendu reste disponible sans WebGL.

## Vérification locale

Servir le dossier via HTTP (par exemple `python -m http.server 8000`) et ouvrir la racine du projet. Les URL `/fr/`, `/en/` et `/ar/` sont les points d’entrée localisés.

## Données cartographiques

Les frontières sont adaptées depuis [datasets/geo-countries](https://github.com/datasets/geo-countries), dont les géométries sont fondées sur Natural Earth. Le fichier livré est une extraction simplifiée de l’Europe occidentale et de l’Afrique du Nord pour l’affichage de la V1.

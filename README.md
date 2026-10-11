# VoyageGo — Portail international

Site web statique sans build, prêt pour GitHub Pages.

## Installation

1. Créer le dépôt public `VoyageGo`.
2. Déposer **tous les fichiers de cette livraison à la racine** du dépôt (aucun dossier nécessaire).
3. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
4. Ouvrir `https://bayaya-devi.github.io/VoyageGo/` après publication.

## Architecture

`FRONTEND-CONSTITUTION.md` → web (`index.html`, `styles.css`, `app.js`) → ordinateur / téléphone → FR / AR / EN (six fichiers `ordinateur-*.js` et `telephone-*.js`). Le moteur est partagé mais chaque couple appareil/langue a son module propre. Les futurs frontends application seront un autre produit, non inclus ici.

La langue est déduite du navigateur au premier passage, puis conservée via `localStorage`. Le thème suit `prefers-color-scheme` automatiquement. La carte géographique charge des frontières GeoJSON depuis `datasets/geo-countries` (GitHub) et propose un accès par boutons si la ressource est indisponible. La perspective et les ombres créent un relief visuel léger ; ce n'est **pas encore un moteur de terrain 3D**. Une vraie carte topographique 3D pourra remplacer cette couche sans changer les interfaces linguistiques.

Le bouton compte n'effectue aucune fausse connexion. FrancoGO est marqué comme indisponible jusqu'à réception de son URL. Les liens juridiques affichent un avertissement : **ils doivent être remplacés par de vraies pages validées avant une mise en production publique**. Le site n'utilise pas de cookies marketing ; seule la préférence linguistique est stockée localement. Les polices Google et le GeoJSON sont chargés depuis des services tiers : revoir ces dépendances dans la politique de confidentialité et les auto-héberger si nécessaire.

## Fichiers

- `index.html` — entrée du site
- `styles.css` — styles adaptatifs et thèmes système
- `app.js` — moteur de rendu, navigation, carte, interactions
- `ordinateur-fr.js`, `ordinateur-en.js`, `ordinateur-ar.js` — frontends ordinateur
- `telephone-fr.js`, `telephone-en.js`, `telephone-ar.js` — frontends téléphone et tablette
- `voyagego-logo.png` — logo transparent
- `FRONTEND-CONSTITUTION.md` — règles normatives

## Vérification locale

Ouvrir via un serveur HTTP (pas en `file://`) : `python -m http.server 8000` puis `http://localhost:8000`.

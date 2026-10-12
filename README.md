# VoyageGo — portail international immersif V2

VoyageGo relie des portails nationaux indépendants. Le Maroc ouvre [MarocoGO](https://bayaya-devi.github.io/MarocoGO/); la France, l’Espagne, l’Italie et le Portugal restent annoncés « bientôt disponibles ». Aucun autre dépôt national n’est modifié par ce projet.

## Déploiement

Site statique servi à `https://bayaya-devi.github.io/VoyageGO/`. Le dépôt GitHub Pages est configuré pour publier la branche `main` à la racine; le globe Three.js et les données géographiques sont intégrés au dépôt, sans CDN d’exécution.

## Architecture

- `index.html` choisit la langue manuelle enregistrée, puis celle du navigateur, puis le français.
- `/fr/`, `/en/`, `/ar/`, `/es/` et `/pt/` sont les routes linguistiques; l’arabe est RTL.
- `app.js` compose le récit, les routes légales et les contrôles; les entrées `ordinateur-*` et `telephone-*` chargent cinq catalogues dédiés.
- `globe.js` gère la scène Three.js, le mouvement de caméra piloté par le défilement, les frontières, la sélection pays et le secours SVG interactif.
- `vendor/` contient Three.js 0.186.1 et sa licence MIT. `data/countries.js` centralise les pays et l’état vérifié des portails.
- `geography/world-countries.geojson` contient 177 unités géographiques Natural Earth avec noms localisés. `geography/etopo-world-relief.jpg` est une image de relief mondial ETOPO 2022 fournie par le service cartographique NOAA.
- `FRONTEND-CONSTITUTION.md` est révisée en version 2.0 pour formaliser le parcours immersif et les cinq langues.

## Fonctionnalités et limites

- Accueil sans barre de navigation classique, commandes de langue flottantes, narration au scroll et globe mondial 3D.
- Relief ombré ETOPO 2022; frontières mondiales Natural Earth; globe tactile et survolable. Le sélecteur pays au clavier et la carte SVG interactive forment les alternatives accessibles.
- Le Maroc redirige vers MarocoGO. La France et les autres destinations futures affichent un statut exact et une action désactivée.
- La langue manuelle reste dans le `localStorage` du domaine VoyageGo; elle n’est pas partagée automatiquement entre les domaines nationaux.
- Aucun traceur ou compte central n’est activé. Les pages juridiques restent des brouillons à compléter par l’entité exploitante et ne constituent pas un avis juridique.
- Les performances de terrain/Core Web Vitals et l’expérience sur appareils physiques doivent encore être mesurées; elles ne sont pas déclarées atteintes par les tests locaux.

## Vérification locale

```powershell
npm install
npm run test:e2e
npm run test:a11y
```

Les tests démarrent un serveur statique local sous `/VoyageGO/` via Playwright. Pour une simple prévisualisation, servir le dossier à la racine d’un serveur HTTP et ouvrir `/fr/` ou une autre route localisée.

## Sources géographiques

- Frontières et noms de pays : [Natural Earth, admin-0 1:110m](https://github.com/nvkelso/natural-earth-vector), domaine public. Le jeu est fourni avec ses noms arabe, anglais, espagnol, français et portugais.
- Relief : [NOAA NCEI ETOPO 2022](https://www.ncei.noaa.gov/products/etopo-global-relief-model), service de relief ombré global. L’image locale est préexportée en projection équirectangulaire pour le globe; elle n’est pas recalculée sur le navigateur.

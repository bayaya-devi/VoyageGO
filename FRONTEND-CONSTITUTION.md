# VOYAGEGO — FRONTEND CONSTITUTION

**Version :** 1.0.0  
**Statut :** référence normative de conception et de développement  
**Portée :** portail mère VoyageGo (FR, AR, EN), identité transversale réutilisable par les applications pays  
**Pays initiaux :** Maroc (MarocoGO) et France (FrancoGO)  
**Date :** 11 octobre 2026

> **Principe cardinal :** une interface qui se fait oublier, une expérience qui donne envie de découvrir. VoyageGo est un portail de sélection de pays, non un catalogue, un comparateur ni un moteur de réservation.

## 1. Ordre de priorité

1. Sécurité, respect de la vie privée et accessibilité.
2. Compréhension immédiate de la fonction du portail.
3. Exactitude linguistique et géographique.
4. Fluidité, performance et compatibilité mobile.
5. Identité visuelle, esthétique et animation.

En cas de conflit, appliquer la règle de rang supérieur. Les animations ne doivent jamais bloquer une action, le scroll ou la lecture.

## 2. Architecture du produit

- **VoyageGo** est la marque et l'application mère.
- **MarocoGO** et **FrancoGO** sont les univers nationaux, auxquels VoyageGo redirige.
- Les autres pays peuvent être visibles sur la carte mais sont inactifs et non trompeusement cliquables.
- Les URLs des applications nationales sont configurables par environnement ; ne jamais supposer que FrancoGO est déjà en ligne.
- L'identité VoyageGo fournit les tokens de marque, principes d'animation et composants de base ; chaque pays conserve ses contenus, logos et particularités.
- **Compte unique** : le bouton de connexion prépare une authentification centralisée pour tous les pays ; tant qu'elle n'est pas réellement disponible, ne pas simuler une connexion réussie, un profil ou une session.

## 3. Structure canonique de l'accueil

### 3.1 En-tête permanent

- En-tête visible en permanence, fixé en haut, non intrusif, sans masquer le contenu.
- Logo VoyageGo officiel à gauche en LTR et à droite en RTL, cliquable vers l'accueil.
- Sélecteur de langue discret, accessible au clavier, nom explicite dans la langue affichée.
- Bouton de connexion sous forme d'icône avec libellé accessible ; libellé visible au survol et au focus, et solution lisible au toucher.
- Aspect de verre très transparent : viser **80–84 % de transparence perçue** (alpha du fond d'environ 0,16–0,20) ; augmenter localement l'opacité si nécessaire pour garantir la lisibilité. Ne pas appliquer aveuglément un alpha de 0,82.
- Flou léger conditionnel (`backdrop-filter`), bordure argentée à peine perceptible ; désactiver les effets coûteux si nécessaire.
- Tenir compte des encoches et zones sûres mobiles (`safe-area-inset-*`).

### 3.2 Séquence 1 : découverte et carte

- Titre court, inspirant, dans la langue active. Exemple FR : « La découverte commence ici. »
- Sous-titre très bref : « Choisissez votre destination. »
- **Carte géographique 3D en relief, non une image rectangulaire**, fusionnée avec le fond de la page.
- Vue initiale centrée sur l'Europe occidentale et l'Afrique du Nord, montrant nettement France et Maroc.
- Relief et frontières fondés sur des données géographiques documentées, projection et positionnement exacts.
- France et Maroc mis en valeur sans surcharger la carte de marqueurs. Survol/focus : nom du pays, animation discrète et affordance de sélection ; clic/tap : accès à l'application correspondante si disponible.
- Navigation accessible alternative avec deux destinations clairement identifiées et actionnables, indépendante de la 3D.
- Carte extensible à d'autres pays par configuration, sans duplication de composants.
- Le scroll révèle la carte et modifie subtilement la perspective ; il ne détourne pas le contrôle du scroll utilisateur.

### 3.3 Séquence 2 : ce que permet l'écosystème

- Présentation minimale des trois idées : **Découvrir → Préparer → Explorer**.
- Pas de longs paragraphes, de cartes marketing rectangulaires, de faux témoignages ou d'offres inventées.
- Trois symboles organiques (boussole, itinéraire, paysage/carte) intégrés au décor, reliés par un trait irrégulier inspiré de la trajectoire du logo.
- Apparition successive au scroll : premier pictogramme, puis ligne, puis deuxième, puis troisième ; une courte phrase facultative par étape.
- Ne pas promettre des fonctions de planification ou de réservation comme disponibles si les applications nationales ne les proposent pas encore. Adapter les formulations au périmètre réel.

### 3.4 Pied de page

- Intégration visuelle au paysage, sans rupture de fond ni bloc blanc.
- Liens fonctionnels vers : mentions légales, politique de confidentialité, politique de cookies, gestion des préférences de cookies, conditions d'utilisation et contact.
- Copyright dynamique, identité de l'éditeur et liens de navigation utiles.
- Les documents légaux doivent refléter les données, prestataires, pays d'exploitation et traitements réels ; ne jamais présenter un modèle générique comme une conformité garantie.
- Les liens légaux doivent exister dans chacune des trois langues avant publication publique, ou être clairement indiqués comme non disponibles pendant une phase privée de développement.

### 3.5 Retour en haut

- Icône seule avec nom accessible « Retour en haut » (équivalents AR/EN).
- Apparaît uniquement lorsque le footer approche du viewport, via `IntersectionObserver` ou logique équivalente.
- Positionnement dans une zone sûre, avec marges et décalage pour éviter de recouvrir texte, consentement cookies ou autres commandes.
- Ne pas afficher si son placement obstrue un élément essentiel ; préférer un placement intégré au footer sur très petits écrans.
- Scroll doux uniquement si `prefers-reduced-motion` ne le proscrit pas ; sinon retour instantané.

## 4. Identité graphique et tokens

### Palette officielle (trois couleurs principales)

| Token | Valeur | Usage |
|---|---|---|
| `--vg-horizon` | `#2F7768` | identité, végétation, navigation, titres |
| `--vg-sky` | `#86C5D8` | ciel, eau, reliefs, lumière froide |
| `--vg-sun` | `#F3BD72` | accents, chaleur, sélection, flèche |
| `--vg-silver` | `#B8BEC1` | reflet accessoire seulement |

- Pas de blanc comme couleur de fond dominante. Employer des dégradés naturels et des nuances dérivées des trois couleurs, avec des valeurs sombres de vert pour le contraste.
- Une couleur ne remplace jamais seule un libellé ou un état accessible.
- Les contrastes du texte normal doivent atteindre WCAG AA (4,5:1), textes grands 3:1 et éléments d'interface pertinents 3:1 ; adapter les teintes ou supports locaux pour y parvenir.
- Dégradés discrets, lumière diffuse, profondeur et textures naturelles ; pas de néon, saturation agressive, effet plastique ni surabondance de glassmorphism.

### Logo

- Utiliser le fichier officiel VoyageGo fourni et approuvé, sans le redessiner arbitrairement.
- Composition : cercle ouvert fin et flèche directionnelle de petite taille, Terre stylisée au centre, mot « VoyageGo » en typographie inclinée cohérente avec les logos pays, trait courbé inférieur.
- Préserver les proportions, espaces et transparence ; ne jamais étirer, recadrer ou fusionner le logo avec des boutons.
- Variantes nécessaires : horizontale transparente, pictogramme seul, favicon, version contraste adapté si besoin.
- Human Touch : irrégularités subtiles dans le tracé, jamais des fautes de langue, une géographie mensongère ou une perte de netteté.

### Typographie et composants

- Typographie sans-serif humaniste, lisible, à hiérarchie claire ; choisir une famille disposant de vraies variantes arabes ou une paire typographique harmonisée.
- Tailles fluides via `clamp()` ; interlignage adapté à l'arabe ; pas de texte dans des images.
- Boutons prioritairement iconographiques, avec libellé visible au focus/survol et `aria-label` localisé ; taille cible tactile recommandée ≥ 44×44 px.
- Micro-interactions 3D de faible amplitude, sans rotations distrayantes, avec retour d'état clair.
- Textures organiques légères et traits volontairement imparfaits ; ne pas introduire d'erreurs d'orthographe ou d'alignement.

## 5. Internationalisation stricte

### Trois expériences linguistiques séparées

- Routes indépendantes : `/fr/`, `/ar/`, `/en/` ; chaque route possède ses écrans, contenus, métadonnées, labels, messages d'erreur, textes d'accessibilité et documents légaux localisés.
- Partage autorisé du moteur (auth, carte, design tokens, sécurité, types), **mais pas de chaînes d'interface provenant d'une autre langue**.
- Aucun fallback silencieux vers le français ou l'anglais dans une interface publiée ; si une traduction manque, bloquer la publication de la route concernée et signaler l'erreur au build.
- Les noms propres de marques (« VoyageGo », « MarocoGO », « FrancoGO ») peuvent conserver leur graphie officielle ; ce ne sont pas des erreurs de localisation.
- `lang` HTML correct par route ; `dir="rtl"` sur `/ar/`, `dir="ltr"` sur `/fr/` et `/en/`.
- Arabe : composition RTL réelle, logo/menus/alignements inversés selon la logique de lecture, flèches directionnelles adaptées ; préserver l'orientation des cartes géographiques et des pictogrammes universels lorsque leur inversion serait incorrecte.
- Isolation bidirectionnelle (`bdi`/`dir="auto"`) pour marques latines, URLs et données mélangées dans les textes arabes.
- Détection initiale : préférence explicite mémorisée d'abord, sinon langue du navigateur, sinon français par défaut. Ne pas géolocaliser la langue et ne pas changer automatiquement la langue en cours de navigation.
- Le sélecteur de langue conserve si possible la même page et l'intention de l'utilisateur ; jamais de mélange transitoire des trois langues.
- Tester toutes les routes, écrans vides, formulaires, modales, erreurs et métadonnées pour chaque langue.

## 6. Animations, scroll et 3D

- Animations au scroll progressives, réversibles et non bloquantes ; jamais de scroll-jacking imposé.
- Carte 3D avec relief géographique réel, éclairage doux, interaction pointer/touch, sélection clavier via commandes alternatives.
- Prévoir rendu de qualité adaptative selon les capacités de l'appareil, limitation du pixel ratio, chargement différé et suspension des rendus inutiles.
- Prévoir une alternative **2D interactive accessible** si WebGL n'est pas pris en charge ou si le GPU est insuffisant. Une simple image non cliquable ne suffit pas.
- Préférer les transformations GPU (`transform`, `opacity`) aux animations provoquant des recalculs de layout.
- Respecter `prefers-reduced-motion`, désactiver parallaxe et déplacements excessifs ; le site reste complet sans animation.
- Les transitions ne doivent jamais gêner le clic, l'accès aux liens ni le changement de langue.

## 7. Responsive et accessibilité

- Mobile-first ; vérifier au minimum 320, 375, 430, 768, 1024 et 1440 px, orientations portrait et paysage.
- Aucune barre de défilement horizontale accidentelle, aucun chevauchement avec header/footer, claviers virtuels ou safe areas.
- Focus visible, ordre de tabulation logique, titres hiérarchiques, landmarks, skip link vers contenu, alternatives textuelles.
- Aucune fonction exclusivement disponible au hover ; tous les boutons fonctionnent au toucher et au clavier.
- Cibles et espacements tactiles suffisants ; zoom navigateur jusqu'à 200 % sans perte de fonction.
- Viser WCAG 2.2 AA et tester les trois langues avec lecteurs d'écran et navigation clavier.

## 8. Performance et fiabilité

- Objectifs de terrain au 75e percentile : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 lorsque mesurables.
- La 3D ne doit pas retarder le texte, les boutons ou les liens de destination ; chargement progressif et code-splitting.
- Polices locales/optimisées, compression des assets, cache versionné et limitation des dépendances.
- Aucun message d'erreur console non traité, aucune navigation cassée, aucun écran vide en cas d'échec de chargement de la carte.
- Tester réseau lent, hors connexion, faible mémoire, WebGL indisponible et préférences de réduction du mouvement.

## 9. Authentification et liens entre pays

- Identité centrale VoyageGo prévue pour les pays ; un même utilisateur ne doit pas avoir à créer des comptes indépendants sans justification.
- Authentification réelle via fournisseur central et protocole éprouvé (OIDC/OAuth2 avec PKCE selon architecture), cookies sécurisés, gestion des sessions et des expirations.
- Ne jamais transmettre de tokens de session dans les paramètres d'URL vers les applications pays.
- L'interopérabilité SSO entre domaines est un projet technique séparé ; elle ne résulte pas automatiquement de simples liens GitHub ou de redirections.
- Les URLs nationales et leur état (`active`, `coming_soon`) doivent être configurables ; aucun lien cassé ni fausse promesse de service.

## 10. Vie privée, cookies, sécurité et conformité

- Minimisation des données et de la télémétrie ; aucune collecte non nécessaire à la sélection d'un pays.
- Identifier le responsable de traitement, les finalités, bases légales, durées de conservation, destinataires, transferts internationaux, droits des personnes et moyen de contact.
- Si des cookies/traceurs non essentiels sont utilisés : information et choix préalable lorsque requis, refus aussi simple que l'acceptation, preuve du choix, retrait facile et absence de déclenchement avant consentement.
- Ne pas afficher de bannière de consentement factice si seuls des cookies strictement nécessaires sont utilisés ; fournir néanmoins une information exacte.
- Pages légales localisées et datées ; vérifier les obligations applicables selon l'entité, les utilisateurs et les marchés (notamment RGPD/ePrivacy si applicables, et législation marocaine applicable).
- HTTPS, politique CSP adaptée, dépendances auditées, protections contre XSS et injections, validation des redirections externes, aucun secret dans le frontend.
- Liens externes sécurisés ; les environnements de test ne doivent pas exposer de données personnelles.
- **Cette constitution est une spécification produit, pas un avis juridique ni une attestation de conformité.**

## 11. Structure technique indicative

```text
src/
  app/
    routes/
      fr/
      ar/
      en/
    providers/
  design-system/
    tokens/
    components/
    motion/
  features/
    country-map/
    country-selection/
    account-entry/
    legal/
  locales/
    fr/
    ar/
    en/
  data/
    countries.ts
  shared/
    accessibility/
    security/
    utils/
public/
  brand/
  geography/
  icons/
```

- Chaque langue possède ses routes et son contenu dédiés ; les composants purement fonctionnels peuvent être partagés sans imposer de traduction partielle.
- React + TypeScript ; moteur de carte 3D (Three.js/React Three Fiber ou équivalent), animations au scroll (GSAP ou équivalent) selon les mesures de performance.
- Séparer les données géographiques, la configuration des pays, la navigation et les composants de présentation.
- Les dépendances et choix finaux doivent être validés après prototype de performance, en particulier sur Android modeste.

## 12. Règles de non-régression et validation

### Contrôles obligatoires avant merge/publication

- [ ] Logo officiel et palette strictement respectés.
- [ ] En-tête permanent, transparent et lisible sur tous les fonds.
- [ ] Carte centrée France–Maroc, frontières et positions vérifiées.
- [ ] Pays disponibles cliquables ; pays non disponibles non trompeurs.
- [ ] Alternative à la 3D utilisable au clavier et au toucher.
- [ ] Deux séquences d'accueil, sans cartes marketing inutiles.
- [ ] Retour en haut visible uniquement près du footer, sans obstruction.
- [ ] FR, AR et EN : aucune chaîne étrangère non autorisée ; RTL complet en AR.
- [ ] Détection et mémorisation de langue correctes.
- [ ] Navigation, authentification et états indisponibles honnêtes.
- [ ] Pages légales réelles, liens fonctionnels, politique cookies conforme à l'implémentation.
- [ ] Navigation clavier, lecteurs d'écran, contrastes, réduction de mouvement.
- [ ] Tests mobile/desktop, réseaux lents, échec WebGL, zoom et orientations.
- [ ] Mesures Core Web Vitals et absence d'erreurs bloquantes.
- [ ] Tests unitaires, intégration, E2E et captures visuelles des trois langues.

### Processus de modification

1. Diagnostiquer et documenter le changement.
2. Modifier la plus petite surface possible.
3. Vérifier les trois langues, les deux pays et tous les formats d'écran.
4. Exécuter les tests et mesurer la performance.
5. Relire la conformité visuelle, l'accessibilité et la sécurité.
6. Publier seulement si les critères précédents sont satisfaits ; conserver une possibilité de retour arrière.

## 13. Ce qui est expressément interdit

- Ajouter une marketplace, une réservation ou un catalogue sur l'accueil VoyageGo sans nouvelle décision produit.
- Remplacer la carte par une photographie encadrée ou un fond vidéo sans interaction.
- Afficher des chaînes françaises ou anglaises par défaut dans le frontend arabe.
- Faire du « Human Touch » en ajoutant des fautes d'orthographe, des bugs ou des incohérences.
- Inventer un compte connecté, une destination active, un prix, un service ou une conformité légale.
- Bloquer le scroll, forcer les animations, cacher un bouton essentiel ou dégrader l'accessibilité pour un effet 3D.
- Modifier les dépôts MarocoGO/FrancoGO sans validation spécifique.

## 14. Livrables de la V1

1. Constitution frontend versionnée dans le dépôt VoyageGo.
2. Assets officiels de marque validés et optimisés.
3. Frontend français, frontend arabe RTL et frontend anglais, avec routes indépendantes.
4. Accueil à deux séquences et footer légal.
5. Carte géographique interactive 3D avec alternative 2D et sélection Maroc/France.
6. Sélecteur de langue avec préférence mémorisée.
7. Point d'entrée de connexion honnête et compatible avec l'authentification centralisée future.
8. Tests automatisés, rapport d'accessibilité et vérifications de performance.

---

**Toute exception à cette constitution doit être documentée, justifiée et approuvée avant intégration.**

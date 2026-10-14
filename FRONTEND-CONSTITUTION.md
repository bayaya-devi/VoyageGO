# VOYAGEGO — FRONTEND CONSTITUTION

**Version :** 3.0.0

**Statut :** référence normative

**Portée :** plateforme web mondiale unique, FR / AR / EN / ES / PT
**Date :** 14 octobre 2026

> VoyageGo est une application mondiale unique. Un pays est une destination et un ensemble de capacités activables, jamais une nouvelle application à créer.

## 1. Priorités

1. Sécurité, confidentialité et exactitude des statuts.
2. Accessibilité WCAG 2.2 AA et usage mobile.
3. Séparation linguistique complète, avec arabe RTL natif.
4. Performance et robustesse progressive.
5. Identité premium, mouvement utile et cohérence visuelle.

Une animation ne bloque jamais le défilement ou une action. Une fonction indisponible est annoncée honnêtement.

## 2. Modèle produit

- Une identité VoyageGo peut agir comme voyageur et, après activation, comme prestataire.
- Les contenus, voyages, favoris, demandes et notifications restent dans VoyageGo.
- Aucun pays ne redirige vers une application nationale.
- Le Maroc, la France et la Thaïlande sont les contenus pilotes proposés ; leur activité commerciale reste désactivée avant validation.
- Les services d’un pays sont pilotés par capacités : information, guides, lieux, prestataires, demandes et offres partenaires.
- Une demande n’est confirmée qu’après acceptation explicite du prestataire.
- Le paiement reste `not_configured` tant qu’aucune architecture de paiement validée n’existe.

## 3. Navigation canonique

La navigation produit comprend quatre accès persistants : Accueil, Préparer, Explorer et Profil. Elle reste tactile, lisible, compatible clavier et adaptée aux zones sûres mobiles.

L’accueil conserve le globe mondial comme élément signature. Le globe est manipulable au pointeur, au toucher et via une alternative accessible. WebGL bénéficie d’un repli SVG fonctionnel.

Dans la représentation cartographique propre au produit VoyageGo, le Sahara occidental est intégré à la géométrie du Maroc. Cette même géométrie canonique s’applique au rendu 3D, au survol, au clic, au sélecteur clavier et au repli SVG.

## 4. Préparer

- Mode guidé ou libre.
- Brouillon local utilisable avant connexion.
- Après connexion, les voyages et étapes se synchronisent via l’API.
- Les intégrations de vols, hébergements, transports, activités et guides sont présentées comme non connectées tant qu’elles ne le sont pas réellement.
- Aucune réservation ou tarification fictive.

## 5. Explorer

- Le monde entier reste consultable.
- `contentStatus` distingue contenu publié et contenu en préparation.
- `serviceStatus` distingue pays inactif et pays autorisant les demandes.
- Les deux états sont indépendants : du contenu peut être publié sans activité commerciale.

## 6. Comptes et onboarding

- Priorité de langue : choix manuel, navigateur, français.
- E-mail + mot de passe exige une vérification OTP.
- Google OAuth peut être activé uniquement avec de vrais secrets configurés.
- L’ajout d’un mot de passe local est facultatif après Google et exige une session récente.
- L’onboarding collecte exactement trois pays favoris, les intérêts et préférences utiles.
- Les mots de passe, OTP et jetons ne sont jamais stockés par le frontend.

## 7. Prestataires et réservations

- L’activation prestataire complète le compte existant.
- États prestataire : brouillon, en vérification, actif, suspendu, refusé.
- Les annonces restent en brouillon avant validation et activation du pays.
- Le serveur contrôle les permissions, prix, conditions et transitions.
- États réservation : attente, acceptée, refusée, annulée, expirée, terminée.
- Les tentatives concurrentes sur un créneau accepté sont rejetées.

## 8. Langues et direction

Chaque langue possède son catalogue de textes. Aucun libellé traduisible ne doit provenir d’une autre langue. Les noms de marque, codes ISO et devises peuvent conserver leur forme officielle. L’arabe utilise `dir="rtl"`, une composition miroir cohérente et des contrôles testés dans ce sens.

## 9. Design et mouvement

Palette : vert horizon `#2F7768`, bleu ciel `#86C5D8`, soleil doux `#F3BD72`, argent `#B8BEC1`. Les thèmes clair et sombre ont leurs propres surfaces et contrastes. Les mouvements sont sobres, interrompables et supprimés sous `prefers-reduced-motion`.

## 10. Sécurité et données

- Toutes les mutations exigent une session et une origine identique.
- Les objets privés sont toujours filtrés par propriétaire côté SQL.
- Les entrées sont limitées, typées et envoyées en JSON.
- Les réponses privées sont `no-store`.
- Les secrets résident uniquement dans Cloudflare.
- Les informations juridiques inconnues restent explicitement à compléter.
- Aucun traceur facultatif n’est activé avant consentement approprié.

## 11. Livraison

Le frontend est construit dans `dist/` et déployé sur Cloudflare Pages. L’API s’exécute dans Pages Functions et les données dans D1. Toute migration distante ou publication nécessite une validation explicite des pays pilotes et du périmètre commercial. Les résultats de test ne sont annoncés qu’après exécution réelle.

# VoyageGo — vérifications avant finalisation juridique

État vérifié pendant la refonte frontend V1. Ce document est une liste de travail, pas un avis juridique.

## Constat dans le dépôt et le site

- VoyageGo est publié sous GitHub Pages, à l’adresse `https://bayaya-devi.github.io/VoyageGO/`.
- Le dépôt ne contient actuellement ni configuration Cloudflare, ni intégration AdSense, ni identifiant éditeur publicitaire.
- Le module de compte reste indisponible sans configuration Supabase. Aucun compte ne peut être créé dans la configuration publiée actuelle.
- La préférence de langue manuelle est conservée dans `localStorage` (`voyagego-language`), pas dans un cookie.
- Aucun script de mesure d’audience ou de publicité facultative n’est configuré dans cette version.
- L’adresse de contact fournie pour publication est `aetbconseil@gmail.com`.

## À confirmer par l’exploitant avant toute affirmation juridique complète

1. Dénomination légale, forme, pays d’établissement, adresse et responsable de publication.
2. Identité du responsable de traitement, juridictions visées, finalités, bases légales, durées, destinataires et procédure d’exercice des droits.
3. Contrats et flux réels du site en production : hébergeur, DNS/proxy/CDN, stockage d’objets, formulaires et journaux. Le dépôt ne suffit pas à établir si Cloudflare intervient dans une couche externe.
4. Si Cloudflare est utilisé : produits précis, données concernées, rôles, lieux de traitement, sous-traitants et durées, à valider à partir du compte et des contrats réellement utilisés.
5. Titularité des droits sur le logo, les textes, les photographies et les données cartographiques.
6. Loi applicable, juridiction, médiation et autres obligations selon le lieu d’établissement et les publics visés.

## Publicité future

AdSense n’est pas présent ni activé dans cette version. Avant son activation, confirmer l’éligibilité du site et de l’éditeur, l’identifiant AdSense, les disclosures et la CMP adaptée aux audiences et juridictions. Google indique qu’une CMP certifiée par Google et intégrée au TCF est requise pour diffuser des annonces personnalisées aux utilisateurs de l’EEE, du Royaume-Uni et de la Suisse. Vérifier les consignes Google à jour au moment de l’intégration :

- [Exigences CMP Google AdSense pour les éditeurs](https://support.google.com/adsense/answer/13554116?hl=fr)
- [CNIL — recommandation relative aux cookies et autres traceurs](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies)

Ne pas charger de scripts publicitaires facultatifs avant que la configuration et les choix de consentement applicables soient effectifs.

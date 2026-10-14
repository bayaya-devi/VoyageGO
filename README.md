# VoyageGo — plateforme mondiale unique

VoyageGo est une seule plateforme de voyage mondiale : un compte, un profil, un carnet de voyage et un espace prestataire. Les pays sont des contenus et des capacités activables dans la même application, pas des applications nationales indépendantes.

## État de la V1

- Cinq interfaces séparées : français, arabe RTL, anglais, espagnol et portugais.
- Globe mondial 3D avec repli SVG accessible.
- Espaces Accueil, Préparer, Explorer et Profil.
- Onboarding en huit étapes avec OTP e-mail, trois pays favoris et préférences.
- Compte voyageur et capacité prestataire rattachés à la même identité.
- API Cloudflare Pages Functions versionnée et base Cloudflare D1.
- Demandes de réservation directes : `pending`, `accepted`, `rejected`, `cancelled`, `expired`, `completed`.
- Aucun paiement actif et aucun service commercial présenté comme disponible.

Les contenus pilotes proposés sont le Maroc, la France et la Thaïlande. Leur statut commercial reste `inactive` jusqu’à validation explicite du propriétaire.

## Architecture

- Frontend statique modulaire en JavaScript moderne et CSS.
- `platform/` contient les interfaces produit et les ressources linguistiques.
- `functions/api/v1/` expose l’API métier protégée par session.
- Better Auth gère identité, sessions, compte e-mail et Google OAuth.
- `migrations/0001_better_auth.sql` contient le socle d’identité.
- `migrations/0002_world_platform.sql` contient les 11 tables métier minimales.
- `data/`, `geography/` et `globe.js` portent le registre mondial et la cartographie.
- `FRONTEND-CONSTITUTION.md` est la référence produit et design.
- `docs/WORLD-PLATFORM-ARCHITECTURE.md` documente permissions, API et états.

Les anciens fichiers Supabase sont conservés à titre historique mais ne participent pas au runtime Cloudflare.

## Configuration locale

```powershell
npm ci
npm run build
npx wrangler d1 migrations apply voyagego-accounts --local
npx wrangler pages dev dist --binding BETTER_AUTH_SECRET=une-valeur-locale-longue --binding BETTER_AUTH_URL=http://127.0.0.1:8788 --binding PUBLIC_SITE_URL=http://127.0.0.1:8788
```

Copier `.dev.vars.example` vers `.dev.vars` pour un environnement local durable. Ne jamais versionner les vraies clés Brevo ou Google.

## Vérification

```powershell
npm run test:unit
npm run build
npm run test:e2e
npm audit
```

Les mesures Core Web Vitals sur appareils réels restent nécessaires avant ouverture commerciale.

## Déploiement

La cible est Cloudflare Pages avec Functions et D1. La migration distante, les secrets, puis le déploiement ne doivent être exécutés qu’après validation des pays pilotes, des textes juridiques, du domaine d’envoi et de Google OAuth. La commande `npm run deploy` existe mais n’est pas une autorisation de publier.

MarocoGO n’est ni modifié ni utilisé comme backend par ce dépôt.

## Sources géographiques

- Frontières : Natural Earth admin-0 1:110m, domaine public.
- Relief : NOAA NCEI ETOPO 2022, export local équirectangulaire.

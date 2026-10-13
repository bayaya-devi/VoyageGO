# Comptes VoyageGo — Cloudflare Pages, D1 et Better Auth

## Architecture du dépôt

- Le frontend statique est construit dans `dist/` pour Cloudflare Pages.
- Les routes `functions/api/auth/[[route]].js` et `functions/api/health.js` s’exécutent sur Pages Functions, sur la même origine que le site.
- Better Auth 1.7.7 gère les comptes, le hachage des mots de passe, les sessions, la vérification e-mail, les liens de réinitialisation, Google OAuth facultatif et les limites de requêtes.
- La base D1 dédiée est `voyagego-accounts`; son schéma versionné se trouve dans `migrations/`.
- Les e-mails sont envoyés par l’API transactionnelle Brevo uniquement depuis le serveur. Aucun secret ne va au navigateur.

Les inscriptions restent désactivées tant que D1, le secret Better Auth et un expéditeur Brevo complet ne sont pas disponibles. Le bouton Google n’apparaît que lorsque les deux secrets OAuth sont présents. Aucun mode de démonstration ou session locale n’est fourni.

## Secrets Cloudflare

Depuis la racine du dépôt, ajouter les secrets avec Wrangler (les valeurs ne sont pas inscrites dans le code) :

```powershell
npx wrangler pages secret put BETTER_AUTH_SECRET --project-name voyagego
npx wrangler pages secret put BREVO_API_KEY --project-name voyagego
npx wrangler pages secret put BREVO_SENDER_EMAIL --project-name voyagego
npx wrangler pages secret put BREVO_SENDER_NAME --project-name voyagego
```

`BETTER_AUTH_SECRET` doit contenir au moins 32 caractères aléatoires. `BREVO_SENDER_EMAIL` doit être un expéditeur autorisé et le domaine d’envoi doit avoir été authentifié dans Brevo. Ne pas copier de clé API dans `.env`, `wrangler.toml` ou les variables publiques Pages.

Google est facultatif : seulement après création et validation de l’application OAuth Google, ajouter `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` avec `wrangler pages secret put`. L’URI de retour Better Auth est `https://<origine-de-production>/api/auth/callback/google`.

## Migrations et déploiement

Vérifier l’état local puis appliquer les migrations à distance uniquement à la base VoyageGo :

```powershell
npm ci
npm run build
npx wrangler d1 migrations apply voyagego-accounts --remote
npx wrangler --config wrangler.toml pages project list
npm run deploy
```

Le projet Pages se nomme `voyagego`. Avant de déployer une nouvelle migration, sauvegarder la base depuis Cloudflare et ne jamais réinitialiser une base existante.

Pour le développement local, créer un fichier ignoré `.dev.vars` avec un secret local aléatoire et `BETTER_AUTH_URL=http://localhost:8788`. Appliquer d’abord les migrations en local, puis lancer `npm run dev`. Ne jamais réutiliser le secret local en production.

## Sécurité et mise en service

- Les mots de passe ont une longueur serveur de 15 à 128 caractères; aucune règle de composition arbitraire n’est imposée.
- Les sessions sont stockées dans D1 et utilisent des cookies `HttpOnly`, `Secure` en HTTPS, `SameSite=Lax` et une vérification d’origine pour les redirections.
- Les limites Better Auth sont stockées dans D1 et renforcées sur les routes d’inscription, de connexion et de récupération.
- Les réponses de récupération et d’inscription sont génériques pour réduire l’énumération d’adresses.
- Les migrations de l’ancien prototype Supabase ne sont pas appliquées à Cloudflare et ne sont pas réutilisées.
- Le lancement des comptes en production doit attendre l’authentification SPF/DKIM de l’expéditeur, un test réel de confirmation et de récupération, et la finalisation des informations de confidentialité/éditeur requises pour l’exploitant.

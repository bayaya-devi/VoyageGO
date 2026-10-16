# Authentification VoyageGo sur Cloudflare

VoyageGo utilise Better Auth dans Cloudflare Pages Functions et la base D1 `voyagego-accounts`. Une même identité porte les rôles voyageur et prestataire.

## Origine publique et cookies

L'interface actuellement publiée sur `https://bayaya-devi.github.io/VoyageGO/` et l'API `https://voyagego-0fn.pages.dev/` sont deux origines distinctes. Ne pas activer l'authentification en pointant simplement l'interface GitHub Pages vers l'API Pages : les cookies de session, la protection CSRF et les restrictions de cookies intersites rendent cette architecture non fiable selon le navigateur. La mise en production de comptes exige un domaine personnalisé vérifié, configuré sur Cloudflare Pages, avec le site et ses routes API servis sous la même origine. Conserver l'URL GitHub Pages comme site public tant que ce choix de domaine n'a pas été validé.

## Variables et secrets

Obligatoires :

- `BETTER_AUTH_SECRET` : secret aléatoire long, défini avec `wrangler pages secret put`.
- `BETTER_AUTH_URL` et `PUBLIC_SITE_URL` : URL HTTPS canonique du site Cloudflare Pages ou du domaine personnalisé.

L'endpoint de santé vérifie désormais la présence des tables Auth et plateforme dans D1, en plus de la configuration des fournisseurs. Des identifiants Cloudflare présents ne suffisent donc pas à annoncer le backend comme disponible avant l'application des migrations.

Pour l’inscription e-mail OTP et la récupération :

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`

L’adresse expéditrice doit appartenir à un domaine réellement vérifié chez Brevo. Sans ces trois valeurs, l’interface annonce que l’e-mail transactionnel est indisponible et l’API refuse l’envoi.

Pour Google :

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

L’URI de redirection à déclarer chez Google est `https://DOMAINE/api/auth/callback/google`. Sans les deux valeurs, le bouton Google reste indisponible.

Ne jamais placer de secret dans Git, `.dev.vars.example`, le frontend ou une capture d’écran.

## Base D1

Après validation et juste avant le premier déploiement :

```powershell
npx wrangler d1 migrations apply voyagego-accounts --remote
```

Cette commande ne doit pas être exécutée avant l’accord sur les pays pilotes et le périmètre de production. La migration `0001` crée Better Auth ; `0002` crée le domaine mondial.

## Flux

- E-mail : création → OTP à six chiffres, valable dix minutes, cinq tentatives → session.
- Google : OAuth → même compte si l’adresse est identique et vérifiée → onboarding.
- Mot de passe facultatif après Google : session âgée de moins de dix minutes requise.
- Cookies : `HttpOnly`, `Secure` en HTTPS, `SameSite=Lax`, même origine Cloudflare.

Le endpoint `/api/health` publie uniquement des indicateurs booléens (`accountsEnabled`, `emailEnabled`, `googleEnabled`, `platformApiEnabled`) et jamais la valeur des secrets.

## Vérification avant production

1. Vérifier le domaine d’envoi et les modèles dans les cinq langues.
2. Configurer les URI Google exactes de production.
3. Appliquer les migrations distantes.
4. Tester inscription, OTP erroné/expiré, renvoi, connexion, récupération, Google, liaison de compte et déconnexion.
5. Vérifier les cookies, les limites de débit et l’absence de données sensibles dans les journaux.

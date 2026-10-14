# Authentification VoyageGo sur Cloudflare

VoyageGo utilise Better Auth dans Cloudflare Pages Functions et la base D1 `voyagego-accounts`. Une même identité porte les rôles voyageur et prestataire.

## Variables et secrets

Obligatoires :

- `BETTER_AUTH_SECRET` : secret aléatoire long, défini avec `wrangler pages secret put`.
- `BETTER_AUTH_URL` et `PUBLIC_SITE_URL` : URL HTTPS canonique du site Cloudflare Pages ou du domaine personnalisé.

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

# Mise en service des comptes VoyageGo

## État actuel

Le portail contient les parcours d’inscription, connexion, récupération, renouvellement de mot de passe, connexion Google et profil. Ils restent volontairement désactivés tant qu’un projet Supabase n’a pas été créé et configuré. Aucun compte ou service de démonstration n’est créé. Les clés privées `service_role` ne doivent jamais être utilisées dans le navigateur ni ajoutées au dépôt.

La base SQL et ses politiques RLS sont préparées dans `supabase/migrations/202610120001_profiles.sql`; cette migration n’est pas appliquée à un projet distant. Les pages juridiques restent à compléter et valider par l’entité exploitante avant l’activation des comptes.

## Configuration Supabase requise

1. Créer le projet Supabase de production et conserver son URL ainsi que sa clé publique `publishable` (ou `anon` historique). Configurer l’authentification par e-mail avec confirmation d’adresse.
2. Dans la configuration des mots de passe Supabase, imposer au moins 6 caractères et les classes requises : une minuscule ASCII, une majuscule ASCII et au moins un caractère du groupe chiffres ou ponctuation ASCII. Le formulaire applique les mêmes critères côté navigateur, mais le contrôle fournisseur doit être activé côté serveur avant d’ouvrir les inscriptions. La documentation Supabase décrit les classes de caractères séparées par `:`.
3. Appliquer la migration SQL du dépôt depuis le SQL Editor Supabase ou la CLI officielle. Vérifier qu’un utilisateur ne peut lire et modifier que sa propre ligne dans `public.profiles` et que le déclencheur crée un profil après inscription.
4. Configurer les URL du site et de redirection Supabase : `https://bayaya-devi.github.io/VoyageGO/` et `https://bayaya-devi.github.io/VoyageGO/**`. Ajouter les URL locales nécessaires séparément, jamais un joker large en production.
5. Configurer un serveur SMTP vérifié pour les confirmations, invitations et récupération de mot de passe. Les envois par défaut Supabase ne conviennent pas à une ouverture publique.
6. Pour Google, configurer le fournisseur OAuth Supabase et le client Google. URI de rappel fournisseur : `https://<référence-du-projet>.supabase.co/auth/v1/callback`; origine JavaScript : `https://bayaya-devi.github.io`. Régler les URL de retour Supabase selon l’étape 4.
7. En local seulement, copier `.env.example` vers `.env.local`, renseigner `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY`, puis exécuter :

   ```powershell
   npm run configure:auth
   npm run build:auth
   npm run test:e2e
   ```

   `auth/runtime-config.js` ne contient que l’URL et la clé publique. Pour GitHub Pages, inclure ce fichier généré dans la publication après validation des paramètres; sa clé publishable est conçue pour être publique et les permissions reposent sur RLS. `.env.local` est ignoré par Git. Ne jamais passer une clé `service_role` à cette configuration.

## Avant activation en production

- Répéter la configuration dans un projet de production dont l’accès appartient à l’entité VoyageGo; vérifier SMTP, confirmation d’adresse, OAuth, URL de retour et critères serveur.
- Mesurer les limites anti-abus/rate limits et ajouter CAPTCHA seulement si le risque et l’expérience le justifient.
- Tester les parcours avec de vrais comptes contrôlés, y compris confirmation, Google, récupération, changement de mot de passe et révocation de session.
- Vérifier RLS avec au moins deux utilisateurs différents; aucune donnée de profil ne doit être accessible à `anon` ni à un autre utilisateur.
- Finaliser les mentions légales, politique de confidentialité, durées de conservation, responsable de traitement et contact avant activation.
- Générer `auth/runtime-config.js` avec les paramètres publics validés et reconstruire `vendor/supabase-auth.js`; déployer puis vérifier chaque parcours sur GitHub Pages.

Références officielles : [mots de passe](https://supabase.com/docs/guides/auth/passwords), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [données utilisateur et profils](https://supabase.com/docs/guides/auth/managing-user-data), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [URL de redirection](https://supabase.com/docs/guides/auth/redirect-urls), [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

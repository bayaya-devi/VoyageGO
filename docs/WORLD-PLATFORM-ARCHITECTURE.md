# Architecture mondiale VoyageGo V1

## Frontières du système

Le frontend Cloudflare Pages appelle uniquement `/api/auth/*` et `/api/v1/*` sur la même origine. Pages Functions utilise D1. Brevo et Google sont des intégrations facultatives côté serveur ; aucune clé n’atteint le navigateur.

## Données

Better Auth possède `user`, `session`, `account`, `verification` et `rateLimit`. Le domaine ajoute 11 tables : `profile`, `destination`, `trip`, `tripItem`, `providerProfile`, `listing`, `availability`, `bookingRequest`, `bookingEvent`, `notification` et `favorite`.

Les profils stockent uniquement les préférences nécessaires. Les conditions et prix d’une demande sont figés dans la demande. Aucun numéro de carte ni mot de passe en clair n’est collecté.

## Permissions

| Ressource | Lecture | Écriture |
| --- | --- | --- |
| Destinations | publique | administration future uniquement |
| Profil, voyages, favoris, notifications | propriétaire connecté | propriétaire connecté |
| Profil prestataire, annonces, disponibilités | prestataire propriétaire | prestataire propriétaire ; activation réservée à une administration future |
| Demandes voyageur | voyageur concerné | création/annulation par le voyageur |
| Demandes prestataire | prestataire concerné | acceptation/refus par le prestataire |

Le serveur recalcule les champs sensibles et n’accepte jamais un statut actif, un prix final ou un badge de vérification fourni par le client.

## API V1

- `GET /api/v1/destinations`
- `GET|PATCH /api/v1/me/profile`
- `POST /api/v1/me/password`
- `GET|POST /api/v1/trips`
- `GET|PATCH|DELETE /api/v1/trips/:id`
- `POST /api/v1/trips/:id/items`
- `GET|POST|PATCH /api/v1/provider/profile`
- `GET|POST /api/v1/provider/listings`
- `POST /api/v1/provider/listings/:id/availability`
- `GET|POST /api/v1/booking-requests`
- `POST /api/v1/booking-requests/:id/cancel`
- `GET /api/v1/provider/booking-requests`
- `POST /api/v1/provider/booking-requests/:id/decision`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/:id/read`
- `GET|POST /api/v1/favorites`
- `DELETE /api/v1/favorites/:type/:id`

Les mutations exigent `Content-Type: application/json`, une origine identique et une session. La création de demande exige aussi `Idempotency-Key`.

## États et activation

Les contenus proposés sont Maroc, France et Thaïlande. `contentStatus=published` signifie uniquement que des contenus éditoriaux peuvent être affichés. Les trois pays restent `serviceStatus=inactive`, les prestataires restent non vérifiés et les annonces non publiées. Ce verrou empêche une ouverture commerciale accidentelle.

## Intégrations en attente

- domaine d’envoi et secret Brevo ;
- identifiants Google OAuth ;
- validation juridique et identité de l’éditeur ;
- processus administratif de vérification des prestataires/annonces ;
- fournisseur de paiement ;
- partenaires de vols, hébergements et transports.

Ces absences sont représentées dans l’interface et ne sont pas simulées.

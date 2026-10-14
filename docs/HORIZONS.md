# Horizons de VoyageGo

La page d'accueil choisit un seul horizon par ouverture parmi 18 fichiers locaux. Le dernier choix est mémorisé pour éviter une répétition immédiate. Le même horizon reste associé à la visite et réapparaît lorsqu'un paysage de destination est désélectionné.

Toutes les images proviennent de la bibliothèque officielle [NASA Images](https://images.nasa.gov/) et renvoient depuis l'interface vers leur fiche source. La NASA indique que ses contenus sont généralement utilisables à des fins éducatives ou informationnelles sous réserve d'attribution et des exceptions signalées sur chaque média ; voir les [règles NASA relatives aux images et médias](https://www.nasa.gov/nasa-brand-center/images-and-media/).

Les fichiers ont été examinés visuellement : aucune personne, aucun animal, aucun bateau avec personne visible, aucun édifice ou symbole religieux. Ils sont servis en WebP 1920 × 1080 et aucun appel d'image tiers n'est effectué au chargement.

| Famille | Identifiant NASA | Fichier local |
| --- | --- | --- |
| Atmosphère | `iss072e724819` | `earth-blue-hour.webp` |
| Atmosphère | `iss074e0089803` | `earth-pacific-blue.webp` |
| Atmosphère | `iss074e0722845` | `earth-sunset-band.webp` |
| Atmosphère | `iss073e0257194` | `earth-noctilucent.webp` |
| Atmosphère | `STS052-23-022` | `earth-moonrise.webp` |
| Atmosphère | `STS047-54-018` | `earth-sunrise-limb.webp` |
| Océan | `iss034e048455` | `ocean-sun-glint.webp` |
| Océan | `iss020e047807` | `ocean-cloud-river.webp` |
| Océan | `iss036e025673` | `ocean-cloud-islands.webp` |
| Océan | `iss067e316063` | `ocean-midnight-blue.webp` |
| Océan | `iss066e008725` | `ocean-cloud-corridor.webp` |
| Océan | `iss066e152100` | `ocean-sunrise-arc.webp` |
| Espace | `GSFC_20171208_Archive_e002086` | `space-bug-nebula.webp` |
| Espace | `PIA14442` | `space-hourglass.webp` |
| Espace | `PIA17834` | `space-trifid.webp` |
| Espace | `GSFC_20171208_Archive_e000577` | `space-blue-ring.webp` |
| Espace | `GSFC_20171208_Archive_e002039` | `space-stellar-cloud.webp` |
| Espace | `GSFC_20171208_Archive_e000657` | `space-little-gem.webp` |

Le script `npm run assets:horizons` permet de régénérer les dérivés optimisés à partir des manifestes NASA. Il n'est pas exécuté pendant le build ou en production.


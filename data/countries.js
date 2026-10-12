const marocogoUrl = 'https://bayaya-devi.github.io/MarocoGO/';

/** National portals are activated only after their destination URL is verified. */
export const destinations = [
  {
    id: 'ma', iso2: 'MA', iso3: 'MAR',
    names: { fr: 'Maroc', en: 'Morocco', ar: 'المغرب', es: 'Marruecos', pt: 'Marrocos' },
    url: marocogoUrl, status: 'available', region: { latitude: 31.8, longitude: -6.0 },
    visual: { accent: '#F3BD72' },
  },
  {
    id: 'fr', iso2: 'FR', iso3: 'FRA',
    names: { fr: 'France', en: 'France', ar: 'فرنسا', es: 'Francia', pt: 'França' },
    url: null, status: 'coming_soon', region: { latitude: 46.5, longitude: 2.4 },
    visual: { accent: '#86C5D8' },
  },
  {
    id: 'es', iso2: 'ES', iso3: 'ESP',
    names: { fr: 'Espagne', en: 'Spain', ar: 'إسبانيا', es: 'España', pt: 'Espanha' },
    url: null, status: 'coming_soon', region: { latitude: 40.2, longitude: -3.7 },
    visual: { accent: '#B8BEC1' },
  },
  {
    id: 'it', iso2: 'IT', iso3: 'ITA',
    names: { fr: 'Italie', en: 'Italy', ar: 'إيطاليا', es: 'Italia', pt: 'Itália' },
    url: null, status: 'coming_soon', region: { latitude: 42.8, longitude: 12.5 },
    visual: { accent: '#B8BEC1' },
  },
  {
    id: 'pt', iso2: 'PT', iso3: 'PRT',
    names: { fr: 'Portugal', en: 'Portugal', ar: 'البرتغال', es: 'Portugal', pt: 'Portugal' },
    url: null, status: 'coming_soon', region: { latitude: 39.6, longitude: -8.0 },
    visual: { accent: '#B8BEC1' },
  },
];

export const localeCodes = ['fr', 'en', 'ar', 'es', 'pt'];
export const worldDataUrl = '../geography/world-countries.geojson';
export const reliefTextureUrl = '../geography/etopo-world-relief.jpg';

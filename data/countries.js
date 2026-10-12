const marocogoUrl = 'https://bayaya-devi.github.io/MarocoGO/';

/** Central registry for national portals. Add new destinations here. */
export const destinations = [
  {
    id: 'ma', iso2: 'MA', iso3: 'MAR',
    names: { fr: 'Maroc', en: 'Morocco', ar: 'المغرب' },
    url: marocogoUrl, status: 'available', region: { latitude: 31.8, longitude: -6.0 },
    visual: { accent: '#F3BD72', mapClass: 'country--available' },
  },
  {
    id: 'fr', iso2: 'FR', iso3: 'FRA',
    names: { fr: 'France', en: 'France', ar: 'فرنسا' },
    url: null, status: 'coming_soon', region: { latitude: 46.5, longitude: 2.4 },
    visual: { accent: '#86C5D8', mapClass: 'country--coming-soon' },
  },
  {
    id: 'es', iso2: 'ES', iso3: 'ESP',
    names: { fr: 'Espagne', en: 'Spain', ar: 'إسبانيا' },
    url: null, status: 'coming_soon', region: { latitude: 40.2, longitude: -3.7 },
    visual: { accent: '#B8BEC1', mapClass: 'country--future' },
  },
  {
    id: 'it', iso2: 'IT', iso3: 'ITA',
    names: { fr: 'Italie', en: 'Italy', ar: 'إيطاليا' },
    url: null, status: 'coming_soon', region: { latitude: 42.8, longitude: 12.5 },
    visual: { accent: '#B8BEC1', mapClass: 'country--future' },
  },
  {
    id: 'pt', iso2: 'PT', iso3: 'PRT',
    names: { fr: 'Portugal', en: 'Portugal', ar: 'البرتغال' },
    url: null, status: 'coming_soon', region: { latitude: 39.6, longitude: -8.0 },
    visual: { accent: '#B8BEC1', mapClass: 'country--future' },
  },
];

export const mapBounds = { west: -17, east: 37, south: 23, north: 68 };
export const mapDataUrl = '../geography/europe-north-africa.geojson';

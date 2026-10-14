/** Curated worldwide destinations. Commercial services remain disabled until validated. */
export const destinations = [
  {
    id: 'ma', iso2: 'MA', iso3: 'MAR',
    names: { fr: 'Maroc', en: 'Morocco', ar: 'المغرب', es: 'Marruecos', pt: 'Marrocos' },
    url: null, status: 'content', serviceStatus: 'inactive', region: { latitude: 31.8, longitude: -6.0 },
    visual: { accent: '#F3BD72' },
  },
  {
    id: 'fr', iso2: 'FR', iso3: 'FRA',
    names: { fr: 'France', en: 'France', ar: 'فرنسا', es: 'Francia', pt: 'França' },
    url: null, status: 'content', serviceStatus: 'inactive', region: { latitude: 46.5, longitude: 2.4 },
    visual: { accent: '#86C5D8' },
  },
  {
    id: 'th', iso2: 'TH', iso3: 'THA',
    names: { fr: 'Thaïlande', en: 'Thailand', ar: 'تايلاند', es: 'Tailandia', pt: 'Tailândia' },
    url: null, status: 'content', serviceStatus: 'inactive', region: { latitude: 15.8, longitude: 100.9 },
    visual: { accent: '#2F7768' },
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

/** Curated destination photography. Unlisted countries intentionally use the atmospheric fallback. */
export const destinationVisuals = {
  MAR: {
    src: new URL('../assets/destinations/morocco-dunes.jpg', import.meta.url).href,
    source: 'https://commons.wikimedia.org/wiki/File:Big_sand_dunes.jpg',
    credit: 'Wikimedia Commons',
    position: 'center 54%',
  },
  FRA: {
    src: new URL('../assets/destinations/france-alps.jpg', import.meta.url).href,
    source: 'https://commons.wikimedia.org/wiki/File:French_Alps_(233127345).jpeg',
    credit: 'Loïc Faucon · Wikimedia Commons',
    position: 'center 52%',
  },
  THA: {
    src: new URL('../assets/destinations/thailand-jungle.jpg', import.meta.url).href,
    source: 'https://commons.wikimedia.org/wiki/File:Dramatic_karst_landscape_of_Surat_Thani,_Khlong_Phanom_jungle,_Thailand.jpg',
    credit: 'Vyacheslav Argenberg · Wikimedia Commons',
    position: 'center 52%',
  },
};

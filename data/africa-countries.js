/**
 * VoyageGo Africa registry.
 *
 * Country names are provided by the runtime's Unicode CLDR data through
 * Intl.DisplayNames. Palettes are design tokens inspired by national flags;
 * they are not presented as official colour specifications.
 */
export const africaLocales = ['fr', 'ar', 'en', 'es', 'pt'];
export const voyageGoSilver = '#B8BEC1';

const sourceRefs = {
  country: 'https://unstats.un.org/unsd/methodology/m49/overview',
  names: 'https://cldr.unicode.org/translation/displaynames/countryregion-territory-names',
  timeZones: 'https://www.iana.org/time-zones',
  currencies: 'https://cldr.unicode.org/translation/currency-names-and-symbols',
};

const row = (iso2, iso3, group, currency, timeZones, palette, contentStatus = 'registry_only') => ({
  id: iso2.toLowerCase(), iso2, iso3, group, currency, timeZones,
  supportedLocales: africaLocales,
  palette: { primary: palette[0], secondary: palette[1] || palette[0], accent: palette[2] || voyageGoSilver, silver: voyageGoSilver },
  validationStatus: 'registry_verified',
  contentStatus,
  serviceStatus: 'inactive',
  capabilities: { information: contentStatus === 'published', editorialGuides: false, providers: false, bookingRequests: false, payments: false },
  sources: sourceRefs,
});

const baseCountries = [
  row('MA','MAR','north','MAD',['Africa/Casablanca'],['#C1272D','#006233','#F3BD72'],'published'),
  row('DZ','DZA','north','DZD',['Africa/Algiers'],['#006233','#D21034','#FFFFFF']),
  row('TN','TUN','north','TND',['Africa/Tunis'],['#E70013','#FFFFFF','#B8BEC1']),
  row('LY','LBY','north','LYD',['Africa/Tripoli'],['#239E46','#E70013','#111111']),
  row('EG','EGY','north','EGP',['Africa/Cairo'],['#CE1126','#111111','#C6A664']),
  row('MR','MRT','north','MRU',['Africa/Nouakchott'],['#00A95C','#FFD700','#D01C1F']),
  row('SD','SDN','north','SDG',['Africa/Khartoum'],['#D21034','#007229','#111111']),

  row('SN','SEN','west','XOF',['Africa/Dakar'],['#00853F','#FDEF42','#E31B23']),
  row('ML','MLI','west','XOF',['Africa/Bamako'],['#14B53A','#FCD116','#CE1126']),
  row('NE','NER','west','XOF',['Africa/Niamey'],['#E05206','#FFFFFF','#0DB02B']),
  row('NG','NGA','west','NGN',['Africa/Lagos'],['#008751','#FFFFFF','#B8BEC1']),
  row('GH','GHA','west','GHS',['Africa/Accra'],['#CE1126','#FCD116','#006B3F']),
  row('CI','CIV','west','XOF',['Africa/Abidjan'],['#F77F00','#FFFFFF','#009E60']),
  row('GN','GIN','west','GNF',['Africa/Conakry'],['#CE1126','#FCD116','#009460']),
  row('GW','GNB','west','XOF',['Africa/Bissau'],['#CE1126','#FCD116','#009E49']),
  row('GM','GMB','west','GMD',['Africa/Banjul'],['#CE1126','#0C1C8C','#3A7728']),
  row('LR','LBR','west','LRD',['Africa/Monrovia'],['#BF0A30','#002868','#FFFFFF']),
  row('SL','SLE','west','SLE',['Africa/Freetown'],['#1EB53A','#0072C6','#FFFFFF']),
  row('TG','TGO','west','XOF',['Africa/Lome'],['#006A4E','#FFCE00','#D21034']),
  row('BJ','BEN','west','XOF',['Africa/Porto-Novo'],['#008751','#FCD116','#E8112D']),
  row('BF','BFA','west','XOF',['Africa/Ouagadougou'],['#EF2B2D','#009E49','#FCD116']),
  row('CV','CPV','west','CVE',['Atlantic/Cape_Verde'],['#003893','#CF2027','#F7D116']),

  row('CM','CMR','central','XAF',['Africa/Douala'],['#007A5E','#CE1126','#FCD116']),
  row('TD','TCD','central','XAF',['Africa/Ndjamena'],['#002664','#FECB00','#C60C30']),
  row('CF','CAF','central','XAF',['Africa/Bangui'],['#003082','#289728','#FFCE00']),
  row('GA','GAB','central','XAF',['Africa/Libreville'],['#009E60','#FCD116','#3A75C4']),
  row('GQ','GNQ','central','XAF',['Africa/Malabo'],['#3E9A00','#FFFFFF','#E32118']),
  row('CG','COG','central','XAF',['Africa/Brazzaville'],['#009543','#FBDE4A','#DC241F']),
  row('CD','COD','central','CDF',['Africa/Kinshasa','Africa/Lubumbashi'],['#007FFF','#CE1021','#F7D618']),
  row('ST','STP','central','STN',['Africa/Sao_Tome'],['#12AD2B','#FFCE00','#D21034']),

  row('ET','ETH','east','ETB',['Africa/Addis_Ababa'],['#078930','#FCDD09','#DA121A']),
  row('ER','ERI','east','ERN',['Africa/Asmara'],['#EA0437','#12AD2B','#4189DD']),
  row('DJ','DJI','east','DJF',['Africa/Djibouti'],['#6AB2E7','#12AD2B','#D7141A']),
  row('SO','SOM','east','SOS',['Africa/Mogadishu'],['#4189DD','#FFFFFF','#B8BEC1']),
  row('KE','KEN','east','KES',['Africa/Nairobi'],['#006600','#BB0000','#111111']),
  row('UG','UGA','east','UGX',['Africa/Kampala'],['#FCDC04','#D90000','#111111']),
  row('RW','RWA','east','RWF',['Africa/Kigali'],['#00A1DE','#FAD201','#20603D']),
  row('BI','BDI','east','BIF',['Africa/Bujumbura'],['#1EB53A','#CE1126','#FFFFFF']),
  row('TZ','TZA','east','TZS',['Africa/Dar_es_Salaam'],['#1EB53A','#00A3DD','#FCD116']),
  row('SS','SSD','east','SSP',['Africa/Juba'],['#078930','#0F47AF','#FCDD09']),
  row('SC','SYC','east','SCR',['Indian/Mahe'],['#003D88','#FCD856','#D62828']),
  row('KM','COM','east','KMF',['Indian/Comoro'],['#3D8E33','#FFC61E','#CE1126']),
  row('MU','MUS','east','MUR',['Indian/Mauritius'],['#EA2839','#1A206D','#00A551']),
  row('MG','MDG','east','MGA',['Indian/Antananarivo'],['#FC3D32','#007E3A','#FFFFFF']),

  row('ZA','ZAF','southern','ZAR',['Africa/Johannesburg'],['#007749','#FFB81C','#001489']),
  row('NA','NAM','southern','NAD',['Africa/Windhoek'],['#003580','#D21034','#009543']),
  row('BW','BWA','southern','BWP',['Africa/Gaborone'],['#75AADB','#111111','#FFFFFF']),
  row('ZW','ZWE','southern','ZWG',['Africa/Harare'],['#319208','#FFD200','#DE2010']),
  row('ZM','ZMB','southern','ZMW',['Africa/Lusaka'],['#198A00','#EF7D00','#DE2010']),
  row('AO','AGO','southern','AOA',['Africa/Luanda'],['#CC092F','#111111','#FFCB00']),
  row('MZ','MOZ','southern','MZN',['Africa/Maputo'],['#009739','#FCE100','#D21034']),
  row('MW','MWI','southern','MWK',['Africa/Blantyre'],['#CE1126','#339E35','#111111']),
  row('LS','LSO','southern','LSL',['Africa/Maseru'],['#00209F','#009543','#FFFFFF']),
  row('SZ','SWZ','southern','SZL',['Africa/Mbabane'],['#3E5EB9','#FFD900','#B10C0C']),
];

const displayNames = Object.fromEntries(africaLocales.map((locale) => [locale, new Intl.DisplayNames([locale], { type: 'region' })]));
const flagFor = (iso2) => String.fromCodePoint(...iso2.split('').map((letter) => 127397 + letter.charCodeAt(0)));

export const africaCountries = baseCountries.map((country) => ({
  ...country,
  names: Object.fromEntries(africaLocales.map((locale) => [locale, displayNames[locale].of(country.iso2)])),
  flag: flagFor(country.iso2),
}));

export const africaCountryByIso2 = new Map(africaCountries.map((country) => [country.iso2, country]));
export const africaCountryByIso3 = new Map(africaCountries.map((country) => [country.iso3, country]));
export const africaRegions = Object.freeze({ north: 7, west: 15, central: 8, east: 14, southern: 10 });

export function getAfricaCountry(code) {
  const normalized = String(code || '').toUpperCase();
  return africaCountryByIso2.get(normalized) || africaCountryByIso3.get(normalized) || null;
}

export function africaCountryPath(country, locale) {
  const item = typeof country === 'string' ? getAfricaCountry(country) : country;
  return item && africaLocales.includes(locale) ? `${item.id}/${locale}/` : null;
}

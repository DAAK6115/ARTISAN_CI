const DEFAULT_REVERSE_GEOCODER = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_PREFIX = 'artisan_ci_reverse_geocode_v1:';
let lastReverseGeocodeAt = 0;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const coordKey = (latitude, longitude) =>
  `${Number(latitude).toFixed(5)},${Number(longitude).toFixed(5)}`;

function unique(parts) {
  return parts.filter((part, index) => part && parts.indexOf(part) === index);
}

function formatAddress(payload) {
  const address = payload?.address || {};
  const locality =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district ||
    address.borough;
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county;
  const road = address.road || address.pedestrian || address.residential;
  const state = address.state;

  const concise = unique([road, locality, city, state]).join(', ');
  return concise || payload?.display_name || '';
}

export async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Coordonnées GPS invalides.');
  }

  const key = `${CACHE_PREFIX}${coordKey(lat, lng)}`;
  try {
    const cached = window.localStorage.getItem(key);
    if (cached) return cached;
  } catch {
    // Le cache est facultatif (navigation privée, stockage désactivé, etc.).
  }

  // Le service public Nominatim demande au maximum une requête par seconde.
  // Ici l'appel n'est déclenché que par une action explicite de l'utilisateur.
  const wait = Math.max(0, 1100 - (Date.now() - lastReverseGeocodeAt));
  if (wait) await sleep(wait);
  lastReverseGeocodeAt = Date.now();

  const endpoint = process.env.REACT_APP_REVERSE_GEOCODER_URL || DEFAULT_REVERSE_GEOCODER;
  const url = new URL(endpoint);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'fr');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Adresse introuvable pour cette position.');

  const payload = await response.json();
  const formatted = formatAddress(payload);
  if (!formatted) throw new Error('Adresse introuvable pour cette position.');

  try {
    window.localStorage.setItem(key, formatted);
  } catch {
    // Le cache est facultatif.
  }
  return formatted;
}

export function buildNavigationLinks(latitude, longitude, label = 'ARTISAN_CI') {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const coords = `${lat},${lng}`;
  const encodedLabel = encodeURIComponent(label);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`,
    waze: `https://www.waze.com/ul?ll=${encodeURIComponent(coords)}&navigate=yes&utm_source=artisan_ci`,
    apple: `https://maps.apple.com/?daddr=${encodeURIComponent(coords)}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    native: `geo:${coords}?q=${encodeURIComponent(`${coords}(${label})`)}`,
    label: encodedLabel,
  };
}

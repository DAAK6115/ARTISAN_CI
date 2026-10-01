import axios from './axiosInstance';

export async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Coordonnées GPS invalides.');
  }

  const response = await axios.get('/portfolio/geocoding/reverse/', {
    params: { lat, lng },
  });
  const address = response.data?.label || response.data?.display_name;
  if (!address) throw new Error('Adresse introuvable pour cette position.');
  return address;
}

export async function searchAddresses(query, options = {}) {
  const value = String(query || '').trim();
  if (value.length < 3) return [];
  const response = await axios.get('/portfolio/geocoding/search/', {
    params: {
      q: value,
      limit: options.limit || 6,
      ...(options.country ? { country: options.country } : {}),
    },
  });
  return response.data?.results || [];
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

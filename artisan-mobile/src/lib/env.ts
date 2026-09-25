const rawApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const rawMapTileUrl = import.meta.env.VITE_MAP_TILE_URL?.trim();
const rawMapAttribution = import.meta.env.VITE_MAP_ATTRIBUTION?.trim();

export const env = {
  apiBaseUrl: (rawApiUrl || 'http://localhost:8000/api').replace(/\/$/, ''),
  mapTileUrl: rawMapTileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution: rawMapAttribution || '&copy; OpenStreetMap contributors'
} as const;

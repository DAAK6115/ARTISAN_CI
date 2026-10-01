import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import AppIcon from './AppIcon';
import axios from '../utils/axiosInstance';
import LocationActions from './LocationActions';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapboxArtisanMap.css';

const DEFAULT_CENTER = [-4.00826, 5.35995];
const STANDARD_STYLE = 'mapbox://styles/mapbox/standard';
const STREETS_STYLE = 'mapbox://styles/mapbox/streets-v12';
const SATELLITE_STYLE = 'mapbox://styles/mapbox/standard-satellite';
const CLUSTER_RADIUS = 68;
const CLUSTER_MAX_ZOOM = 16;
const ROUTE_SOURCE_ID = 'artisan-ci-route';
const ROUTE_CASING_LAYER_ID = 'artisan-ci-route-casing';
const ROUTE_LAYER_ID = 'artisan-ci-route-line';

const OSM_FALLBACK_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

function categorySummary(artisan) {
  const labels = artisan?.service_category_labels || [];
  if (labels.length === 0) return 'Prestations à découvrir';
  if (labels.length <= 2) return labels.join(' · ');
  return `${labels.slice(0, 2).join(' · ')} +${labels.length - 2}`;
}

function initials(artisan) {
  return String(artisan?.artisan_nom || 'A').slice(0, 1).toUpperCase();
}

function MarkerBadge({ artisan }) {
  return (
    <div className="artisan-mapbox-marker" title={artisan.artisan_nom}>
      <div className="artisan-mapbox-marker__avatar">
        {artisan.photo_profil ? (
          <img src={artisan.photo_profil} alt="" />
        ) : (
          <span>{initials(artisan)}</span>
        )}
      </div>
      {artisan.artisan_verified ? <i className="artisan-mapbox-marker__verified">✓</i> : null}
      {artisan.review_count ? (
        <b>★ {Number(artisan.rating_average || 0).toFixed(1)}</b>
      ) : null}
    </div>
  );
}

function ClusterBadge({ count }) {
  const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
  return (
    <div className={`artisan-mapbox-cluster artisan-mapbox-cluster--${size}`}>
      <span>{count}</span>
      <small>artisans</small>
    </div>
  );
}

function travelLabel(artisan) {
  if (artisan?.route_distance_km != null) {
    const distance = `${Number(artisan.route_distance_km).toFixed(1)} km`;
    const duration = artisan.route_duration_minutes != null ? ` · ${artisan.route_duration_minutes} min` : '';
    return `${distance}${duration}`;
  }
  if (artisan?.distance_km != null) return `${Number(artisan.distance_km).toFixed(1)} km`;
  return null;
}

function PopupCard({ artisan, onNavigate, onShowRoute, canShowRoute }) {
  return (
    <article className="artisan-mapbox-card">
      <div className="artisan-mapbox-card__cover">
        {artisan.photo_couverture ? <img src={artisan.photo_couverture} alt="" /> : null}
        <div className="artisan-mapbox-card__veil" />
      </div>

      <div className="artisan-mapbox-card__body">
        <div className="artisan-mapbox-card__avatar">
          {artisan.photo_profil ? <img src={artisan.photo_profil} alt={`Photo de ${artisan.artisan_nom}`} /> : <span>{initials(artisan)}</span>}
        </div>

        <div className="artisan-mapbox-card__title-row">
          <h3>{artisan.artisan_nom}</h3>
          {artisan.artisan_verified ? <span className="artisan-mapbox-card__verified">✓ Vérifié</span> : null}
        </div>

        <p className="artisan-mapbox-card__category">{categorySummary(artisan)}</p>

        {artisan.review_count ? (
          <p className="artisan-mapbox-card__rating">★ {Number(artisan.rating_average || 0).toFixed(1)} · {artisan.review_count} avis</p>
        ) : null}

        <div className="artisan-mapbox-card__quick-badges">
          {artisan.supports_home_service ? <span>Chez le client</span> : null}
          {artisan.available_today ? <span className="is-available">Disponible aujourd’hui</span> : null}
        </div>

        {artisan.distance_source === 'road' ? (
          <>
            <div className="artisan-mapbox-card__travel-metrics" aria-label="Distance et durée estimées par la route">
              {artisan.route_distance_km != null ? (
                <span><strong>🚗</strong>{Number(artisan.route_distance_km).toFixed(1)} km</span>
              ) : null}
              {artisan.route_duration_minutes != null ? (
                <span><strong>⏱</strong>{artisan.route_duration_minutes} min</span>
              ) : null}
            </div>
            <p className="artisan-mapbox-card__travel-note">Distance et durée estimées par la route</p>
          </>
        ) : artisan.distance_km != null ? (
          <>
            <div className="artisan-mapbox-card__travel-metrics">
              <span><strong>📍</strong>{Number(artisan.distance_km).toFixed(1)} km</span>
            </div>
            <p className="artisan-mapbox-card__travel-note">Distance approximative à vol d’oiseau</p>
          </>
        ) : null}

        <p className="artisan-mapbox-card__meta"><AppIcon name="pin" className="h-3.5 w-3.5" /><span>{artisan.localisation || 'Localisation non précisée'}</span></p>
        {artisan.service_titles?.length ? (
          <p className="artisan-mapbox-card__meta"><AppIcon name="tools" className="h-3.5 w-3.5" /><span>{artisan.service_titles.slice(0, 2).join(' · ')}</span></p>
        ) : null}

        <div className="artisan-mapbox-card__actions artisan-mapbox-card__actions--three">
          <button type="button" className="artisan-mapbox-card__primary" onClick={() => onNavigate(`/artisans/${artisan.artisan_nom}`)}>Profil</button>
          <button type="button" onClick={() => onNavigate(`/client/messagerie/${artisan.artisan_nom}`)}>Message</button>
          <button
            type="button"
            className="artisan-mapbox-card__route"
            disabled={!canShowRoute}
            title={canShowRoute ? 'Afficher l’itinéraire dans ARTISAN_CI' : 'Activez “Autour de moi” pour tracer l’itinéraire'}
            onClick={() => onShowRoute(artisan)}
          >
            Itinéraire
          </button>
        </div>

        <details className="artisan-mapbox-card__gps">
          <summary>Itinéraire & GPS</summary>
          <LocationActions
            latitude={artisan.latitude}
            longitude={artisan.longitude}
            label={artisan.artisan_nom || 'Artisan ARTISAN_CI'}
            compact
          />
        </details>
      </div>
    </article>
  );
}

function applyStandardConfig(map, mode) {
  if (!['standard', 'satellite'].includes(mode)) return;
  const entries = [
    ['lightPreset', 'day'],
    ['showPointOfInterestLabels', true],
    ['showTransitLabels', false],
    ['showPlaceLabels', true],
    ['showRoadLabels', true],
  ];
  if (mode === 'standard') {
    entries.push(['show3dObjects', true]);
    entries.push(['theme', 'faded']);
  }

  entries.forEach(([key, value]) => {
    try { map.setConfigProperty('basemap', key, value); } catch (_) { /* option non disponible */ }
  });
}

function styleForMode(mode, customStyle) {
  if (customStyle) return customStyle;
  if (mode === 'satellite') return SATELLITE_STYLE;
  if (mode === 'streets') return STREETS_STYLE;
  return STANDARD_STYLE;
}

function normalizeCustomStyle(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';

  // Les valeurs ci-dessous sont des exemples de documentation et ne doivent
  // jamais être traitées comme de vrais styles Mapbox. Cela évite une carte
  // vide lorsqu'un utilisateur copie directement le .env.example.
  const placeholderPattern = /ton-compte|ton-style|your-account|your-style|example/i;
  if (placeholderPattern.test(candidate)) return '';

  return candidate;
}

function isMapDomReady(map) {
  if (!map) return false;
  try {
    const container = map.getContainer?.();
    const canvasContainer = map.getCanvasContainer?.();
    return Boolean(container?.isConnected && canvasContainer?.isConnected);
  } catch (_) {
    return false;
  }
}

function logMapNotice(message) {
  if (process.env.NODE_ENV === 'development' && message) {
    console.warn(`[Mapbox] ${message}`);
  }
}

function removeRouteLayers(map) {
  if (!map) return;
  try { if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID); } catch (_) { /* ignore */ }
  try { if (map.getLayer(ROUTE_CASING_LAYER_ID)) map.removeLayer(ROUTE_CASING_LAYER_ID); } catch (_) { /* ignore */ }
  try { if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID); } catch (_) { /* ignore */ }
}

function routeCoordinates(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return geometry.coordinates || [];
  if (geometry.type === 'MultiLineString') return (geometry.coordinates || []).flat();
  return [];
}

function drawRouteLayers(map, route, { fit = false } = {}) {
  if (!map || !route?.geometry || !map.isStyleLoaded?.()) return;

  const feature = {
    type: 'Feature',
    properties: {},
    geometry: route.geometry,
  };

  try {
    const existing = map.getSource(ROUTE_SOURCE_ID);
    if (existing?.setData) existing.setData(feature);
    else {
      map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: feature });
      map.addLayer({
        id: ROUTE_CASING_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-width': 9, 'line-opacity': 0.94 },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0B6B50', 'line-width': 5, 'line-opacity': 0.96 },
      });
    }

    if (fit) {
      const coordinates = routeCoordinates(route.geometry);
      if (coordinates.length) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach((coordinate) => bounds.extend(coordinate));
        map.fitBounds(bounds, { padding: { top: 100, right: 90, bottom: 110, left: 90 }, maxZoom: 15.5, duration: 850 });
      }
    }
  } catch (error) {
    logMapNotice(`Impossible de dessiner l’itinéraire : ${error?.message || error}`);
  }
}

export default function MapboxArtisanMap({ artisans = [], position = null }) {
  const token = (process.env.REACT_APP_MAPBOX_TOKEN || '').trim();
  const rawCustomStyle = (process.env.REACT_APP_MAPBOX_STYLE_URL || '').trim();
  const customStyle = normalizeCustomStyle(rawCustomStyle);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const renderedMarkersRef = useRef([]);
  const markerRootsRef = useRef([]);
  const popupRootsRef = useRef([]);
  const clientMarkerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const basemapFailureCountRef = useRef(0);
  const renderClustersRef = useRef(() => {});
  const modeRef = useRef('standard');
  const routeDataRef = useRef(null);
  const [mode, setMode] = useState(customStyle ? 'custom' : 'standard');
  const [mapError, setMapError] = useState('');
  const [visibleCount, setVisibleCount] = useState(0);
  const [routeData, setRouteData] = useState(null);
  const [routeLoadingId, setRouteLoadingId] = useState(null);
  const [routeError, setRouteError] = useState('');

  const points = useMemo(
    () => artisans.filter((artisan) => artisan.latitude != null && artisan.longitude != null),
    [artisans],
  );

  const artisanById = useMemo(() => {
    const map = new Map();
    points.forEach((artisan) => map.set(String(artisan.id), artisan));
    return map;
  }, [points]);

  const clusterIndex = useMemo(() => {
    const index = new Supercluster({ radius: CLUSTER_RADIUS, maxZoom: CLUSTER_MAX_ZOOM, minPoints: 2 });
    index.load(points.map((artisan) => ({
      type: 'Feature',
      properties: { artisanId: String(artisan.id) },
      geometry: {
        type: 'Point',
        coordinates: [Number(artisan.longitude), Number(artisan.latitude)],
      },
    })));
    return index;
  }, [points]);

  const clearRoute = useCallback(() => {
    const map = mapRef.current;
    routeDataRef.current = null;
    setRouteData(null);
    setRouteError('');
    if (map?.isStyleLoaded?.()) removeRouteLayers(map);
  }, []);

  const showRoute = useCallback(async (artisan) => {
    if (!position || position.length < 2) {
      setRouteError('Activez « Autour de moi » pour afficher l’itinéraire depuis votre position.');
      return;
    }
    if (!artisan?.id) return;

    setRouteLoadingId(artisan.id);
    setRouteError('');
    try {
      const response = await axios.post('/portfolio/route-to-artisan/', {
        artisan_id: artisan.id,
        lat: Number(position[0]),
        lng: Number(position[1]),
      });
      const nextRoute = { ...response.data, artisan };
      routeDataRef.current = nextRoute;
      setRouteData(nextRoute);
      const map = mapRef.current;
      if (map?.isStyleLoaded?.()) drawRouteLayers(map, nextRoute, { fit: true });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setRouteError(detail || 'Impossible de calculer cet itinéraire pour le moment.');
    } finally {
      setRouteLoadingId(null);
    }
  }, [position]);

  const clearRenderedMarkers = useCallback(() => {
    renderedMarkersRef.current.forEach((marker) => marker.remove());
    renderedMarkersRef.current = [];
    markerRootsRef.current.forEach((root) => root.unmount());
    markerRootsRef.current = [];
    popupRootsRef.current.forEach((root) => root.unmount());
    popupRootsRef.current = [];
  }, []);

  const renderClusters = useCallback(() => {
    const map = mapRef.current;
    // Marker.addTo() appelle map.getCanvasContainer().appendChild(...).
    // Pendant l'initialisation, un changement de style ou un hot-reload,
    // ce conteneur peut ne pas encore exister. On attend alors le prochain
    // événement Mapbox (load/moveend/zoomend) au lieu de faire planter React.
    if (!isMapDomReady(map)) return;

    clearRenderedMarkers();

    const bounds = map.getBounds();
    const zoom = Math.max(0, Math.min(CLUSTER_MAX_ZOOM + 1, Math.floor(map.getZoom())));
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    let features = [];
    try {
      features = clusterIndex.getClusters(bbox, zoom);
    } catch (_) {
      features = [];
    }

    let individualCount = 0;

    features.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const isCluster = Boolean(feature.properties?.cluster);
      const markerNode = document.createElement('div');
      const markerRoot = createRoot(markerNode);
      markerRootsRef.current.push(markerRoot);

      if (isCluster) {
        const count = Number(feature.properties.point_count || 0);
        const clusterId = feature.properties.cluster_id;
        markerRoot.render(<ClusterBadge count={count} />);
        markerNode.setAttribute('aria-label', `${count} artisans dans cette zone`);
        markerNode.setAttribute('role', 'button');
        markerNode.tabIndex = 0;

        const expand = () => {
          let expansionZoom = Math.min(map.getZoom() + 2, CLUSTER_MAX_ZOOM + 1);
          try { expansionZoom = clusterIndex.getClusterExpansionZoom(clusterId); } catch (_) { /* garde le zoom par défaut */ }
          map.easeTo({ center: [lng, lat], zoom: expansionZoom, duration: 650 });
        };
        markerNode.addEventListener('click', expand);
        markerNode.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            expand();
          }
        });
      } else {
        const artisan = artisanById.get(String(feature.properties?.artisanId));
        if (!artisan) return;
        individualCount += 1;
        markerRoot.render(<MarkerBadge artisan={artisan} />);

        const popupNode = document.createElement('div');
        const popupRoot = createRoot(popupNode);
        popupRoot.render(<PopupCard artisan={artisan} onNavigate={navigate} onShowRoute={showRoute} canShowRoute={Boolean(position)} />);
        popupRootsRef.current.push(popupRoot);

        const popup = new mapboxgl.Popup({ offset: 32, maxWidth: '290px', className: 'artisan-mapbox-popup' }).setDOMContent(popupNode);
        const marker = new mapboxgl.Marker({ element: markerNode, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
        renderedMarkersRef.current.push(marker);
        return;
      }

      const marker = new mapboxgl.Marker({ element: markerNode, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);
      renderedMarkersRef.current.push(marker);
    });

    setVisibleCount(individualCount);
  }, [artisanById, clearRenderedMarkers, clusterIndex, navigate, position, showRoute]);

  useEffect(() => {
    renderClustersRef.current = renderClusters;
  }, [renderClusters]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const activateFallbackBasemap = useCallback((reason = '') => {
    const map = mapRef.current;
    if (!map) return;
    window.clearTimeout(fallbackTimerRef.current);
    try {
      map.setStyle(OSM_FALLBACK_STYLE);
      map.once('style.load', () => {
        if (routeDataRef.current) drawRouteLayers(map, routeDataRef.current);
      });
      setMode('fallback');
      logMapNotice('Fond OpenStreetMap activé automatiquement : Mapbox n’a pas chargé son fond de carte correctement.');
      setMapError(reason || '');
    } catch (_) {
      setMapError('Impossible de charger le fond de carte. Vérifiez votre connexion et votre jeton Mapbox.');
    }
  }, []);

  const scheduleBasemapHealthCheck = useCallback((map, currentMode) => {
    window.clearTimeout(fallbackTimerRef.current);
    if (currentMode === 'fallback' || currentMode === 'custom') return;

    fallbackTimerRef.current = window.setTimeout(() => {
      if (!mapRef.current || mapRef.current !== map) return;
      const loaded = map.isStyleLoaded();
      const tilesLoaded = typeof map.areTilesLoaded === 'function' ? map.areTilesLoaded() : true;
      if (!loaded || !tilesLoaded) {
        if (currentMode === 'standard' && basemapFailureCountRef.current === 0) {
          basemapFailureCountRef.current += 1;
          logMapNotice('Mapbox Standard tarde à charger. Passage automatique au style Rues.');
          setMode('streets');
        } else {
          activateFallbackBasemap();
        }
      }
    }, 6500);
  }, [activateFallbackBasemap]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return undefined;

    mapboxgl.accessToken = token;
    const initialMode = customStyle ? 'custom' : 'standard';
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleForMode(initialMode, customStyle),
      center: DEFAULT_CENTER,
      zoom: 10.5,
      pitch: 35,
      bearing: -5,
      antialias: true,
      cooperativeGestures: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    const handleRender = () => renderClustersRef.current?.();

    map.on('load', () => {
      setMapError('');
      if (!customStyle) applyStandardConfig(map, 'standard');
      handleRender();
      scheduleBasemapHealthCheck(map, initialMode);
    });

    map.on('moveend', handleRender);
    map.on('zoomend', handleRender);
    map.on('resize', handleRender);

    map.on('error', (event) => {
      const message = String(event?.error?.message || '');
      const serious = /401|403|unauthor|forbidden|token|style|failed to fetch|network/i.test(message);
      if (!serious) return;
      if (modeRef.current === 'fallback') return;
      if (basemapFailureCountRef.current === 0 && !customStyle) {
        basemapFailureCountRef.current += 1;
        logMapNotice('Le style Mapbox principal n’a pas chargé correctement. Passage automatique au style Rues.');
        setMode('streets');
      } else {
        activateFallbackBasemap('Mapbox n’a pas pu charger toutes les données du fond de carte.');
      }
    });

    mapRef.current = map;

    return () => {
      window.clearTimeout(fallbackTimerRef.current);
      map.off('moveend', handleRender);
      map.off('zoomend', handleRender);
      map.off('resize', handleRender);
      clearRenderedMarkers();
      clientMarkerRef.current?.remove();
      clientMarkerRef.current = null;
      routeDataRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [clearRenderedMarkers, customStyle, scheduleBasemapHealthCheck, token, activateFallbackBasemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode === 'custom' || mode === 'fallback') return;
    if (!map.loaded()) return;

    const nextStyle = styleForMode(mode, customStyle);
    setMapError('');
    map.setStyle(nextStyle);
    map.once('style.load', () => {
      applyStandardConfig(map, mode);
      renderClustersRef.current?.();
      if (routeDataRef.current) drawRouteLayers(map, routeDataRef.current);
      scheduleBasemapHealthCheck(map, mode);
    });
  }, [customStyle, mode, renderClusters, scheduleBasemapHealthCheck]);

  useEffect(() => {
    renderClusters();
  }, [renderClusters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const renderClientMarker = () => {
      if (mapRef.current !== map || !isMapDomReady(map)) return;

      clientMarkerRef.current?.remove();
      clientMarkerRef.current = null;

      if (position) {
        const dot = document.createElement('div');
        dot.className = 'artisan-mapbox-client-marker';
        dot.setAttribute('aria-label', 'Votre position approximative');
        clientMarkerRef.current = new mapboxgl.Marker({ element: dot, anchor: 'center' })
          .setLngLat([Number(position[1]), Number(position[0])])
          .setPopup(new mapboxgl.Popup({ offset: 18 }).setText('Votre position approximative'))
          .addTo(map);
      }
    };

    if (isMapDomReady(map)) renderClientMarker();
    else map.once('load', renderClientMarker);

    return () => {
      map.off('load', renderClientMarker);
      clientMarkerRef.current?.remove();
      clientMarkerRef.current = null;
    };
  }, [position]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapDomReady(map)) return;

    const bounds = new mapboxgl.LngLatBounds();
    points.forEach((artisan) => bounds.extend([Number(artisan.longitude), Number(artisan.latitude)]));
    if (position) bounds.extend([Number(position[1]), Number(position[0])]);

    if (bounds.isEmpty()) {
      map.easeTo({ center: DEFAULT_CENTER, zoom: 10.5, pitch: 35, duration: 700 });
      return;
    }

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    if (sw.lng === ne.lng && sw.lat === ne.lat) {
      map.easeTo({ center: [sw.lng, sw.lat], zoom: 14, pitch: 40, duration: 700 });
      return;
    }

    map.fitBounds(bounds, { padding: 72, maxZoom: 14.5, duration: 800 });
  }, [points, position]);

  useEffect(() => {
    if (!routeData) return;
    const artisanStillVisible = artisanById.has(String(routeData.artisan_id || routeData.artisan?.id));
    if (!position || !artisanStillVisible) clearRoute();
  }, [artisanById, clearRoute, position, routeData]);

  if (!token) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-[24px] bg-[#F3F6F4] px-6 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EAF4F0] text-[#0B6B50]"><AppIcon name="pin" className="h-6 w-6" /></span>
          <h3 className="mt-4 text-lg font-black text-[#111815]">Carte Mapbox à configurer</h3>
          <p className="mt-2 text-sm leading-6 text-[#66736D]">Ajoutez votre jeton public Mapbox dans <code className="rounded bg-white px-1.5 py-1">REACT_APP_MAPBOX_TOKEN</code>, puis redémarrez le frontend.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[#EAF0EC]">
      <div ref={containerRef} className="h-[560px] w-full sm:h-[610px]" />

      {!customStyle && mode !== 'fallback' ? (
        <div className="absolute left-3 top-3 z-10 flex rounded-2xl border border-white/70 bg-white/95 p-1 shadow-lg backdrop-blur-xl">
          <button type="button" onClick={() => setMode('standard')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === 'standard' ? 'bg-[#0B6B50] text-white' : 'text-[#526159]'}`}>Premium 3D</button>
          <button type="button" onClick={() => setMode('streets')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === 'streets' ? 'bg-[#0B6B50] text-white' : 'text-[#526159]'}`}>Rues</button>
          <button type="button" onClick={() => setMode('satellite')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === 'satellite' ? 'bg-[#0B6B50] text-white' : 'text-[#526159]'}`}>Satellite</button>
        </div>
      ) : null}

      {routeLoadingId ? (
        <div className="absolute right-3 top-3 z-20 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-xs font-black text-[#334139] shadow-lg backdrop-blur-xl">
          Calcul de l’itinéraire…
        </div>
      ) : routeData ? (
        <aside className="artisan-route-summary">
          <button type="button" onClick={clearRoute} aria-label="Fermer l’itinéraire">×</button>
          <p>Itinéraire vers</p>
          <strong>{routeData.artisan_nom || routeData.artisan?.artisan_nom}</strong>
          <div>
            {routeData.distance_km != null ? <span>🚗 {Number(routeData.distance_km).toFixed(1)} km</span> : null}
            {routeData.duration_minutes != null ? <span>⏱ {routeData.duration_minutes} min</span> : null}
          </div>
        </aside>
      ) : null}

      {routeError ? (
        <div className="artisan-route-error">
          <span>{routeError}</span>
          <button type="button" onClick={() => setRouteError('')}>×</button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/60 bg-[#10271F]/90 px-4 py-2 text-[11px] font-bold text-white shadow-xl backdrop-blur-md">
        {points.length} artisan{points.length > 1 ? 's' : ''} · {visibleCount} visible{visibleCount > 1 ? 's' : ''}
      </div>

      {mapError ? (
        <div className="absolute inset-x-4 bottom-16 z-20 rounded-2xl border border-red-100 bg-white/95 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">{mapError}</div>
      ) : null}
    </div>
  );
}

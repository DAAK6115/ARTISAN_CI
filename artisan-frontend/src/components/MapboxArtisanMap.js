import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import AppIcon from './AppIcon';
import LocationActions from './LocationActions';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapboxArtisanMap.css';

const DEFAULT_CENTER = [-4.00826, 5.35995];
const STANDARD_STYLE = 'mapbox://styles/mapbox/standard';
const SATELLITE_STYLE = 'mapbox://styles/mapbox/standard-satellite';

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
      {artisan.photo_profil ? (
        <img src={artisan.photo_profil} alt="" />
      ) : (
        <span>{initials(artisan)}</span>
      )}
      {artisan.review_count ? (
        <b>★ {Number(artisan.rating_average || 0).toFixed(1)}</b>
      ) : null}
    </div>
  );
}

function PopupCard({ artisan, onNavigate }) {
  return (
    <article className="artisan-mapbox-card">
      <div className="artisan-mapbox-card__cover">
        {artisan.photo_couverture ? <img src={artisan.photo_couverture} alt="" /> : null}
        <div className="artisan-mapbox-card__veil" />
        {artisan.distance_km != null ? (
          <span className="artisan-mapbox-card__distance">{Number(artisan.distance_km).toFixed(1)} km</span>
        ) : null}
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

        <p className="artisan-mapbox-card__meta"><AppIcon name="pin" className="h-3.5 w-3.5" /><span>{artisan.localisation || 'Localisation non précisée'}</span></p>
        {artisan.service_titles?.length ? (
          <p className="artisan-mapbox-card__meta"><AppIcon name="tools" className="h-3.5 w-3.5" /><span>{artisan.service_titles.slice(0, 2).join(' · ')}</span></p>
        ) : null}

        <div className="artisan-mapbox-card__actions">
          <button type="button" className="artisan-mapbox-card__primary" onClick={() => onNavigate(`/artisans/${artisan.artisan_nom}`)}>Profil</button>
          <button type="button" onClick={() => onNavigate(`/client/messagerie/${artisan.artisan_nom}`)}>Message</button>
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
  const isSatellite = mode === 'satellite';
  const entries = [
    ['lightPreset', 'day'],
    ['showPointOfInterestLabels', true],
    ['showTransitLabels', false],
    ['showPlaceLabels', true],
    ['showRoadLabels', true],
    ['show3dObjects', true],
  ];
  if (!isSatellite) entries.push(['theme', 'faded']);

  entries.forEach(([key, value]) => {
    try { map.setConfigProperty('basemap', key, value); } catch (_) { /* propriété non disponible sur ce style/version */ }
  });
}

export default function MapboxArtisanMap({ artisans = [], position = null }) {
  const token = (process.env.REACT_APP_MAPBOX_TOKEN || '').trim();
  const customStyle = (process.env.REACT_APP_MAPBOX_STYLE_URL || '').trim();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const popupRoots = useRef([]);
  const markerRoots = useRef([]);
  const clientMarkerRef = useRef(null);
  const [mode, setMode] = useState('standard');
  const [mapError, setMapError] = useState('');

  const points = useMemo(
    () => artisans.filter((artisan) => artisan.latitude != null && artisan.longitude != null),
    [artisans],
  );

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return undefined;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: customStyle || STANDARD_STYLE,
      center: DEFAULT_CENTER,
      zoom: 10.5,
      pitch: 38,
      bearing: -8,
      antialias: true,
      cooperativeGestures: true,
      attributionControl: false,
      config: customStyle ? undefined : {
        basemap: {
          theme: 'faded',
          lightPreset: 'day',
          showPointOfInterestLabels: true,
          showTransitLabels: false,
          show3dObjects: true,
        },
      },
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      setMapError('');
      if (!customStyle) applyStandardConfig(map, 'standard');
    });
    map.on('error', (event) => {
      const message = event?.error?.message || '';
      if (/token|401|403|style/i.test(message)) {
        setMapError('Mapbox ne peut pas charger la carte. Vérifiez le jeton public et le style configurés.');
      }
    });

    mapRef.current = map;
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      markerRoots.current.forEach((root) => root.unmount());
      markerRoots.current = [];
      popupRoots.current.forEach((root) => root.unmount());
      popupRoots.current = [];
      clientMarkerRef.current?.remove();
      clientMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [customStyle, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || customStyle) return;
    const styleUrl = mode === 'satellite' ? SATELLITE_STYLE : STANDARD_STYLE;
    map.setStyle(styleUrl);
    map.once('style.load', () => applyStandardConfig(map, mode));
  }, [customStyle, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];
    markerRoots.current.forEach((root) => root.unmount());
    markerRoots.current = [];
    popupRoots.current.forEach((root) => root.unmount());
    popupRoots.current = [];

    points.forEach((artisan) => {
      const markerNode = document.createElement('div');
      const markerRoot = createRoot(markerNode);
      markerRoot.render(<MarkerBadge artisan={artisan} />);
      markerRoots.current.push(markerRoot);

      const popupNode = document.createElement('div');
      const popupRoot = createRoot(popupNode);
      popupRoot.render(<PopupCard artisan={artisan} onNavigate={navigate} />);
      popupRoots.current.push(popupRoot);

      const popup = new mapboxgl.Popup({ offset: 30, maxWidth: '290px', className: 'artisan-mapbox-popup' }).setDOMContent(popupNode);
      const marker = new mapboxgl.Marker({ element: markerNode, anchor: 'bottom' })
        .setLngLat([Number(artisan.longitude), Number(artisan.latitude)])
        .setPopup(popup)
        .addTo(map);
      markerRefs.current.push(marker);
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      markerRoots.current.forEach((root) => root.unmount());
      markerRoots.current = [];
      popupRoots.current.forEach((root) => root.unmount());
      popupRoots.current = [];
    };
  }, [navigate, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
  }, [position]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = new mapboxgl.LngLatBounds();
    points.forEach((artisan) => bounds.extend([Number(artisan.longitude), Number(artisan.latitude)]));
    if (position) bounds.extend([Number(position[1]), Number(position[0])]);

    if (bounds.isEmpty()) {
      map.easeTo({ center: DEFAULT_CENTER, zoom: 10.5, pitch: 38, duration: 700 });
      return;
    }

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    if (sw.lng === ne.lng && sw.lat === ne.lat) {
      map.easeTo({ center: [sw.lng, sw.lat], zoom: 14, pitch: 42, duration: 700 });
      return;
    }

    map.fitBounds(bounds, { padding: 70, maxZoom: 14.5, duration: 800 });
  }, [points, position]);

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

      {!customStyle ? (
        <div className="absolute left-3 top-3 z-10 flex rounded-2xl border border-white/70 bg-white/95 p-1 shadow-lg backdrop-blur-xl">
          <button type="button" onClick={() => setMode('standard')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === 'standard' ? 'bg-[#0B6B50] text-white' : 'text-[#526159]'}`}>Standard</button>
          <button type="button" onClick={() => setMode('satellite')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === 'satellite' ? 'bg-[#0B6B50] text-white' : 'text-[#526159]'}`}>Satellite</button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/60 bg-[#10271F]/90 px-4 py-2 text-[11px] font-bold text-white shadow-xl backdrop-blur-md">
        {points.length} artisan{points.length > 1 ? 's' : ''} sur la carte
      </div>

      {mapError ? (
        <div className="absolute inset-x-4 top-16 z-20 rounded-2xl border border-red-100 bg-white/95 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">{mapError}</div>
      ) : null}
    </div>
  );
}

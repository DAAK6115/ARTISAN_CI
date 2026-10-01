import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './ArtisanMap.css';

const STANDARD_STYLE = 'mapbox://styles/mapbox/standard';
const STREETS_STYLE = 'mapbox://styles/mapbox/streets-v12';
const SATELLITE_STYLE = 'mapbox://styles/mapbox/standard-satellite';

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

function normalizeCustomStyle(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  if (/ton-compte|ton-style|your-account|your-style|example/i.test(candidate)) return '';
  return candidate;
}

function styleForMode(mode, customStyle) {
  if (customStyle) return customStyle;
  if (mode === 'satellite') return SATELLITE_STYLE;
  if (mode === 'streets') return STREETS_STYLE;
  return STANDARD_STYLE;
}

function configureStandardStyle(map, mode) {
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
    try { map.setConfigProperty('basemap', key, value); } catch (_) { /* option indisponible */ }
  });
}

function createMarkerElement({ editable }) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `artisan-profile-map__marker${editable ? ' is-editable' : ''}`;
  element.setAttribute('aria-label', editable ? 'Position de l’artisan, déplaçable' : 'Position de l’artisan');
  element.innerHTML = `
    <span class="artisan-profile-map__marker-core">
      <img src="/artisan-ci-logo.png" alt="" />
    </span>
    <span class="artisan-profile-map__marker-tip"></span>
  `;
  return element;
}

function logProfileMapNotice(message) {
  if (process.env.NODE_ENV === 'development' && message) {
    console.warn(`[Mapbox profil] ${message}`);
  }
}

export default function ArtisanMap({
  latitude,
  longitude,
  editable = false,
  onLocationChange,
  height = 300,
  popupText = 'Position de l’artisan',
}) {
  const token = String(process.env.REACT_APP_MAPBOX_TOKEN || '').trim();
  const rawCustomStyle = String(process.env.REACT_APP_MAPBOX_STYLE_URL || '').trim();
  const customStyle = normalizeCustomStyle(rawCustomStyle);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const coordinates = useMemo(() => [lng, lat], [lat, lng]);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const popupRef = useRef(null);
  const styleTimerRef = useRef(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const editableRef = useRef(editable);
  const [mode, setMode] = useState(customStyle ? 'custom' : 'standard');
  const [fallback, setFallback] = useState(!token);

  useEffect(() => { onLocationChangeRef.current = onLocationChange; }, [onLocationChange]);
  useEffect(() => { editableRef.current = editable; }, [editable]);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !containerRef.current) return undefined;

    mapboxgl.accessToken = token;
    const initialFallback = !token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: initialFallback ? OSM_FALLBACK_STYLE : styleForMode(customStyle ? 'custom' : 'standard', customStyle),
      center: coordinates,
      zoom: 15.8,
      pitch: initialFallback ? 0 : 38,
      bearing: 0,
      attributionControl: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');

    const markerElement = createMarkerElement({ editable });
    const marker = new mapboxgl.Marker({
      element: markerElement,
      anchor: 'bottom',
      draggable: editable,
    }).setLngLat(coordinates);

    const popup = new mapboxgl.Popup({ offset: 28, closeButton: false, className: 'artisan-profile-map__popup' })
      .setText(editable ? 'Déplacez le marqueur ou cliquez sur la carte pour ajuster la position.' : popupText);
    marker.setPopup(popup);

    const addMarkerWhenReady = () => {
      try {
        const canvasContainer = map.getCanvasContainer?.();
        if (canvasContainer?.isConnected && !markerRef.current) {
          marker.addTo(map);
          markerRef.current = marker;
          popupRef.current = popup;
        }
      } catch (_) { /* la carte est peut-être en cours de destruction */ }
    };

    const handleLoad = () => {
      addMarkerWhenReady();
      if (!initialFallback) configureStandardStyle(map, customStyle ? 'custom' : 'standard');
    };

    const handleStyleData = () => addMarkerWhenReady();
    const handleError = (event) => {
      if (initialFallback || map.__artisanFallbackActive) return;
      const message = String(event?.error?.message || '');
      if (!/style|source|sprite|glyph|tile|401|403|404/i.test(message)) return;
      map.__artisanFallbackActive = true;
      setFallback(true);
      logProfileMapNotice('Le fond Mapbox n’a pas pu être chargé. Fond OpenStreetMap activé automatiquement.');
      try {
        map.setStyle(OSM_FALLBACK_STYLE);
        map.easeTo({ pitch: 0, bearing: 0, duration: 450 });
      } catch (_) { /* carte démontée */ }
    };

    map.on('load', handleLoad);
    map.on('styledata', handleStyleData);
    map.on('error', handleError);

    // Les erreurs de style ne remontent pas toutes de la même façon selon Mapbox.
    if (!initialFallback) {
      styleTimerRef.current = window.setTimeout(() => {
        if (!map.isStyleLoaded?.() && !map.__artisanFallbackActive) {
          map.__artisanFallbackActive = true;
          setFallback(true);
          logProfileMapNotice('Le fond Mapbox tarde à charger. Fond OpenStreetMap activé automatiquement.');
          try { map.setStyle(OSM_FALLBACK_STYLE); } catch (_) { /* carte démontée */ }
        }
      }, 8000);
    }

    const handleMapClick = (event) => {
      if (!editableRef.current || !onLocationChangeRef.current) return;
      const { lat: nextLat, lng: nextLng } = event.lngLat;
      marker.setLngLat([nextLng, nextLat]);
      onLocationChangeRef.current(nextLat, nextLng);
    };

    const handleDragEnd = () => {
      if (!onLocationChangeRef.current) return;
      const next = marker.getLngLat();
      onLocationChangeRef.current(next.lat, next.lng);
    };

    map.on('click', handleMapClick);
    marker.on('dragend', handleDragEnd);

    return () => {
      if (styleTimerRef.current) window.clearTimeout(styleTimerRef.current);
      styleTimerRef.current = null;
      try { map.off('load', handleLoad); } catch (_) { /* noop */ }
      try { map.off('styledata', handleStyleData); } catch (_) { /* noop */ }
      try { map.off('error', handleError); } catch (_) { /* noop */ }
      try { map.off('click', handleMapClick); } catch (_) { /* noop */ }
      try { marker.off('dragend', handleDragEnd); } catch (_) { /* noop */ }
      try { marker.remove(); } catch (_) { /* noop */ }
      markerRef.current = null;
      popupRef.current = null;
      mapRef.current = null;
      try { map.remove(); } catch (_) { /* noop */ }
    };
  // La carte est créée une seule fois pour cette configuration. Les coordonnées sont synchronisées séparément.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, customStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      markerRef.current?.setLngLat(coordinates);
      map.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), 15.8), duration: 650 });
    } catch (_) { /* carte en cours de démontage */ }
  }, [coordinates, lat, lng]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    try { marker.setDraggable(Boolean(editable)); } catch (_) { /* noop */ }
    marker.getElement()?.classList.toggle('is-editable', Boolean(editable));
  }, [editable]);

  const changeMode = (nextMode) => {
    const map = mapRef.current;
    if (!map || customStyle) return;
    setMode(nextMode);
    setFallback(false);
    logProfileMapNotice('');
    map.__artisanFallbackActive = false;
    try {
      map.setStyle(styleForMode(nextMode, ''));
      map.easeTo({ pitch: nextMode === 'standard' ? 38 : 0, bearing: 0, duration: 500 });
      map.once('style.load', () => configureStandardStyle(map, nextMode));
    } catch (_) {
      setFallback(true);
      logProfileMapNotice('Impossible de changer le fond Mapbox. Fond OpenStreetMap utilisé.');
      try { map.setStyle(OSM_FALLBACK_STYLE); } catch (_) { /* noop */ }
    }
  };

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <div className="artisan-profile-map" style={{ height: `${height}px` }}>
      <div ref={containerRef} className="artisan-profile-map__canvas" />

      {!customStyle && token && !fallback ? (
        <div className="artisan-profile-map__modes" role="group" aria-label="Style de carte">
          <button type="button" onClick={() => changeMode('standard')} className={mode === 'standard' ? 'is-active' : ''}>Premium 3D</button>
          <button type="button" onClick={() => changeMode('streets')} className={mode === 'streets' ? 'is-active' : ''}>Rues</button>
          <button type="button" onClick={() => changeMode('satellite')} className={mode === 'satellite' ? 'is-active' : ''}>Satellite</button>
        </div>
      ) : null}


      <div className="artisan-profile-map__status">
        <span className="artisan-profile-map__status-dot" />
        {editable ? 'Position modifiable' : 'Position de l’artisan'}
      </div>
    </div>
  );
}

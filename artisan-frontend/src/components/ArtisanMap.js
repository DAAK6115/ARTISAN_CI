import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrige l'icône Leaflet avec Webpack/CRA.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function Recenter({ latitude, longitude }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], Math.max(map.getZoom(), 16), { animate: true });
  }, [latitude, longitude, map]);
  return null;
}

function ClickToMove({ enabled, onChange }) {
  useMapEvents({
    click(event) {
      if (!enabled || !onChange) return;
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function ArtisanMap({
  latitude,
  longitude,
  editable = false,
  onLocationChange,
  height = 300,
  popupText = 'Position de l’artisan',
}) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const markerRef = useRef(null);
  const position = useMemo(() => [lat, lng], [lat, lng]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const markerHandlers = editable
    ? {
        dragend() {
          const marker = markerRef.current;
          if (!marker || !onLocationChange) return;
          const next = marker.getLatLng();
          onLocationChange(next.lat, next.lng);
        },
      }
    : undefined;

  return (
    <MapContainer
      center={position}
      zoom={16}
      scrollWheelZoom
      style={{ height: `${height}px`, width: '100%', zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Recenter latitude={lat} longitude={lng} />
      <ClickToMove enabled={editable} onChange={onLocationChange} />
      <Marker
        ref={markerRef}
        position={position}
        draggable={editable}
        eventHandlers={markerHandlers}
      >
        <Popup>
          {editable ? 'Déplacez ce marqueur ou cliquez sur la carte pour ajuster la position.' : popupText}
        </Popup>
      </Marker>
    </MapContainer>
  );
}

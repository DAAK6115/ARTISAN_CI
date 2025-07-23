// ✅ components/ArtisanMap.js - Carte interactive centrée sur artisan
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corriger l’icône par défaut (bug Leaflet avec Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

export default function ArtisanMap({ latitude, longitude }) {
  if (!latitude || !longitude) return null;
  return (
    <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom style={{ height: '250px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>Vous êtes ici !</Popup>
      </Marker>
    </MapContainer>
  );
}

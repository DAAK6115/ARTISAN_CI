import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ArtisansList() {
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState('25');
  const [view, setView] = useState('list');

  const loadArtisans = async (coordinates = null, selectedRadius = radius) => {
    setLoading(true);
    setMessage('');
    try {
      const params = coordinates ? { lat: coordinates[0], lng: coordinates[1], radius: Number(selectedRadius) } : {};
      const response = await axios.get('/portfolio/map/', { params });
      setArtisans(response.data || []);
    } catch {
      setMessage('Impossible de charger les artisans pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadArtisans(); }, []);

  const useMyPosition = () => {
    if (!navigator.geolocation) {
      setMessage('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const current = [coords.latitude, coords.longitude];
        setPosition(current);
        loadArtisans(current, radius);
      },
      () => setMessage('Position non disponible. La liste complète reste accessible.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return artisans
      .map((artisan) => ({
        ...artisan,
        distance: position && artisan.latitude != null && artisan.longitude != null
          ? distanceKm(position[0], position[1], Number(artisan.latitude), Number(artisan.longitude))
          : null,
      }))
      .filter((artisan) => !needle || [artisan.artisan_nom, artisan.bio, artisan.localisation].some((value) => String(value || '').toLowerCase().includes(needle)))
      .sort((a, b) => a.distance == null ? 1 : b.distance == null ? -1 : a.distance - b.distance);
  }, [artisans, position, search]);

  const mapPoints = filtered.filter((artisan) => artisan.latitude != null && artisan.longitude != null);
  const center = position || (mapPoints[0] ? [Number(mapPoints[0].latitude), Number(mapPoints[0].longitude)] : [5.35995, -4.00826]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Proximité</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Artisans disponibles</h1>
          <p className="mt-2 text-sm leading-6 text-[#66736D]">La géolocalisation est facultative : vous pouvez toujours parcourir tous les profils publics.</p>
        </div>
        <div className="flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
          <button onClick={() => setView('list')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'list' ? 'bg-[#0B6B50] text-white' : 'text-[#66736D]'}`}>Liste</button>
          <button onClick={() => setView('map')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'map' ? 'bg-[#0B6B50] text-white' : 'text-[#66736D]'}`}>Carte</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_35px_rgba(20,38,30,0.05)] md:grid-cols-[1fr_auto_auto]">
        <label className="flex items-center gap-3 rounded-2xl bg-[#F5F7F5] px-4 py-3"><AppIcon name="search" className="h-5 w-5 text-[#0B6B50]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, commune, spécialité…" className="w-full bg-transparent text-sm outline-none" /></label>
        <select value={radius} onChange={(event) => { setRadius(event.target.value); if (position) loadArtisans(position, event.target.value); }} className="rounded-2xl border border-[#DDE5E0] px-4 py-3 text-sm"><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option></select>
        <button onClick={useMyPosition} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111815] px-5 py-3 text-sm font-black text-white"><AppIcon name="pin" className="h-4 w-4" /> Autour de moi</button>
      </div>

      {message && <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}

      {view === 'map' && (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-black/5 bg-white p-2 shadow-[0_12px_35px_rgba(20,38,30,0.06)]">
          <MapContainer key={`${center[0]}-${center[1]}-${mapPoints.length}`} center={center} zoom={position ? 12 : 10} style={{ height: '520px', width: '100%', borderRadius: '22px' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            {position && <CircleMarker center={position} radius={9} pathOptions={{ color: '#0B6B50', fillColor: '#0B6B50', fillOpacity: 0.9 }}><Popup>Votre position approximative</Popup></CircleMarker>}
            {mapPoints.map((artisan) => <Marker key={artisan.id} position={[Number(artisan.latitude), Number(artisan.longitude)]}><Popup><strong>{artisan.artisan_nom}</strong><br />{artisan.localisation || 'Localisation non précisée'}<br /><Link to={`/artisans/${artisan.artisan_nom}`}>Voir le profil</Link></Popup></Marker>)}
          </MapContainer>
        </div>
      )}

      {view === 'list' && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#718078]">{loading ? 'Chargement…' : `${filtered.length} artisan${filtered.length > 1 ? 's' : ''}`}</p>
          {loading ? <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl bg-white" />)}</div> : filtered.length === 0 ? <div className="mt-5 rounded-3xl border border-dashed border-[#CAD5CF] bg-white p-10 text-center text-sm text-[#718078]">Aucun artisan ne correspond à cette recherche.</div> : (
            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((artisan) => (
                <article key={artisan.id} className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_35px_rgba(20,38,30,0.06)]">
                  <div className="relative h-36 bg-gradient-to-br from-[#DCEDE6] via-[#F1F5F2] to-[#FFF1E4]">{artisan.photo_couverture && <img src={artisan.photo_couverture} alt="" className="h-full w-full object-cover" />}<span className="absolute bottom-3 left-4 grid h-14 w-14 place-items-center rounded-2xl border-4 border-white bg-[#0B6B50] text-lg font-black text-white">{String(artisan.artisan_nom || 'A').slice(0,1).toUpperCase()}</span></div>
                  <div className="p-5 pt-6">
                    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{artisan.artisan_nom}</h2>{artisan.artisan_verified && <span className="rounded-full bg-[#EAF4F0] px-2 py-1 text-[10px] font-black text-[#0B6B50]">✓ Vérifié</span>}</div><p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#718078]"><AppIcon name="pin" className="h-3.5 w-3.5" />{artisan.localisation || 'Localisation non renseignée'}</p></div>{artisan.distance != null && <span className="rounded-full bg-[#EAF4F0] px-2.5 py-1 text-xs font-black text-[#0B6B50]">{artisan.distance.toFixed(1)} km</span>}</div>
                    <p className="mt-4 line-clamp-3 min-h-[60px] text-sm leading-5 text-[#66736D]">{artisan.bio || 'Cet artisan n’a pas encore renseigné sa présentation.'}</p>
                    <div className="mt-5 flex gap-2"><Link to={`/artisans/${artisan.artisan_nom}`} className="flex-1 rounded-xl bg-[#0B6B50] px-4 py-2.5 text-center text-sm font-black text-white">Voir le profil</Link><Link to={`/client/messagerie/${artisan.artisan_nom}`} className="grid h-10 w-11 place-items-center rounded-xl bg-[#F2F5F3] text-[#526159]" aria-label={`Écrire à ${artisan.artisan_nom}`}><AppIcon name="chat" className="h-5 w-5" /></Link></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

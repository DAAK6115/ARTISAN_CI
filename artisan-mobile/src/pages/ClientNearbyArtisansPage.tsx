import { useQuery } from '@tanstack/react-query';
import { divIcon } from 'leaflet';
import {
  Crosshair,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { MobileTopBar } from '../components/MobileTopBar';
import { getNearbyArtisans } from '../features/client/client.api';
import { getServices } from '../features/home/services.api';
import type { PublicPortfolio } from '../features/portfolio/portfolio.api';
import { env } from '../lib/env';

interface Coordinates {
  lat: number;
  lng: number;
}

interface NearbyArtisanItem {
  artisan: PublicPortfolio;
  position: Coordinates;
  distance: number;
}

function distanceKm(a: Coordinates, b: Coordinates): number {
  const earthRadius = 6371;
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function Recenter({ coordinates }: { coordinates: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([coordinates.lat, coordinates.lng], Math.max(map.getZoom(), 12), { animate: true });
  }, [coordinates.lat, coordinates.lng, map]);
  return null;
}

function artisanCoordinates(artisan: PublicPortfolio): Coordinates | null {
  if (artisan.latitude == null || artisan.longitude == null) return null;
  const lat = Number(artisan.latitude);
  const lng = Number(artisan.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function geolocationMessage(code?: number): string {
  if (code === 1) return 'Autorisez la localisation dans votre navigateur pour afficher les artisans proches.';
  if (code === 2) return 'Votre position est momentanément indisponible.';
  if (code === 3) return 'La recherche de position a pris trop de temps. Réessayez.';
  return 'Impossible d’obtenir votre position. Vérifiez la localisation de votre téléphone.';
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'A';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

function mapMarkerIcon(selected = false) {
  const background = selected ? '#D46B24' : '#0B6B50';
  return divIcon({
    className: '',
    iconSize: [38, 44],
    iconAnchor: [19, 41],
    html: `
      <div style="position:relative;width:38px;height:44px;filter:drop-shadow(0 8px 10px rgba(17,24,21,.18));">
        <div style="position:absolute;left:6px;top:3px;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${background};border:3px solid white;"></div>
        <div style="position:absolute;left:15px;top:12px;width:8px;height:8px;border-radius:999px;background:white;"></div>
      </div>
    `,
  });
}

function SelectedArtisanCard({
  item,
  onClose,
}: {
  item: NearbyArtisanItem;
  onClose: () => void;
}) {
  const { artisan, position, distance } = item;
  const services = useQuery({
    queryKey: ['nearby-artisan-services', artisan.artisan_nom],
    queryFn: () => getServices({ artisan: artisan.artisan_nom }),
    staleTime: 5 * 60 * 1000,
  });

  const serviceList = Array.isArray(services.data) ? services.data : [];
  const categories = Array.from(new Set(serviceList.map((service) => service.categorie_label || service.categorie))).slice(0, 2);
  const serviceNames = Array.from(new Set(serviceList.map((service) => service.titre))).slice(0, 3);

  function openDirections() {
    const destination = `${position.lat},${position.lng}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <div
      className="absolute inset-x-3 bottom-3 z-[700] overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-[0_28px_70px_rgba(16,47,34,0.28)]"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative h-[76px] overflow-hidden bg-gradient-to-r from-[#0B6B50] via-[#0D7A5A] to-[#0A4F3C]">
        {artisan.photo_couverture ? (
          <img src={artisan.photo_couverture} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(231,180,81,.30),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(212,107,36,.35),_transparent_30%)]" />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/92 text-[#344139] shadow-sm backdrop-blur"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative px-4 pb-4 pt-6">
        <div className="absolute -top-6 left-4 grid size-12 place-items-center rounded-[16px] border-4 border-white bg-[var(--artisan-green)] text-base font-black text-white shadow-sm">
          {initials(artisan.artisan_nom)}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-black tracking-[-0.03em] text-[var(--artisan-ink)]">{artisan.artisan_nom}</h3>
            {categories.length ? (
              <p className="mt-2 text-[11px] font-black uppercase leading-4 tracking-[0.08em] text-[var(--artisan-green)]">
                {categories.join(' · ')}
              </p>
            ) : null}
          </div>
          {artisan.artisan_verified ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--artisan-green-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--artisan-green)]">
              <ShieldCheck size={12} /> Vérifié
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-2 text-[12px] text-[#64726B]">
          <div className="flex items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--artisan-green)]" />
            <span className="min-w-0 flex-1 leading-5">{artisan.localisation || 'Localisation renseignée sur la carte'}</span>
            <strong className="shrink-0 text-[var(--artisan-ink)]">{distance.toFixed(distance < 10 ? 1 : 0)} km</strong>
          </div>

          {serviceNames.length ? (
            <div className="flex items-start gap-2">
              <UserRound size={15} className="mt-0.5 shrink-0 text-[var(--artisan-green)]" />
              <span className="line-clamp-2 leading-5">{serviceNames.join(' · ')}</span>
            </div>
          ) : services.isPending ? (
            <div className="h-4 w-40 animate-pulse rounded-full bg-[#EEF1EF]" />
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            to={`/client/artisans/${encodeURIComponent(artisan.artisan_nom)}`}
            className="flex min-h-11 items-center justify-center rounded-2xl bg-[var(--artisan-green)] px-2 text-[12px] font-black text-white"
          >
            Profil
          </Link>
          <Link
            to={`/client/messages/${artisan.artisan_id}?username=${encodeURIComponent(artisan.artisan_nom)}`}
            className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-[var(--artisan-green-soft)] px-2 text-[12px] font-black text-[var(--artisan-green)]"
          >
            <MessageCircle size={14} /> Message
          </Link>
          <button
            type="button"
            onClick={openDirections}
            className="flex min-h-11 items-center justify-center gap-1 rounded-2xl border border-[#DDE5E0] bg-white px-2 text-[12px] font-black text-[#315348]"
          >
            <Route size={14} /> Itinéraire
          </button>
        </div>

        <button
          type="button"
          onClick={openDirections}
          className="mt-3 flex w-full items-center justify-center gap-1 border-t border-black/5 pt-3 text-[10px] font-bold text-[#7A8780]"
        >
          <Navigation size={12} /> Ouvrir dans mon application GPS
        </button>
      </div>
    </div>
  );
}

export function ClientNearbyArtisansPage() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState(10);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selected, setSelected] = useState<NearbyArtisanItem | null>(null);

  const nearby = useQuery({
    queryKey: ['nearby-artisans', coordinates?.lat, coordinates?.lng, radius],
    queryFn: () => getNearbyArtisans({ lat: coordinates!.lat, lng: coordinates!.lng, radius }),
    enabled: Boolean(coordinates),
  });

  const nearbyArtisans = Array.isArray(nearby.data) ? nearby.data : [];

  const sorted = useMemo(() => {
    if (!coordinates) return [];
    return nearbyArtisans
      .map((artisan) => {
        const position = artisanCoordinates(artisan);
        return position ? { artisan, position, distance: distanceKm(coordinates, position) } : null;
      })
      .filter((item): item is NearbyArtisanItem => Boolean(item))
      .sort((a, b) => a.distance - b.distance);
  }, [nearbyArtisans, coordinates]);

  useEffect(() => {
    setSelected((current) => {
      if (!current) return null;
      return sorted.find((item) => item.artisan.id === current.artisan.id) ?? null;
    });
  }, [sorted]);

  function locate() {
    if (!('geolocation' in navigator)) {
      setLocationError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setSelected(null);
        setLocating(false);
      },
      (error) => {
        setLocationError(geolocationMessage(error.code));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  }

  return (
    <div>
      <MobileTopBar />

      <section className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[var(--artisan-shadow-card)]">
        <div className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artisan-green)]">À proximité</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--artisan-ink)]">Artisans autour de moi</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--artisan-muted)]">Autorisez votre position pour afficher les profils publics situés dans le rayon choisi.</p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--artisan-green)] px-4 text-sm font-black text-white disabled:opacity-60"
            >
              <LocateFixed size={18} /> {locating ? 'Localisation…' : coordinates ? 'Actualiser ma position' : 'Utiliser ma position'}
            </button>
          </div>

          <label className="mt-4 block">
            <span className="flex items-center gap-2 text-xs font-black text-[#45534C]"><SlidersHorizontal size={14} /> Rayon de recherche</span>
            <select
              value={radius}
              onChange={(event) => {
                setRadius(Number(event.target.value));
                setSelected(null);
              }}
              className="mt-2 min-h-12 w-full rounded-2xl border border-[#DDE5E0] bg-[#F7F8F6] px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-[#0B6B50]/10"
            >
              {[5, 10, 25, 50].map((value) => <option key={value} value={value}>{value} km</option>)}
            </select>
          </label>

          {locationError ? <div className="mt-4 rounded-2xl bg-[var(--artisan-danger-soft)] px-4 py-3 text-sm font-semibold text-[#A83228]">{locationError}</div> : null}
        </div>

        <div className="relative h-[470px] border-t border-black/5 bg-[var(--artisan-green-soft)]">
          {coordinates ? (
            <MapContainer
              center={[coordinates.lat, coordinates.lng]}
              zoom={12}
              scrollWheelZoom
              className="h-full w-full"
              zoomControl
            >
              <Recenter coordinates={coordinates} />
              <TileLayer attribution={env.mapAttribution} url={env.mapTileUrl} />

              <CircleMarker
                center={[coordinates.lat, coordinates.lng]}
                radius={8}
                pathOptions={{ color: '#FFFFFF', fillColor: '#2F80ED', fillOpacity: 1, weight: 3 }}
              />

              {sorted.map((item) => (
                <Marker
                  key={item.artisan.id}
                  position={[item.position.lat, item.position.lng]}
                  icon={mapMarkerIcon(selected?.artisan.id === item.artisan.id)}
                  eventHandlers={{ click: () => setSelected(item) }}
                />
              ))}
            </MapContainer>
          ) : (
            <div className="grid h-full place-items-center px-8 text-center">
              <div>
                <span className="mx-auto grid size-16 place-items-center rounded-[22px] bg-white text-[var(--artisan-green)] shadow-sm"><Crosshair size={28} /></span>
                <p className="mt-4 text-base font-black text-[var(--artisan-ink)]">Votre position n’est pas encore utilisée</p>
                <p className="mt-2 text-sm leading-6 text-[var(--artisan-muted)]">Appuyez sur « Utiliser ma position ». ARTISAN_CI envoie uniquement les coordonnées nécessaires à cette recherche.</p>
              </div>
            </div>
          )}

          {selected ? <SelectedArtisanCard item={selected} onClose={() => setSelected(null)} /> : null}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--artisan-green)]">Résultats</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--artisan-ink)]">{coordinates ? `${sorted.length} artisan${sorted.length > 1 ? 's' : ''} trouvé${sorted.length > 1 ? 's' : ''}` : 'Artisans proches'}</h2>
          </div>
          {coordinates ? <span className="rounded-full bg-[var(--artisan-green-soft)] px-3 py-1.5 text-xs font-black text-[var(--artisan-green)]">≤ {radius} km</span> : null}
        </div>

        {nearby.isLoading ? <div className="mt-4 h-32 animate-pulse rounded-3xl bg-white" /> : null}
        {nearby.isError ? (
          <div className="mt-4 rounded-3xl bg-[var(--artisan-danger-soft)] p-4 text-sm font-semibold text-[#A83228]">
            Impossible de charger les artisans proches. Vérifiez la connexion puis réessayez.
          </div>
        ) : null}
        {coordinates && !nearby.isLoading && sorted.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-black/5 bg-white p-5 text-center shadow-sm">
            <MapPin className="mx-auto text-[var(--artisan-muted)]" size={26} />
            <p className="mt-3 font-black">Aucun artisan géolocalisé dans ce rayon</p>
            <p className="mt-1 text-sm text-[var(--artisan-muted)]">Essayez un rayon plus large ou consultez la recherche classique.</p>
            <Link to="/client/recherche" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--artisan-green-soft)] px-4 text-sm font-black text-[var(--artisan-green)]">Rechercher une prestation</Link>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {sorted.map(({ artisan, distance }) => (
            <Link key={artisan.id} to={`/client/artisans/${encodeURIComponent(artisan.artisan_nom)}`} className="flex items-center gap-3 rounded-3xl border border-black/5 bg-white p-4 shadow-sm active:scale-[.99]">
              <div className="size-16 shrink-0 overflow-hidden rounded-[20px] bg-gradient-to-br from-[var(--artisan-green-soft)] to-[var(--artisan-orange-soft)]">
                {artisan.photo_couverture ? <img src={artisan.photo_couverture} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[var(--artisan-green)]"><MapPin size={24} /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-black text-[var(--artisan-ink)]">{artisan.artisan_nom}</p>
                  {artisan.artisan_verified ? <ShieldCheck size={15} className="shrink-0 text-[var(--artisan-green)]" /> : null}
                </div>
                <p className="mt-1 truncate text-xs text-[var(--artisan-muted)]">{artisan.localisation || 'Localisation GPS renseignée'}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--artisan-orange-soft)] px-2.5 py-1 text-[10px] font-black text-[var(--artisan-orange)]"><Navigation size={11} /> {distance.toFixed(distance < 10 ? 1 : 0)} km</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

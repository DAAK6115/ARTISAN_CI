import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import LocationActions from '../../components/LocationActions';
import { buildNavigationLinks } from '../../utils/location';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DEFAULT_CENTER = [5.35995, -4.00826];

function MapViewport({ artisans, position }) {
  const map = useMap();

  useEffect(() => {
    const points = artisans
      .filter((artisan) => artisan.latitude != null && artisan.longitude != null)
      .map((artisan) => [Number(artisan.latitude), Number(artisan.longitude)]);

    if (position) points.push(position);

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, 10);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [45, 45], maxZoom: 14 });
  }, [artisans, map, position]);

  return null;
}

function categorySummary(artisan) {
  const labels = artisan.service_category_labels || [];
  if (labels.length === 0) return 'Prestations à découvrir';
  if (labels.length <= 2) return labels.join(' · ');
  return `${labels.slice(0, 2).join(' · ')} +${labels.length - 2}`;
}

function artisanInitial(artisan) {
  return String(artisan?.artisan_nom || 'A').slice(0, 1).toUpperCase();
}

function ArtisanAvatar({ artisan, className = '' }) {
  if (artisan?.photo_profil) {
    return <img src={artisan.photo_profil} alt={`Photo de ${artisan.artisan_nom}`} className={`object-cover ${className}`} />;
  }
  return <span className={`grid place-items-center bg-[#0B6B50] font-black text-white ${className}`}>{artisanInitial(artisan)}</span>;
}

function RatingBadge({ artisan, compact = false }) {
  if (!artisan?.review_count) return null;
  return (
    <span className={`${compact ? 'text-[10px]' : 'text-xs'} inline-flex items-center gap-1 rounded-full bg-[#FFF7DD] px-2 py-1 font-black text-[#8A6500]`}>
      ★ {Number(artisan.rating_average || 0).toFixed(1)} · {artisan.review_count} avis
    </span>
  );
}

export default function ArtisansList() {
  const [artisans, setArtisans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [position, setPosition] = useState(null);
  const [radius, setRadius] = useState('10');
  const [scope, setScope] = useState('all');
  const [view, setView] = useState('map');
  const [locating, setLocating] = useState(false);

  const loadArtisans = useCallback(async ({
    currentPosition = position,
    currentRadius = radius,
    currentSearch = search,
    currentCategory = selectedCategory,
    currentScope = scope,
    silent = false,
  } = {}) => {
    if (currentScope === 'nearby' && !currentPosition) return;

    if (!silent) setLoading(true);
    setMessage('');
    try {
      const params = {
        scope: currentScope,
        search: currentSearch.trim(),
      };

      if (currentCategory) params.category = currentCategory;
      if (currentPosition) {
        params.lat = currentPosition[0];
        params.lng = currentPosition[1];
      }
      if (currentScope === 'nearby') params.radius = Number(currentRadius);

      const response = await axios.get('/portfolio/map/', { params });
      const data = response.data || {};
      const nextCategories = data.available_categories || [];

      setArtisans(data.results || []);
      setCategories(nextCategories);

      if (currentCategory && !nextCategories.some((category) => category.value === currentCategory)) {
        setSelectedCategory('');
      }
    } catch (error) {
      const detail = error.response?.data?.localisation || error.response?.data?.detail;
      setMessage(typeof detail === 'string' ? detail : 'Impossible de charger les artisans pour le moment.');
      setArtisans([]);
      setCategories([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [position, radius, search, selectedCategory, scope]);

  const activateNearbySearch = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage('La géolocalisation n’est pas disponible sur cet appareil. Vous pouvez utiliser la recherche élargie.');
      return;
    }

    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const current = [coords.latitude, coords.longitude];
        setPosition(current);
        setScope('nearby');
        setLocating(false);
      },
      () => {
        setLocating(false);
        setScope('all');
        setMessage('Votre position n’a pas pu être obtenue. La recherche élargie reste disponible.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  // Si le client a déjà accordé la permission de géolocalisation, la page
  // démarre directement sur les artisans proches sans provoquer un nouveau prompt.
  useEffect(() => {
    if (!navigator.permissions?.query || !navigator.geolocation) return;
    navigator.permissions.query({ name: 'geolocation' })
      .then((permission) => {
        if (permission.state === 'granted') activateNearbySearch();
      })
      .catch(() => {});
  }, [activateNearbySearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadArtisans();
    }, search.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadArtisans, search, selectedCategory, radius, scope, position]);

  useAutoRefresh(() => loadArtisans({ silent: true }), { intervalMs: 30000 });

  const mapPoints = useMemo(
    () => artisans.filter((artisan) => artisan.latitude != null && artisan.longitude != null),
    [artisans],
  );

  const resultLabel = loading
    ? 'Recherche en cours…'
    : `${artisans.length} artisan${artisans.length > 1 ? 's' : ''} trouvé${artisans.length > 1 ? 's' : ''}`;

  const setSearchEverywhere = () => {
    setScope('all');
    setMessage('Recherche élargie activée : vous pouvez saisir une ville, une commune, un métier ou une spécialité.');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0B6B50]">Proximité</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Artisans disponibles</h1>
          <p className="mt-2 text-sm leading-6 text-[#66736D]">
            Trouvez les artisans réellement disponibles autour de vous, ou élargissez la recherche où vous le souhaitez.
          </p>
        </div>
        <div className="flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
          <button onClick={() => setView('list')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'list' ? 'bg-[#0B6B50] text-white' : 'text-[#66736D]'}`}>Liste</button>
          <button onClick={() => setView('map')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === 'map' ? 'bg-[#0B6B50] text-white' : 'text-[#66736D]'}`}>Carte</button>
        </div>
      </div>

      <section className="mt-6 rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_35px_rgba(20,38,30,0.05)]">
        <div className="flex flex-col gap-3 xl:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-2xl bg-[#F5F7F5] px-4 py-3">
            <AppIcon name="search" className="h-5 w-5 shrink-0 text-[#0B6B50]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={scope === 'nearby' ? 'Métier, spécialité, nom…' : 'Métier, spécialité, ville, commune…'}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="min-w-[220px] rounded-2xl border border-[#DDE5E0] bg-white px-4 py-3 text-sm font-semibold text-[#334139]"
          >
            <option value="">Toutes les catégories disponibles</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label} ({category.count})
              </option>
            ))}
          </select>

          {scope === 'nearby' && (
            <select
              value={radius}
              onChange={(event) => setRadius(event.target.value)}
              className="rounded-2xl border border-[#DDE5E0] bg-white px-4 py-3 text-sm font-semibold"
              aria-label="Rayon de recherche"
            >
              <option value="5">Dans 5 km</option>
              <option value="10">Dans 10 km</option>
              <option value="25">Dans 25 km</option>
              <option value="50">Dans 50 km</option>
              <option value="100">Dans 100 km</option>
            </select>
          )}

          {scope === 'nearby' ? (
            <button onClick={setSearchEverywhere} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DDE5E0] bg-white px-5 py-3 text-sm font-black text-[#334139] hover:bg-[#F5F7F5]">
              <AppIcon name="search" className="h-4 w-4" /> Élargir la recherche
            </button>
          ) : (
            <button onClick={activateNearbySearch} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111815] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
              <AppIcon name="pin" className="h-4 w-4" /> {locating ? 'Localisation…' : 'Autour de moi'}
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${scope === 'nearby' ? 'bg-[#EAF4F0] text-[#0B6B50]' : 'bg-[#FFF1E4] text-[#9A521C]'}`}>
            {scope === 'nearby' ? `Autour de vous · ${radius} km` : 'Recherche élargie'}
          </span>
          {categories.slice(0, 6).map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === category.value ? '' : category.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedCategory === category.value ? 'border-[#0B6B50] bg-[#0B6B50] text-white' : 'border-[#DDE5E0] bg-white text-[#526159] hover:border-[#AFC5BA]'}`}
            >
              {category.label} · {category.count}
            </button>
          ))}
        </div>
      </section>

      {message && <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#718078]">{resultLabel}</p>
        {scope === 'nearby' && (
          <p className="text-xs text-[#829087]">Seuls les artisans avec une position GPS renseignée peuvent apparaître dans la recherche de proximité.</p>
        )}
      </div>

      {view === 'map' && (
        <div className="mt-4 overflow-hidden rounded-[28px] border border-black/5 bg-white p-2 shadow-[0_12px_35px_rgba(20,38,30,0.06)]">
          <MapContainer center={DEFAULT_CENTER} zoom={10} style={{ height: '520px', width: '100%', borderRadius: '22px' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            <MapViewport artisans={mapPoints} position={position} />
            {position && (
              <CircleMarker center={position} radius={9} pathOptions={{ color: '#0B6B50', fillColor: '#0B6B50', fillOpacity: 0.9 }}>
                <Popup>Votre position approximative</Popup>
              </CircleMarker>
            )}
            {mapPoints.map((artisan) => (
              <Marker key={artisan.id} position={[Number(artisan.latitude), Number(artisan.longitude)]}>
                <Popup minWidth={250} maxWidth={270} className="artisan-map-popup">
                  {(() => {
                    const navigation = buildNavigationLinks(
                      artisan.latitude,
                      artisan.longitude,
                      artisan.artisan_nom || 'Artisan ARTISAN_CI',
                    );
                    return (
                      <div className="w-[254px] overflow-hidden bg-white text-[#1E2A24]">
                        <div className="relative h-16 overflow-hidden bg-gradient-to-br from-[#DCEDE6] via-[#F4F7F5] to-[#FFF1E4]">
                          {artisan.photo_couverture ? (
                            <img src={artisan.photo_couverture} alt="" className="h-full w-full object-cover" />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                          {artisan.distance_km != null ? (
                            <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#0B6B50] shadow-sm">
                              {Number(artisan.distance_km).toFixed(1)} km
                            </span>
                          ) : null}
                        </div>

                        <div className="relative px-3.5 pb-3.5 pt-6">
                          <ArtisanAvatar artisan={artisan} className="absolute -top-5 left-3.5 h-10 w-10 rounded-xl border-[3px] border-white shadow-md" />

                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <h3 className="min-w-0 flex-1 truncate text-[15px] font-black text-[#111815]">{artisan.artisan_nom}</h3>
                              {artisan.artisan_verified ? (
                                <span className="shrink-0 rounded-full bg-[#EAF4F0] px-1.5 py-0.5 text-[9px] font-black text-[#0B6B50]">✓ Vérifié</span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 min-h-[28px] line-clamp-2 text-[10px] font-black uppercase leading-4 tracking-[0.06em] text-[#0B6B50]">
                              {categorySummary(artisan)}
                            </p>
                            <div className="mt-1.5"><RatingBadge artisan={artisan} compact /></div>
                          </div>

                          <div className="mt-2.5 space-y-1.5 text-[12px] text-[#5F6D65]">
                            <p className="flex min-w-0 items-start gap-1.5">
                              <AppIcon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0B6B50]" />
                              <span className="line-clamp-2 leading-4">{artisan.localisation || 'Localisation non précisée'}</span>
                            </p>
                            {artisan.service_titles?.length > 0 ? (
                              <p className="flex min-w-0 items-start gap-1.5">
                                <AppIcon name="tools" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0B6B50]" />
                                <span className="line-clamp-2 leading-4">{artisan.service_titles.slice(0, 2).join(' · ')}</span>
                              </p>
                            ) : null}
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <Link
                              to={`/artisans/${artisan.artisan_nom}`}
                              className="flex h-10 items-center justify-center rounded-xl bg-[#0B6B50] px-2 text-center text-[11px] font-black tracking-[0.01em] text-white shadow-sm"
                              style={{ color: '#FFFFFF' }}
                            >
                              Profil
                            </Link>
                            <Link
                              to={`/client/messagerie/${artisan.artisan_nom}`}
                              className="flex h-10 items-center justify-center rounded-xl bg-[#F2F5F3] px-2 text-center text-[11px] font-black text-[#334139]"
                              aria-label={`Écrire à ${artisan.artisan_nom}`}
                            >
                              Message
                            </Link>
                            {navigation ? (
                              <a
                                href={navigation.google}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-10 items-center justify-center rounded-xl border border-[#DDE5E0] bg-white px-2 text-center text-[11px] font-black text-[#0B6B50]"
                              >
                                Itinéraire
                              </a>
                            ) : <span />}
                          </div>

                          {navigation ? (
                            <details className="mt-2 border-t border-black/5 pt-2">
                              <summary className="cursor-pointer list-none text-center text-[10px] font-bold text-[#718078] hover:text-[#0B6B50]">
                                Autres GPS
                              </summary>
                              <div className="mt-2">
                                <LocationActions
                                  latitude={artisan.latitude}
                                  longitude={artisan.longitude}
                                  label={artisan.artisan_nom || 'Artisan ARTISAN_CI'}
                                  compact
                                />
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {!loading && mapPoints.length === 0 && (
            <div className="border-t border-black/5 px-4 py-4 text-center text-sm text-[#718078]">
              Aucun artisan géolocalisé ne correspond à cette recherche. Essayez d’augmenter le rayon ou d’élargir la recherche.
            </div>
          )}
        </div>
      )}

      {view === 'list' && (
        <div className="mt-4">
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl bg-white" />)}</div>
          ) : artisans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#CAD5CF] bg-white p-10 text-center">
              <p className="font-black text-[#334139]">Aucun artisan ne correspond à cette recherche.</p>
              <p className="mt-2 text-sm text-[#718078]">Augmentez le rayon, retirez un filtre ou lancez une recherche élargie.</p>
              {scope === 'nearby' && <button onClick={setSearchEverywhere} className="mt-4 rounded-xl bg-[#0B6B50] px-4 py-2.5 text-sm font-black text-white">Rechercher hors de ma zone</button>}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {artisans.map((artisan) => (
                <article key={artisan.id} className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_35px_rgba(20,38,30,0.06)]">
                  <div className="relative h-36 bg-gradient-to-br from-[#DCEDE6] via-[#F1F5F2] to-[#FFF1E4]">
                    {artisan.photo_couverture && <img src={artisan.photo_couverture} alt="" className="h-full w-full object-cover" />}
                    <ArtisanAvatar artisan={artisan} className="absolute bottom-3 left-4 h-14 w-14 rounded-2xl border-4 border-white shadow-sm" />
                  </div>
                  <div className="p-5 pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black">{artisan.artisan_nom}</h2>
                          {artisan.artisan_verified && <span className="rounded-full bg-[#EAF4F0] px-2 py-1 text-[10px] font-black text-[#0B6B50]">✓ Vérifié</span>}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#718078]"><AppIcon name="pin" className="h-3.5 w-3.5" />{artisan.localisation || 'Localisation non renseignée'}</p>
                      </div>
                      {artisan.distance_km != null && <span className="rounded-full bg-[#EAF4F0] px-2.5 py-1 text-xs font-black text-[#0B6B50]">{Number(artisan.distance_km).toFixed(1)} km</span>}
                    </div>

                    <p className="mt-3 text-xs font-black uppercase tracking-[0.08em] text-[#0B6B50]">{categorySummary(artisan)}</p>
                    <div className="mt-2"><RatingBadge artisan={artisan} /></div>
                    {artisan.service_titles?.length > 0 && <p className="mt-2 line-clamp-2 text-xs text-[#829087]">{artisan.service_titles.slice(0, 3).join(' · ')}</p>}
                    <p className="mt-4 line-clamp-3 min-h-[60px] text-sm leading-5 text-[#66736D]">{artisan.bio || 'Cet artisan n’a pas encore renseigné sa présentation.'}</p>
                    <div className="mt-5 flex gap-2">
                      <Link to={`/artisans/${artisan.artisan_nom}`} className="flex-1 rounded-xl bg-[#0B6B50] px-4 py-2.5 text-center text-sm font-black text-white">Voir le profil</Link>
                      <Link to={`/client/messagerie/${artisan.artisan_nom}`} className="grid h-10 w-11 place-items-center rounded-xl bg-[#F2F5F3] text-[#526159]" aria-label={`Écrire à ${artisan.artisan_nom}`}><AppIcon name="chat" className="h-5 w-5" /></Link>
                    </div>
                    {artisan.latitude != null && artisan.longitude != null && (
                      <div className="mt-4 border-t border-black/5 pt-4">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-[#66736D]">
                          <AppIcon name="pin" className="h-3.5 w-3.5" /> Itinéraire vers l’artisan
                        </p>
                        <LocationActions
                          latitude={artisan.latitude}
                          longitude={artisan.longitude}
                          label={artisan.artisan_nom || 'Artisan ARTISAN_CI'}
                          compact
                        />
                      </div>
                    )}
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

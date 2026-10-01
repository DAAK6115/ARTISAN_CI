import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosInstance';
import AppIcon from '../../components/AppIcon';
import LocationActions from '../../components/LocationActions';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import MapboxArtisanMap from '../../components/MapboxArtisanMap';

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

function availabilityLabel(artisan) {
  if (!artisan?.next_available_at) return null;
  const date = new Date(artisan.next_available_at);
  if (Number.isNaN(date.getTime())) return null;
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  if (artisan.available_today) return `Disponible aujourd’hui à ${time}`;
  const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  return `Prochain créneau ${day} à ${time}`;
}

function travelLabel(artisan, approximateOrigin = false) {
  if (!approximateOrigin && artisan?.route_distance_km != null) {
    const distance = `${Number(artisan.route_distance_km).toFixed(1)} km`;
    const duration = artisan.route_duration_minutes != null ? ` · ${artisan.route_duration_minutes} min` : '';
    return `${distance}${duration}`;
  }
  if (artisan?.distance_km != null) {
    return approximateOrigin
      ? `≈ ${Number(artisan.distance_km).toFixed(1)} km depuis votre zone`
      : `${Number(artisan.distance_km).toFixed(1)} km à vol d’oiseau`;
  }
  return null;
}

export default function ArtisansList() {
  const [artisans, setArtisans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [position, setPosition] = useState(null);
  const [positionSource, setPositionSource] = useState(null);
  const [approximateLocation, setApproximateLocation] = useState(null);
  const [gpsUnavailable, setGpsUnavailable] = useState(false);
  const [approximateLocating, setApproximateLocating] = useState(false);
  const [radius, setRadius] = useState('10');
  const [proximityMode, setProximityMode] = useState('distance');
  const [travelTime, setTravelTime] = useState('30');
  const [isochrone, setIsochrone] = useState(null);
  const [isochroneLoading, setIsochroneLoading] = useState(false);
  const [scope, setScope] = useState('all');
  const [view, setView] = useState('map');
  const [locating, setLocating] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [homeServiceOnly, setHomeServiceOnly] = useState(false);
  const [coveredOnly, setCoveredOnly] = useState(false);
  const [availability, setAvailability] = useState('');
  const [availableFilters, setAvailableFilters] = useState({
    verified: 0,
    home_service: 0,
    covered: 0,
    availability_today: 0,
    availability_7d: 0,
    rating_options: [],
  });
  const [routing, setRouting] = useState({ requested: false, configured: false, provider: 'openrouteservice', profile: 'driving-car' });

  const loadArtisans = useCallback(async ({
    currentPosition = position,
    currentPositionSource = positionSource,
    currentRadius = radius,
    currentProximityMode = proximityMode,
    currentTravelTime = travelTime,
    currentSearch = search,
    currentCategory = selectedCategory,
    currentScope = scope,
    currentMinRating = minRating,
    currentVerifiedOnly = verifiedOnly,
    currentHomeServiceOnly = homeServiceOnly,
    currentCoveredOnly = coveredOnly,
    currentAvailability = availability,
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
      if (currentMinRating) params.min_rating = currentMinRating;
      if (currentVerifiedOnly) params.verified = 'true';
      if (currentHomeServiceOnly) params.home_service = 'true';
      if (currentCoveredOnly && currentPositionSource === 'gps') params.covered = 'true';
      if (currentAvailability) params.availability = currentAvailability;
      if (currentPosition) {
        params.lat = currentPosition[0];
        params.lng = currentPosition[1];
        if (currentPositionSource === 'gps') params.route_metrics = 'true';
      }
      if (currentScope === 'nearby') {
        if (currentProximityMode === 'time' && currentPositionSource === 'gps') params.travel_time_minutes = Number(currentTravelTime);
        else params.radius = Number(currentRadius);
      }

      const response = await axios.get('/portfolio/map/', { params });
      const data = response.data || {};
      const nextCategories = data.available_categories || [];

      setArtisans(data.results || []);
      setCategories(nextCategories);
      setRouting(data.routing || { requested: Boolean(currentPosition), configured: false, provider: 'openrouteservice', profile: 'driving-car' });
      setAvailableFilters(data.available_filters || {
        verified: 0,
        home_service: 0,
        covered: 0,
        availability_today: 0,
        availability_7d: 0,
        rating_options: [],
      });

      if (currentCategory && !nextCategories.some((category) => category.value === currentCategory)) {
        setSelectedCategory('');
      }
    } catch (error) {
      const detail = error.response?.data?.localisation || error.response?.data?.detail;
      setMessage(typeof detail === 'string' ? detail : 'Impossible de charger les artisans pour le moment.');
      setArtisans([]);
      setCategories([]);
      setRouting({ requested: Boolean(currentPosition), configured: false, provider: 'openrouteservice', profile: 'driving-car' });
      setAvailableFilters({ verified: 0, home_service: 0, covered: 0, availability_today: 0, availability_7d: 0, rating_options: [] });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [position, positionSource, radius, proximityMode, travelTime, search, selectedCategory, scope, minRating, verifiedOnly, homeServiceOnly, coveredOnly, availability]);

  const activateNearbySearch = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsUnavailable(true);
      setMessage('La géolocalisation n’est pas disponible sur cet appareil. Vous pouvez utiliser la recherche élargie ou une zone approximative.');
      return;
    }

    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const current = [coords.latitude, coords.longitude];
        setPosition(current);
        setPositionSource('gps');
        setApproximateLocation(null);
        setGpsUnavailable(false);
        setScope('nearby');
        setLocating(false);
      },
      () => {
        setLocating(false);
        setGpsUnavailable(true);
        setScope('all');
        setMessage('Votre GPS n’a pas pu être utilisé. Vous pouvez rechercher partout ou utiliser une zone approximative.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const activateApproximateSearch = useCallback(async () => {
    setApproximateLocating(true);
    setMessage('');
    try {
      const response = await axios.get('/portfolio/location/approximate/');
      const data = response.data || {};
      if (data.latitude == null || data.longitude == null) throw new Error('Position approximative invalide.');
      const recommendedRadius = String(Math.max(25, Math.min(100, Number(data.recommended_radius_km || 25))));
      setPosition([Number(data.latitude), Number(data.longitude)]);
      setPositionSource('ip');
      setApproximateLocation(data);
      setRadius(recommendedRadius);
      setProximityMode('distance');
      setCoveredOnly(false);
      setIsochrone(null);
      setScope('nearby');
      setGpsUnavailable(true);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessage(detail || 'La localisation approximative n’est pas disponible. Utilisez la recherche élargie ou saisissez une ville.');
    } finally {
      setApproximateLocating(false);
    }
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
  }, [loadArtisans, search, selectedCategory, radius, proximityMode, travelTime, scope, position, positionSource, minRating, verifiedOnly, homeServiceOnly, coveredOnly, availability]);

  useEffect(() => {
    let active = true;
    if (scope !== 'nearby' || proximityMode !== 'time' || positionSource !== 'gps' || !position || !routing.configured) {
      setIsochrone(null);
      setIsochroneLoading(false);
      return () => { active = false; };
    }

    setIsochroneLoading(true);
    axios.post('/portfolio/isochrone/', {
      lat: Number(position[0]),
      lng: Number(position[1]),
      minutes: Number(travelTime),
    })
      .then((response) => {
        if (active) setIsochrone(response.data || null);
      })
      .catch(() => {
        if (active) setIsochrone(null);
      })
      .finally(() => {
        if (active) setIsochroneLoading(false);
      });

    return () => { active = false; };
  }, [position, positionSource, proximityMode, routing.configured, scope, travelTime]);

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
    setIsochrone(null);
    setCoveredOnly(false);
    setMessage('Recherche élargie activée : vous pouvez saisir une ville, une commune, un métier ou une spécialité.');
  };

  const advancedFilterCount = [Boolean(minRating), verifiedOnly, homeServiceOnly, coveredOnly, Boolean(availability)].filter(Boolean).length;
  const clearAdvancedFilters = () => {
    setMinRating('');
    setVerifiedOnly(false);
    setHomeServiceOnly(false);
    setCoveredOnly(false);
    setAvailability('');
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-2xl bg-[#F5F7F5] p-1 ring-1 ring-black/5" aria-label="Mode de proximité">
                <button
                  type="button"
                  onClick={() => setProximityMode('distance')}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${proximityMode === 'distance' ? 'bg-white text-[#0B6B50] shadow-sm' : 'text-[#718078]'}`}
                >
                  Distance
                </button>
                <button
                  type="button"
                  onClick={() => setProximityMode('time')}
                  disabled={!routing.configured || positionSource !== 'gps'}
                  title={positionSource !== 'gps' ? 'Le temps de trajet nécessite votre position GPS précise' : (routing.configured ? 'Rechercher par temps de trajet réel' : 'Configurez openrouteservice pour utiliser ce mode')}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${proximityMode === 'time' ? 'bg-[#0B6B50] text-white shadow-sm' : 'text-[#718078]'} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Temps de trajet
                </button>
              </div>

              {proximityMode === 'time' ? (
                <select
                  value={travelTime}
                  onChange={(event) => setTravelTime(event.target.value)}
                  className="rounded-2xl border border-[#DDE5E0] bg-white px-4 py-3 text-sm font-semibold"
                  aria-label="Temps de trajet maximal"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 heure</option>
                </select>
              ) : (
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
            </div>
          )}

          {scope === 'nearby' ? (
            <button onClick={setSearchEverywhere} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DDE5E0] bg-white px-5 py-3 text-sm font-black text-[#334139] hover:bg-[#F5F7F5]">
              <AppIcon name="search" className="h-4 w-4" /> Élargir la recherche
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button onClick={activateNearbySearch} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111815] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                <AppIcon name="pin" className="h-4 w-4" /> {locating ? 'Localisation…' : 'Autour de moi'}
              </button>
              <button onClick={activateApproximateSearch} disabled={approximateLocating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DDE5E0] bg-white px-4 py-3 text-sm font-black text-[#526159] disabled:opacity-60">
                <AppIcon name="pin" className="h-4 w-4" /> {approximateLocating ? 'Recherche…' : (gpsUnavailable ? 'Utiliser ma zone approximative' : 'Sans GPS ?')}
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${scope === 'nearby' ? 'bg-[#EAF4F0] text-[#0B6B50]' : 'bg-[#FFF1E4] text-[#9A521C]'}`}>
            {scope === 'nearby'
              ? (positionSource === 'ip'
                ? `Zone approximative · ${radius} km`
                : (proximityMode === 'time' ? `Accessible en ≤ ${travelTime === '60' ? '1 h' : `${travelTime} min`}` : `Autour de vous · ${radius} km`))
              : 'Recherche élargie'}
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

        {(availableFilters.verified > 0 || availableFilters.home_service > 0 || (positionSource === 'gps' && availableFilters.covered > 0) || availableFilters.availability_today > 0 || availableFilters.availability_7d > 0 || availableFilters.rating_options?.length > 0) && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#718078]">Filtres disponibles dans cette recherche</p>
              {advancedFilterCount > 0 && (
                <button type="button" onClick={clearAdvancedFilters} className="text-xs font-black text-[#B85D1C] hover:underline">
                  Réinitialiser ({advancedFilterCount})
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {availableFilters.verified > 0 && (
                <button
                  type="button"
                  onClick={() => setVerifiedOnly((value) => !value)}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${verifiedOnly ? 'border-[#0B6B50] bg-[#0B6B50] text-white' : 'border-[#DDE5E0] bg-white text-[#334139]'}`}
                >
                  ✓ Vérifiés · {availableFilters.verified}
                </button>
              )}
              {availableFilters.home_service > 0 && (
                <button
                  type="button"
                  onClick={() => setHomeServiceOnly((value) => !value)}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${homeServiceOnly ? 'border-[#0B6B50] bg-[#0B6B50] text-white' : 'border-[#DDE5E0] bg-white text-[#334139]'}`}
                >
                  Chez le client · {availableFilters.home_service}
                </button>
              )}
              {scope === 'nearby' && positionSource === 'gps' && availableFilters.covered > 0 && (
                <button
                  type="button"
                  onClick={() => setCoveredOnly((value) => !value)}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${coveredOnly ? 'border-[#0B6B50] bg-[#0B6B50] text-white' : 'border-[#DDE5E0] bg-white text-[#334139]'}`}
                >
                  ✓ Dans ma zone · {availableFilters.covered}
                </button>
              )}
              {(availableFilters.availability_today > 0 || availableFilters.availability_7d > 0) && (
                <select
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                  className="rounded-full border border-[#DDE5E0] bg-white px-3 py-2 text-xs font-black text-[#334139]"
                  aria-label="Filtrer par disponibilité"
                >
                  <option value="">Toutes disponibilités</option>
                  {availableFilters.availability_today > 0 && <option value="today">Aujourd’hui ({availableFilters.availability_today})</option>}
                  {availableFilters.availability_7d > 0 && <option value="7d">Sous 7 jours ({availableFilters.availability_7d})</option>}
                </select>
              )}
              {availableFilters.rating_options?.length > 0 && (
                <select
                  value={minRating}
                  onChange={(event) => setMinRating(event.target.value)}
                  className="rounded-full border border-[#DDE5E0] bg-white px-3 py-2 text-xs font-black text-[#334139]"
                  aria-label="Filtrer par note minimale"
                >
                  <option value="">Toutes les notes</option>
                  {availableFilters.rating_options.map((option) => (
                    <option key={option.value} value={option.value}>★ {option.label} ({option.count})</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </section>

      {message && <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}
      {positionSource === 'ip' && approximateLocation && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#F2D1B8] bg-[#FFF8F1] px-4 py-3 text-sm text-[#7A4B28] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black">Position approximative : {approximateLocation.label}</p>
            <p className="mt-1 text-xs leading-5">Cette estimation vient de votre connexion Internet{approximateLocation.accuracy_km ? ` (précision indicative ≈ ${approximateLocation.accuracy_km} km)` : ''}. Les trajets précis et la vérification des zones nécessitent le GPS.</p>
          </div>
          <button type="button" onClick={activateNearbySearch} disabled={locating} className="shrink-0 rounded-xl bg-[#0B6B50] px-3 py-2 text-xs font-black text-white disabled:opacity-60">Utiliser mon GPS</button>
        </div>
      )}
      {position && positionSource === 'gps' && routing.requested && !routing.configured && (
        <div className="mt-4 rounded-2xl border border-[#DDE5E0] bg-white px-4 py-3 text-xs font-semibold text-[#66736D]">
          Les temps de trajet routiers ne sont pas configurés sur le backend. Les distances affichées restent provisoirement à vol d’oiseau.
        </div>
      )}

      {scope === 'nearby' && proximityMode === 'time' && isochroneLoading && (
        <div className="mt-4 rounded-2xl border border-[#DDE5E0] bg-white px-4 py-3 text-xs font-semibold text-[#66736D]">
          Calcul de la zone accessible en {travelTime === '60' ? '1 heure' : `${travelTime} minutes`}…
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#718078]">{resultLabel}</p>
        {scope === 'nearby' && (
          <p className="text-xs text-[#829087]">{positionSource === 'ip' ? 'La zone est approximative : utilisez votre GPS pour des distances, trajets et zones d’intervention précis.' : 'Seuls les artisans avec une position GPS renseignée peuvent apparaître dans la recherche de proximité.'}</p>
        )}
      </div>

      {view === 'map' && (
        <div className="mt-4 overflow-hidden rounded-[28px] border border-black/5 bg-white p-2 shadow-[0_12px_35px_rgba(20,38,30,0.06)]">
          <MapboxArtisanMap
            artisans={mapPoints}
            position={position}
            positionApproximate={positionSource === 'ip'}
            isochrone={scope === 'nearby' && positionSource === 'gps' && proximityMode === 'time' ? isochrone : null}
          />
          {!loading && mapPoints.length === 0 && (
            <div className="border-t border-black/5 px-4 py-4 text-center text-sm text-[#718078]">
              Aucun artisan géolocalisé ne correspond à cette recherche. Essayez d’augmenter la distance ou le temps de trajet, ou d’élargir la recherche.
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
                      {travelLabel(artisan, positionSource === 'ip') && (
                        <span className="rounded-full bg-[#EAF4F0] px-2.5 py-1 text-xs font-black text-[#0B6B50]">{travelLabel(artisan, positionSource === 'ip')}</span>
                      )}
                    </div>

                    <p className="mt-3 text-xs font-black uppercase tracking-[0.08em] text-[#0B6B50]">{categorySummary(artisan)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RatingBadge artisan={artisan} />
                      {artisan.supports_home_service && <span className="rounded-full bg-[#EAF4F0] px-2 py-1 text-[10px] font-black text-[#0B6B50]">Chez le client</span>}
                      {positionSource === 'gps' && artisan.client_coverage_status === 'covered' && <span className="rounded-full bg-[#EAF4F0] px-2 py-1 text-[10px] font-black text-[#0B6B50]">✓ Votre position est couverte</span>}
                      {positionSource === 'gps' && artisan.client_coverage_status === 'outside' && <span className="rounded-full bg-[#FFF1E6] px-2 py-1 text-[10px] font-black text-[#A4561D]">Hors zone habituelle</span>}
                    </div>
                    {availabilityLabel(artisan) && (
                      <p className={`mt-2 text-xs font-black ${artisan.available_today ? 'text-[#0B6B50]' : 'text-[#526159]'}`}>
                        {artisan.available_today ? '● ' : ''}{availabilityLabel(artisan)}
                      </p>
                    )}
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

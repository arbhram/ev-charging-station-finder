import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import MapView from '../components/Map/MapView';
import StationCard from '../components/Station/StationCard';
import StationDetail from '../components/Station/StationDetail';
import { LoadingSpinner, ErrorMessage } from '../components/Common/SharedComponents';
import { useGeolocation, useDebounce } from '../hooks/useCustomHooks';
import stationService from '../services/stationService';
import osmService from '../services/osmService';
import AuthContext from '../context/AuthContext';
import { favoritesService } from '../services/miscServices';

/* ── Small icon helpers ─────────────────────────────────────────── */
const Icon = {
  bolt: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  search: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  filter: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  ),
  map: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  battery: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V15H4.5v-4.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z" />
    </svg>
  ),
  close: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  chevronLeft: (cls = 'w-5 h-5') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (cls = 'w-5 h-5') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  location: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  car: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
};

const HomePage = () => {
  const { user } = useContext(AuthContext);
  const { location: userLocation, loading: geoLoading } = useGeolocation();

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [osmLoading, setOsmLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [radius, setRadius] = useState(50);
  const [quickFilters, setQuickFilters] = useState({ nearby: false, fastCharger: false, connectorType: false, availableNow: false, alongRoute: false, favorites: false });
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [connectorTypeFilter, setConnectorTypeFilter] = useState('');
  const [showConnectorPicker, setShowConnectorPicker] = useState(false);

  // Battery / range
  const [batteryPct, setBatteryPct] = useState(80);
  const [vehicleRange, setVehicleRange] = useState(400);
  const [showBatteryPanel, setShowBatteryPanel] = useState(false);
  const [reachableIds, setReachableIds] = useState(null);
  const [reachableLoading, setReachableLoading] = useState(false);
  const [reachableInfo, setReachableInfo] = useState(null);

  // Map fly-to override (when address search pans map)
  const [mapFlyTo, setMapFlyTo] = useState(null);

  // Inline route (shown when user clicks Go on a nearest station or searches a destination)
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeSteps, setRouteSteps] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [destination, setDestination] = useState(null);

  // Destination address search
  const [destInput, setDestInput] = useState('');
  const [destResults, setDestResults] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const destJustSelected = useRef(false);

  // Charging stop waypoints along route
  const [waypoints, setWaypoints] = useState([]);

  // Navigation mode
  const [isNavigating, setIsNavigating] = useState(false);
  const [navLocation, setNavLocation] = useState(null);  // { lat, lng }
  const [navHeading, setNavHeading] = useState(null);    // degrees
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const navWatchRef = useRef(null);
  const lastNavPos = useRef(null);

  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 400);
  const debouncedDest = useDebounce(destInput, 400);

  useEffect(() => {
    if (user?.vehicle?.range) setVehicleRange(user.vehicle.range);
  }, [user]);

  // Load favorites when authenticated
  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return; }
    favoritesService.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.data || data.stations || data.favorites || []);
        setFavoriteIds(new Set(list.map((s) => s._id?.toString())));
      }).catch(() => {});
  }, [user]); // eslint-disable-line

  const handleToggleFavorite = async (station) => {
    if (!user || station.source === 'osm') return;
    const id = station._id?.toString();
    const isNowFav = favoriteIds.has(id);
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      isNowFav ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      isNowFav ? await favoritesService.remove(id) : await favoritesService.add(id);
    } catch {
      // Revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isNowFav ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };

  const mergeStations = (dbStations, osmStations) => {
    const map = new Map();
    [...dbStations, ...osmStations].forEach((s) => map.set(s._id, s));
    return Array.from(map.values()).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  };

  // On mount: load all DB stations (our own API, no rate limit)
  useEffect(() => {
    setLoading(true);
    stationService.getAll({ limit: 500 })
      .then((res) => setStations(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStations = useCallback(async () => {
    if (!userLocation) return; // AU-wide load already handled above
    setLoading(true);
    setError(null);
    try {
      const params = { lat: userLocation.lat, lng: userLocation.lng, radius };
      const dbResponse = await stationService.getNearby(params.lat, params.lng, params.radius, params);
      setStations((prev) => mergeStations(dbResponse.data || [], prev));
      setLoading(false);
      setOsmLoading(true);
      osmService
        .fetchNearbyStations(userLocation.lat, userLocation.lng, radius)
        .then((osmStations) => setStations((prev) => mergeStations(prev, osmStations)))
        .catch(() => {})
        .finally(() => setOsmLoading(false));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch stations');
      setLoading(false);
    }
  }, [userLocation, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchStations(); }, [fetchStations]);

  // Search — DB by name/suburb + geocode address + OSM nearby
  useEffect(() => {
    if (!debouncedSearch) { fetchStations(); return; }
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. DB text search (name, suburb, city, state)
        const response = await stationService.getAll({ search: debouncedSearch });
        const dbStations = response.data || [];
        setStations(dbStations);
        setLoading(false);

        // 2. Geocode the query — if it resolves to a location, fly map there and load OSM nearby
        osmService.geocodeAddress(debouncedSearch).then((results) => {
          if (results.length === 0) return;
          const { lat, lng } = results[0];
          setMapFlyTo([lat, lng]);
          setOsmLoading(true);
          osmService
            .fetchNearbyStations(lat, lng, radius)
            .then((osmStations) => setStations((prev) => mergeStations(prev, osmStations)))
            .catch(() => {})
            .finally(() => setOsmLoading(false));
        }).catch(() => {});
      } catch {
        setError('Search failed');
        setLoading(false);
      }
    };
    run();
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geocode destination address input
  useEffect(() => {
    if (!debouncedDest || debouncedDest.length < 2) { setDestResults([]); return; }
    if (destJustSelected.current) { destJustSelected.current = false; return; }
    setDestLoading(true);
    osmService.geocodeAddress(debouncedDest)
      .then(setDestResults).catch(() => setDestResults([]))
      .finally(() => setDestLoading(false));
  }, [debouncedDest]); // eslint-disable-line

  // Shared route calculator — tries Mapbox first (gets steps), falls back to OSRM
  const calcRoute = async (origin, dest, wpts = []) => {
    if (!origin || !dest) return;
    setRouteLoading(true);
    setRouteCoordinates(null);
    setRouteInfo(null);
    setRouteSteps([]);
    try {
      let route;
      try { route = await osmService.fetchRouteMapbox(origin.lat, origin.lng, dest.lat, dest.lng, wpts); }
      catch { route = await osmService.fetchRoute(origin.lat, origin.lng, dest.lat, dest.lng, wpts); }
      setRouteCoordinates(route.coordinates);
      setRouteInfo({ distanceKm: route.distanceKm, durationMin: route.durationMin });
      setRouteSteps(route.steps || []);
    } catch { setError('Could not calculate route.'); }
    finally { setRouteLoading(false); }
  };

  const handleSelectDest = async (result) => {
    if (!userLocation) return;
    const dest = { lat: result.lat, lng: result.lng, name: result.shortName };
    destJustSelected.current = true;
    setDestInput(result.shortName);
    setDestResults([]);
    setDestination(dest);
    setWaypoints([]);
    setQuickFilters((prev) => ({ ...prev, alongRoute: true }));
    await calcRoute(userLocation, dest, []);
  };

  const handleAddStop = (station) => {
    if (!destination || waypoints.some((w) => w.stationId === station._id)) return;
    const [lng, lat] = station.location.coordinates;
    const next = [...waypoints, { lat, lng, name: station.name, stationId: station._id }];
    setWaypoints(next);
    calcRoute(userLocation, destination, next);
  };

  const handleRemoveStop = (stationId) => {
    const next = waypoints.filter((w) => w.stationId !== stationId);
    setWaypoints(next);
    if (destination && userLocation) calcRoute(userLocation, destination, next);
  };

  const handleCalculateReachable = async () => {
    if (!userLocation) return;
    setReachableLoading(true);
    setReachableInfo(null);
    try {
      const response = await stationService.getReachable(userLocation.lat, userLocation.lng, batteryPct, vehicleRange);
      const reachable = response.data?.stations || [];
      const safeKm = response.data?.safeDistance || 0;
      const ids = new Set(reachable.map((s) => s._id?.toString()));
      setReachableIds(ids);
      setReachableInfo({ count: reachable.length, safeKm: safeKm.toFixed(0) });
    } catch {
      setReachableInfo({ count: 0, safeKm: 0 });
      setReachableIds(new Set());
    } finally {
      setReachableLoading(false);
    }
  };

  const clearReachable = () => { setReachableIds(null); setReachableInfo(null); };

  const handleStationClick = (station) => {
    setSelectedStation(station);
    if (window.innerWidth < 1024) setSidebarOpen(true);
  };

  const handleGetDirections = async (station) => {
    if (!userLocation) return;
    const [lng, lat] = station.location.coordinates;
    const dest = { lat, lng, name: station.name };
    setDestination(dest);
    setSelectedStation(station);
    setWaypoints([]);
    setDestInput('');
    await calcRoute(userLocation, dest, []);
  };

  const handleClearRoute = () => {
    setRouteCoordinates(null);
    setRouteInfo(null);
    setRouteSteps([]);
    setDestination(null);
    setWaypoints([]);
    setDestInput('');
    setQuickFilters((p) => ({ ...p, alongRoute: false }));
    stopNavigation();
  };

  // ── Navigation ──────────────────────────────────────────────────
  const haversineBearing = (lat1, lng1, lat2, lng2) => {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  const distM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startNavigation = () => {
    if (!destination || !routeCoordinates) return;
    setIsNavigating(true);
    setCurrentStepIdx(0);
    navWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const prev = lastNavPos.current;
        let heading = navHeading;
        if (prev) heading = haversineBearing(prev.lat, prev.lng, lat, lng);
        lastNavPos.current = { lat, lng };
        setNavLocation({ lat, lng });
        if (heading !== null) setNavHeading(heading);
        // Advance step when within 30 m of next maneuver
        setCurrentStepIdx((idx) => {
          const next = routeSteps[idx + 1];
          if (next?.lat && next?.lng && distM(lat, lng, next.lat, next.lng) < 30) return idx + 1;
          return idx;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
  };

  const stopNavigation = () => {
    if (navWatchRef.current != null) {
      navigator.geolocation.clearWatch(navWatchRef.current);
      navWatchRef.current = null;
    }
    setIsNavigating(false);
    setNavLocation(null);
    setNavHeading(null);
    setCurrentStepIdx(0);
    lastNavPos.current = null;
  };

  // Only DB stations have valid 24-char Mongo ObjectIds and can be favorited
  const isMongoId = (id) => /^[0-9a-f]{24}$/i.test(String(id ?? ''));

  const toggleFilter = (key) => {
    setQuickFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'connectorType' && !next.connectorType) setShowConnectorPicker(false);
      if (key === 'connectorType' && next.connectorType) setShowConnectorPicker(true);
      return next;
    });
  };

  const clearFilters = () => {
    setQuickFilters({ nearby: false, fastCharger: false, connectorType: false, availableNow: false, alongRoute: false, favorites: false });
    setConnectorTypeFilter('');
    setShowConnectorPicker(false);
    setSearchQuery('');
  };

  // Haversine for along-route check
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const isNearRoute = (station, routeCoords, thresholdKm = 2) => {
    const [sLng, sLat] = station.location?.coordinates || [0, 0];
    for (let i = 0; i < routeCoords.length; i += 5) {
      if (haversineKm(sLat, sLng, routeCoords[i][0], routeCoords[i][1]) < thresholdKm) return true;
    }
    return false;
  };

  // Base list sorted by vehicle connector match then distance
  const sortedStations = user?.vehicle?.connectorType
    ? [...stations].sort((a, b) => {
        const aMatch = a.connectors?.some((c) => c.type === user.vehicle.connectorType) ? 0 : 1;
        const bMatch = b.connectors?.some((c) => c.type === user.vehicle.connectorType) ? 0 : 1;
        return aMatch - bMatch || (a.distance || 0) - (b.distance || 0);
      })
    : [...stations].sort((a, b) => (a.distance || 0) - (b.distance || 0));

  // Stations within 2 km of the active route — only these get Add Stop on hover
  const routeNearbyIds = routeCoordinates
    ? new Set(sortedStations.filter((s) => isNearRoute(s, routeCoordinates, 2)).map((s) => s._id))
    : null;

  // Apply quick filters
  let displayStations = sortedStations;
  if (quickFilters.nearby) displayStations = displayStations.filter((s) => (s.distance || 0) <= 10);
  if (quickFilters.fastCharger) displayStations = displayStations.filter((s) => s.chargerLevel === 'DC Fast Charger');
  if (quickFilters.connectorType && connectorTypeFilter) displayStations = displayStations.filter((s) => s.connectors?.some((c) => c.type === connectorTypeFilter));
  if (quickFilters.availableNow) displayStations = displayStations.filter((s) => s.connectors?.some((c) => (c.available || 0) > 0));
  if (quickFilters.alongRoute && routeCoordinates) displayStations = displayStations.filter((s) => isNearRoute(s, routeCoordinates, 2));
  if (quickFilters.favorites) displayStations = displayStations.filter((s) => favoriteIds.has(s._id?.toString()));

  const activeFiltersCount = Object.values(quickFilters).filter(Boolean).length;

  const mapCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [-33.8688, 151.2093];

  return (
    <div className="flex flex-col" style={{ height: '100dvh', paddingTop: '64px' }}>
      <div className="flex flex-1 overflow-hidden relative">

        {/* SIDEBAR */}
        <aside
          className={`absolute lg:relative z-30 h-full flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-[360px]' : 'w-0 overflow-hidden'}`}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
            {/* Title + live count */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  {Icon.bolt('w-4 h-4 text-white')}
                </div>
                <span className="text-sm font-bold text-gray-800">EV Stations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-500">
                  {displayStations.length} {osmLoading && <span className="text-green-500">+live</span>}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {/* Station search */}
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1 block">Find Stations</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    {Icon.search('w-3.5 h-3.5')}
                  </span>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Suburb, postcode, name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {Icon.close('w-3 h-3')}
                    </button>
                  )}
                </div>
              </div>

              {/* Destination search */}
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1 block">Plan a Route</label>
                <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-red-400">
                  {Icon.location('w-3.5 h-3.5')}
                </span>
                <input
                  type="text"
                  placeholder="Where do you want to go?"
                  value={destInput}
                  onChange={(e) => { setDestInput(e.target.value); setDestResults([]); }}
                  autoComplete="off"
                  className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 outline-none focus:border-red-300 focus:bg-white transition-all"
                />
                {destLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-3.5 h-3.5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
                {destInput && !destLoading && (
                  <button onClick={() => { setDestInput(''); setDestResults([]); setRouteCoordinates(null); setRouteInfo(null); setDestination(null); setQuickFilters((p) => ({ ...p, alongRoute: false })); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {Icon.close('w-3 h-3')}
                  </button>
                )}
                {destResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                    {destResults.map((r) => (
                      <button key={r.id} type="button" onClick={() => handleSelectDest(r)}
                        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                        </svg>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{r.shortName}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{r.displayName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>

              {/* Route info */}
              {routeInfo && (
                <div className="rounded-xl p-3 space-y-2 bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
                    </svg>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-blue-600">{routeInfo.distanceKm.toFixed(1)} km</span>
                      <span className="text-blue-300">·</span>
                      <span className="text-xs font-bold text-blue-600">{routeInfo.durationMin} min</span>
                      <span className="text-[10px] truncate flex-1 text-gray-500">{destination?.name}</span>
                    </div>
                    <button onClick={handleClearRoute} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                      {Icon.close('w-3 h-3')}
                    </button>
                  </div>
                  {waypoints.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-blue-100">
                      <p className="text-[9px] font-bold tracking-widest uppercase text-blue-400">Charging Stops</p>
                      {waypoints.map((w, i) => (
                        <div key={w.stationId} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 bg-amber-400">{i + 1}</div>
                          <span className="text-[11px] truncate flex-1 text-gray-700">{w.name}</span>
                          <button onClick={() => handleRemoveStop(w.stationId)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">{Icon.close('w-3 h-3')}</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-blue-100">
                    {isNavigating ? (
                      <button onClick={stopNavigation} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        Stop Navigation
                      </button>
                    ) : (
                      <button onClick={startNavigation} disabled={!userLocation} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                        Start Navigation
                      </button>
                    )}
                  </div>
                </div>
              )}

              {routeLoading && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                  <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  <span className="text-[11px] text-gray-500">Calculating route…</span>
                </div>
              )}

              {/* Filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'nearby',        label: 'Nearby',     activeClass: 'bg-green-50 border-green-400 text-green-600', inactiveClass: 'bg-gray-50 border-gray-200 text-gray-500', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg> },
                  { key: 'fastCharger',   label: 'Fast',       activeClass: 'bg-amber-50 border-amber-400 text-amber-600', inactiveClass: 'bg-gray-50 border-gray-200 text-gray-500', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg> },
                  { key: 'connectorType', label: quickFilters.connectorType && connectorTypeFilter ? connectorTypeFilter : 'Connector', activeClass: 'bg-purple-50 border-purple-400 text-purple-600', inactiveClass: 'bg-gray-50 border-gray-200 text-gray-500', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z"/></svg> },
                  { key: 'availableNow',  label: 'Available',  activeClass: 'bg-emerald-50 border-emerald-400 text-emerald-600', inactiveClass: 'bg-gray-50 border-gray-200 text-gray-500', icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
                  { key: 'alongRoute',    label: 'On Route',   activeClass: 'bg-blue-50 border-blue-400 text-blue-600', inactiveClass: 'bg-gray-50 border-gray-200 text-gray-400', disabled: !routeCoordinates, icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/></svg> },
                ].map(({ key, label, activeClass, inactiveClass, icon, disabled }) => {
                  const active = quickFilters[key];
                  return (
                    <button key={key} onClick={() => !disabled && toggleFilter(key)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${active ? activeClass : inactiveClass} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}`}>
                      {icon}{label}
                    </button>
                  );
                })}
                {user && (
                  <button onClick={() => toggleFilter('favorites')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${quickFilters.favorites ? 'bg-red-50 border-red-300 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <svg className="w-3 h-3" fill={quickFilters.favorites ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    Saved
                    {favoriteIds.size > 0 && <span className={`px-1 rounded-full text-[9px] font-bold ${quickFilters.favorites ? 'bg-red-100 text-red-500' : 'bg-gray-200 text-gray-500'}`}>{favoriteIds.size}</span>}
                  </button>
                )}
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                    Reset ({activeFiltersCount})
                  </button>
                )}
              </div>

              {/* Connector picker */}
              {quickFilters.connectorType && showConnectorPicker && (
                <div className="grid grid-cols-2 gap-1.5">
                  {['Type 2', 'CCS2', 'CHAdeMO', 'Tesla Supercharger'].map((ct) => (
                    <button key={ct} onClick={() => { setConnectorTypeFilter(ct); setShowConnectorPicker(false); }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-left border transition-all ${connectorTypeFilter === ct ? 'bg-purple-50 border-purple-300 text-purple-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {ct}
                    </button>
                  ))}
                </div>
              )}

              {/* Status row + Range button */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">
                  {displayStations.length} stations
                  {osmLoading && <span className="ml-1 text-green-500 animate-pulse">+live</span>}
                </span>
                <button onClick={() => setShowBatteryPanel(!showBatteryPanel)}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${showBatteryPanel || reachableIds ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {Icon.battery('w-3.5 h-3.5')}
                  Range
                  {reachableInfo && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-white">{reachableInfo.count}</span>}
                </button>
              </div>

              {/* Battery panel */}
              {showBatteryPanel && (
                <div className="rounded-xl p-3 space-y-3 bg-amber-50 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-amber-600">Range Calculator</span>
                    {reachableInfo && <button onClick={clearReachable} className="text-[10px] text-gray-400 hover:text-gray-600">Clear</button>}
                  </div>
                  {user?.vehicle?.make && (
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-white border border-amber-100">
                      {Icon.car('w-3.5 h-3.5 text-amber-500')}
                      <span className="text-[11px] text-gray-600">{user.vehicle.make} {user.vehicle.model} · {user.vehicle.connectorType}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[11px] text-gray-500">Battery Level</span>
                      <span className={`text-sm font-bold ${batteryPct > 60 ? 'text-green-500' : batteryPct > 25 ? 'text-amber-500' : 'text-red-500'}`}>{batteryPct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-gray-100">
                      <div className={`h-full rounded-full transition-all duration-300 ${batteryPct > 60 ? 'bg-green-400' : batteryPct > 25 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${batteryPct}%` }} />
                    </div>
                    <input type="range" min="5" max="100" value={batteryPct} onChange={(e) => setBatteryPct(Number(e.target.value))} className="w-full mt-1 accent-amber-400" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[11px] text-gray-500">Vehicle Range</span>
                      <span className="text-sm font-bold text-amber-600">{vehicleRange} km</span>
                    </div>
                    <input type="range" min="50" max="800" step="10" value={vehicleRange} onChange={(e) => setVehicleRange(Number(e.target.value))} className="w-full accent-amber-400" />
                  </div>
                  {reachableInfo && (
                    <div className="rounded-lg px-3 py-2 bg-white border border-amber-100">
                      <p className="text-sm font-bold text-amber-600">{reachableInfo.count} <span className="text-xs font-normal text-gray-400">stations reachable</span></p>
                      <p className="text-[11px] mt-0.5 text-gray-400">Safe radius: {reachableInfo.safeKm} km</p>
                    </div>
                  )}
                  <button onClick={handleCalculateReachable} disabled={reachableLoading || !userLocation}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-amber-400 text-white hover:bg-amber-500 disabled:opacity-40 transition-colors">
                    {reachableLoading ? 'Scanning…' : 'Calculate Reachable Range'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Station list */}
          <div className="flex-1 overflow-y-auto">
            {selectedStation && (
              <div className="p-3 border-b border-gray-100">
                <StationDetail station={selectedStation} onClose={() => setSelectedStation(null)} onGetDirections={handleGetDirections} />
              </div>
            )}

            {loading && !stations.length ? (
              <div className="p-6 flex flex-col items-center gap-3">
                <LoadingSpinner />
                <span className="text-xs text-gray-400">Loading stations…</span>
              </div>
            ) : error ? (
              <div className="p-4"><ErrorMessage message={error} onRetry={fetchStations} /></div>
            ) : displayStations.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  {Icon.bolt('w-6 h-6 text-gray-300')}
                </div>
                {activeFiltersCount > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-gray-600">No stations match your filters</p>
                    <p className="text-xs mt-1 text-gray-400">Try removing some filters</p>
                    <button onClick={clearFilters} className="mt-4 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">Clear Filters</button>
                  </>
                ) : !userLocation ? (
                  <>
                    <p className="text-sm font-semibold text-gray-600">Enable location to find nearby stations</p>
                    <p className="text-xs mt-2 text-gray-400 leading-relaxed">Allow location access in your browser, or search for a suburb above to explore stations in any area.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-600">No stations found</p>
                    <p className="text-xs mt-1 text-gray-400">Try a different search or increase the radius</p>
                  </>
                )}
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {userLocation && displayStations.length > 0 && (() => {
                  const suggested = [...displayStations].filter((s) => s.distance != null).sort((a, b) => a.distance - b.distance).slice(0, 3);
                  if (!suggested.length) return null;
                  return (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        Nearest Stations
                      </p>
                      <div className="space-y-2">
                        {suggested.map((station) => {
                          const availableCount = station.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;
                          const totalCount     = station.connectors?.reduce((s, c) => s + (c.quantity  || 0), 0) || 0;
                          const isAvailable    = availableCount > 0;
                          const distKm         = Number(station.distance).toFixed(1);
                          const isSelected     = selectedStation?._id === station._id;
                          return (
                            <div key={`sug-${station._id}`}
                              className={`rounded-xl overflow-hidden border transition-all ${isSelected ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>
                              <button onClick={() => handleStationClick(station)} className="w-full text-left px-3 pt-3 pb-2 flex items-start gap-3">
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isAvailable ? 'bg-green-50' : 'bg-red-50'}`}>
                                    {Icon.bolt(`w-4 h-4 ${isAvailable ? 'text-green-500' : 'text-red-400'}`)}
                                  </div>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap bg-blue-50 text-blue-500">{distKm} km</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-800 truncate leading-snug">{station.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{station.location?.formattedAddress || station.location?.address?.city || ''}</p>
                                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <span className="text-[10px] text-gray-400">{station.chargerLevel || 'Unknown'}</span>
                                    <span className="text-gray-200">·</span>
                                    <span className={`text-[10px] font-bold ${isAvailable ? 'text-green-500' : 'text-red-400'}`}>{availableCount}/{totalCount} avail</span>
                                    {station.pricing?.isFree ? (<><span className="text-gray-200">·</span><span className="text-[10px] font-bold text-green-500">Free</span></>) : station.pricing?.perKWh ? (<><span className="text-gray-200">·</span><span className="text-[10px] text-gray-400">${station.pricing.perKWh.toFixed(2)}/kWh</span></>) : null}
                                  </div>
                                </div>
                              </button>
                              <div className="px-3 pb-3 flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleGetDirections(station); }} disabled={routeLoading}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors">
                                  {routeLoading && destination?.name === station.name ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg>
                                  )}
                                  GO · {distKm} km
                                </button>
                                {user && isMongoId(station._id) && (
                                  <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(station); }}
                                    className={`w-9 flex-shrink-0 rounded-lg flex items-center justify-center transition-all border ${favoriteIds.has(station._id?.toString()) ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-300 hover:text-red-400'}`}>
                                    <svg className="w-4 h-4" fill={favoriteIds.has(station._id?.toString()) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {displayStations.length > 3 && (
                        <div className="flex items-center gap-2 mt-3 mb-1">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] font-bold tracking-widest uppercase text-gray-300">All Stations</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {displayStations.map((station) => (
                  <StationCard
                    key={station._id}
                    station={station}
                    onClick={handleStationClick}
                    onGo={userLocation ? handleGetDirections : undefined}
                    onAddStop={routeNearbyIds?.has(station._id) ? handleAddStop : undefined}
                    onRemoveStop={routeNearbyIds?.has(station._id) ? handleRemoveStop : undefined}
                    isStop={waypoints.some((w) => w.stationId === station._id)}
                    stopOrder={waypoints.findIndex((w) => w.stationId === station._id) + 1}
                    selected={selectedStation?._id === station._id}
                    dimmed={reachableIds ? !reachableIds.has(station._id?.toString()) : false}
                    isFavorite={favoriteIds.has(station._id?.toString())}
                    onToggleFavorite={user && isMongoId(station._id) ? handleToggleFavorite : undefined}
                  />
                ))}

                {osmLoading && (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100">
                    <svg className="w-3 h-3 animate-spin flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <span className="text-[11px] text-gray-400">Loading live OSM data…</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-40 w-5 h-12 flex items-center justify-center bg-white border border-gray-200 border-l-0 rounded-r-lg text-gray-400 hover:text-gray-600 shadow-sm transition-all duration-300"
          style={{ left: sidebarOpen ? '360px' : '0px' }}>
          {sidebarOpen ? Icon.chevronLeft('w-3 h-3') : Icon.chevronRight('w-3 h-3')}
        </button>

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          {geoLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="px-4 py-2.5 flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-100">
                <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span className="text-xs text-gray-500">Getting your location…</span>
              </div>
            </div>
          )}
          <MapView
            center={mapCenter}
            zoom={userLocation ? 13 : 5}
            stations={displayStations}
            onStationClick={handleStationClick}
            userLocation={userLocation}
            routeCoordinates={routeCoordinates}
            routeInfo={routeInfo}
            onClearRoute={handleClearRoute}
            destination={destination}
            selectedStation={selectedStation}
            reachableStationIds={reachableIds}
            waypointOrderMap={new Map(waypoints.map((w, i) => [w.stationId, i + 1]))}
            waypointIds={new Set(waypoints.map((w) => w.stationId))}
            onAddStop={routeNearbyIds ? (s) => routeNearbyIds.has(s._id) && handleAddStop(s) : null}
            onRemoveStop={routeNearbyIds ? handleRemoveStop : null}
            favoriteIds={user ? favoriteIds : null}
            onToggleFavorite={user ? (s) => isMongoId(s._id) && handleToggleFavorite(s) : null}
            isNavigating={isNavigating}
            navLocation={navLocation}
            navHeading={navHeading}
            navStep={routeSteps[currentStepIdx] || null}
            navStepIndex={currentStepIdx}
            navTotalSteps={routeSteps.length}
            flyTo={mapFlyTo}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;

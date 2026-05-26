import { useState, useEffect, useRef } from 'react';
import MapView from '../components/Map/MapView';
import { LoadingSpinner, ErrorMessage } from '../components/Common/SharedComponents';
import osmService from '../services/osmService';
import { useDebounce, useGeolocation } from '../hooks/useCustomHooks';
import { useAuth } from '../context/AuthContext';

const VEHICLE_PRESETS = [
  { label: 'Tesla Model 3', range: 491, battery: 60, connector: 'Tesla Supercharger' },
  { label: 'Tesla Model Y', range: 533, battery: 75, connector: 'Tesla Supercharger' },
  { label: 'Hyundai Ioniq 5', range: 507, battery: 77.4, connector: 'CCS2' },
  { label: 'BYD Atto 3', range: 420, battery: 60.48, connector: 'CCS2' },
  { label: 'Nissan Leaf', range: 270, battery: 40, connector: 'CHAdeMO' },
  { label: 'Kia EV6', range: 528, battery: 77.4, connector: 'CCS2' },
];

const HISTORY_KEY = 'ev_route_history';
const MAX_HISTORY = 8;

/** Haversine distance in km */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Given route coords [[lat,lng],...], return the [lat,lng] at targetKm along the path */
function pointAlongRoute(coords, targetKm) {
  let accumulated = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = haversineKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    if (accumulated + seg >= targetKm) return coords[i];
    accumulated += seg;
  }
  return coords[coords.length - 1];
}

/**
 * Iteratively find charging stops.
 * Returns enriched stop objects with: fastestOption, cheapestOption, topAlternatives for multi-provider comparison.
 * avgSpeedKmh: used to compute predicted arrival time at each stop.
 */
async function planChargingStops(routeCoords, origin, destination, vehicleRange, currentBattery, batteryCapacityKwh, fetchNearby, avgSpeedKmh = 90) {
  const SAFE_RESERVE = 15;
  const CHARGE_TO = 80;

  const stops = [];
  let curLat = origin.lat, curLng = origin.lng;
  let distanceTravelledKm = 0;
  let battery = currentBattery;
  let iterations = 10;

  while (iterations-- > 0) {
    const distToDest = haversineKm(curLat, curLng, destination.lat, destination.lng);
    const safeRange = ((battery - SAFE_RESERVE) / 100) * vehicleRange;

    if (distToDest <= safeRange) break; // can reach destination — done

    const targetDist = distanceTravelledKm + safeRange * 0.8;
    const [searchLat, searchLng] = pointAlongRoute(routeCoords, targetDist);

    const nearby = await fetchNearby(searchLat, searchLng, 30);
    if (!nearby || nearby.length === 0) break;

    // Score all candidates: add simulated availability + scoring fields
    const scored = nearby
      .map((s) => {
        const [lng, lat] = s.location.coordinates;
        const distToRoute = haversineKm(searchLat, searchLng, lat, lng);
        const maxPowerKW = Math.max(...(s.connectors?.map((c) => c.powerKW || 0) || [0]), 0) || 50;
        const pricePerKWh = s.pricing?.isFree ? 0 : (s.pricing?.perKWh ?? 0.45);
        // Simulate availability: connectors get a realistic available count
        const connectors = (s.connectors || []).map((c) => ({
          ...c,
          available: Math.max(0, Math.round((c.quantity || 1) * (0.3 + Math.random() * 0.7))),
        }));
        const totalAvailable = connectors.reduce((sum, c) => sum + c.available, 0);
        return { ...s, lat, lng, distToRoute, maxPowerKW, pricePerKWh, connectors, totalAvailable };
      })
      .filter((s) => haversineKm(s.lat, s.lng, destination.lat, destination.lng) < distToDest)
      .sort((a, b) => a.distToRoute - b.distToRoute);

    if (scored.length === 0) break;

    // Best = closest to the route search point
    const best = scored[0];
    // Fastest = highest charger power
    const fastest = [...scored].sort((a, b) => b.maxPowerKW - a.maxPowerKW)[0];
    // Cheapest = lowest price (free stations are cheapest=0)
    const cheapest = [...scored].sort((a, b) => a.pricePerKWh - b.pricePerKWh)[0];
    // Top 5 alternatives for multi-provider comparison panel
    const topAlternatives = scored.slice(0, 5);

    const distFromPrev = haversineKm(curLat, curLng, best.lat, best.lng);
    const batteryUsed = (distFromPrev / vehicleRange) * 100;
    const arrivalBattery = Math.max(0, battery - batteryUsed);
    const chargeNeededKwh = ((CHARGE_TO - arrivalBattery) / 100) * batteryCapacityKwh;
    const chargeMinutes = Math.round((chargeNeededKwh / best.maxPowerKW) * 60);

    // Predict arrival time using real avg speed from Mapbox Directions
    const hoursFromOrigin = (distanceTravelledKm + distFromPrev) / avgSpeedKmh;
    const arrivalDate = new Date(Date.now() + hoursFromOrigin * 3600 * 1000);
    const predictedArrival = arrivalDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

    stops.push({
      order: stops.length + 1,
      station: { ...best, predictedArrival },
      distanceFromPrev: Math.round(distFromPrev),
      arrivalBattery: Math.round(arrivalBattery),
      departureBattery: CHARGE_TO,
      chargeMinutes,
      predictedArrival,
      // Multi-provider comparison data
      fastestOption: fastest,
      cheapestOption: cheapest,
      topAlternatives,
    });

    distanceTravelledKm += distFromPrev;
    curLat = best.lat;
    curLng = best.lng;
    battery = CHARGE_TO;
  }

  return stops;
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(entry, existing) {
  const filtered = existing.filter(
    (h) => !(h.originName === entry.originName && h.destName === entry.destName)
  );
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

const Spinner = () => (
  <svg className="w-3.5 h-3.5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const PROVIDER_COLORS = {
  'Chargefox': '#8B5CF6', 'Evie Networks': '#10B981', 'Tesla': '#EF4444',
  'NRMA': '#F59E0B', 'BP Pulse': '#059669', 'Ampol AmpCharge': '#0EA5E9',
  'Jolt': '#F97316', 'ChargePoint': '#3B82F6',
};
function providerDot(name) {
  for (const [k, c] of Object.entries(PROVIDER_COLORS)) {
    if ((name || '').toLowerCase().includes(k.toLowerCase())) return c;
  }
  return '#2563eb';
}

/** Renders a single charging stop card with predictive info + multi-provider comparison */
const ChargingStopCard = ({ stop, onAdd, isAdded }) => {
  const [showComparison, setShowComparison] = useState(false);
  const { station: st, fastestOption, cheapestOption, topAlternatives } = stop;
  const provider = st.operator?.name || 'Unknown';
  const dotColor = providerDot(provider);
  const price = st.pricing?.isFree ? 'Free' : st.pricing?.perKWh ? `$${st.pricing.perKWh.toFixed(2)}/kWh` : 'N/A';
  const totalAvail = st.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;
  const totalCount = st.connectors?.reduce((s, c) => s + (c.quantity || 0), 0) || 0;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Stop header */}
      <div className="bg-primary-50 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
        <div className="w-6 h-6 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {stop.order}
        </div>
        <span className="text-xs font-bold text-primary-700 flex-1">Stop {stop.order}</span>
        <span className="text-[10px] text-primary-500 font-medium">{stop.distanceFromPrev} km from prev</span>
      </div>

      {/* Recommended station */}
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: dotColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight truncate">{st.name}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{provider} · {st.chargerLevel}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-gray-700">{st.maxPowerKW || st.connectors?.[0]?.powerKW || '?'} kW</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{price}</p>
          </div>
        </div>

        {/* Predictive info row */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5">
            <p className="text-xs font-bold text-amber-700">{stop.predictedArrival}</p>
            <p className="text-[9px] text-amber-600 mt-0.5">Arrive at</p>
          </div>
          <div className="bg-red-50 border border red-200 rounded-lg p-1.5" style={{ borderColor: '#fca5a5' }}>
            <p className="text-xs font-bold text-red-600">{stop.arrivalBattery}%</p>
            <p className="text-[9px] text-red-500 mt-0.5">Battery in</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
            <p className="text-xs font-bold text-green-700">{stop.departureBattery}%</p>
            <p className="text-[9px] text-green-600 mt-0.5">Leave at</p>
          </div>
        </div>

        {/* Charge time + availability */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500">~{stop.chargeMinutes} min charge</span>
          <span className={totalAvail > 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
            {totalAvail}/{totalCount} available
          </span>
        </div>

        {/* Add / Added button */}
        {onAdd && (
          <button
            onClick={() => !isAdded && onAdd(stop.station)}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              isAdded
                ? 'bg-orange-100 border border-orange-300 text-orange-700 cursor-default'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isAdded ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Added to Route
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add to Route
              </>
            )}
          </button>
        )}

        {/* Fastest / Cheapest highlights */}
        {(fastestOption || cheapestOption) && (
          <div className="flex gap-1.5">
            {fastestOption && fastestOption._id !== st._id && (
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                <p className="text-[9px] font-bold text-blue-500 uppercase">Fastest</p>
                <p className="text-[11px] font-semibold text-blue-800 truncate mt-0.5">{fastestOption.name}</p>
                <p className="text-[10px] text-blue-600">{fastestOption.maxPowerKW} kW</p>
              </div>
            )}
            {cheapestOption && cheapestOption._id !== st._id && (
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1.5">
                <p className="text-[9px] font-bold text-green-500 uppercase">Cheapest</p>
                <p className="text-[11px] font-semibold text-green-800 truncate mt-0.5">{cheapestOption.name}</p>
                <p className="text-[10px] text-green-600">
                  {cheapestOption.pricing?.isFree ? 'Free' : cheapestOption.pricePerKWh ? `$${cheapestOption.pricePerKWh.toFixed(2)}/kWh` : 'N/A'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Multi-provider comparison toggle */}
        {topAlternatives?.length > 1 && (
          <button
            onClick={() => setShowComparison((v) => !v)}
            className="w-full text-[11px] text-primary-600 font-semibold hover:text-primary-800 flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showComparison ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {showComparison ? 'Hide' : 'Compare'} {topAlternatives.length} nearby stations
          </button>
        )}

        {/* Comparison table */}
        {showComparison && topAlternatives?.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden mt-1">
            <div className="grid grid-cols-4 gap-0 text-[9px] font-bold text-gray-400 uppercase px-2 py-1.5 bg-gray-50 border-b border-gray-200">
              <span>Station</span>
              <span className="text-center">Power</span>
              <span className="text-center">Price</span>
              <span className="text-center">Avail</span>
            </div>
            {topAlternatives.map((alt) => {
              const altProvider = alt.operator?.name || 'Unknown';
              const altColor = providerDot(altProvider);
              const altPrice = alt.pricing?.isFree ? 'Free' : alt.pricePerKWh ? `$${alt.pricePerKWh.toFixed(2)}` : 'N/A';
              const altAvail = alt.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;
              const altTotal = alt.connectors?.reduce((s, c) => s + (c.quantity || 0), 0) || 0;
              const isSelected = alt._id === st._id;
              return (
                <div
                  key={alt._id}
                  className={`grid grid-cols-4 gap-0 px-2 py-2 text-[11px] border-b border-gray-100 last:border-0 items-center ${isSelected ? 'bg-primary-50' : ''}`}
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: altColor }} />
                    <span className={`truncate font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>{alt.name}</span>
                    {isSelected && <span className="text-[8px] bg-primary-100 text-primary-600 rounded px-1 font-bold flex-shrink-0">★</span>}
                  </div>
                  <span className="text-center text-gray-600 font-semibold">{alt.maxPowerKW} kW</span>
                  <span className={`text-center font-semibold ${alt.pricing?.isFree ? 'text-green-600' : 'text-gray-600'}`}>{altPrice}</span>
                  <span className={`text-center font-semibold ${altAvail > 0 ? 'text-green-600' : 'text-red-500'}`}>{altAvail}/{altTotal}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-card text-center">
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
  </div>
);

/** Reachability badge */
const ReachBadge = ({ reachable }) =>
  reachable ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-50 border border-secondary-200 text-secondary-700 text-[11px] font-semibold">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      Reachable
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-50 border border-accent-200 text-accent-700 text-[11px] font-semibold">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Charging needed
    </span>
  );

/** Address autocomplete input */
const AddressInput = ({ label, dotColor, value, onChange, onSelect, results, loading, placeholder, onClear }) => (
  <div>
    <label className="label-text">
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotColor} inline-block`} />
        {label}
      </span>
    </label>
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input-field text-sm h-10 pr-8"
        autoComplete="off"
      />
      {loading ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></span>
      ) : value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
    {results.length > 0 && (
      <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-panel z-50 relative">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r)}
            className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
          >
            <svg className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{r.shortName}</p>
              <p className="text-[11px] text-gray-400 truncate">{r.displayName}</p>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);

const RoutePlannerPage = () => {
  const { user } = useAuth();
  const { location: gpsLocation } = useGeolocation();

  // Address inputs
  const [originInput, setOriginInput]   = useState('');
  const [destInput,   setDestInput]     = useState('');
  const [originLocation, setOriginLocation] = useState(null); // { lat, lng, name }
  const [destLocation,   setDestLocation]   = useState(null);
  const [originResults, setOriginResults] = useState([]);
  const [destResults,   setDestResults]   = useState([]);
  const [usingGPS, setUsingGPS] = useState(false);
  const [originLoading, setOriginLoading] = useState(false);
  const [destLoading,   setDestLoading]   = useState(false);

  // Manual waypoints added by user clicking "Add as Charging Stop"
  // Each: { lat, lng, name, stationId }
  const [waypoints, setWaypoints] = useState([]);

  // Vehicle — seeded from user profile if available
  const userVehicle    = user?.vehicle;
  const hasUserVehicle = !!(userVehicle?.range && userVehicle?.batteryCapacity);
  // Connector filter: if user has a connector type, only show compatible stations
  const connectorFilter = userVehicle?.connectorType || null;

  const [vehicleRange,    setVehicleRange]    = useState(() => userVehicle?.range          || 400);
  const [currentBattery,  setCurrentBattery]  = useState(80);
  const [batteryCapacity, setBatteryCapacity] = useState(() => userVehicle?.batteryCapacity || 60);
  const [selectedPreset,  setSelectedPreset]  = useState(null);

  // Sync vehicle state if user object arrives after mount (e.g. slow auth restore)
  useEffect(() => {
    if (hasUserVehicle) {
      setVehicleRange(userVehicle.range);
      setBatteryCapacity(userVehicle.batteryCapacity);
      setSelectedPreset(null);
    }
  }, [user]); // eslint-disable-line

  // Auto-set origin to GPS location on first fix (only if not already set)
  useEffect(() => {
    if (gpsLocation && !originLocation && !originInput) {
      setOriginLocation({ lat: gpsLocation.lat, lng: gpsLocation.lng, name: 'My Location' });
      setOriginInput('My Location');
      setUsingGPS(true);
    }
  }, [gpsLocation]); // eslint-disable-line

  // Route
  const [routeCoords,   setRouteCoords]   = useState(null);
  const [routeInfo,     setRouteInfo]     = useState(null);
  const [routeStations, setRouteStations] = useState([]);
  const [chargingStops, setChargingStops] = useState([]);
  const [stopsLoading,  setStopsLoading]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  const [suggestion,    setSuggestion]    = useState(null);
  const [notification,  setNotification]  = useState(null);
  const [history,       setHistory]       = useState(loadHistory);

  // Live navigation
  const [routeSteps,     setRouteSteps]     = useState([]);
  const [isNavigating,   setIsNavigating]   = useState(false);
  const [navLocation,    setNavLocation]    = useState(null);
  const [navHeading,     setNavHeading]     = useState(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const navWatchRef  = useRef(null);
  const lastNavPos   = useRef(null);

  const debouncedOrigin = useDebounce(originInput, 400);
  const debouncedDest   = useDebounce(destInput,   400);

  // ── Geocode origin ───────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedOrigin || debouncedOrigin.length < 2 || originLocation) {
      setOriginResults([]); return;
    }
    setOriginLoading(true);
    osmService.geocodeAddress(debouncedOrigin)
      .then(setOriginResults).catch(() => setOriginResults([]))
      .finally(() => setOriginLoading(false));
  }, [debouncedOrigin]); // eslint-disable-line

  // ── Geocode destination ──────────────────────────────────────────
  useEffect(() => {
    if (!debouncedDest || debouncedDest.length < 2 || destLocation) {
      setDestResults([]); return;
    }
    setDestLoading(true);
    osmService.geocodeAddress(debouncedDest)
      .then(setDestResults).catch(() => setDestResults([]))
      .finally(() => setDestLoading(false));
  }, [debouncedDest]); // eslint-disable-line

  // ── Reachability hint ────────────────────────────────────────────
  useEffect(() => {
    if (!originLocation || !destLocation) { setSuggestion(null); return; }
    const dLat = ((destLocation.lat - originLocation.lat) * Math.PI) / 180;
    const dLng = ((destLocation.lng - originLocation.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos((originLocation.lat * Math.PI) / 180)
      * Math.cos((destLocation.lat  * Math.PI) / 180)
      * Math.sin(dLng / 2) ** 2;
    const distKm    = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const reachable = (currentBattery / 100) * vehicleRange;
    setSuggestion({ reachable: reachable >= distKm, distKm: Math.round(distKm), reachableKm: Math.round(reachable) });
  }, [originLocation, destLocation, currentBattery, vehicleRange]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSelectOrigin = (r) => {
    setOriginLocation({ lat: r.lat, lng: r.lng, name: r.shortName });
    setOriginInput(r.shortName);
    setOriginResults([]);
  };

  const handleSelectDest = (r) => {
    setDestLocation({ lat: r.lat, lng: r.lng, name: r.shortName });
    setDestInput(r.shortName);
    setDestResults([]);
  };

  // ── Navigation helpers ────────────────────────────────────────────
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
    if (!routeCoords) return;
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

  const handleHistorySelect = (h) => {
    setOriginLocation({ lat: h.originLat, lng: h.originLng, name: h.originName });
    setOriginInput(h.originName);
    setDestLocation({ lat: h.destLat, lng: h.destLng, name: h.destName });
    setDestInput(h.destName);
    setOriginResults([]);
    setDestResults([]);
  };

  // ── Add / remove manual waypoints ────────────────────────────────
  const handleAddStop = (station) => {
    const [lng, lat] = station.location.coordinates;
    setWaypoints((prev) => {
      if (prev.some((w) => w.stationId === station._id)) return prev;
      return [...prev, { lat, lng, name: station.name, stationId: station._id }];
    });
  };

  const handleRemoveWaypoint = (stationId) => {
    setWaypoints((prev) => prev.filter((w) => w.stationId !== stationId));
  };

  // Re-calculate route whenever waypoints change (and a route already exists)
  useEffect(() => {
    if (!originLocation || !destLocation) return;
    if (routeCoords) calcRoute(originLocation, destLocation, waypoints);
  }, [waypoints]); // eslint-disable-line

  // ── Core routing function (shared by form submit + waypoint changes) ──
  const calcRoute = async (origin, dest, wpts = []) => {
    setLoading(true);
    setError(null);
    setChargingStops([]);
    setRouteStations([]);
    setRouteCoords(null);
    setRouteInfo(null);
    setNotification(null);

    try {
      let route;
      try {
        route = await osmService.fetchRouteMapbox(
          origin.lat, origin.lng, dest.lat, dest.lng, wpts
        );
      } catch {
        route = await osmService.fetchRoute(
          origin.lat, origin.lng, dest.lat, dest.lng, wpts
        );
      }

      setRouteCoords(route.coordinates);
      setRouteInfo({ distanceKm: route.distanceKm, durationMin: route.durationMin });
      setRouteSteps(route.steps || []);
      setLoading(false);

      setStopsLoading(true);
      try {
        const rawStations = await osmService.fetchStationsAlongRoute(route.coordinates, route.distanceKm);
        // Filter to only stations that support the user's connector type (if known)
        const allStations = connectorFilter
          ? rawStations.filter((s) =>
              s.connectors?.some((c) =>
                (c.type || '').toLowerCase() === connectorFilter.toLowerCase()
              )
            )
          : rawStations;
        const avgSpeedKmh = route.avgSpeedKmh || 90;

        const annotated = allStations.map((s) => {
          const [sLng, sLat] = s.location.coordinates;
          const distFromOrigin  = haversineKm(origin.lat, origin.lng, sLat, sLng);
          const hoursToArrive   = distFromOrigin / avgSpeedKmh;
          const batteryUsed     = (distFromOrigin / Number(vehicleRange)) * 100;
          const predictedBattery = Math.max(0, Math.round(Number(currentBattery) - batteryUsed));
          const predictedArrival = new Date(Date.now() + hoursToArrive * 3600000)
            .toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
          const connectors = (s.connectors || []).map((c) => ({
            ...c,
            available: Math.max(0, Math.round((c.quantity || 1) * (0.3 + Math.random() * 0.7))),
          }));
          return { ...s, predictedArrival, predictedBattery, connectors };
        });
        setRouteStations(annotated);

        const reachableKm = (Number(currentBattery) / 100) * Number(vehicleRange);
        if (route.distanceKm > reachableKm * 0.85) {
          const stops = await planChargingStops(
            route.coordinates, origin, dest,
            Number(vehicleRange), Number(currentBattery), Number(batteryCapacity),
            (lat, lng, r) => osmService.fetchNearbyStations(lat, lng, r),
            avgSpeedKmh
          );
          setChargingStops(stops);
          if (stops.length > 0) {
            const first = stops[0];
            const st    = first.station;
            const provider = st.operator?.name || 'EV charger';
            const powerKw  = first.fastestOption?.maxPowerKW || st.connectors?.[0]?.powerKW || 50;
            const price    = st.pricing?.isFree ? 'Free'
              : st.pricing?.perKWh ? `$${st.pricing.perKWh.toFixed(2)}/kWh` : 'N/A';
            setNotification({
              title:   `Charging stop: ${st.name}`,
              message: `Arrive ${first.predictedArrival} · ${first.arrivalBattery}% battery · ${provider} · ${powerKw} kW · ${price} · ~${first.chargeMinutes} min`,
            });
          }
        } else {
          setNotification({
            title:   'You can reach your destination!',
            message: `${Math.round(reachableKm)} km range · ${Math.round(route.distanceKm)} km trip · no charging needed`,
          });
        }
      } catch { /* Overpass rate-limit — route still shown */ }
      finally { setStopsLoading(false); }
    } catch (err) {
      setError(err.message || 'Failed to calculate route. Check your addresses and try again.');
      setLoading(false);
    }
  };

  const handlePlanRoute = async (e) => {
    e.preventDefault();
    if (!originLocation || !destLocation) {
      setError('Please select both origin and destination from the suggestions.');
      return;
    }
    setHistory((prev) => saveHistory({
      originName: originLocation.name, originLat: originLocation.lat, originLng: originLocation.lng,
      destName:   destLocation.name,   destLat:   destLocation.lat,   destLng:   destLocation.lng,
      ts: Date.now(),
    }, prev));
    await calcRoute(originLocation, destLocation, waypoints);
  };

  // Show corridor stations on map — already filtered by connector in calcRoute
  const getMapStations = () => {
    const stopIds     = new Set(chargingStops.map((s) => s.station._id));
    const waypointIds = new Set(waypoints.map((w) => w.stationId));
    return routeStations.map((s) => ({
      ...s,
      isRecommendedStop: stopIds.has(s._id) || waypointIds.has(s._id),
    }));
  };

  const waypointIdSet    = new Set(waypoints.map((w) => w.stationId));
  // Map stationId → 1-based stop number for numbered orange markers
  const waypointOrderMap = new Map(waypoints.map((w, i) => [w.stationId, i + 1]));

  const mapCenter = originLocation
    ? [originLocation.lat, originLocation.lng]
    : [-33.8688, 151.2093];

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '64px' }}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Route Planner</h1>
            <p className="text-sm text-gray-500">Plan trips with optimal EV charging stops across Australia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5">

          {/* ── Left panel ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Search history */}
            {history.length > 0 && (
              <div className="card !p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Routes
                </h3>
                <div className="space-y-1.5">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => handleHistorySelect(h)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-700 border border-transparent hover:border-primary-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-secondary-500" />
                          <div className="w-0.5 h-3 bg-gray-300" />
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{h.originName}</p>
                          <p className="text-xs text-gray-400 truncate">{h.destName}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }}
                  className="text-[11px] text-gray-400 hover:text-red-500 mt-2 transition-colors"
                >
                  Clear history
                </button>
              </div>
            )}

            {/* Vehicle */}
            <div className="card !p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Vehicle</h3>

              {hasUserVehicle ? (
                /* ── Registered vehicle display ── */
                <div className="bg-primary-50 border border-primary-200 rounded-xl px-3 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary-900 truncate">
                      {[userVehicle.year, userVehicle.make, userVehicle.model].filter(Boolean).join(' ') || 'My Vehicle'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                      <span className="text-[11px] text-primary-600 font-medium">{userVehicle.batteryCapacity} kWh</span>
                      <span className="text-primary-300 text-[10px]">·</span>
                      <span className="text-[11px] text-primary-600 font-medium">{userVehicle.range} km range</span>
                      {userVehicle.connectorType && (
                        <>
                          <span className="text-primary-300 text-[10px]">·</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-700 bg-primary-100 border border-primary-300 rounded-md px-1.5 py-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                            {userVehicle.connectorType}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── No vehicle set — quick presets ── */
                <div>
                  <p className="text-[11px] text-gray-400 font-medium mb-1.5">Select a vehicle preset</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VEHICLE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => { setSelectedPreset(p.label); setVehicleRange(p.range); setBatteryCapacity(p.battery); }}
                        className={`text-left px-2.5 py-2 rounded-lg text-xs transition-all border ${
                          selectedPreset === p.label
                            ? 'bg-primary-50 border-primary-300 text-primary-700 font-semibold'
                            : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-semibold block truncate">{p.label}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{p.battery} kWh · {p.range} km</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    <a href="/register" className="text-primary-500 hover:underline">Add your vehicle</a> to filter stations by connector
                  </p>
                </div>
              )}

              {hasUserVehicle && connectorFilter && (
                <p className="text-[11px] text-primary-600 bg-primary-50 border border-primary-200 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Only showing <strong className="mx-0.5">{connectorFilter}</strong> compatible stations
                </p>
              )}
            </div>

            {/* Route form */}
            <form onSubmit={handlePlanRoute} className="card !p-4 space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Route Details</h3>

              {/* Origin — GPS pill when using current location, text input otherwise */}
              {usingGPS ? (
                <div>
                  <label className="label-text">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-secondary-500 inline-block" />
                      Origin
                    </span>
                  </label>
                  <div className="flex items-center gap-2 h-10 px-3 bg-green-50 border border-green-300 rounded-xl">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-green-800 flex-1">Current Location</span>
                    <button
                      type="button"
                      onClick={() => { setOriginInput(''); setOriginLocation(null); setOriginResults([]); setUsingGPS(false); }}
                      className="text-green-500 hover:text-green-700 ml-auto"
                      title="Clear"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <AddressInput
                    label="Origin"
                    dotColor="bg-secondary-500"
                    value={originInput}
                    onChange={(e) => { setOriginInput(e.target.value); setOriginLocation(null); }}
                    onSelect={handleSelectOrigin}
                    results={originResults}
                    loading={originLoading}
                    placeholder="e.g. Sydney Opera House, Sydney"
                    onClear={() => { setOriginInput(''); setOriginLocation(null); setOriginResults([]); }}
                  />
                  {gpsLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setOriginLocation({ lat: gpsLocation.lat, lng: gpsLocation.lng, name: 'My Location' });
                        setOriginInput('My Location');
                        setOriginResults([]);
                        setUsingGPS(true);
                      }}
                      className="mt-1.5 text-[11px] text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      Use my current location
                    </button>
                  )}
                </div>
              )}

              <AddressInput
                label="Destination"
                dotColor="bg-red-500"
                value={destInput}
                onChange={(e) => { setDestInput(e.target.value); setDestLocation(null); }}
                onSelect={handleSelectDest}
                results={destResults}
                loading={destLoading}
                placeholder="e.g. Federation Square, Melbourne"
                onClear={() => { setDestInput(''); setDestLocation(null); setDestResults([]); }}
              />

              {/* Manual charging waypoints */}
              {waypoints.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Charging Stops ({waypoints.length})
                  </p>
                  {waypoints.map((w, i) => (
                    <div key={w.stationId} className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-3 py-2">
                      <div className="w-5 h-5 rounded-md bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-xs font-semibold text-primary-800 flex-1 truncate">{w.name}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveWaypoint(w.stationId)}
                        className="text-primary-400 hover:text-red-500 transition-colors flex-shrink-0"
                        title="Remove stop"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <p className="text-[10px] text-primary-500 text-center">Route will recalculate via these stops</p>
                </div>
              )}

              {/* Smart suggestion */}
              {suggestion && (
                <div className={`rounded-xl p-3 border text-xs space-y-1 ${
                  suggestion.reachable
                    ? 'bg-secondary-50 border-secondary-200'
                    : 'bg-accent-50 border-accent-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Route check</span>
                    <ReachBadge reachable={suggestion.reachable} />
                  </div>
                  <p className="text-gray-600">
                    Distance ~{suggestion.distKm} km · Range at {currentBattery}%: <strong>{suggestion.reachableKm} km</strong>
                  </p>
                  {!suggestion.reachable && (
                    <p className="text-accent-700 font-medium">Charging stops will be suggested along the route.</p>
                  )}
                </div>
              )}

              {/* Vehicle specs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text text-xs">Range (km)</label>
                  <input type="number" value={vehicleRange}
                    onChange={(e) => setVehicleRange(e.target.value)}
                    className="input-field text-sm h-10" />
                </div>
                <div>
                  <label className="label-text text-xs">Battery (kWh)</label>
                  <input type="number" value={batteryCapacity}
                    onChange={(e) => setBatteryCapacity(e.target.value)}
                    className="input-field text-sm h-10" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="label-text text-xs">Current Battery</label>
                  <span className="text-xs font-bold text-primary-600">{currentBattery}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-400 via-accent-400 to-secondary-500 transition-all"
                    style={{ width: `${currentBattery}%` }} />
                </div>
                <input type="range" min="5" max="100" value={currentBattery}
                  onChange={(e) => setCurrentBattery(Number(e.target.value))}
                  className="w-full accent-primary-600" />
              </div>

              <button type="submit" disabled={loading || !originLocation || !destLocation} className="btn-primary w-full">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Planning route…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Plan Route
                  </>
                )}
              </button>
            </form>

            {/* Start / Stop navigation */}
            {routeCoords && (
              <div className="mt-1">
                {isNavigating ? (
                  <button
                    onClick={stopNavigation}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Stop Navigation
                  </button>
                ) : (
                  <button
                    onClick={startNavigation}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                    Start Navigation
                  </button>
                )}
              </div>
            )}

            {error && <ErrorMessage message={error} />}

            {/* Route summary */}
            {routeInfo && (
              <div className="card !p-4 space-y-4 animate-slide-up">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Route Summary</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox label="Distance" value={`${routeInfo.distanceKm.toFixed(1)} km`} />
                  <StatBox label="Drive Time" value={`${routeInfo.durationMin} min`} color="text-primary-600" />
                  <StatBox label="Charging Stops" value={stopsLoading ? '…' : chargingStops.length} color="text-accent-600" />
                  <StatBox
                    label="Total Charge Time"
                    value={stopsLoading ? '…' : chargingStops.length > 0
                      ? `${chargingStops.reduce((sum, s) => sum + s.chargeMinutes, 0)} min`
                      : '—'}
                    color="text-secondary-600"
                  />
                </div>

                {/* Charging stops list */}
                {stopsLoading && (
                  <div className="flex items-center gap-2 py-2">
                    <svg className="w-4 h-4 text-primary-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs text-gray-500">Finding charging stations along route…</span>
                  </div>
                )}

                {!stopsLoading && chargingStops.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Recommended Charging Stops
                    </h4>
                    {chargingStops.map((stop) => (
                      <ChargingStopCard
                        key={stop.order}
                        stop={stop}
                        onAdd={originLocation && destLocation ? handleAddStop : undefined}
                        isAdded={waypointIdSet.has(stop.station._id)}
                      />
                    ))}
                  </div>
                )}

                {!stopsLoading && chargingStops.length === 0 && suggestion && !suggestion.reachable && (
                  <p className="text-xs text-accent-700 bg-accent-50 rounded-xl px-3 py-2 border border-accent-200">
                    No charging stations found along this route in OSM data. Try expanding your search radius or check back later.
                  </p>
                )}

                {!stopsLoading && suggestion?.reachable && (
                  <p className="text-xs text-secondary-700 bg-secondary-50 rounded-xl px-3 py-2 border border-secondary-200">
                    ✓ Destination is within your current range — no charging stop needed!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Map ── */}
          <div className="lg:col-span-2 xl:col-span-3">
            <div className="sticky top-20 rounded-2xl overflow-hidden border border-gray-200 shadow-card" style={{ height: 'calc(100vh - 120px)' }}>
              {loading && (
                <div className="absolute inset-0 z-10 bg-white/80 flex items-center justify-center rounded-2xl">
                  <LoadingSpinner message="Planning your route…" />
                </div>
              )}
              <MapView
                center={mapCenter}
                zoom={routeCoords ? 6 : 5}
                stations={getMapStations()}
                routeCoordinates={routeCoords}
                routeInfo={routeInfo}
                destination={destLocation}
                recommendedStopIds={new Set(chargingStops.map((s) => s.station._id))}
                notification={notification}
                onAddStop={originLocation && destLocation ? handleAddStop : null}
                waypointIds={waypointIdSet}
                waypointOrderMap={waypointOrderMap}
                isNavigating={isNavigating}
                navLocation={navLocation}
                navHeading={navHeading}
                navStep={routeSteps[currentStepIdx] || null}
                navStepIndex={currentStepIdx}
                navTotalSteps={routeSteps.length}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlannerPage;

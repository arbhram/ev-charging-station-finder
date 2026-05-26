/**
 * EV Charging data services — Australia.
 *
 * Data sources:
 *  1. OpenChargeMap (OCM) — https://openchargemap.org  — richest structured data
 *     Requires free API key: get one at https://openchargemap.org/site/develop/api
 *     Set REACT_APP_OCM_KEY in frontend/.env
 *     Falls back to OSM-only if key is absent.
 *
 *  2. OpenStreetMap Overpass — always used as supplement / fallback
 *
 *  3. Mapbox Directions API — real-time traffic routing
 *     Key: REACT_APP_MAPBOX_TOKEN
 *
 *  4. Nominatim — geocodes ANY address: streets, suburbs, landmarks, airports
 */

const OVERPASS_PRIMARY  = 'https://overpass.kumi.systems/api/interpreter';
const OVERPASS_FALLBACK = 'https://overpass-api.de/api/interpreter';
const OSRM_URL          = 'https://router.project-osrm.org/route/v1/driving';
const NOMINATIM_URL     = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const OCM_BASE          = 'https://api.openchargemap.io/v3/poi/';

const AU_BBOX = { s: -43.6, w: 113.3, n: -10.4, e: 153.7 };

const AU_STATES = {
  NSW: { s: -37.5, w: 141.0, n: -28.2, e: 153.7 },
  VIC: { s: -39.2, w: 140.9, n: -34.0, e: 149.9 },
  QLD: { s: -29.0, w: 137.9, n: -10.4, e: 153.7 },
  WA:  { s: -35.1, w: 113.3, n: -13.7, e: 129.0 },
  SA:  { s: -38.1, w: 129.0, n: -26.0, e: 141.0 },
  TAS: { s: -43.6, w: 143.8, n: -39.6, e: 148.5 },
  NT:  { s: -26.0, w: 129.0, n: -10.4, e: 138.1 },
  ACT: { s: -35.9, w: 148.8, n: -35.1, e: 149.4 },
};

const AU_OPERATORS = new Set([
  'Chargefox', 'NRMA', 'Evie Networks', 'Tesla', 'BP Pulse',
  'Ampol AmpCharge', 'Jolt', 'ChargePoint', 'Charge Together',
  'Tritium', 'EV Charger', 'ChargeStar', 'EVolution Networks',
  'Ausgrid', 'Origin Energy', 'AGL', 'Endeavour Energy',
]);

// ─── Utilities ────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(tid);
    return res;
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180)
    * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectAustralianState(q) {
  return AU_STATES[q.trim().toUpperCase()] ? q.trim().toUpperCase() : null;
}

// ─── Overpass cache + dedup ───────────────────────────────────────────────────

const _qCache   = new Map();
const _inFlight = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function overpassQuery(query, timeoutMs = 20000) {
  const key    = query.replace(/\s+/g, ' ').trim();
  const cached = _qCache.get(key);
  if (cached && Date.now() < cached.expiry) return cached.data;
  if (_inFlight.has(key)) return _inFlight.get(key);

  const body = `data=${encodeURIComponent(query)}`;
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body };

  const promise = (async () => {
    try {
      let res = await fetchWithTimeout(OVERPASS_PRIMARY, opts, timeoutMs);
      if (!res.ok) {
        res = await fetchWithTimeout(OVERPASS_FALLBACK, opts, timeoutMs);
        if (!res.ok) throw new Error('Overpass unavailable');
      }
      const data = await res.json();
      _qCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
      return data;
    } finally {
      _inFlight.delete(key);
    }
  })();

  _inFlight.set(key, promise);
  return promise;
}

// ─── OSM normalisation ────────────────────────────────────────────────────────

function buildConnectorsFromOSM(tags) {
  const map = [
    { tag: 'socket:type2',              type: 'Type 2',             defaultKW: 22  },
    { tag: 'socket:type2_combo',        type: 'CCS2',               defaultKW: 50  },
    { tag: 'socket:ccs',                type: 'CCS2',               defaultKW: 50  },
    { tag: 'socket:chademo',            type: 'CHAdeMO',            defaultKW: 50  },
    { tag: 'socket:tesla_supercharger', type: 'Tesla Supercharger', defaultKW: 150 },
    { tag: 'socket:tesla_destination',  type: 'Tesla Destination',  defaultKW: 11  },
    { tag: 'socket:type1',              type: 'Type 1',             defaultKW: 7   },
    { tag: 'socket:schuko',             type: 'Wall Outlet',        defaultKW: 3.6 },
  ];
  const connectors = [];
  for (const { tag, type, defaultKW } of map) {
    if (tags[tag] || tags[`${tag}:output`] || tags[`${tag}:count`]) {
      connectors.push({
        type,
        powerKW:  parseFloat(tags[`${tag}:output`]) || defaultKW,
        quantity: parseInt(tags[`${tag}:count`], 10) || 1,
        available: parseInt(tags[`${tag}:count`], 10) || 1,
        status: 'available',
      });
    }
  }
  if (connectors.length === 0) {
    const total = parseInt(tags.capacity || tags.sockets || '1', 10);
    connectors.push({ type: 'Type 2', powerKW: parseFloat(tags.maxpower) || 22, quantity: total, available: total, status: 'available' });
  }
  return connectors;
}

function inferChargerLevel(tags) {
  const dcKeys = ['socket:chademo','socket:chademo:count','socket:ccs','socket:ccs:count','socket:tesla_supercharger','socket:type2_combo'];
  if (dcKeys.some((k) => tags[k])) return 'DC Fast Charger';
  if (parseFloat(tags.maxpower || tags.power || '0') > 22) return 'DC Fast Charger';
  return 'Level 2';
}

function normalizeOSMNode(node, refLat, refLng) {
  const tags = node.tags || {};
  const houseNum = tags['addr:housenumber'] || '';
  const street   = tags['addr:street'] || '';
  const suburb   = tags['addr:suburb'] || tags['addr:town'] || '';
  const city     = tags['addr:city'] || suburb;
  const state    = tags['addr:state'] || '';
  const postcode = tags['addr:postcode'] || '';
  const streetLine = [houseNum, street].filter(Boolean).join(' ');
  const addrParts  = [streetLine, suburb, [state, postcode].filter(Boolean).join(' ')].filter(Boolean);
  const formattedAddress = addrParts.length > 0
    ? addrParts.join(', ') + ', Australia'
    : `${node.lat.toFixed(5)}, ${node.lon.toFixed(5)}`;

  const operatorName = tags.operator || tags.brand || tags.network || '';
  const isFree = tags.fee === 'no' || tags.fee === 'free' || tags.charge === 'free';
  let perKWh;
  if (!isFree && tags.charge) { const m = tags.charge.match(/[\d.]+/); if (m) perKWh = parseFloat(m[0]); }

  return {
    _id: `osm-${node.id}`,
    name: tags.name || operatorName || 'EV Charging Station',
    location: {
      type: 'Point',
      coordinates: [node.lon, node.lat],
      formattedAddress,
      address: { street: streetLine, city, suburb, state, postcode, country: 'Australia' },
    },
    chargerLevel: inferChargerLevel(tags),
    connectors: buildConnectorsFromOSM(tags),
    operator: operatorName ? { name: operatorName, isKnown: AU_OPERATORS.has(operatorName) } : undefined,
    pricing: { isFree, currency: 'AUD', perKWh },
    amenities: [],
    rating: { average: 0, count: 0 },
    isActive: true,
    distance: haversineKm(refLat, refLng, node.lat, node.lon),
    source: 'osm',
  };
}

// ─── OpenChargeMap normalisation ──────────────────────────────────────────────

/** Map OCM ConnectionType titles to our connector type names */
function normalizeOCMConnectorType(title = '') {
  const t = title.toLowerCase();
  if (t.includes('chademo'))                       return 'CHAdeMO';
  if (t.includes('ccs') || t.includes('combo'))    return 'CCS2';
  if (t.includes('tesla') && t.includes('super'))  return 'Tesla Supercharger';
  if (t.includes('tesla'))                         return 'Tesla Destination';
  if (t.includes('type 2') || t.includes('type2')) return 'Type 2';
  if (t.includes('type 1') || t.includes('type1')) return 'Type 1';
  if (t.includes('wall') || t.includes('schuko'))  return 'Wall Outlet';
  return title || 'Type 2';
}

function inferLevelFromOCM(connections = []) {
  const maxKW = Math.max(...connections.map((c) => c.PowerKW || 0), 0);
  const types  = connections.map((c) => (c.ConnectionType?.Title || '').toLowerCase());
  if (types.some((t) => t.includes('chademo') || t.includes('ccs') || t.includes('super'))) return 'DC Fast Charger';
  if (maxKW > 22) return 'DC Fast Charger';
  if (maxKW > 7)  return 'Level 2';
  return 'Level 2';
}

function normalizeOCMStation(poi, refLat, refLng) {
  const addr = poi.AddressInfo || {};
  const connections = poi.Connections || [];

  const streetLine = [addr.AddressLine1, addr.AddressLine2].filter(Boolean).join(', ');
  const suburb     = addr.Town || '';
  const state      = addr.StateOrProvince || '';
  const postcode   = addr.Postcode || '';
  const city       = suburb;
  const addrParts  = [streetLine, suburb, [state, postcode].filter(Boolean).join(' ')].filter(Boolean);
  const formattedAddress = addrParts.length > 0
    ? addrParts.join(', ') + ', Australia'
    : `${addr.Latitude?.toFixed(5)}, ${addr.Longitude?.toFixed(5)}`;

  const connectors = connections
    .filter((c) => c.ConnectionType)
    .map((c) => ({
      type:      normalizeOCMConnectorType(c.ConnectionType.Title),
      powerKW:   c.PowerKW || 22,
      quantity:  c.Quantity || 1,
      available: c.Quantity || 1,  // OCM doesn't provide real-time availability in free tier
      status:    c.StatusType?.IsOperational !== false ? 'available' : 'unavailable',
    }));

  if (connectors.length === 0) {
    connectors.push({ type: 'Type 2', powerKW: 22, quantity: 1, available: 1, status: 'available' });
  }

  const operatorName = poi.OperatorInfo?.Title || '';
  // Parse price from UsageCost string e.g. "$0.40/kWh"
  let isFree = false, perKWh;
  const cost = poi.UsageCost || '';
  if (!cost || cost.toLowerCase().includes('free') || cost === '$0') {
    isFree = true;
  } else {
    const m = cost.match(/\$?([\d.]+)\s*\/?\s*kwh/i);
    if (m) perKWh = parseFloat(m[1]);
  }

  const lat = addr.Latitude;
  const lng = addr.Longitude;

  return {
    _id: `ocm-${poi.ID}`,
    name: addr.Title || operatorName || 'EV Charging Station',
    location: {
      type: 'Point',
      coordinates: [lng, lat],
      formattedAddress,
      address: { street: streetLine, city, suburb, state, postcode, country: 'Australia' },
    },
    chargerLevel: inferLevelFromOCM(connections),
    connectors,
    operator: operatorName ? { name: operatorName, isKnown: AU_OPERATORS.has(operatorName) } : undefined,
    pricing: { isFree, currency: 'AUD', perKWh },
    amenities: [],
    rating: { average: 0, count: 0 },
    isActive: poi.StatusType?.IsOperational !== false,
    distance: (lat && lng && refLat && refLng) ? haversineKm(refLat, refLng, lat, lng) : 0,
    source: 'ocm',
  };
}

// ─── Merge + deduplicate ──────────────────────────────────────────────────────

/**
 * Merge two station arrays, deduplicating by proximity (< 80 m apart = same station).
 * OCM stations take priority over OSM ones (richer data).
 */
function mergeStations(primary, secondary) {
  const merged = [...primary];
  for (const s of secondary) {
    const [sLng, sLat] = s.location.coordinates;
    const isDupe = merged.some((m) => {
      const [mLng, mLat] = m.location.coordinates;
      return haversineKm(sLat, sLng, mLat, mLng) < 0.08; // 80 m threshold
    });
    if (!isDupe) merged.push(s);
  }
  return merged;
}

// ─── OpenChargeMap fetch ──────────────────────────────────────────────────────

async function fetchOCMNearby(lat, lng, radiusKm = 50, maxResults = 200) {
  const key = process.env.REACT_APP_OCM_KEY;
  if (!key) return [];
  const params = new URLSearchParams({
    output:       'json',
    latitude:     lat,
    longitude:    lng,
    distance:     Math.min(radiusKm, 200),
    distanceunit: 'KM',
    maxresults:   maxResults,
    countrycode:  'AU',
    compact:      'false',
    verbose:      'false',
    key,
  });
  try {
    const res = await fetchWithTimeout(`${OCM_BASE}?${params}`, {}, 15000);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data
          .filter((p) => p.AddressInfo?.Latitude && p.AddressInfo?.Longitude)
          .map((p) => normalizeOCMStation(p, lat, lng))
      : [];
  } catch {
    return [];
  }
}

async function fetchOCMBbox(south, west, north, east, refLat, refLng, maxResults = 500) {
  const key = process.env.REACT_APP_OCM_KEY;
  if (!key) return [];
  const params = new URLSearchParams({
    output:       'json',
    boundingbox:  `(${south},${west}),(${north},${east})`,
    maxresults:   maxResults,
    countrycode:  'AU',
    compact:      'false',
    verbose:      'false',
    key,
  });
  try {
    const res = await fetchWithTimeout(`${OCM_BASE}?${params}`, {}, 20000);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data
          .filter((p) => p.AddressInfo?.Latitude && p.AddressInfo?.Longitude)
          .map((p) => normalizeOCMStation(p, refLat, refLng))
      : [];
  } catch {
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const osmService = {

  /**
   * Fetch EV stations near a lat/lng.
   * Tries OpenChargeMap first (structured data), then Overpass (OSM), merges results.
   */
  fetchNearbyStations: async (lat, lng, radiusKm = 50) => {
    const [ocmStations, osmStations] = await Promise.allSettled([
      fetchOCMNearby(lat, lng, radiusKm),
      overpassQuery(
        `[out:json][timeout:25];\nnode["amenity"="charging_station"](around:${Math.round(Math.min(radiusKm, 200) * 1000)},${lat},${lng});\nout body 150;`,
        20000
      ).then((d) => (d.elements || []).map((n) => normalizeOSMNode(n, lat, lng))),
    ]);

    const ocm = ocmStations.status === 'fulfilled' ? ocmStations.value : [];
    const osm = osmStations.status === 'fulfilled' ? osmStations.value : [];
    return mergeStations(ocm, osm).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  },

  /**
   * Fetch stations across an Australian state (or whole country).
   */
  fetchByRegion: async (stateCode, userLat, userLng) => {
    const bb     = AU_STATES[stateCode] || AU_BBOX;
    const refLat = userLat ?? (bb.s + bb.n) / 2;
    const refLng = userLng ?? (bb.w + bb.e) / 2;

    const [ocmStations, osmData] = await Promise.allSettled([
      fetchOCMBbox(bb.s, bb.w, bb.n, bb.e, refLat, refLng),
      overpassQuery(
        `[out:json][timeout:55];\nnode["amenity"="charging_station"](${bb.s},${bb.w},${bb.n},${bb.e});\nout body 500;`,
        45000
      ),
    ]);

    const ocm = ocmStations.status === 'fulfilled' ? ocmStations.value : [];
    const osm = osmData.status === 'fulfilled'
      ? (osmData.value.elements || []).map((n) => normalizeOSMNode(n, refLat, refLng))
      : [];

    return mergeStations(ocm, osm).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  },

  /**
   * Fetch EV stations Australia-wide (union of major city radii).
   * Uses OCM if key available, supplements with OSM.
   */
  fetchAustraliaWide: async () => {
    const refLat = -25.3, refLng = 133.8;
    const ocmPromise = fetchOCMBbox(AU_BBOX.s, AU_BBOX.w, AU_BBOX.n, AU_BBOX.e, refLat, refLng, 1000);
    const osmQuery = `[out:json][timeout:50];
(
  node["amenity"="charging_station"](around:400000,-33.8688,151.2093);
  node["amenity"="charging_station"](around:400000,-37.8136,144.9631);
  node["amenity"="charging_station"](around:400000,-27.4698,153.0251);
  node["amenity"="charging_station"](around:400000,-31.9505,115.8605);
  node["amenity"="charging_station"](around:400000,-34.9285,138.6007);
);
out body 1000;`;
    const [ocmRes, osmRes] = await Promise.allSettled([ocmPromise, overpassQuery(osmQuery, 45000)]);
    const ocm = ocmRes.status === 'fulfilled' ? ocmRes.value : [];
    const osm = osmRes.status === 'fulfilled'
      ? (osmRes.value.elements || []).map((n) => normalizeOSMNode(n, refLat, refLng))
      : [];
    return mergeStations(ocm, osm);
  },

  /**
   * Fetch stations along a route corridor.
   * Tries OCM nearby at sampled route points, supplements with OSM corridor query.
   */
  fetchStationsAlongRoute: async (routeCoords, distanceKm = 0) => {
    if (!routeCoords || routeCoords.length === 0) return [];

    const bufferKm     = distanceKm > 300 ? 8 : distanceKm > 100 ? 5 : 3;
    const radiusM      = Math.round(bufferKm * 1000);
    const targetSamples = Math.min(60, Math.max(30, Math.floor(distanceKm / 20)));
    const step         = Math.max(1, Math.floor(routeCoords.length / targetSamples));
    const sampled      = [];
    for (let i = 0; i < routeCoords.length; i += step) sampled.push(routeCoords[i]);
    const last = routeCoords[routeCoords.length - 1];
    if (sampled[sampled.length - 1] !== last) sampled.push(last);

    const [refLat, refLng] = routeCoords[0];
    const coordStr   = sampled.map(([lat, lng]) => `${lat},${lng}`).join(',');
    const resultLimit = distanceKm > 300 ? 200 : 100;

    // Use midpoint of route for OCM query centre
    const midPt    = sampled[Math.floor(sampled.length / 2)];
    const ocmRadius = Math.min(distanceKm / 2 + bufferKm + 20, 200);

    const [ocmRes, osmRes] = await Promise.allSettled([
      fetchOCMNearby(midPt[0], midPt[1], ocmRadius, resultLimit),
      overpassQuery(
        `[out:json][timeout:40];\nnode["amenity"="charging_station"](around:${radiusM},${coordStr});\nout body ${resultLimit};`,
        35000
      ),
    ]);

    const ocm = ocmRes.status === 'fulfilled' ? ocmRes.value : [];
    const osm = osmRes.status === 'fulfilled'
      ? (osmRes.value.elements || []).map((n) => normalizeOSMNode(n, refLat, refLng))
      : [];

    // Filter merged results to only those within bufferKm of the route
    const merged = mergeStations(ocm, osm);
    return merged.filter((s) => {
      const [sLng, sLat] = s.location.coordinates;
      return sampled.some(([rLat, rLng]) => haversineKm(sLat, sLng, rLat, rLng) <= bufferKm + 2);
    });
  },

  /**
   * Geocode ANY address, suburb, postcode, landmark, city or state using Nominatim.
   *
   * Handles:
   *  - Full street addresses: "25 George St, Sydney NSW 2000"
   *  - Landmarks:             "Sydney Opera House"
   *  - Airports:              "Melbourne Airport"
   *  - Suburbs:               "Bondi Junction"
   *  - Postcodes:             "3000"
   *  - State abbreviations:   "NSW"
   *  - City names:            "Brisbane"
   */
  geocodeAddress: async (query) => {
    if (!query || query.trim().length < 2) return [];

    const stateCode = detectAustralianState(query);
    // Normalise the query for best Nominatim results
    let searchQuery = query.trim();
    if (stateCode) {
      searchQuery = `${stateCode}, Australia`;
    } else if (/^\d{4}$/.test(searchQuery)) {
      searchQuery = `${searchQuery}, Australia`;
    } else if (!/australia/i.test(searchQuery)) {
      // Append Australia only if not already present — helps Nominatim bias results
      searchQuery = `${searchQuery}, Australia`;
    }

    const params = new URLSearchParams({
      format:         'json',
      q:              searchQuery,
      limit:          '8',
      countrycodes:   'au',
      addressdetails: '1',
      'accept-language': 'en',
    });

    let data = [];
    try {
      const res = await fetchWithTimeout(`${NOMINATIM_URL}?${params}`, {
        headers: { 'User-Agent': 'EVChargingFinderAU/1.0 (education project)' },
      }, 10000);
      if (res.ok) data = await res.json();
    } catch { /* fallthrough to empty */ }

    // If Nominatim returns nothing, retry without ", Australia" suffix
    // (handles cases where the appended country confuses the matcher)
    if (data.length === 0 && searchQuery !== query.trim()) {
      try {
        const retryParams = new URLSearchParams({
          format:         'json',
          q:              query.trim(),
          limit:          '8',
          countrycodes:   'au',
          addressdetails: '1',
          'accept-language': 'en',
        });
        const res2 = await fetchWithTimeout(`${NOMINATIM_URL}?${retryParams}`, {
          headers: { 'User-Agent': 'EVChargingFinderAU/1.0 (education project)' },
        }, 10000);
        if (res2.ok) data = await res2.json();
      } catch { /* ignore */ }
    }

    return data.map((item) => {
      const addr       = item.address || {};
      const houseNum   = addr.house_number || '';
      const road       = addr.road || '';
      const suburb     = addr.suburb || addr.neighbourhood || addr.quarter || addr.town || addr.village || addr.city_district || '';
      const city       = addr.city || addr.county || '';
      const state      = addr.state_code || addr.state || '';
      const postcode   = addr.postcode || '';

      const streetPart = [houseNum, road].filter(Boolean).join(' ');
      const localPart  = suburb || city;
      const parts      = [streetPart, localPart, state, postcode].filter(Boolean);

      // Short label: "25 George St, Sydney, NSW 2000"
      const shortName = parts.length > 0
        ? parts.join(', ')
        : item.display_name.split(',').slice(0, 3).join(',').trim();

      return {
        id:          item.place_id,
        displayName: item.display_name,
        shortName,
        lat:         parseFloat(item.lat),
        lng:         parseFloat(item.lon),
        stateCode:   detectAustralianState(state) || state,
        isState:     !!stateCode,
        type:        item.type,         // 'house', 'suburb', 'city', 'aerodrome', etc.
        category:    item.category,     // 'place', 'highway', 'tourism', etc.
        address: {
          street:   streetPart,
          suburb,
          city:     city || suburb,
          state,
          postcode,
          country:  'Australia',
        },
      };
    });
  },

  /**
   * Reverse geocode a lat/lng to the nearest address string.
   */
  reverseGeocode: async (lat, lng) => {
    const params = new URLSearchParams({
      format:         'json',
      lat,
      lon:            lng,
      addressdetails: '1',
      'accept-language': 'en',
    });
    try {
      const res = await fetchWithTimeout(`${NOMINATIM_REVERSE}?${params}`, {
        headers: { 'User-Agent': 'EVChargingFinderAU/1.0 (education project)' },
      }, 8000);
      if (!res.ok) return null;
      const d    = await res.json();
      const addr = d.address || {};
      const parts = [
        [addr.house_number, addr.road].filter(Boolean).join(' '),
        addr.suburb || addr.town || addr.city || '',
        addr.state_code || addr.state || '',
        addr.postcode || '',
      ].filter(Boolean);
      return { shortName: parts.join(', ') || d.display_name, displayName: d.display_name, lat, lng };
    } catch {
      return null;
    }
  },

  /**
   * Driving route via Mapbox Directions API (real-time traffic).
   * @param {number} fromLat
   * @param {number} fromLng
   * @param {number} toLat
   * @param {number} toLng
   * @param {Array<{lat,lng}>} waypoints  — optional intermediate stops
   */
  fetchRouteMapbox: async (fromLat, fromLng, toLat, toLng, waypoints = []) => {
    const token = process.env.REACT_APP_MAPBOX_TOKEN;
    if (!token) throw new Error('Mapbox token not configured');
    const allPoints = [
      { lat: fromLat, lng: fromLng },
      ...waypoints,
      { lat: toLat,   lng: toLng   },
    ];
    const coordStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordStr}?geometries=geojson&overview=full&steps=true&annotations=duration,distance&access_token=${token}`;
    const res = await fetchWithTimeout(url, {}, 20000);
    if (!res.ok) throw new Error(`Mapbox Directions API error (${res.status})`);
    const data = await res.json();
    if (!data.routes?.[0]) throw new Error('No route found between these locations');
    const route       = data.routes[0];
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distanceKm  = route.distance / 1000;
    const durationSec = route.duration;
    // Flatten steps from all legs for turn-by-turn navigation
    const steps = (route.legs || []).flatMap((leg) =>
      (leg.steps || []).map((s) => ({
        instruction: s.maneuver?.instruction || '',
        type:        s.maneuver?.type        || '',
        modifier:    s.maneuver?.modifier    || '',
        distanceM:   s.distance             || 0,
        lat:         s.maneuver?.location?.[1] ?? null,
        lng:         s.maneuver?.location?.[0] ?? null,
      }))
    );
    return {
      coordinates,
      distanceKm,
      durationMin:      Math.round(durationSec / 60),
      totalDurationSec: durationSec,
      avgSpeedKmh:      distanceKm > 0 ? distanceKm / (durationSec / 3600) : 90,
      legs:             route.legs || [],
      steps,
    };
  },

  /**
   * Driving route via OSRM (fallback when Mapbox unavailable).
   * @param {number} fromLat
   * @param {number} fromLng
   * @param {number} toLat
   * @param {number} toLng
   * @param {Array<{lat,lng}>} waypoints  — optional intermediate stops
   */
  fetchRoute: async (fromLat, fromLng, toLat, toLng, waypoints = []) => {
    const allPoints = [
      { lat: fromLat, lng: fromLng },
      ...waypoints,
      { lat: toLat,   lng: toLng   },
    ];
    const coordStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `${OSRM_URL}/${coordStr}?overview=full&geometries=geojson`;
    const res = await fetchWithTimeout(url, {}, 15000);
    if (!res.ok) throw new Error('OSRM routing service failed');
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes[0]) throw new Error('No driving route found');
    const route       = data.routes[0];
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distanceKm  = route.distance / 1000;
    const durationSec = route.duration;
    return {
      coordinates,
      distanceKm,
      durationMin:      Math.round(durationSec / 60),
      totalDurationSec: durationSec,
      avgSpeedKmh:      distanceKm > 0 ? distanceKm / (durationSec / 3600) : 90,
    };
  },

  AU_STATES,
  AU_BBOX,
};

export default osmService;

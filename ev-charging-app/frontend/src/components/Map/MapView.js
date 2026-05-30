import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import StationCard from '../Station/StationCard';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const PROVIDER_COLORS = {
  'Chargefox':        '#8B5CF6',
  'Evie Networks':    '#10B981',
  'Tesla':            '#EF4444',
  'NRMA':             '#F59E0B',
  'BP Pulse':         '#059669',
  'Ampol AmpCharge':  '#0EA5E9',
  'Jolt':             '#F97316',
  'ChargePoint':      '#3B82F6',
};

function providerColor(station) {
  const op = station.operator?.name || '';
  for (const [key, color] of Object.entries(PROVIDER_COLORS)) {
    if (op.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#2563eb';
}

// waypointOrder: 1-based stop number if this station is a manual charging stop, else null
function markerEl(station, isSelected, isRecommended, isReachable, waypointOrder = null) {
  const isWaypoint = waypointOrder != null;

  const color = isWaypoint
    ? '#f97316'          // orange — manual charging stop
    : isRecommended
      ? '#10b981'        // green  — algorithm recommended
      : isSelected
        ? '#f59e0b'      // amber  — selected
        : !isReachable
          ? '#94a3b8'    // slate  — out of range
          : providerColor(station);

  const size = isWaypoint || isSelected || isRecommended ? 36 : 26;

  const shadowDefault = isWaypoint
    ? '0 0 0 3px rgba(249,115,22,0.4), 0 2px 8px rgba(0,0,0,0.2)'
    : isRecommended
      ? '0 0 0 3px rgba(16,185,129,0.35), 0 2px 8px rgba(0,0,0,0.18)'
      : isSelected
        ? '0 0 0 3px rgba(245,158,11,0.35), 0 2px 8px rgba(0,0,0,0.18)'
        : '0 2px 8px rgba(0,0,0,0.18)';

  const shadowHover = isWaypoint
    ? '0 0 0 5px rgba(249,115,22,0.5), 0 4px 14px rgba(0,0,0,0.25)'
    : isRecommended
      ? '0 0 0 5px rgba(16,185,129,0.45), 0 4px 14px rgba(0,0,0,0.25)'
      : isSelected
        ? '0 0 0 5px rgba(245,158,11,0.45), 0 4px 14px rgba(0,0,0,0.25)'
        : '0 0 0 4px rgba(37,99,235,0.3), 0 4px 14px rgba(0,0,0,0.22)';

  const el = document.createElement('div');
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    `background:${color}`,
    `border:2.5px solid #fff`,
    `border-radius:${isRecommended ? '50%' : '8px'}`,
    `display:flex`,
    `align-items:center`,
    `justify-content:center`,
    `cursor:pointer`,
    `opacity:${isReachable ? 1 : 0.5}`,
    `box-shadow:${shadowDefault}`,
    `transition:box-shadow 0.18s ease, border-color 0.18s ease`,
    // NO transform, NO position:relative, NO will-change
  ].join(';');

  if (isWaypoint) {
    // Show stop number inside the marker
    el.innerHTML = `<span style="color:#fff;font-size:13px;font-weight:800;line-height:1;font-family:system-ui,sans-serif">${waypointOrder}</span>`;
  } else if (isRecommended) {
    el.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
  } else {
    el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
  }

  el._shadowDefault = shadowDefault;
  el._shadowHover   = shadowHover;
  return el;
}

const MapView = ({
  center = [-33.8688, 151.2093],
  zoom = 5,
  stations = [],
  onStationClick,
  userLocation = null,
  routeCoordinates = null,
  routeInfo = null,
  onClearRoute = null,
  selectedStation = null,
  destination = null,
  reachableStationIds = null,
  flyTo = null,
  recommendedStopIds = null,
  notification = null,
  isNavigating = false,
  navLocation = null,       // { lat, lng } — live GPS during navigation
  navHeading = null,        // degrees — direction of travel
  navStep = null,           // current maneuver step { instruction, type, modifier, distanceM }
  navStepIndex = 0,
  navTotalSteps = 0,
  onAddStop = null,         // (station) => void — add station as a route waypoint
  onRemoveStop = null,      // (stationId) => void — remove station from waypoints
  waypointIds = null,       // Set of station _ids already added as waypoints
  waypointOrderMap = null,  // Map<stationId, stopNumber> for numbered marker display
  favoriteIds = null,       // Set of favorited station _ids
  onToggleFavorite = null,  // (station) => void
  sidebarOpen = true,
  className = '',
}) => {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const userMarkerRef   = useRef(null);
  const destMarkerRef   = useRef(null);
  const navMarkerRef    = useRef(null);
  const hideTimerRef    = useRef(null);   // debounce timer for hide
  const [mapReady, setMapReady]     = useState(false);
  const [showNotif, setShowNotif]   = useState(false);
  // { station, x, y } — x/y are pixels relative to mapContainerRef
  const [hoverState, setHoverState] = useState(null);

  // Resize map when sidebar opens/closes (wait for CSS transition to finish)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const t = setTimeout(() => mapRef.current?.resize(), 310);
    return () => clearTimeout(t);
  }, [sidebarOpen, mapReady]);

  // Schedule hide after 120 ms — cancelled if mouse enters the card before then
  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setHoverState(null), 120);
  }, []);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
  }, []);

  // Immediately hide (used on click)
  const clearHover = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setHoverState(null);
  }, []);

  // Notification auto-dismiss
  useEffect(() => {
    if (notification) {
      setShowNotif(true);
      const t = setTimeout(() => setShowNotif(false), 8000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({ id: 'route-shadow', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#000', 'line-width': 8, 'line-opacity': 0.07 } });
      map.addLayer({ id: 'route-line',   type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.9 } });
      setMapReady(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // flyTo
  useEffect(() => {
    if (mapRef.current && mapReady && flyTo) {
      mapRef.current.flyTo({ center: [flyTo[1], flyTo[0]], zoom: 13, duration: 1200 });
    }
  }, [flyTo, mapReady]);

  // Center / zoom change
  useEffect(() => {
    if (mapRef.current && mapReady && !routeCoordinates) {
      mapRef.current.flyTo({ center: [center[1], center[0]], zoom, duration: 800 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoom, mapReady]);

  // User location marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userLocation) return;

    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:20px;height:20px;';
    el.innerHTML = `
      <div style="position:absolute;inset:-8px;background:rgba(37,99,235,0.15);border-radius:50%;animation:pulse 2s infinite;"></div>
      <div style="position:absolute;inset:0;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.4);"></div>`;

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML('<b style="font-size:13px;">📍 Your Location</b>'))
      .addTo(mapRef.current);
  }, [userLocation, mapReady]);

  // Navigation marker — directional arrow that replaces the static dot while navigating
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    navMarkerRef.current?.remove();
    navMarkerRef.current = null;
    if (!isNavigating || !navLocation) return;

    // Hide the static user dot while navigating
    userMarkerRef.current?.getElement()?.style.setProperty('display', 'none');

    const el = document.createElement('div');
    el.style.cssText = 'width:36px;height:36px;display:flex;align-items:center;justify-content:center;';
    const heading = navHeading ?? 0;
    el.innerHTML = `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:#2563eb;border:3px solid white;
        box-shadow:0 3px 12px rgba(37,99,235,0.5);
        display:flex;align-items:center;justify-content:center;
        transform:rotate(${heading}deg);
        transition:transform 0.4s ease;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L4 20l8-4 8 4L12 2z"/>
        </svg>
      </div>`;

    navMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([navLocation.lng, navLocation.lat])
      .addTo(mapRef.current);

    // Track-up: keep camera centred on user, rotated to heading
    mapRef.current.easeTo({
      center: [navLocation.lng, navLocation.lat],
      bearing: navHeading ?? 0,
      pitch: 45,
      zoom: 17,
      duration: 500,
    });

    return () => {
      navMarkerRef.current?.remove();
      navMarkerRef.current = null;
      userMarkerRef.current?.getElement()?.style.setProperty('display', '');
    };
  }, [isNavigating, navLocation, navHeading, mapReady]); // eslint-disable-line

  // Reset camera when navigation stops
  useEffect(() => {
    if (!isNavigating && mapRef.current && mapReady) {
      mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 600 });
    }
  }, [isNavigating, mapReady]); // eslint-disable-line

  // Destination marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    destMarkerRef.current?.remove();
    destMarkerRef.current = null;
    if (!destination) return;

    const el = document.createElement('div');
    el.style.cssText = 'width:30px;height:36px;display:flex;flex-direction:column;align-items:center;cursor:pointer;';
    el.innerHTML = `
      <div style="width:26px;height:26px;background:#ef4444;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(239,68,68,0.4);"></div>
      <div style="width:3px;height:8px;background:#ef4444;border-radius:0 0 2px 2px;"></div>`;

    destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([destination.lng, destination.lat])
      .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(`<b>🏁 ${destination.name}</b>`))
      .addTo(mapRef.current);
  }, [destination, mapReady]);

  // Route line
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const coords = routeCoordinates ? routeCoordinates.map(([lat, lng]) => [lng, lat]) : [];
    mapRef.current.getSource('route')?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });

    if (routeCoordinates?.length > 1) {
      const lngs = routeCoordinates.map(([, lng]) => lng);
      const lats  = routeCoordinates.map(([lat]) => lat);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 80, duration: 1000 }
      );
    }
  }, [routeCoordinates, mapReady]);

  // Station markers — hover sets state, card shown as fixed React panel (no coordinate math)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    stations.forEach((station) => {
      const [lng, lat] = station.location?.coordinates || [0, 0];
      if (!lat || !lng) return;

      const isSelected    = selectedStation?._id === station._id;
      const isReachable   = reachableStationIds ? reachableStationIds.has(station._id?.toString()) : true;
      const isRecommended = recommendedStopIds  ? recommendedStopIds.has(station._id)             : (station.isRecommendedStop || false);
      const waypointOrder = waypointOrderMap    ? (waypointOrderMap.get(station._id) ?? null)     : null;

      const el = markerEl(station, isSelected, isRecommended, isReachable, waypointOrder);

      // Hover: grow box-shadow only — no transform, marker never shifts
      el.addEventListener('mouseenter', (e) => {
        el.style.boxShadow   = el._shadowHover;
        el.style.borderColor = '#fff';
        cancelHide();
        const rect = mapContainerRef.current?.getBoundingClientRect();
        const x = rect ? e.clientX - rect.left : e.clientX;
        const y = rect ? e.clientY - rect.top  : e.clientY;
        setHoverState({ station, x, y });
      });
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow   = el._shadowDefault;
        el.style.borderColor = '#fff';
        scheduleHide();
      });
      el.addEventListener('click', () => {
        el.style.boxShadow = el._shadowDefault;
        clearHover();
        if (onStationClick) onStationClick(station);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [stations, selectedStation, reachableStationIds, recommendedStopIds, waypointOrderMap, mapReady, onStationClick, cancelHide, scheduleHide, clearHover]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />

      {/* ── Hover station card — positioned near the marker ── */}
      {hoverState && (() => {
        const CARD_W = 288;
        const CARD_H = 320; // conservative estimate
        const mapW = mapContainerRef.current?.offsetWidth  || 600;
        const mapH = mapContainerRef.current?.offsetHeight || 400;

        // Default: card appears to the right of and above the cursor
        let left = hoverState.x + 16;
        let top  = hoverState.y - CARD_H / 2;

        // Flip left if not enough room on right
        if (left + CARD_W > mapW - 8) left = hoverState.x - CARD_W - 16;
        // Keep within horizontal bounds
        if (left < 8) left = 8;
        // Keep within vertical bounds
        if (top + CARD_H > mapH - 8) top = mapH - CARD_H - 8;
        if (top < 8) top = 8;

        const station = hoverState.station;
        return (
          <div
            className="absolute z-20 w-72 animate-fade-in"
            style={{ left, top }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            onMouseDown={cancelHide}
          >
            <StationCard
              station={station}
              onClick={(s) => { clearHover(); if (onStationClick) onStationClick(s); }}
              compact={false}
              showDistance={true}
              isFavorite={favoriteIds?.has(station._id?.toString()) ?? false}
              onToggleFavorite={onToggleFavorite ?? undefined}
            />
            {/* Add / Remove charging stop — shown when route is active and station is near route */}
            {(onAddStop || (onRemoveStop && waypointIds?.has(station._id))) && (
              waypointIds?.has(station._id) ? (
                <button
                  onClick={() => { onRemoveStop(station._id); clearHover(); }}
                  className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <span className="w-4 h-4 rounded bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {waypointOrderMap?.get(station._id) ?? '✓'}
                  </span>
                  Remove Stop
                </button>
              ) : (
                <button
                  onClick={() => { onAddStop(station); clearHover(); }}
                  className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border bg-primary-600 border-primary-600 text-white hover:bg-primary-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add as Charging Stop
                </button>
              )
            )}
          </div>
        );
      })()}

      {/* Navigation instruction banner */}
      {isNavigating && navStep && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-sm pointer-events-none">
          <div className="bg-primary-600 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 animate-slide-up">
            {/* Maneuver icon */}
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {navStep.type === 'arrive' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              ) : navStep.modifier === 'right' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              ) : navStep.modifier === 'left' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              ) : navStep.modifier === 'slight right' || navStep.modifier === 'sharp right' ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M14 5l7 7-7 7M3 12h18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              )}
            </div>

            {/* Instruction + distance */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug line-clamp-2">
                {navStep.instruction || 'Continue on route'}
              </p>
              {navStep.distanceM > 0 && (
                <p className="text-[11px] text-white/75 mt-0.5">
                  In {navStep.distanceM >= 1000
                    ? `${(navStep.distanceM / 1000).toFixed(1)} km`
                    : `${Math.round(navStep.distanceM)} m`}
                </p>
              )}
            </div>

            {/* Step progress */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] text-white/60 font-medium">{navStepIndex + 1}/{navTotalSteps}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
              <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-gray-500 text-sm font-medium">Loading map…</span>
          </div>
        </div>
      )}

      {/* Smart notification banner */}
      {showNotif && notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl border border-accent-200 px-4 py-3 flex items-start gap-3 animate-slide-up">
            <div className="w-9 h-9 rounded-xl bg-accent-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">{notification.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
            </div>
            <button onClick={() => setShowNotif(false)} className="text-gray-300 hover:text-gray-500 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Route info bar */}
      {routeInfo && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="map-panel flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-none">{routeInfo.distanceKm.toFixed(1)} km</p>
                <p className="text-[10px] text-gray-400 mt-0.5">distance</p>
              </div>
            </div>
            <div className="w-px h-7 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-none">
                  {routeInfo.durationMin < 60
                    ? `${routeInfo.durationMin} min`
                    : `${Math.floor(routeInfo.durationMin / 60)}h${routeInfo.durationMin % 60 ? ` ${routeInfo.durationMin % 60}m` : ''}`}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">drive time</p>
              </div>
            </div>
            {onClearRoute && (
              <>
                <div className="w-px h-7 bg-gray-200" />
                <button onClick={onClearRoute} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Locate me button */}
      {userLocation && (
        <button
          onClick={() => mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 14, duration: 1200 })}
          className="absolute bottom-32 right-3 z-10 w-10 h-10 bg-white rounded-xl shadow-md border border-gray-200 flex items-center justify-center text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-all"
          title="Go to my location"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </button>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10">
        <div className="map-panel px-3 py-2.5 space-y-1.5 text-[11px] text-gray-500 font-medium">
          {waypointOrderMap && waypointOrderMap.size > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-sm bg-orange-500 shadow-sm flex items-center justify-center flex-shrink-0">
                <span style={{ color: '#fff', fontSize: '8px', fontWeight: 800, lineHeight: 1 }}>1</span>
              </div>
              Charging Stop
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-secondary-500 shadow-sm flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            Recommended
          </div>
          {Object.entries(PROVIDER_COLORS).slice(0, 4).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shadow-sm inline-block" style={{ background: color }} />
              {name}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-primary-600 shadow-sm inline-block" />
            Other
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-slate-400 shadow-sm inline-block" />
            Out of range
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;

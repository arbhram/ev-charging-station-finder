import { formatDistance, formatCurrency } from '../../utils/helpers';

const LEVEL_CONFIG = {
  'DC Fast Charger': { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200', dot: 'bg-accent-500' },
  'Level 2':         { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200', dot: 'bg-primary-500' },
  'Level 1':         { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
};

const StationCard = ({ station, onClick, onGo, onAddStop, onRemoveStop, isStop = false, stopOrder = 0, compact = false, showDistance = true, selected = false, dimmed = false, isFavorite = false, onToggleFavorite }) => {
  const levelCfg = LEVEL_CONFIG[station.chargerLevel] || LEVEL_CONFIG['Level 1'];
  const availableCount = station.connectors?.reduce((sum, c) => sum + (c.available || 0), 0) || 0;
  const totalCount = station.connectors?.reduce((sum, c) => sum + (c.quantity || 0), 0) || 0;
  const isAvailable = availableCount > 0;
  const isOSM = station.source === 'osm';

  return (
    <div
      onClick={() => onClick && onClick(station)}
      className={`
        group rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden
        ${selected
          ? 'bg-primary-50 border-primary-300 shadow-md ring-1 ring-primary-300'
          : 'bg-white border-gray-200 shadow-card hover:shadow-card-hover hover:border-gray-300 hover:-translate-y-0.5'
        }
        ${dimmed ? 'opacity-40 grayscale' : ''}
      `}
    >
      {/* Availability indicator bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isAvailable ? 'bg-green-400' : 'bg-red-300'}`} />
      <div className="p-4 pl-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Station name + OSM badge */}
          <div className="flex items-start gap-2 mb-1">
            <h3 className={`font-semibold truncate leading-snug ${compact ? 'text-sm' : 'text-sm'} ${selected ? 'text-primary-800' : 'text-gray-900'}`}>
              {station.name}
            </h3>
            {isOSM && (
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-gray-100 text-gray-400 uppercase tracking-wide mt-0.5">
                OSM
              </span>
            )}
          </div>

          {/* Address */}
          <p className="text-xs text-gray-400 truncate">
            {station.location?.formattedAddress || station.location?.address?.city || 'Location not specified'}
          </p>

          {/* Level + availability row */}
          <div className="flex items-center gap-2 mt-2.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${levelCfg.bg} ${levelCfg.text} ${levelCfg.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${levelCfg.dot}`} />
              {station.chargerLevel || 'Unknown'}
            </span>
            <span className={`text-[11px] font-semibold ${isAvailable ? 'text-secondary-600' : 'text-red-500'}`}>
              {availableCount}/{totalCount} available
            </span>
          </div>

          {/* Connectors */}
          {!compact && (
            <div className="flex flex-wrap gap-1 mt-2">
              {station.connectors?.slice(0, 4).map((connector, idx) => (
                <span
                  key={idx}
                  className={`connector-pill ${connector.available > 0 ? 'bg-secondary-50 text-secondary-700' : 'bg-red-50 text-red-600'}`}
                >
                  {connector.type} · {connector.powerKW}kW
                </span>
              ))}
              {station.connectors?.length > 4 && (
                <span className="connector-pill text-gray-400">+{station.connectors.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Right side — favorite + price & distance */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(station); }}
              className={`p-1 -mt-0.5 -mr-0.5 rounded-lg transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          )}
          {station.pricing?.isFree ? (
            <span className="badge-green">Free</span>
          ) : station.pricing?.perKWh ? (
            <div className="text-right">
              <span className="text-sm font-bold text-gray-900">{formatCurrency(station.pricing.perKWh)}</span>
              <span className="text-[10px] text-gray-400">/kWh</span>
            </div>
          ) : null}

          {showDistance && station.distance != null && (
            <span className="text-xs text-gray-400 font-medium">{formatDistance(station.distance)}</span>
          )}

          {station.rating?.average > 0 && (
            <div className="flex items-center gap-0.5">
              <svg className="w-3 h-3 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-[11px] text-gray-500 font-medium">{station.rating.average.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Go button — always visible when available */}
      {!compact && onGo && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onGo(station); }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            Go{station.distance != null && ` · ${Number(station.distance).toFixed(1)} km`}
          </button>
        </div>
      )}

      {/* Add/Remove Stop — appears on hover when a route is active */}
      {!compact && (onAddStop || onRemoveStop) && (
        isStop ? (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveStop(station._id); }}
            className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 border border-orange-300 text-orange-700 text-[10px] font-bold transition-all opacity-100"
          >
            <span className="w-3.5 h-3.5 rounded bg-orange-500 text-white text-[8px] font-bold flex items-center justify-center">{stopOrder}</span>
            Stop
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onAddStop(station); }}
            className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Stop
          </button>
        )
      )}

      {/* Amenities */}
      {!compact && station.amenities?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
          {station.amenities.slice(0, 5).map((amenity, idx) => (
            <span key={idx} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium">
              {amenity}
            </span>
          ))}
          {station.amenities.length > 5 && (
            <span className="text-[10px] text-gray-400 py-0.5">+{station.amenities.length - 5} more</span>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default StationCard;

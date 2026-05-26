import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { favoritesService } from '../../services/miscServices';
import { formatCurrency } from '../../utils/helpers';

const LEVEL_CONFIG = {
  'DC Fast Charger': { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200', label: 'DC Fast Charger', speed: 'Up to 350 kW' },
  'Level 2':         { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200', label: 'Level 2 AC', speed: 'Up to 22 kW' },
  'Level 1':         { bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200',   label: 'Level 1 AC', speed: 'Up to 2.4 kW' },
};

const AMENITY_ICONS = {
  'WiFi': '📶', 'Restroom': '🚻', 'Food': '🍔', 'Shopping': '🛍️',
  'Parking': '🅿️', 'Shelter': '🏠', 'Lighting': '💡',
  '24/7 Access': '🕐', 'Wheelchair Accessible': '♿',
};

const StationDetail = ({ station, onClose, onGetDirections }) => {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && /^[0-9a-f]{24}$/i.test(String(station?._id ?? ''))) {
      favoritesService.check(station._id).then((res) => {
        setIsFavorite(res.data.isFavorite);
      }).catch(() => {});
    }
  }, [station, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) return;
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoritesService.remove(station._id);
        setIsFavorite(false);
      } else {
        await favoritesService.add(station._id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Favorite toggle error:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (!station) return null;

  const levelCfg = LEVEL_CONFIG[station.chargerLevel] || LEVEL_CONFIG['Level 1'];
  const availableCount = station.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;
  const totalCount = station.connectors?.reduce((s, c) => s + (c.quantity || 0), 0) || 0;
  const isOSM = station.source === 'osm';
  const isMongoId = /^[0-9a-f]{24}$/i.test(String(station._id ?? ''));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-card animate-slide-up">
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 ${levelCfg.bg} border-b ${levelCfg.border}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${levelCfg.bg} ${levelCfg.text} ${levelCfg.border}`}>
                {levelCfg.label}
              </span>
              {isOSM && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 border border-gray-200">
                  OSM
                </span>
              )}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${availableCount > 0 ? 'bg-secondary-100 text-secondary-700' : 'bg-red-100 text-red-600'}`}>
                {availableCount}/{totalCount} free
              </span>
            </div>
            <h2 className="text-base font-bold text-gray-900 leading-snug">{station.name}</h2>
            {station.location?.formattedAddress && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{station.location.formattedAddress}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {onGetDirections && (
              <button
                onClick={() => onGetDirections(station)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm"
                title="Get directions"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Go
              </button>
            )}
            {isAuthenticated && isMongoId && (
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className="p-1.5 rounded-lg hover:bg-white/60 transition-colors"
                title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
              >
                <svg
                  className={`w-4 h-4 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
                  fill={isFavorite ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white rounded-xl p-2.5 text-center border border-white/60 shadow-sm">
            <p className={`text-xs font-bold ${levelCfg.text}`}>{levelCfg.speed}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Max Power</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center border border-white/60 shadow-sm">
            <p className="text-xs font-bold text-gray-800">
              {station.pricing?.isFree ? 'Free' : station.pricing?.perKWh ? formatCurrency(station.pricing.perKWh) : 'N/A'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{station.pricing?.isFree ? 'No charge' : 'Per kWh'}</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center border border-white/60 shadow-sm">
            <p className="text-xs font-bold text-gray-800">
              {station.rating?.average > 0 ? station.rating.average.toFixed(1) : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{station.rating?.count > 0 ? `${station.rating.count} reviews` : 'No reviews'}</p>
          </div>
        </div>
      </div>

      {/* Connectors */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Connectors</h3>
        <div className="space-y-1.5">
          {station.connectors?.map((connector, idx) => (
            <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connector.available > 0 ? 'bg-secondary-500' : 'bg-red-400'}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{connector.type}</p>
                  <p className="text-[10px] text-gray-400">{connector.powerKW} kW</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${connector.available > 0 ? 'text-secondary-600' : 'text-red-500'}`}>
                  {connector.available}/{connector.quantity}
                </p>
                <p className="text-[10px] text-gray-400">{connector.available > 0 ? 'available' : 'occupied'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operator */}
      {station.operator?.name && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Operator</h3>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">{station.operator.name}</p>
            {station.operator.website && (
              <a
                href={station.operator.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Website →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Amenities */}
      {station.amenities?.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amenities</h3>
          <div className="flex flex-wrap gap-1.5">
            {station.amenities.map((amenity, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-lg">
                {AMENITY_ICONS[amenity] || '•'} {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Distance */}
      {station.distance != null && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <p className="text-xs text-gray-400 text-center">
            📍 {station.distance.toFixed(1)} km from your location
          </p>
        </div>
      )}
    </div>
  );
};

export default StationDetail;

/**
 * Frontend utility functions.
 */

/**
 * Format distance for display.
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance
 */
export const formatDistance = (km) => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
};

/**
 * Format currency.
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'AUD') => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get connector badge color.
 * @param {string} type - Connector type
 * @returns {string} CSS class
 */
export const getConnectorColor = (type) => {
  const colors = {
    'Type 1': 'badge-blue',
    'Type 2': 'badge-green',
    CCS: 'badge-yellow',
    CCS2: 'badge-yellow',
    CHAdeMO: 'badge-red',
    'Tesla Supercharger': 'badge-red',
    'Tesla Destination': 'badge-blue',
  };
  return colors[type] || 'badge-blue';
};

/**
 * Get charger level display info.
 * @param {string} level
 * @returns {object} { label, color, icon }
 */
export const getChargerLevelInfo = (level) => {
  const levels = {
    'Level 1': { label: 'Level 1 (Slow)', color: 'text-blue-400', speed: '~1.4 kW' },
    'Level 2': { label: 'Level 2 (Standard)', color: 'text-primary-400', speed: '~7-22 kW' },
    'DC Fast Charger': { label: 'DC Fast', color: 'text-volt-400', speed: '~50-350 kW' },
  };
  return levels[level] || { label: level, color: 'text-carbon-400', speed: '' };
};

/**
 * Get availability status display.
 * @param {string} status
 * @returns {object} { label, color }
 */
export const getStatusInfo = (status) => {
  const statuses = {
    available: { label: 'Available', color: 'text-primary-400', bg: 'bg-primary-500/10' },
    occupied: { label: 'Occupied', color: 'text-volt-400', bg: 'bg-volt-500/10' },
    out_of_service: { label: 'Out of Service', color: 'text-red-400', bg: 'bg-red-500/10' },
    unknown: { label: 'Unknown', color: 'text-carbon-400', bg: 'bg-carbon-500/10' },
  };
  return statuses[status] || statuses.unknown;
};

/**
 * Truncate text with ellipsis.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncate = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format relative time.
 * @param {string|Date} date
 * @returns {string}
 */
/**
 * Format minutes into human-readable duration.
 * e.g. 45 → "45 min", 90 → "1 hr 30 min", 120 → "2 hrs"
 */
export const formatMinutes = (totalMinutes) => {
  const mins = Math.round(Number(totalMinutes) || 0);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  const hLabel = hrs === 1 ? 'hr' : 'hrs';
  return rem === 0 ? `${hrs} ${hLabel}` : `${hrs} ${hLabel} ${rem} min`;
};

export const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'Just now';
};

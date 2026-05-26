import { useState } from 'react';
import calculatorService from '../services/calculatorService';
import { formatCurrency } from '../utils/helpers';
import { ErrorMessage } from '../components/Common/SharedComponents';
import { useAuth } from '../context/AuthContext';

const PRESETS = [
  { label: 'Tesla Model 3', battery: 60, range: 491, icon: '⚡' },
  { label: 'Tesla Model Y', battery: 75, range: 533, icon: '⚡' },
  { label: 'Nissan Leaf', battery: 40, range: 270, icon: '🍃' },
  { label: 'BYD Atto 3', battery: 60.48, range: 420, icon: '🔋' },
  { label: 'Hyundai Ioniq 5', battery: 77.4, range: 507, icon: '🚗' },
  { label: 'Kia EV6', battery: 77.4, range: 528, icon: '🚘' },
];

const ResultCard = ({ icon, value, unit, label, colorClass = '' }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-card text-center group hover:shadow-card-hover hover:border-primary-200 transition-all">
    <div className={`w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center ${colorClass || 'bg-gray-100'}`}>
      {icon}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {unit && <p className="text-xs text-gray-400 font-medium mt-0.5">{unit}</p>}
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

const CalculatorPage = () => {
  const { user } = useAuth();
  const userVehicle    = user?.vehicle;
  const hasUserVehicle = !!(userVehicle?.batteryCapacity);

  const [formData, setFormData] = useState({
    batteryCapacity: userVehicle?.batteryCapacity || 60,
    currentPercent: 20,
    targetPercent: 80,
    chargerLevel: 'DC Fast Charger',
    pricePerKWh: 0.45,
  });
  // null = nothing selected, 'user' = user's vehicle, else preset label
  const [selectedPreset, setSelectedPreset] = useState(hasUserVehicle ? 'user' : null);
  const [result, setResult] = useState(null);
  const [quickResult, setQuickResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handlePreset = (preset) => {
    setSelectedPreset(preset.label);
    set('batteryCapacity', preset.battery);
  };

  const handleUserVehicle = () => {
    setSelectedPreset('user');
    set('batteryCapacity', userVehicle.batteryCapacity);
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const [calcResponse, quickResponse] = await Promise.all([
        calculatorService.calculate({
          batteryCapacity: Number(formData.batteryCapacity),
          currentPercent: Number(formData.currentPercent),
          targetPercent: Number(formData.targetPercent),
          chargerLevel: formData.chargerLevel,
          pricing: { perKWh: Number(formData.pricePerKWh), currency: 'AUD', isFree: false },
        }),
        calculatorService.quickEstimate({
          batteryCapacity: Number(formData.batteryCapacity),
          currentPercent: Number(formData.currentPercent),
          targetPercent: Number(formData.targetPercent),
        }),
      ]);
      const r = calcResponse.data.result;
      setResult({
        charging: { chargingTime: r.chargingTime, energyRequired: r.energyRequired },
        cost: r.cost != null ? { totalCost: r.cost } : null,
      });
      const comparisons = quickResponse.data.comparisons;
      setQuickResult({ estimates: comparisons, energyRequired: comparisons[0]?.energyKWh });
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const energyNeeded = ((Number(formData.targetPercent) - Number(formData.currentPercent)) / 100 * Number(formData.batteryCapacity)).toFixed(1);
  const estCost = (energyNeeded * Number(formData.pricePerKWh)).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '64px' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Charging Calculator</h1>
            <p className="text-sm text-gray-500">Estimate charging time, cost, and energy for your EV</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Inputs (left, wider) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Vehicle selection */}
            <div className="card !p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Vehicle</h3>

              {/* User's registered vehicle */}
              {hasUserVehicle && (
                <button
                  onClick={handleUserVehicle}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                    selectedPreset === 'user'
                      ? 'bg-primary-50 border-primary-300 ring-1 ring-primary-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedPreset === 'user' ? 'bg-primary-600' : 'bg-gray-300'}`}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${selectedPreset === 'user' ? 'text-primary-800' : 'text-gray-700'}`}>
                      {[userVehicle.year, userVehicle.make, userVehicle.model].filter(Boolean).join(' ') || 'My Vehicle'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{userVehicle.batteryCapacity} kWh · {userVehicle.range} km</p>
                  </div>
                  {selectedPreset === 'user' && (
                    <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              )}

              {/* Presets */}
              <div>
                {hasUserVehicle && <p className="text-[11px] text-gray-400 font-medium mb-1.5">Or use a preset</p>}
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePreset(preset)}
                      className={`text-left px-3 py-2.5 rounded-xl text-xs transition-all border ${
                        selectedPreset === preset.label
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-base mr-1">{preset.icon}</span>
                      <span className="font-semibold">{preset.label}</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">{preset.battery} kWh</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculator form */}
            <form onSubmit={handleCalculate} className="card !p-5 space-y-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Charging Parameters</h3>

              <div>
                <label className="label-text">Battery Capacity (kWh)</label>
                <input
                  type="number" step="0.1"
                  value={formData.batteryCapacity}
                  onChange={(e) => set('batteryCapacity', e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Battery sliders */}
              <div className="space-y-4">
                {/* Current battery */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Current Battery</label>
                    <span className="text-sm font-bold text-red-500">{formData.currentPercent}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-400 to-accent-400 transition-all"
                      style={{ width: `${formData.currentPercent}%` }}
                    />
                  </div>
                  <input type="range" min="0" max="100"
                    value={formData.currentPercent}
                    onChange={(e) => set('currentPercent', Number(e.target.value))}
                    className="w-full accent-red-500" />
                </div>

                {/* Target battery */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Target Battery</label>
                    <span className="text-sm font-bold text-secondary-600">{formData.targetPercent}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-500 transition-all"
                      style={{ width: `${formData.targetPercent}%` }}
                    />
                  </div>
                  <input type="range" min="0" max="100"
                    value={formData.targetPercent}
                    onChange={(e) => set('targetPercent', Number(e.target.value))}
                    className="w-full accent-secondary-500" />
                </div>
              </div>

              {/* Live preview */}
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary-600 font-medium">Energy needed</p>
                  <p className="text-base font-bold text-primary-800">{energyNeeded} kWh</p>
                </div>
                <div className="w-px h-8 bg-primary-200" />
                <div>
                  <p className="text-xs text-primary-600 font-medium">Est. cost</p>
                  <p className="text-base font-bold text-primary-800">${estCost}</p>
                </div>
                <div className="w-px h-8 bg-primary-200" />
                <div>
                  <p className="text-xs text-primary-600 font-medium">Charge delta</p>
                  <p className="text-base font-bold text-primary-800">
                    +{Math.max(0, formData.targetPercent - formData.currentPercent)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Charger Type</label>
                  <select
                    value={formData.chargerLevel}
                    onChange={(e) => set('chargerLevel', e.target.value)}
                    className="input-field"
                  >
                    <option value="Level 1">Level 1 (~1.4 kW)</option>
                    <option value="Level 2">Level 2 (~7.2 kW)</option>
                    <option value="DC Fast Charger">DC Fast (~50 kW)</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Price/kWh ($AUD)</label>
                  <input
                    type="number" step="0.01"
                    value={formData.pricePerKWh}
                    onChange={(e) => set('pricePerKWh', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Calculating…
                  </>
                ) : 'Calculate Charging'}
              </button>
            </form>

            {error && <ErrorMessage message={error} />}
          </div>

          {/* ── Results (right) ── */}
          <div className="lg:col-span-3 space-y-5">
            {result ? (
              <>
                {/* 3 main result cards */}
                <div className="grid grid-cols-3 gap-4 animate-slide-up">
                  <ResultCard
                    icon={<svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    value={result.charging.chargingTime}
                    label="Charging Time"
                    colorClass="bg-primary-50"
                  />
                  <ResultCard
                    icon={<svg className="w-5 h-5 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    value={result.cost ? formatCurrency(result.cost.totalCost) : 'N/A'}
                    label="Estimated Cost"
                    colorClass="bg-secondary-50"
                  />
                  <ResultCard
                    icon={<svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
                    value={result.charging.energyRequired}
                    unit="kWh"
                    label="Energy Required"
                    colorClass="bg-accent-50"
                  />
                </div>

                {/* Charger comparison */}
                {quickResult && (
                  <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Compare Charger Types</h3>
                    <div className="space-y-4">
                      {quickResult.estimates?.map((est, idx) => {
                        const maxTime = Math.max(...quickResult.estimates.map((e) => e.chargingTimeMinutes));
                        const barWidth = maxTime > 0 ? (est.chargingTimeMinutes / maxTime) * 100 : 0;
                        const configs = [
                          { bar: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                          { bar: 'bg-primary-500', bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200' },
                          { bar: 'bg-secondary-500', bg: 'bg-secondary-50', text: 'text-secondary-700', border: 'border-secondary-200' },
                        ];
                        const c = configs[idx] || configs[0];
                        return (
                          <div key={idx} className={`rounded-xl p-3 border ${c.bg} ${c.border}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-semibold ${c.text}`}>{est.chargerLevel}</span>
                              <span className="text-sm font-bold text-gray-800">{est.chargingTime}</span>
                            </div>
                            <div className="w-full bg-white/60 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${c.bar} transition-all duration-700`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Total energy: <span className="font-semibold text-gray-700">{quickResult.energyRequired} kWh</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        At <span className="font-semibold text-gray-700">${formData.pricePerKWh}/kWh</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Tip card */}
                <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary-800">Charging Tip</p>
                    <p className="text-xs text-primary-600 mt-0.5">
                      For lithium batteries, charging to 80% is ideal for longevity. Use DC fast chargers sparingly for daily use.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="card flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-500">Results will appear here</p>
                <p className="text-sm text-gray-400 mt-1 max-w-xs">Select a vehicle, set your battery levels, and click Calculate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorPage;

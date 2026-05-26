import { useState, useEffect, useCallback } from 'react';
import stationService from '../services/stationService';
import adminService from '../services/adminService';
import vehicleService from '../services/vehicleService';
import { LoadingSpinner, ErrorMessage } from '../components/Common/SharedComponents';
import { formatCurrency } from '../utils/helpers';

// ── tiny helpers ────────────────────────────────────────────────────
const Badge = ({ children, color = 'gray' }) => {
  const map = {
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    gray:   'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[color] || map.gray}`}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, color = 'text-gray-900', icon, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
    {icon && (
      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
    )}
    <div className="min-w-0">
      <p className={`text-2xl font-bold leading-tight ${color}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const Th = ({ children, right }) => (
  <th className={`py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',    icon: '📊' },
  { id: 'stations',   label: 'Stations',      icon: '⚡' },
  { id: 'map',        label: 'Map',           icon: '🗺️' },
  { id: 'users',      label: 'Users',         icon: '👥' },
  { id: 'reports',    label: 'Reports',       icon: '🚩' },
  { id: 'vehicles',   label: 'Vehicles',      icon: '🚗' },
];

// ── MODAL wrapper ────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════
// TAB: DASHBOARD
// ══════════════════════════════════════════════════
const DashboardTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAnalytics()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>;
  if (!data) return <ErrorMessage message="Failed to load analytics" />;

  const maxConnector = Math.max(...(data.stationsByConnector?.map((c) => c.count) || [1]));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Stations" value={data.totalStations} color="text-primary-600"
          icon={<svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
        <StatCard label="Registered Users" value={data.totalUsers} color="text-blue-600"
          icon={<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <StatCard label="Total Routes" value={data.totalRoutes} color="text-purple-600"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>} />
        <StatCard label="Open Reports" value={data.openReports} color="text-red-600"
          icon={<svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charger Levels */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Stations by Level</h4>
          <div className="space-y-3">
            {data.stationsByLevel?.map((l) => {
              const max = Math.max(...data.stationsByLevel.map((x) => x.count));
              return (
                <div key={l._id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-32 truncate">{l._id}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(l.count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{l.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connector types */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Connector Distribution</h4>
          <div className="grid grid-cols-2 gap-3">
            {data.stationsByConnector?.slice(0, 6).map((c) => (
              <div key={c._id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-lg font-bold text-gray-800">{c.count}</p>
                <p className="text-xs text-gray-500 truncate mb-2">{c._id}</p>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.round((c.count / maxConnector) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Routes per day */}
      {data.routesPerDay?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Routes Planned — Last 7 Days</h4>
          <div className="flex items-end gap-2 h-24">
            {data.routesPerDay.map((d) => {
              const max = Math.max(...data.routesPerDay.map((x) => x.count), 1);
              return (
                <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.count}</span>
                  <div className="w-full bg-primary-500 rounded-t-md" style={{ height: `${Math.max((d.count / max) * 72, 4)}px` }} />
                  <span className="text-[10px] text-gray-400">{d._id?.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Users</h4>
          <div className="space-y-2">
            {data.recentUsers?.map((u) => (
              <div key={u._id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Blocked'}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Top Stations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Most Favourited Stations</h4>
          <div className="space-y-2">
            {data.topStations?.map((s, i) => (
              <div key={s._id} className="flex items-center gap-3 py-1.5">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.city}</p>
                </div>
                <span className="text-xs font-semibold text-gray-600">♥ {s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════
// TAB: STATIONS
// ══════════════════════════════════════════════════
const StationsTab = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editStation, setEditStation] = useState(null);
  const [availStation, setAvailStation] = useState(null);
  const [newStation, setNewStation] = useState({
    name: '', latitude: '', longitude: '', chargerLevel: 'Level 2',
    formattedAddress: '', connectorType: 'Type 2', connectorPower: 22, pricePerKWh: 0.40,
  });
  const [bulkCsv, setBulkCsv] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stationService.getAll({ page, limit: 20, search: search || undefined });
      setStations(res.data || []);
      setPagination(res.pagination || {});
    } catch {
      setError('Failed to load stations');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await stationService.create({
        name: newStation.name,
        location: {
          type: 'Point',
          coordinates: [Number(newStation.longitude), Number(newStation.latitude)],
          formattedAddress: newStation.formattedAddress,
        },
        chargerLevel: newStation.chargerLevel,
        connectors: [{ type: newStation.connectorType, powerKW: Number(newStation.connectorPower), quantity: 1, available: 1, status: 'available' }],
        pricing: { perKWh: Number(newStation.pricePerKWh), currency: 'AUD', isFree: Number(newStation.pricePerKWh) === 0 },
      });
      setShowAdd(false);
      setNewStation({ name: '', latitude: '', longitude: '', chargerLevel: 'Level 2', formattedAddress: '', connectorType: 'Type 2', connectorPower: 22, pricePerKWh: 0.40 });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create station'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Soft-delete this station?')) return;
    try { await stationService.delete(id); load(); }
    catch { setError('Failed to delete station'); }
  };

  const handleVerify = async (id, current) => {
    try {
      await stationService.verifyStation(id, !current);
      setStations((prev) => prev.map((s) => s._id === id ? { ...s, isVerified: !current } : s));
    } catch { setError('Failed to update verification'); }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    try {
      const res = await stationService.bulkImport({ csv: bulkCsv });
      setShowBulk(false);
      setBulkCsv('');
      alert(`Imported ${res.count} stations`);
      load();
    } catch (err) { setError(err.response?.data?.error || 'Bulk import failed'); }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await stationService.update(editStation._id, {
        name: editStation.name,
        chargerLevel: editStation.chargerLevel,
        location: editStation.location,
      });
      setEditStation(null);
      load();
    } catch { setError('Failed to update station'); }
  };

  const handleSaveAvail = async (e) => {
    e.preventDefault();
    try {
      const available = Number(availStation._availCount);
      const status = available > 0 ? 'available' : 'occupied';
      await stationService.updateAvailability(availStation._id, { available, status });
      setAvailStation(null);
      load();
    } catch { setError('Failed to update availability'); }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-0">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search stations…" className="input-field w-full max-w-xs" />
        </div>
        <button onClick={() => setShowBulk(true)} className="btn-secondary text-sm">Bulk Import CSV</button>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Station</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <Th>Station</Th>
                <Th>Level</Th>
                <Th>Connectors</Th>
                <Th>Price</Th>
                <Th>Status</Th>
                <Th right>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><LoadingSpinner /></td></tr>
              ) : stations.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No stations found</td></tr>
              ) : stations.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-800 truncate max-w-[180px]">{s.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">
                      {s.location?.address?.city || s.location?.formattedAddress || '—'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge color={s.chargerLevel === 'DC Fast Charger' ? 'yellow' : s.chargerLevel === 'Level 2' ? 'blue' : 'gray'}>
                      {s.chargerLevel?.replace('DC Fast Charger', 'DC Fast') || '—'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {s.connectors?.slice(0, 2).map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs">{c.type}</span>
                      ))}
                      {s.connectors?.length > 2 && <span className="text-xs text-gray-400">+{s.connectors.length - 2}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {s.pricing?.isFree ? <Badge color="green">Free</Badge> : <span className="text-sm text-gray-700">{formatCurrency(s.pricing?.perKWh || 0)}/kWh</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <Badge color={s.isActive ? 'green' : 'red'}>{s.isActive ? 'Active' : 'Deleted'}</Badge>
                      {s.isVerified && <Badge color="blue">Verified</Badge>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setAvailStation({ ...s, _availCount: s.connectors?.[0]?.available ?? 1 })}
                        title="Availability" className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </button>
                      <button onClick={() => handleVerify(s._id, s.isVerified)}
                        title={s.isVerified ? 'Unverify' : 'Verify'} className={`p-1.5 rounded-lg transition-colors ${s.isVerified ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 hover:text-blue-400 hover:bg-blue-50'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      </button>
                      <button onClick={() => setEditStation(s)}
                        title="Edit" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(s._id)}
                        title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Station Modal */}
      {showAdd && (
        <Modal title="Add New Station" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="label-text">Station Name *</label>
              <input value={newStation.name} onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                className="input-field" required placeholder="e.g. Chargefox Sydney CBD" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-text">Latitude *</label>
                <input type="number" step="any" value={newStation.latitude}
                  onChange={(e) => setNewStation({ ...newStation, latitude: e.target.value })}
                  className="input-field" required placeholder="-33.8688" /></div>
              <div><label className="label-text">Longitude *</label>
                <input type="number" step="any" value={newStation.longitude}
                  onChange={(e) => setNewStation({ ...newStation, longitude: e.target.value })}
                  className="input-field" required placeholder="151.2093" /></div>
            </div>
            <div><label className="label-text">Address</label>
              <input value={newStation.formattedAddress}
                onChange={(e) => setNewStation({ ...newStation, formattedAddress: e.target.value })}
                className="input-field" placeholder="123 Main St, Sydney NSW 2000" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-text">Charger Level</label>
                <select value={newStation.chargerLevel}
                  onChange={(e) => setNewStation({ ...newStation, chargerLevel: e.target.value })} className="input-field">
                  <option>Level 1</option><option>Level 2</option><option>DC Fast Charger</option>
                </select></div>
              <div><label className="label-text">Connector Type</label>
                <select value={newStation.connectorType}
                  onChange={(e) => setNewStation({ ...newStation, connectorType: e.target.value })} className="input-field">
                  <option>Type 2</option><option>CCS2</option><option>CHAdeMO</option><option>Tesla Supercharger</option>
                </select></div>
              <div><label className="label-text">Power (kW)</label>
                <input type="number" value={newStation.connectorPower}
                  onChange={(e) => setNewStation({ ...newStation, connectorPower: e.target.value })} className="input-field" /></div>
              <div><label className="label-text">Price/kWh (AUD)</label>
                <input type="number" step="0.01" value={newStation.pricePerKWh}
                  onChange={(e) => setNewStation({ ...newStation, pricePerKWh: e.target.value })} className="input-field" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create Station</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Import Modal */}
      {showBulk && (
        <Modal title="Bulk Import CSV" onClose={() => setShowBulk(false)}>
          <form onSubmit={handleBulkImport} className="space-y-4">
            <p className="text-xs text-gray-500">
              CSV format (with header row):<br />
              <code className="bg-gray-100 px-1 rounded text-xs">name,lat,lng,address,chargerLevel,connectorType,powerKW,pricePerKWh</code>
            </p>
            <textarea value={bulkCsv} onChange={(e) => setBulkCsv(e.target.value)}
              rows={10} className="input-field font-mono text-xs w-full" required
              placeholder={"name,lat,lng,address,chargerLevel,connectorType,powerKW,pricePerKWh\nTest Station,-33.8688,151.2093,Sydney NSW,Level 2,Type 2,22,0.40"} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowBulk(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Import</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Station Modal */}
      {editStation && (
        <Modal title="Edit Station" onClose={() => setEditStation(null)}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div><label className="label-text">Name</label>
              <input value={editStation.name}
                onChange={(e) => setEditStation({ ...editStation, name: e.target.value })}
                className="input-field" required /></div>
            <div><label className="label-text">Charger Level</label>
              <select value={editStation.chargerLevel}
                onChange={(e) => setEditStation({ ...editStation, chargerLevel: e.target.value })} className="input-field">
                <option>Level 1</option><option>Level 2</option><option>DC Fast Charger</option>
              </select></div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditStation(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Availability Modal */}
      {availStation && (
        <Modal title={`Update Availability — ${availStation.name}`} onClose={() => setAvailStation(null)}>
          <form onSubmit={handleSaveAvail} className="space-y-4">
            <p className="text-xs text-gray-500">Set the number of available connectors for all connectors at this station.</p>
            <div><label className="label-text">Available Connectors</label>
              <input type="number" min={0} value={availStation._availCount}
                onChange={(e) => setAvailStation({ ...availStation, _availCount: e.target.value })}
                className="input-field" /></div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAvailStation(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Update</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════
// TAB: MAP
// ══════════════════════════════════════════════════
const MapTab = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stationService.getAll({ limit: 500 })
      .then((r) => setStations(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
          All Stations — Coordinate Overview
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-normal">{stations.length}</span>
        </h4>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr><Th>Name</Th><Th>Lat</Th><Th>Lng</Th><Th>City</Th><Th>Source</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stations.map((s) => {
                const [lng, lat] = s.location?.coordinates || [];
                return (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium text-gray-800 truncate max-w-[200px]">{s.name}</td>
                    <td className="py-2 px-4 text-gray-500 font-mono text-xs">{lat?.toFixed(5) || '—'}</td>
                    <td className="py-2 px-4 text-gray-500 font-mono text-xs">{lng?.toFixed(5) || '—'}</td>
                    <td className="py-2 px-4 text-gray-500 text-xs">{s.location?.address?.city || '—'}</td>
                    <td className="py-2 px-4"><Badge color={s.source === 'ocm' ? 'blue' : s.source === 'osm' ? 'purple' : 'gray'}>{s.source || 'manual'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════
// TAB: USERS
// ══════════════════════════════════════════════════
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [error, setError] = useState(null);
  const [activityUser, setActivityUser] = useState(null);
  const [activityData, setActivityData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page, limit: 20, search: search || undefined });
      setUsers(res.data || []);
      setPagination(res.pagination || {});
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleBlock = async (id) => {
    try {
      const res = await adminService.toggleBlockUser(id);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: res.data.isActive } : u));
    } catch { setError('Failed to block/unblock user'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this user?')) return;
    try { await adminService.deleteUser(id); load(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to delete user'); }
  };

  const handleViewActivity = async (user) => {
    setActivityUser(user);
    setActivityData(null);
    try {
      const res = await adminService.getUserActivity(user._id);
      setActivityData(res.data);
    } catch { setActivityData({}); }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} />}
      <div className="flex gap-2">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search users…" className="input-field w-full max-w-xs" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <Th>User</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th><Th right>Actions</Th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center"><LoadingSpinner /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-4"><Badge color={u.role === 'admin' ? 'purple' : 'gray'}>{u.role}</Badge></td>
                  <td className="py-3 px-4"><Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Blocked'}</Badge></td>
                  <td className="py-3 px-4 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleViewActivity(u)} title="Activity"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors text-xs px-2">
                        Activity
                      </button>
                      <button onClick={() => handleBlock(u._id)}
                        className={`p-1.5 rounded-lg transition-colors text-xs px-2 ${u.isActive ? 'hover:bg-yellow-50 text-gray-400 hover:text-yellow-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}>
                        {u.isActive ? 'Block' : 'Unblock'}
                      </button>
                      <button onClick={() => handleDelete(u._id)} title="Delete"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Modal */}
      {activityUser && (
        <Modal title={`Activity — ${activityUser.name}`} onClose={() => setActivityUser(null)}>
          {!activityData ? (
            <div className="py-6 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Routes Planned" value={activityData.routeCount ?? 0} />
                <StatCard label="Reports Filed" value={activityData.reportCount ?? 0} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Favourite Stations</p>
                {activityData.favorites?.length ? (
                  <ul className="space-y-1">
                    {activityData.favorites.map((f) => (
                      <li key={f._id} className="text-sm text-gray-700 flex gap-2">
                        <span className="text-primary-500">⚡</span>
                        {f.name} <span className="text-gray-400">— {f['location.address.city'] || ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-400">No favourites</p>}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════
// TAB: REPORTS
// ══════════════════════════════════════════════════
const STATUS_COLORS = { open: 'red', in_progress: 'yellow', resolved: 'green', dismissed: 'gray' };
const TYPE_LABELS = {
  broken_charger: 'Broken Charger',
  wrong_location: 'Wrong Location',
  station_closed: 'Station Closed',
  incorrect_info: 'Incorrect Info',
  other: 'Other',
};

const ReportsTab = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [error, setError] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveStatus, setResolveStatus] = useState('resolved');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getReports({ page, limit: 20, status: status || undefined });
      setReports(res.data || []);
      setPagination(res.pagination || {});
    } catch { setError('Failed to load reports'); }
    finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      await adminService.resolveReport(resolving._id, { status: resolveStatus, resolvedNote: resolveNote });
      setResolving(null);
      setResolveNote('');
      load();
    } catch { setError('Failed to resolve report'); }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} />}
      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'in_progress', 'resolved', 'dismissed'].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${status === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <Th>Station</Th><Th>Type</Th><Th>User</Th><Th>Status</Th><Th>Filed</Th><Th right>Actions</Th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><LoadingSpinner /></td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No reports found</td></tr>
              ) : reports.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800 truncate max-w-[150px]">{r.station?.name || '—'}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[150px]">{r.station?.['location.address.city'] || r.station?.location?.address?.city || ''}</p>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-600">{TYPE_LABELS[r.type] || r.type}</td>
                  <td className="py-3 px-4">
                    <p className="text-xs text-gray-700">{r.user?.name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-400">{r.user?.email || ''}</p>
                  </td>
                  <td className="py-3 px-4"><Badge color={STATUS_COLORS[r.status]}>{r.status?.replace('_', ' ')}</Badge></td>
                  <td className="py-3 px-4 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    {r.status === 'open' || r.status === 'in_progress' ? (
                      <button onClick={() => { setResolving(r); setResolveNote(r.resolvedNote || ''); setResolveStatus('resolved'); }}
                        className="text-xs px-2 py-1 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors">
                        Resolve
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">{r.resolvedBy?.name || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolving && (
        <Modal title={`Resolve Report — ${resolving.station?.name}`} onClose={() => setResolving(null)}>
          <form onSubmit={handleResolve} className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Issue type: <span className="text-gray-700">{TYPE_LABELS[resolving.type]}</span></p>
              {resolving.description && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{resolving.description}</p>}
            </div>
            <div><label className="label-text">Resolution Status</label>
              <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)} className="input-field">
                <option value="resolved">Resolved</option>
                <option value="in_progress">In Progress</option>
                <option value="dismissed">Dismissed</option>
              </select></div>
            <div><label className="label-text">Resolution Note</label>
              <textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)}
                rows={3} className="input-field" placeholder="Describe what was done…" /></div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResolving(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════
// TAB: VEHICLES
// ══════════════════════════════════════════════════
const VehiclesTab = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    vehicleService.getAll()
      .then((r) => setVehicles(r.data || []))
      .catch(() => setError('Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-4">
      {error && <ErrorMessage message={error} />}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="text-sm font-bold text-gray-700">
            All Vehicles
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">{vehicles.length}</span>
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <Th>Vehicle</Th><Th>Range</Th><Th>Battery</Th><Th>Connector</Th><Th>Owner</Th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {vehicles.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No vehicles found</td></tr>
              ) : vehicles.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-800">{v.make} {v.model}</p>
                    <p className="text-xs text-gray-400">{v.year}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{v.range ?? '—'} km</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{v.batteryCapacity ?? '—'} kWh</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {v.connectorTypes?.map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500">{v.user?.name || v.user || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════
const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '64px' }}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your EV charging platform</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'stations'  && <StationsTab />}
        {activeTab === 'map'       && <MapTab />}
        {activeTab === 'users'     && <UsersTab />}
        {activeTab === 'reports'   && <ReportsTab />}
        {activeTab === 'vehicles'  && <VehiclesTab />}
      </div>
    </div>
  );
};

export default AdminPage;

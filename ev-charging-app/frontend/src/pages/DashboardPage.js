import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { favoritesService, notificationService } from '../services/miscServices';
import authService from '../services/authService';
import StationCard from '../components/Station/StationCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/Common/SharedComponents';
import { timeAgo } from '../utils/helpers';

/* ── connector options ─────────────────────────────────── */
const CONNECTOR_TYPES = ['Type 2', 'CCS2', 'CHAdeMO', 'Tesla Supercharger', 'Tesla Destination', 'Type 1'];

/* ── blank vehicle form ────────────────────────────────── */
const BLANK_VEHICLE = { make: '', model: '', year: new Date().getFullYear(), batteryCapacity: '', range: '', connectorType: 'CCS2', efficiency: '' };

/* ── tab config ────────────────────────────────────────── */
const TABS = [
  { id: 'favorites', label: 'Favorites', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )},
  { id: 'notifications', label: 'Notifications', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )},
  { id: 'profile', label: 'Profile', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )},
  { id: 'vehicles', label: 'Vehicles', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )},
];

const DashboardPage = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ── vehicle CRUD state ── */
  const [vehicles, setVehicles] = useState(() => {
    // vehicles stored on user.vehicles (array) or user.vehicle (single)
    const v = user?.vehicles || (user?.vehicle?.make ? [{ ...user.vehicle, _id: 'primary' }] : []);
    return v;
  });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null); // null = add new
  const [vehicleForm, setVehicleForm] = useState(BLANK_VEHICLE);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'favorites') {
          const res = await favoritesService.getAll();
          setFavorites(res.data || []);
        } else if (activeTab === 'notifications') {
          const res = await notificationService.getAll();
          setNotifications(res.data || []);
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const handleRemoveFavorite = async (stationId) => {
    try {
      await favoritesService.remove(stationId);
      setFavorites((prev) => prev.filter((s) => s._id !== stationId));
    } catch (err) {
      console.error('Remove favorite failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  /* ── vehicle helpers ── */
  const openAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm(BLANK_VEHICLE);
    setVehicleError(null);
    setShowVehicleForm(true);
  };

  const openEditVehicle = (v) => {
    setEditingVehicle(v._id);
    setVehicleForm({ make: v.make, model: v.model, year: v.year, batteryCapacity: v.batteryCapacity, range: v.range, connectorType: v.connectorType, efficiency: v.efficiency || '' });
    setVehicleError(null);
    setShowVehicleForm(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.batteryCapacity || !vehicleForm.range) {
      setVehicleError('Make, model, battery capacity and range are required.');
      return;
    }
    setVehicleSaving(true);
    setVehicleError(null);
    try {
      const vehicleData = {
        ...vehicleForm,
        batteryCapacity: Number(vehicleForm.batteryCapacity),
        range: Number(vehicleForm.range),
        efficiency: vehicleForm.efficiency ? Number(vehicleForm.efficiency) : undefined,
        year: Number(vehicleForm.year),
        _id: editingVehicle || `v-${Date.now()}`,
      };

      let updated;
      if (editingVehicle) {
        updated = vehicles.map((v) => v._id === editingVehicle ? vehicleData : v);
      } else {
        updated = [...vehicles, vehicleData];
      }
      setVehicles(updated);

      // Persist primary vehicle to user profile (backend stores one vehicle on user)
      const primary = updated[0];
      await authService.updateProfile({ vehicle: primary });
      updateUser({ vehicle: primary, vehicles: updated });

      setShowVehicleForm(false);
    } catch {
      setVehicleError('Failed to save vehicle. Please try again.');
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleDeleteVehicle = async (id) => {
    const updated = vehicles.filter((v) => v._id !== id);
    setVehicles(updated);
    const primary = updated[0] || null;
    try {
      await authService.updateProfile({ vehicle: primary || {} });
      updateUser({ vehicle: primary || {}, vehicles: updated });
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: '64px' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user?.name?.split(' ')[0]} 👋</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold shadow-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-primary-600">{favorites.length || '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Saved Stations</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-accent-500">{unreadCount || '0'}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Unread Alerts</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-secondary-600">{vehicles.length || '0'}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Vehicles</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-3xl font-bold text-gray-700">{user?.role === 'admin' ? '★' : '—'}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Account Role</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-6 w-fit shadow-card flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

        {/* ── Favorites ── */}
        {activeTab === 'favorites' && (
          <div>
            {loading ? (
              <LoadingSpinner message="Loading favorites…" />
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {favorites.map((station) => (
                  <div key={station._id} className="relative group">
                    <StationCard station={station} showDistance={false} />
                    <button
                      onClick={() => handleRemoveFavorite(station._id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      title="Remove from favorites"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
                title="No favorites yet"
                message="Tap the heart icon on any station to save it here for quick access."
              />
            )}
          </div>
        )}

        {/* ── Notifications ── */}
        {activeTab === 'notifications' && (
          <div>
            {notifications.length > 0 && (
              <div className="flex justify-end mb-3">
                <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">
                  Mark all as read
                </button>
              </div>
            )}
            {loading ? (
              <LoadingSpinner message="Loading notifications…" />
            ) : notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`card !p-4 flex items-start gap-3 transition-all ${!notif.isRead ? 'border-primary-200 bg-primary-50' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${notif.isRead ? 'bg-gray-300' : 'bg-primary-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1.5">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>}
                title="No notifications"
                message="You're all caught up! We'll notify you about nearby stations and updates."
              />
            )}
          </div>
        )}

        {/* ── Profile ── */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card !p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Account Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-lg font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-400">{user?.email}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Account role</span>
                    <span className={`badge ${user?.role === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>{user?.role}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Vehicles saved</span>
                    <span className="text-sm font-semibold text-gray-900">{vehicles.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Favorite stations</span>
                    <span className="text-sm font-semibold text-gray-900">{favorites.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary vehicle quick view */}
            <div className="card !p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Primary Vehicle</h3>
                <button
                  onClick={() => setActiveTab('vehicles')}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Manage →
                </button>
              </div>
              {vehicles.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-xl">🚗</div>
                    <div>
                      <p className="font-semibold text-gray-900">{vehicles[0].make} {vehicles[0].model}</p>
                      <p className="text-xs text-gray-400">{vehicles[0].year}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                      <p className="text-sm font-bold text-primary-600">{vehicles[0].batteryCapacity} kWh</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Battery</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                      <p className="text-sm font-bold text-secondary-600">{vehicles[0].range} km</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Range</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100 col-span-2">
                      <p className="text-xs font-bold text-accent-600">{vehicles[0].connectorType}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Connector</p>
                    </div>
                  </div>
                  {vehicles[0].efficiency && (
                    <p className="text-xs text-gray-500 text-center">Efficiency: {vehicles[0].efficiency} kWh/100km</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-4xl mb-3">🚗</div>
                  <p className="text-sm font-semibold text-gray-600">No vehicle set up</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Add your EV to get personalised recommendations</p>
                  <button onClick={() => { setActiveTab('vehicles'); openAddVehicle(); }} className="btn-primary text-xs !py-2">
                    Add Vehicle
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Vehicles CRUD ── */}
        {activeTab === 'vehicles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} saved</p>
              <button onClick={openAddVehicle} className="btn-primary text-xs !py-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Vehicle
              </button>
            </div>

            {/* Add / Edit form */}
            {showVehicleForm && (
              <div className="card !p-5 border-primary-200 animate-slide-up">
                <h3 className="text-sm font-bold text-gray-700 mb-4">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h3>
                <form onSubmit={handleSaveVehicle} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-text">Make *</label>
                      <input
                        value={vehicleForm.make}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                        className="input-field" placeholder="e.g. Tesla" required
                      />
                    </div>
                    <div>
                      <label className="label-text">Model *</label>
                      <input
                        value={vehicleForm.model}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                        className="input-field" placeholder="e.g. Model 3" required
                      />
                    </div>
                    <div>
                      <label className="label-text">Year</label>
                      <input
                        type="number" min="2000" max="2030"
                        value={vehicleForm.year}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label-text">Connector Type</label>
                      <select
                        value={vehicleForm.connectorType}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, connectorType: e.target.value })}
                        className="input-field"
                      >
                        {CONNECTOR_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Battery Capacity (kWh) *</label>
                      <input
                        type="number" step="0.1"
                        value={vehicleForm.batteryCapacity}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, batteryCapacity: e.target.value })}
                        className="input-field" placeholder="e.g. 75" required
                      />
                    </div>
                    <div>
                      <label className="label-text">Range (km) *</label>
                      <input
                        type="number"
                        value={vehicleForm.range}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, range: e.target.value })}
                        className="input-field" placeholder="e.g. 491" required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label-text">Efficiency (kWh/100km) <span className="text-gray-400 font-normal">optional</span></label>
                      <input
                        type="number" step="0.1"
                        value={vehicleForm.efficiency}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, efficiency: e.target.value })}
                        className="input-field" placeholder="e.g. 15.3"
                      />
                    </div>
                  </div>

                  {vehicleError && <p className="text-sm text-red-500">{vehicleError}</p>}

                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button" onClick={() => setShowVehicleForm(false)} className="btn-secondary text-sm !py-2">
                      Cancel
                    </button>
                    <button type="submit" disabled={vehicleSaving} className="btn-primary text-sm !py-2">
                      {vehicleSaving ? 'Saving…' : editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Vehicle list */}
            {vehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((v, idx) => (
                  <div key={v._id} className="card !p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl flex-shrink-0">🚗</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{v.make} {v.model}</p>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold">Primary</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{v.year}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditVehicle(v)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(v._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                        <p className="text-sm font-bold text-primary-600">{v.batteryCapacity}</p>
                        <p className="text-[10px] text-gray-400">kWh</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                        <p className="text-sm font-bold text-secondary-600">{v.range}</p>
                        <p className="text-[10px] text-gray-400">km range</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                        <p className="text-[10px] font-bold text-accent-600 leading-tight">{v.connectorType}</p>
                        <p className="text-[10px] text-gray-400">connector</p>
                      </div>
                    </div>
                    {v.efficiency && (
                      <p className="text-[11px] text-gray-400 text-center">⚡ {v.efficiency} kWh/100km</p>
                    )}
                  </div>
                ))}
              </div>
            ) : !showVehicleForm ? (
              <EmptyState
                icon={<svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
                title="No vehicles added"
                message="Add your EV to get personalised charging recommendations."
              />
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;

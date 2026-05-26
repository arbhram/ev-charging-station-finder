import { useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage } from '../components/Common/SharedComponents';

const EV_PRESETS = [
  { make: 'Tesla', model: 'Model 3', year: 2024, batteryCapacity: 60, range: 491, connectorType: 'CCS2', icon: '⚡' },
  { make: 'Tesla', model: 'Model Y', year: 2024, batteryCapacity: 75, range: 533, connectorType: 'CCS2', icon: '⚡' },
  { make: 'Nissan', model: 'Leaf', year: 2024, batteryCapacity: 40, range: 270, connectorType: 'CHAdeMO', icon: '🍃' },
  { make: 'BYD', model: 'Atto 3', year: 2024, batteryCapacity: 60.48, range: 420, connectorType: 'CCS2', icon: '🔋' },
  { make: 'Hyundai', model: 'Ioniq 5', year: 2024, batteryCapacity: 77.4, range: 507, connectorType: 'CCS2', icon: '🚗' },
  { make: 'Hyundai', model: 'Kona Electric', year: 2024, batteryCapacity: 64, range: 484, connectorType: 'CCS2', icon: '🚙' },
  { make: 'Kia', model: 'EV6', year: 2024, batteryCapacity: 77.4, range: 528, connectorType: 'CCS2', icon: '🚘' },
  { make: 'MG', model: 'ZS EV', year: 2024, batteryCapacity: 51, range: 320, connectorType: 'CCS2', icon: '🌱' },
];

const CONNECTOR_TYPES = ['CCS2', 'CHAdeMO', 'Type 2', 'Type 1', 'Tesla Supercharger'];

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [vehicle, setVehicle] = useState({
    make: '', model: '', year: new Date().getFullYear(),
    batteryCapacity: '', range: '', connectorType: 'CCS2',
  });
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field, value) => setFormData((p) => ({ ...p, [field]: value }));
  const handleVehicleChange = (field, value) => { setSelectedPreset(null); setVehicle((p) => ({ ...p, [field]: value })); };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.model);
    setVehicle({ make: preset.make, model: preset.model, year: preset.year, batteryCapacity: preset.batteryCapacity, range: preset.range, connectorType: preset.connectorType });
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    setError(null);
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setStep(2);
  };

  const handleSubmit = async (skip = false) => {
    setLoading(true);
    setError(null);
    try {
      const payload = { name: formData.name, email: formData.email, password: formData.password };
      if (!skip && vehicle.make && vehicle.model) {
        payload.vehicle = {
          make: vehicle.make, model: vehicle.model, year: Number(vehicle.year),
          batteryCapacity: Number(vehicle.batteryCapacity) || undefined,
          range: Number(vehicle.range) || undefined,
          connectorType: vehicle.connectorType,
        };
      }
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = formData.password;
    if (!p) return { label: '', color: '' };
    if (p.length < 8) return { label: 'Weak', color: 'bg-red-400', width: '33%' };
    if (p.length < 12) return { label: 'Fair', color: 'bg-accent-400', width: '66%' };
    return { label: 'Strong', color: 'bg-secondary-500', width: '100%' };
  };
  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12" style={{ paddingTop: '80px' }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-lg text-gray-900 leading-none">Volt<span className="text-primary-600">ova</span></p>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">AUSTRALIA</p>
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join thousands of EV drivers across Australia</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6 px-2">
          {[1, 2].map((s) => (
            <Fragment key={s}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s < step ? 'bg-secondary-500 text-white' :
                  s === step ? 'bg-primary-600 text-white shadow-sm' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {s < step ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                <span className={`text-sm font-semibold ${s === step ? 'text-gray-900' : s < step ? 'text-secondary-600' : 'text-gray-400'}`}>
                  {s === 1 ? 'Account Details' : 'Your Vehicle'}
                </span>
              </div>
              {s < 2 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? 'bg-secondary-400' : 'bg-gray-200'}`} />
              )}
            </Fragment>
          ))}
        </div>

        <div className="card !p-6 !shadow-panel">
          {error && <div className="mb-5"><ErrorMessage message={error} /></div>}

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <div>
                <label className="label-text">Full Name</label>
                <input type="text" value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Jane Smith" required className="input-field" autoComplete="name" />
              </div>
              <div>
                <label className="label-text">Email address</label>
                <input type="email" value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="you@example.com" required className="input-field" autoComplete="email" />
              </div>
              <div>
                <label className="label-text">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="At least 8 characters" required className="input-field pr-11"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {showPass
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                      }
                    </svg>
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                    </div>
                    <p className={`text-[11px] mt-1 font-medium ${strength.color === 'bg-red-400' ? 'text-red-500' : strength.color === 'bg-accent-400' ? 'text-accent-600' : 'text-secondary-600'}`}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="label-text">Confirm Password</label>
                <input
                  type="password" value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repeat your password" required className={`input-field ${
                    formData.confirmPassword && formData.confirmPassword !== formData.password ? 'border-red-300 focus:ring-red-400' : ''
                  }`}
                  autoComplete="new-password"
                />
                {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                )}
              </div>

              <button type="submit" className="btn-primary w-full !py-3 text-base mt-2">
                Continue to Vehicle Setup
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </form>
          )}

          {/* ── Step 2: Vehicle ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Select your EV model</p>
                <div className="grid grid-cols-2 gap-2">
                  {EV_PRESETS.map((preset) => (
                    <button
                      key={preset.model}
                      onClick={() => handlePresetSelect(preset)}
                      className={`text-left px-3 py-2.5 rounded-xl text-xs transition-all border ${
                        selectedPreset === preset.model
                          ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                          : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <span className="text-base mr-1">{preset.icon}</span>
                      <span className="font-semibold">{preset.make} {preset.model}</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">{preset.batteryCapacity} kWh · {preset.range} km</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom entry */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Or enter manually</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-text text-xs">Make</label>
                    <input type="text" value={vehicle.make} onChange={(e) => handleVehicleChange('make', e.target.value)} placeholder="e.g. Tesla" className="input-field text-sm h-9" />
                  </div>
                  <div>
                    <label className="label-text text-xs">Model</label>
                    <input type="text" value={vehicle.model} onChange={(e) => handleVehicleChange('model', e.target.value)} placeholder="e.g. Model 3" className="input-field text-sm h-9" />
                  </div>
                  <div>
                    <label className="label-text text-xs">Battery (kWh)</label>
                    <input type="number" step="0.1" value={vehicle.batteryCapacity} onChange={(e) => handleVehicleChange('batteryCapacity', e.target.value)} placeholder="60" className="input-field text-sm h-9" />
                  </div>
                  <div>
                    <label className="label-text text-xs">Range (km)</label>
                    <input type="number" value={vehicle.range} onChange={(e) => handleVehicleChange('range', e.target.value)} placeholder="400" className="input-field text-sm h-9" />
                  </div>
                </div>
                <div>
                  <label className="label-text text-xs">Connector Type</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {CONNECTOR_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleVehicleChange('connectorType', type)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          vehicle.connectorType === type
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="btn-primary w-full !py-3 text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                        <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Creating account…
                    </span>
                  ) : 'Create Account'}
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="btn-ghost w-full text-sm text-gray-400 hover:text-gray-600"
                >
                  Skip for now
                </button>
                <button onClick={() => setStep(1)} className="btn-ghost w-full text-sm text-gray-400">
                  ← Back
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

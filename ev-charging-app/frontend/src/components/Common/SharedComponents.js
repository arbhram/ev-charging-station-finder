import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const LoadingSpinner = ({ size = 'md', message = '' }) => {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <svg className={`${sizeMap[size]} animate-spin text-primary-500`} fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.15" />
        <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {message && <p className="text-gray-500 text-sm font-medium">{message}</p>}
    </div>
  );
};

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Loading…" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

export const EmptyState = ({ icon, title, message, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    {icon && <div className="text-gray-300 mb-4">{icon}</div>}
    <h3 className="text-base font-semibold text-gray-600 mb-1">{title}</h3>
    {message && <p className="text-sm text-gray-400 max-w-sm mb-5">{message}</p>}
    {action && action}
  </div>
);

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
    <div className="flex-1">
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-red-500 underline mt-1 hover:text-red-700">
          Try again
        </button>
      )}
    </div>
  </div>
);

export const SkeletonCard = () => (
  <div className="bg-white border border-gray-200 rounded-2xl p-4 animate-pulse">
    <div className="flex gap-3">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-5 bg-gray-100 rounded-lg w-20" />
          <div className="h-5 bg-gray-100 rounded-lg w-16" />
        </div>
      </div>
      <div className="w-12 space-y-2">
        <div className="h-5 bg-gray-200 rounded-lg" />
        <div className="h-3 bg-gray-100 rounded-lg" />
      </div>
    </div>
  </div>
);

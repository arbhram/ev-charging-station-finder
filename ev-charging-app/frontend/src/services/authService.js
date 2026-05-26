import api from './api';

/**
 * Authentication API service.
 * Handles register, login, profile, and password operations.
 */
const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.data.token) {
      localStorage.setItem('ev_token', response.data.data.token);
      localStorage.setItem('ev_user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.data.token) {
      localStorage.setItem('ev_token', response.data.data.token);
      localStorage.setItem('ev_user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('ev_token');
    localStorage.removeItem('ev_user');
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  updatePassword: async (passwordData) => {
    const response = await api.put('/auth/password', passwordData);
    return response.data;
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('ev_user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem('ev_token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('ev_token');
  },
};

export default authService;

import api from './api';

/**
 * Favorites API service.
 */
export const favoritesService = {
  getAll: async () => {
    const response = await api.get('/favorites');
    return response.data;
  },

  add: async (stationId) => {
    const response = await api.post(`/favorites/${stationId}`);
    return response.data;
  },

  remove: async (stationId) => {
    const response = await api.delete(`/favorites/${stationId}`);
    return response.data;
  },

  check: async (stationId) => {
    const response = await api.get(`/favorites/check/${stationId}`);
    return response.data;
  },

  adopt: async (station) => {
    const response = await api.post('/favorites/adopt', { station });
    return response.data;
  },
};

/**
 * Notifications API service.
 */
export const notificationService = {
  getAll: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

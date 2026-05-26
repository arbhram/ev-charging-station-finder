import api from './api';

/**
 * Charging Station API service.
 * Handles station CRUD, nearby search, reachability, and analytics.
 */
const stationService = {
  getAll: async (params = {}) => {
    const response = await api.get('/stations', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/stations/${id}`);
    return response.data;
  },

  getNearby: async (lat, lng, radius = 50, filters = {}) => {
    const response = await api.get('/stations/nearby', {
      params: { lat, lng, radius, ...filters },
    });
    return response.data;
  },

  getReachable: async (lat, lng, battery, range) => {
    const response = await api.get('/stations/reachable', {
      params: { lat, lng, battery, range },
    });
    return response.data;
  },

  create: async (stationData) => {
    const response = await api.post('/stations', stationData);
    return response.data;
  },

  update: async (id, stationData) => {
    const response = await api.put(`/stations/${id}`, stationData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/stations/${id}`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/stations/analytics/overview');
    return response.data;
  },

  bulkImport: async (body) => {
    const response = await api.post('/stations/bulk-import', body);
    return response.data;
  },

  updateAvailability: async (id, body) => {
    const response = await api.patch(`/stations/${id}/availability`, body);
    return response.data;
  },

  verifyStation: async (id, isVerified = true) => {
    const response = await api.patch(`/stations/${id}/verify`, { isVerified });
    return response.data;
  },
};

export default stationService;

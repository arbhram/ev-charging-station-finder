import api from './api';

/**
 * Vehicle API service.
 */
const vehicleService = {
  getAll: async (params = {}) => {
    const response = await api.get('/vehicles', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  getMakes: async () => {
    const response = await api.get('/vehicles/makes');
    return response.data;
  },

  getCompatibleStations: async (vehicleId, lat, lng, radius) => {
    const response = await api.get(`/vehicles/${vehicleId}/compatible-stations`, {
      params: { lat, lng, radius },
    });
    return response.data;
  },
};

export default vehicleService;

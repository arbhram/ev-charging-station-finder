import api from './api';

/**
 * Route Planning API service.
 */
const routeService = {
  planRoute: async (routeData) => {
    const response = await api.post('/routes/plan', routeData);
    return response.data;
  },

  saveRoute: async (routeData) => {
    const response = await api.post('/routes', routeData);
    return response.data;
  },

  getSavedRoutes: async () => {
    const response = await api.get('/routes');
    return response.data;
  },

  deleteRoute: async (id) => {
    const response = await api.delete(`/routes/${id}`);
    return response.data;
  },
};

export default routeService;

import api from './api';

/**
 * Charging Calculator API service.
 */
const calculatorService = {
  calculate: async (data) => {
    const response = await api.post('/calculator/charge', data);
    return response.data;
  },

  quickEstimate: async (data) => {
    const response = await api.post('/calculator/compare', data);
    return response.data;
  },
};

export default calculatorService;

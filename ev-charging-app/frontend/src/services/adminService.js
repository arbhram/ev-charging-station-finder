import api from './api';

const adminService = {
  // Analytics
  getAnalytics: async () => {
    const res = await api.get('/admin/analytics');
    return res.data;
  },
  getSearchAnalytics: async () => {
    const res = await api.get('/admin/analytics/search');
    return res.data;
  },

  // Users
  getUsers: async (params = {}) => {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },
  getUserActivity: async (id) => {
    const res = await api.get(`/admin/users/${id}/activity`);
    return res.data;
  },
  toggleBlockUser: async (id) => {
    const res = await api.patch(`/admin/users/${id}/block`);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },

  // Reports
  getReports: async (params = {}) => {
    const res = await api.get('/admin/reports', { params });
    return res.data;
  },
  resolveReport: async (id, body) => {
    const res = await api.patch(`/admin/reports/${id}/resolve`, body);
    return res.data;
  },
  createReport: async (body) => {
    const res = await api.post('/admin/reports', body);
    return res.data;
  },
};

export default adminService;

import axios from 'axios';
import { getToken, removeToken } from '../utils/tokenStorage';

// Use 10.0.2.2 for local Android Emulator testing, or your actual server URL
const BASE_URL = 'http://10.0.2.2:8080'; 

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach Token to Header automatically
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Catch 401 Unauthorized errors (Token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token if expired or invalid
      await removeToken();
      // Optionally trigger a redirect to Login screen here
    }
    return Promise.reject(error);
  }
);

export default api;
import axios from 'axios';

const api = axios.create({
  baseURL: '', // Uses React proxy to localhost:5000 when running dev server
  timeout: 10000,
});

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USERNAME_KEY = 'auth_username';

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUsername() {
  return localStorage.getItem(AUTH_USERNAME_KEY);
}

export function setStoredAuth(token, username) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (username) localStorage.setItem(AUTH_USERNAME_KEY, username);
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USERNAME_KEY);
}

// Attach token to every request; on 401 clear auth and notify app
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearStoredAuth();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;

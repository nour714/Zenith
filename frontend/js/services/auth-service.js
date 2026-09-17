/**
 * Authentication Service: Handles JWT token storage, user state,
 * and API calls for registration, login, and Google OAuth.
 */
import { bus } from '../core/event-bus.js';

const TOKEN_KEY = 'zenith_access_token';
const USER_KEY = 'zenith_current_user';
const API_BASE = '/api/v1';

class AuthService {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY) || null;
    this.user = this._loadUser();
  }

  _loadUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getToken() {
    return this.token || localStorage.getItem(TOKEN_KEY);
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    bus.emit('auth:state-changed', { isAuthenticated: true, user });
  }

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    bus.emit('auth:state-changed', { isAuthenticated: false, user: null });
  }

  async _request(endpoint, body = null, method = 'POST') {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || json.error || 'فشلت العملية';
      throw new Error(msg);
    }
    return json.data !== undefined ? json.data : json;
  }

  async register(email, password, fullName = '') {
    const data = await this._request('/auth/register', {
      email,
      password,
      full_name: fullName || undefined,
    });
    this.setSession(data.access_token, data.user);
    return data;
  }

  async login(email, password) {
    const data = await this._request('/auth/login', { email, password });
    this.setSession(data.access_token, data.user);
    return data;
  }

  async loginWithGoogle(credential) {
    const data = await this._request('/auth/google', { credential });
    this.setSession(data.access_token, data.user);
    return data;
  }

  async fetchMe() {
    try {
      const user = await this._request('/auth/me', null, 'GET');
      this.user = user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (err) {
      this.clearSession();
      throw err;
    }
  }

  async updateProfile(profileData) {
    const updatedUser = await this._request('/auth/profile', profileData, 'PUT');
    this.user = updatedUser;
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    bus.emit('auth:profile-updated', updatedUser);
    return updatedUser;
  }

  async getAuthConfig() {
    try {
      const res = await fetch(`${API_BASE}/auth/config`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('Failed to fetch auth config:', err);
    }
    return { google_client_id: '' };
  }

  logout() {
    this.clearSession();
    bus.emit('auth:logout');
    window.location.hash = '#auth';
  }
}

export const authService = new AuthService();

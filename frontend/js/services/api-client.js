import { authService } from './auth-service.js';
import { bus } from '../core/event-bus.js';

const API_BASE = '/api/v1';

class APIClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        authService.clearSession();
        bus.emit('auth:unauthorized');
        throw new Error('جلسة الدخول منتهية أو غير صالحة. يرجى تسجيل الدخول.');
      }

      let json = {};
      const text = await response.text();
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = { message: text };
        }
      }

      if (!response.ok) {
        let errorMsg = json.message || json.error;
        if (!errorMsg && json.detail) {
          if (Array.isArray(json.detail)) {
            errorMsg = json.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
          } else {
            errorMsg = String(json.detail);
          }
        }
        if (!errorMsg) {
          errorMsg = `Error ${response.status}: Request failed`;
        }
        throw new Error(errorMsg);
      }

      return json.data !== undefined ? json.data : json;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
      throw err;
    }
  }

  // Consolidated Bootstrap (1 single request for stats, playlists, tasks, notes)
  getBootstrap() {
    return this.request('/stats/bootstrap');
  }

  // Statistics
  getStats() {
    return this.request('/stats');
  }

  // Playlists
  getPlaylists() {
    return this.request('/playlists');
  }

  getPlaylist(id) {
    return this.request(`/playlists/${id}`);
  }

  importPlaylist(data) {
    return this.request('/playlists/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  toggleVideo(videoId, isCompleted) {
    return this.request(`/playlists/videos/${videoId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: isCompleted }),
    });
  }

  deletePlaylist(id) {
    return this.request(`/playlists/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  getTasks(category = null, completed = null) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (completed !== null) params.append('completed', completed);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/tasks${qs}`);
  }

  createTask(taskData) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  updateTask(taskId, taskData) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  toggleTask(taskId) {
    return this.request(`/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
  }

  deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Notes
  getNotes(playlistId = null, videoId = null, search = null) {
    const params = new URLSearchParams();
    if (playlistId) params.append('playlist_id', playlistId);
    if (videoId) params.append('video_id', videoId);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/notes${qs}`);
  }

  createNote(noteData) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  updateNote(noteId, noteData) {
    return this.request(`/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  deleteNote(noteId) {
    return this.request(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // Settings
  getSettings() {
    return this.request('/settings');
  }

  saveSettings(settings) {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  }

  // AI Features
  generateStudyPlan(playlistId, targetDays = 14) {
    return this.request('/ai/study-plan', {
      method: 'POST',
      body: JSON.stringify({ playlist_id: playlistId, target_days: targetDays }),
    });
  }

  enhanceNote(title, content) {
    return this.request('/ai/enhance-note', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  }
}

export const api = new APIClient();

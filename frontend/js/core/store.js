/**
 * Central Reactive Store (Single Source of Truth).
 * Features:
 * - Instant Stale-While-Revalidate caching via localStorage for 0ms initial UI render
 * - Consolidated single-request bootstrap fetching
 * - Reactive event emission to all page components
 */
import { api } from '../services/api-client.js';
import { authService } from '../services/auth-service.js';
import { bus } from './event-bus.js';

class Store {
  constructor() {
    this.state = {
      currentUser: authService.getUser(),
      playlists: [],
      tasks: [],
      notes: [],
      stats: {
        total_playlists: 0,
        total_videos: 0,
        completed_videos: 0,
        total_tasks: 0,
        completed_tasks: 0,
        total_notes: 0,
        overall_progress_percentage: 0,
      },
      activeTab: 'all',
      activeFilter: 'all',
      selectedPlaylistDetail: null,
      isLoading: false,
    };

    // Restore cached snapshot immediately for zero-latency UI display
    if (this.state.currentUser?.id) {
      this._restoreCache(this.state.currentUser.id);
    }

    bus.on('auth:state-changed', ({ isAuthenticated, user }) => {
      this.state.currentUser = user;
      if (isAuthenticated && user?.id) {
        this._restoreCache(user.id);
        this.loadAll();
      } else {
        this.clear();
      }
    });
  }

  _getCacheKey(userId) {
    return `zenith_state_cache_${userId}`;
  }

  _restoreCache(userId) {
    try {
      const raw = localStorage.getItem(this._getCacheKey(userId));
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && typeof cached === 'object') {
          if (cached.stats) this.state.stats = cached.stats;
          if (Array.isArray(cached.playlists)) this.state.playlists = cached.playlists;
          if (Array.isArray(cached.tasks)) this.state.tasks = cached.tasks;
          if (Array.isArray(cached.notes)) this.state.notes = cached.notes;
          // Notify listeners immediately for 0ms render
          setTimeout(() => bus.emit('state:changed', this.state), 0);
        }
      }
    } catch (e) {
      console.warn('Could not restore store cache:', e);
    }
  }

  _saveCache(userId) {
    try {
      if (!userId) return;
      const snapshot = {
        stats: this.state.stats,
        playlists: this.state.playlists,
        tasks: this.state.tasks,
        notes: this.state.notes,
        timestamp: Date.now(),
      };
      localStorage.setItem(this._getCacheKey(userId), JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Could not save store cache:', e);
    }
  }

  clear() {
    this.state.playlists = [];
    this.state.tasks = [];
    this.state.notes = [];
    this.state.stats = {
      total_playlists: 0,
      total_videos: 0,
      completed_videos: 0,
      total_tasks: 0,
      completed_tasks: 0,
      total_notes: 0,
      overall_progress_percentage: 0,
    };
    bus.emit('state:changed', this.state);
  }

  getState() {
    return this.state;
  }

  setTab(tab) {
    this.state.activeTab = tab;
    bus.emit('tab:changed', tab);
    bus.emit('state:changed', this.state);
  }

  async loadAll() {
    if (!authService.isAuthenticated()) {
      return;
    }

    const userId = this.state.currentUser?.id;
    this.state.isLoading = true;
    bus.emit('loading:start');
    try {
      // 1. Try single consolidated bootstrap endpoint
      let loaded = false;
      try {
        const bootstrapData = await api.getBootstrap();
        if (bootstrapData && bootstrapData.stats) {
          this.state.stats = bootstrapData.stats;
          this.state.playlists = bootstrapData.playlists || [];
          this.state.tasks = bootstrapData.tasks || [];
          this.state.notes = bootstrapData.notes || [];
          loaded = true;
        }
      } catch (e) {
        console.warn('Bootstrap request failed, falling back to parallel fetch:', e);
      }

      // 2. Fallback to parallel requests if bootstrap endpoint unavailable
      if (!loaded) {
        const [stats, playlists, tasks, notes] = await Promise.all([
          api.getStats().catch(() => ({})),
          api.getPlaylists().catch(() => []),
          api.getTasks().catch(() => []),
          api.getNotes().catch(() => []),
        ]);

        this.state.stats = stats || this.state.stats;
        this.state.playlists = playlists || [];
        this.state.tasks = tasks || [];
        this.state.notes = notes || [];
      }

      this._saveCache(userId);
      bus.emit('state:changed', this.state);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      this.state.isLoading = false;
      bus.emit('loading:end');
    }
  }

  async refreshStats() {
    if (!authService.isAuthenticated()) return;
    try {
      const stats = await api.getStats();
      this.state.stats = stats;
      this._saveCache(this.state.currentUser?.id);
      bus.emit('stats:updated', stats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  }

  async refreshPlaylists() {
    if (!authService.isAuthenticated()) return;
    try {
      const playlists = await api.getPlaylists();
      this.state.playlists = playlists;
      await this.refreshStats();
      this._saveCache(this.state.currentUser?.id);
      bus.emit('playlists:updated', playlists);
      bus.emit('state:changed', this.state);
    } catch (err) {
      console.error('Failed to refresh playlists:', err);
    }
  }

  async refreshTasks() {
    if (!authService.isAuthenticated()) return;
    try {
      const tasks = await api.getTasks();
      this.state.tasks = tasks;
      await this.refreshStats();
      this._saveCache(this.state.currentUser?.id);
      bus.emit('tasks:updated', tasks);
      bus.emit('state:changed', this.state);
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    }
  }

  async refreshNotes() {
    if (!authService.isAuthenticated()) return;
    try {
      const notes = await api.getNotes();
      this.state.notes = notes;
      await this.refreshStats();
      this._saveCache(this.state.currentUser?.id);
      bus.emit('notes:updated', notes);
      bus.emit('state:changed', this.state);
    } catch (err) {
      console.error('Failed to refresh notes:', err);
    }
  }
}

export const store = new Store();

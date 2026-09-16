/**
 * Central Reactive Store (Single Source of Truth).
 */
import { api } from '../services/api-client.js';
import { bus } from './event-bus.js';

class Store {
  constructor() {
    this.state = {
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
    this.state.isLoading = true;
    bus.emit('loading:start');
    try {
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

      bus.emit('state:changed', this.state);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      this.state.isLoading = false;
      bus.emit('loading:end');
    }
  }

  async refreshStats() {
    try {
      const stats = await api.getStats();
      this.state.stats = stats;
      bus.emit('stats:updated', stats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  }

  async refreshPlaylists() {
    try {
      const playlists = await api.getPlaylists();
      this.state.playlists = playlists;
      await this.refreshStats();
      bus.emit('playlists:updated', playlists);
      bus.emit('state:changed', this.state);
    } catch (err) {
      console.error('Failed to refresh playlists:', err);
    }
  }

  async refreshTasks() {
    try {
      const tasks = await api.getTasks();
      this.state.tasks = tasks;
      await this.refreshStats();
      bus.emit('tasks:updated', tasks);
      bus.emit('state:changed', this.state);
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    }
  }

  async refreshNotes() {
    try {
      const notes = await api.getNotes();
      this.state.notes = notes;
      bus.emit('notes:updated', notes);
    } catch (err) {
      console.error('Failed to refresh notes:', err);
    }
  }
}

export const store = new Store();

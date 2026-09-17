/**
 * Settings Modal Component: Manages Gemini API Key and preferences.
 * Polished with UI/UX Pro Max feedback toasts.
 */
import { api } from '../services/api-client.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { toast } from '../utils/toast.js';
import { $ } from '../utils/dom.js';

export class SettingsModalComponent {
  constructor() {
    this.modal = $('#modal-settings');
    this.form = $('#form-settings');
    this.init();
  }

  async init() {
    const closeModal = () => {
      this.modal?.classList.remove('open');
    };

    bus.on('modal:settings:open', async () => {
      this.modal?.classList.add('open');
      const languageSelect = $('#select-app-language');
      if (languageSelect) languageSelect.value = i18n.lang;
      await this.loadCurrentSettings();
    });

    $('#btn-close-settings-modal')?.addEventListener('click', closeModal);
    $('#btn-cancel-settings-modal')?.addEventListener('click', closeModal);
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) closeModal();
    });

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const apiKey = $('#input-gemini-key').value.trim();
      const language = $('#select-app-language')?.value;
      try {
        await api.saveSettings({ gemini_api_key: apiKey });
        if (language) i18n.setLanguage(language);
        closeModal();
        toast.success(i18n.lang === 'ar' ? 'تم حفظ الإعدادات ومفتاح الذكاء الاصطناعي بنجاح' : 'Settings saved successfully');
      } catch (err) {
        toast.error(err.message);
      }
    });
  }

  async loadCurrentSettings() {
    try {
      const data = await api.getSettings();
      if (data && data.gemini_api_key) {
        $('#input-gemini-key').value = data.gemini_api_key;
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }
}

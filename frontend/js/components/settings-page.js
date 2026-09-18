/**
 * Settings Page Component: Dedicated full page for managing user profile,
 * Google Gemini AI Key, Google OAuth integration, language, and session logout.
 */
import { api } from '../services/api-client.js';
import { authService } from '../services/auth-service.js';
import { bus } from '../core/event-bus.js';
import { toast } from '../utils/toast.js';
import { i18n } from '../i18n/translator.js';
import { $ } from '../utils/dom.js';

export class SettingsPageComponent {
  constructor() {
    this.bindEvents();
    this.loadData();
  }

  bindEvents() {
    // Update profile form
    const profileForm = $('#form-settings-profile');
    profileForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleUpdateProfile();
    });

    // Save AI & App Settings form
    const aiForm = $('#form-settings-ai');
    aiForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSaveAISettings();
    });

    // Language dropdown change
    const selectLang = $('#select-settings-page-language');
    selectLang?.addEventListener('change', (e) => {
      const newLang = e.target.value;
      i18n.setLanguage(newLang);
      toast.success(newLang === 'ar' ? 'تم تحويل اللغة إلى العربية' : 'Language switched to English');
    });

    // Theme dropdown change
    const selectTheme = $('#select-settings-page-theme');
    selectTheme?.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      bus.emit('theme:change', newTheme);
    });

    // Logout button
    $('#btn-settings-page-logout')?.addEventListener('click', async () => {
      const confirmed = await toast.confirm(
        i18n.lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out',
        i18n.lang === 'ar' ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟' : 'Are you sure you want to sign out?',
        i18n.lang === 'ar' ? 'نعم، خروج' : 'Sign Out',
        i18n.lang === 'ar' ? 'إلغاء' : 'Cancel'
      );
      if (confirmed) {
        authService.logout();
        toast.info(i18n.lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed out successfully');
      }
    });

    bus.on('auth:state-changed', () => this.loadData());
    bus.on('auth:profile-updated', () => this.renderUserProfile());
    bus.on('theme:changed', (theme) => {
      if (selectTheme) selectTheme.value = theme;
    });
    window.addEventListener('langchanged', () => this.updateLanguageSelection());
  }

  async loadData() {
    this.renderUserProfile();
    await this.loadSettings();
    this.updateLanguageSelection();
    this.updateThemeSelection();
  }

  updateThemeSelection() {
    const select = $('#select-settings-page-theme');
    if (select) {
      select.value = localStorage.getItem('zenith_theme') || 'dark';
    }
  }

  renderUserProfile() {
    const user = authService.getUser();
    if (!user) return;

    const elName = $('#settings-profile-name');
    const elEmail = $('#settings-profile-email');
    const elAvatar = $('#settings-profile-avatar');
    const inputName = $('#input-settings-name');

    if (elName) elName.textContent = user.full_name || user.email.split('@')[0];
    if (elEmail) elEmail.textContent = user.email;
    if (inputName) inputName.value = user.full_name || '';

    if (elAvatar) {
      if (user.avatar_url) {
        elAvatar.innerHTML = `<img src="${user.avatar_url}" alt="${user.full_name || ''}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        const initial = (user.full_name || user.email || 'Z')[0].toUpperCase();
        elAvatar.textContent = initial;
      }
    }
  }

  async loadSettings() {
    if (!authService.isAuthenticated()) return;
    try {
      const settings = await api.getSettings();
      const geminiInput = $('#input-settings-page-gemini');
      if (geminiInput) {
        if (settings.gemini_api_key_masked) {
          geminiInput.placeholder = settings.gemini_api_key_masked;
        }
      }
    } catch (err) {
      console.warn('Failed to load settings in settings page:', err);
    }
  }

  updateLanguageSelection() {
    const select = $('#select-settings-page-language');
    if (select) {
      select.value = i18n.lang || 'ar';
    }
  }

  async handleUpdateProfile() {
    const inputName = $('#input-settings-name');
    const inputCurrPw = $('#input-settings-current-password');
    const inputNewPw = $('#input-settings-new-password');
    const submitBtn = $('#btn-settings-profile-submit');

    const fullName = inputName?.value.trim();
    const currentPassword = inputCurrPw?.value;
    const newPassword = inputNewPw?.value;

    if (newPassword && newPassword.length < 6) {
      toast.error(i18n.lang === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    try {
      await authService.updateProfile({
        full_name: fullName,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });

      toast.success(i18n.lang === 'ar' ? 'تم تحديث بيانات الملف الشخصي بنجاح' : 'Profile updated successfully');
      if (inputCurrPw) inputCurrPw.value = '';
      if (inputNewPw) inputNewPw.value = '';
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async handleSaveAISettings() {
    const geminiInput = $('#input-settings-page-gemini');
    const submitBtn = $('#btn-settings-ai-submit');
    const rawKey = geminiInput?.value.trim();

    if (!rawKey) {
      toast.info(i18n.lang === 'ar' ? 'لم يتم إدخال مفتاح جديد' : 'No new key provided');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    try {
      await api.saveSettings({ gemini_api_key: rawKey });
      toast.success(i18n.lang === 'ar' ? 'تم حفظ مفتاح Google Gemini بنجاح ⚡' : 'Google Gemini Key saved successfully');
      geminiInput.value = '';
      await this.loadSettings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}

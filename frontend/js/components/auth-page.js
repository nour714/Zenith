/**
 * Auth Page Component: Manages Sign In, Sign Up, Google OAuth flow,
 * floating language switcher, password visibility toggles, and seamless tab transitions.
 */
import { authService } from '../services/auth-service.js';
import { bus } from '../core/event-bus.js';
import { toast } from '../utils/toast.js';
import { i18n } from '../i18n/translator.js';
import { $ } from '../utils/dom.js';

export class AuthPageComponent {
  constructor() {
    this.mode = 'login'; // 'login' | 'register'
    this.bindEvents();
    this.initGoogleOAuth();
    this.updateLangLabel();
  }

  bindEvents() {
    // Mode switcher buttons & prompt links
    const btnTabLogin = $('#auth-tab-login');
    const btnTabRegister = $('#auth-tab-register');
    const linkSwitchRegister = $('#link-switch-to-register');
    const linkSwitchLogin = $('#link-switch-to-login');

    btnTabLogin?.addEventListener('click', () => this.switchMode('login'));
    btnTabRegister?.addEventListener('click', () => this.switchMode('register'));
    linkSwitchRegister?.addEventListener('click', () => this.switchMode('register'));
    linkSwitchLogin?.addEventListener('click', () => this.switchMode('login'));

    // Floating language switcher on auth screen
    const langBtn = $('#btn-auth-lang-toggle');
    langBtn?.addEventListener('click', () => {
      const nextLang = i18n.lang === 'ar' ? 'en' : 'ar';
      i18n.setLanguage(nextLang);
      this.updateLangLabel();
    });

    window.addEventListener('langchanged', () => this.updateLangLabel());

    // Password visibility toggles
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        const eyeIcon = btn.querySelector('.icon-eye');
        const eyeOffIcon = btn.querySelector('.icon-eye-off');

        if (eyeIcon && eyeOffIcon) {
          eyeIcon.style.display = isPassword ? 'none' : 'block';
          eyeOffIcon.style.display = isPassword ? 'block' : 'none';
        }
      });
    });

    // Login Form Submit
    const formLogin = $('#form-auth-login');
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#login-email')?.value.trim();
      const password = $('#login-password')?.value;
      const submitBtn = $('#btn-login-submit');

      if (!email || !password) {
        this.showError(i18n.lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
        return;
      }

      this.setLoading(submitBtn, true);
      this.clearError();
      try {
        await authService.login(email, password);
        toast.success(i18n.lang === 'ar' ? 'تم تسجيل الدخول بنجاح! مرحباً بك' : 'Welcome back!');
        bus.emit('view:switch', 'dashboard');
      } catch (err) {
        this.showError(err.message);
      } finally {
        this.setLoading(submitBtn, false);
      }
    });

    // Register Form Submit
    const formRegister = $('#form-auth-register');
    formRegister?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = $('#register-name')?.value.trim();
      const email = $('#register-email')?.value.trim();
      const password = $('#register-password')?.value;
      const confirmPassword = $('#register-password-confirm')?.value;
      const submitBtn = $('#btn-register-submit');

      if (!email || !password) {
        this.showError(i18n.lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
        return;
      }

      if (password.length < 6) {
        this.showError(i18n.lang === 'ar' ? 'كلمة المرور يجب ألا تقل عن 6 أحرف' : 'Password must be at least 6 characters');
        return;
      }

      if (password !== confirmPassword) {
        this.showError(i18n.lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
        return;
      }

      this.setLoading(submitBtn, true);
      this.clearError();
      try {
        await authService.register(email, password, fullName);
        toast.success(i18n.lang === 'ar' ? 'تم إنشاء الحساب بنجاح! أهلاً بك في Zenith' : 'Account created successfully! Welcome to Zenith');
        bus.emit('view:switch', 'dashboard');
      } catch (err) {
        this.showError(err.message);
      } finally {
        this.setLoading(submitBtn, false);
      }
    });

    // Listen for unauthorized events to redirect
    bus.on('auth:unauthorized', () => {
      bus.emit('view:switch', 'auth');
      toast.info(i18n.lang === 'ar' ? 'يرجى تسجيل الدخول للمتابعة' : 'Please sign in to continue');
    });
  }

  switchMode(mode) {
    this.mode = mode;
    const btnTabLogin = $('#auth-tab-login');
    const btnTabRegister = $('#auth-tab-register');
    const formLogin = $('#form-auth-login');
    const formRegister = $('#form-auth-register');

    if (mode === 'login') {
      btnTabLogin?.classList.add('active');
      btnTabRegister?.classList.remove('active');
      formLogin?.style.setProperty('display', 'flex');
      formRegister?.style.setProperty('display', 'none');
    } else {
      btnTabRegister?.classList.add('active');
      btnTabLogin?.classList.remove('active');
      formLogin?.style.setProperty('display', 'none');
      formRegister?.style.setProperty('display', 'flex');
    }
    this.clearError();
  }

  updateLangLabel() {
    const label = $('#auth-lang-label');
    if (label) {
      label.textContent = i18n.lang === 'ar' ? 'EN' : 'عربي';
    }
  }

  async initGoogleOAuth() {
    try {
      const config = await authService.getAuthConfig();
      const clientId = config?.google_client_id;
      const container = $('#google-signin-btn-container');

      if (!clientId) {
        if (container) {
          container.innerHTML = `
            <div data-i18n="auth_google_hint" style="font-size: 0.78rem; color: var(--text-dim); text-align: center; padding: 6px;">
              ${i18n.t('auth_google_hint')}
            </div>
          `;
        }
        return;
      }

      // Check if Google script is loaded
      const renderGoogleBtn = () => {
        if (window.google?.accounts?.id && container) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              try {
                await authService.loginWithGoogle(response.credential);
                toast.success(i18n.lang === 'ar' ? 'تم تسجيل الدخول بحساب Google بنجاح!' : 'Signed in with Google!');
                bus.emit('view:switch', 'dashboard');
              } catch (err) {
                this.showError(err.message);
              }
            },
          });

          container.innerHTML = '';
          window.google.accounts.id.renderButton(container, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: '100%',
            text: 'continue_with',
          });
        }
      };

      if (window.google?.accounts?.id) {
        renderGoogleBtn();
      } else {
        const interval = setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(interval);
            renderGoogleBtn();
          }
        }, 300);
        setTimeout(() => clearInterval(interval), 5000);
      }
    } catch (err) {
      console.warn('Failed to init Google OAuth UI:', err);
    }
  }

  showError(msg) {
    const errorBox = $('#auth-error-box');
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }
  }

  clearError() {
    const errorBox = $('#auth-error-box');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.style.display = 'none';
    }
  }

  setLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.dataset.origText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner" style="width: 16px; height: 16px; display: inline-block;"></span> ${i18n.lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}`;
    } else if (btn.dataset.origText) {
      btn.innerHTML = btn.dataset.origText;
    }
  }
}

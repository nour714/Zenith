/**
 * Auth Page Component: Manages Sign In, Sign Up, and Google OAuth flow.
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
  }

  bindEvents() {
    // Mode switcher buttons
    const btnTabLogin = $('#auth-tab-login');
    const btnTabRegister = $('#auth-tab-register');
    const formLogin = $('#form-auth-login');
    const formRegister = $('#form-auth-register');

    btnTabLogin?.addEventListener('click', () => {
      this.mode = 'login';
      btnTabLogin.classList.add('active');
      btnTabRegister?.classList.remove('active');
      formLogin?.style.setProperty('display', 'flex');
      formRegister?.style.setProperty('display', 'none');
      this.clearError();
    });

    btnTabRegister?.addEventListener('click', () => {
      this.mode = 'register';
      btnTabRegister.classList.add('active');
      btnTabLogin?.classList.remove('active');
      formLogin?.style.setProperty('display', 'none');
      formRegister?.style.setProperty('display', 'flex');
      this.clearError();
    });

    // Login Form Submit
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

  async initGoogleOAuth() {
    try {
      const config = await authService.getAuthConfig();
      const clientId = config?.google_client_id;
      const container = $('#google-signin-btn-container');

      if (!clientId) {
        if (container) {
          container.innerHTML = `
            <div style="font-size: 0.78rem; color: var(--text-dim); text-align: center; padding: 6px;">
              ${i18n.lang === 'ar' ? '💡 لتفعيل الدخول بـ Google، أضف GOOGLE_CLIENT_ID في ملف .env أو صفحة الإعدادات.' : '💡 To enable Google sign-in, add GOOGLE_CLIENT_ID in your .env or Settings.'}
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

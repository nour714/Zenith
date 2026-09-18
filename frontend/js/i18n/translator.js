/**
 * Internationalization (I18n) Engine with reactive RTL/LTR switching.
 */
import ar from './ar.js?v=3';
import en from './en.js?v=3';

const dictionaries = { ar, en };

class Translator {
  constructor() {
    const saved = localStorage.getItem('zenith_lang');
    this.currentLang = saved && dictionaries[saved] ? saved : 'ar';
  }

  get lang() {
    return this.currentLang;
  }

  setLanguage(newLang) {
    if (!dictionaries[newLang]) return;
    this.currentLang = newLang;
    localStorage.setItem('zenith_lang', newLang);
    this.applyToDOM();
    window.dispatchEvent(new CustomEvent('langchanged', { detail: { lang: newLang } }));
  }

  t(key, fallback = '') {
    const dict = dictionaries[this.currentLang] || dictionaries.ar;
    return dict[key] !== undefined ? dict[key] : (fallback || key);
  }

  applyToDOM() {
    const isRTL = this.currentLang === 'ar';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', this.currentLang);

    // Update text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text) {
        el.textContent = text;
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text) {
        el.setAttribute('placeholder', text);
      }
    });

    // Update titles and aria-labels
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = this.t(key);
      if (text) {
        el.setAttribute('title', text);
        if (el.hasAttribute('aria-label')) {
          el.setAttribute('aria-label', text);
        }
      }
    });

    // Update specific aria-labels
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const text = this.t(key);
      if (text) {
        el.setAttribute('aria-label', text);
      }
    });
  }
}

export const i18n = new Translator();

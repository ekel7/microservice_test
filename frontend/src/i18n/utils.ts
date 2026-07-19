import { ui, defaultLang } from './ui';

export function useTranslations(lang: keyof typeof ui = defaultLang) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}

// For client-side Vue components
export function getTranslation(key: keyof typeof ui[typeof defaultLang], lang?: keyof typeof ui) {
  const currentLang = lang || getCurrentLanguage();
  return ui[currentLang][key] || ui[defaultLang][key];
}

export function getCurrentLanguage(): keyof typeof ui {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('language') as keyof typeof ui) || defaultLang;
  }
  return defaultLang;
}

export function setCurrentLanguage(lang: keyof typeof ui) {
  if (typeof window !== 'undefined') {
    console.log('utils: setCurrentLanguage called with', lang)
    localStorage.setItem('language', lang);
    console.log('utils: localStorage set, dispatching languageChanged event')
    // Dispatch custom event instead of reloading
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }
}

export function formatMessage(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}
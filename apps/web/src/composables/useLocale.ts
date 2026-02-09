import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { type LocaleCode, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../i18n';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores';

const currentLocale = ref<LocaleCode>(DEFAULT_LOCALE);

function isValidLocale(locale: string): locale is LocaleCode {
  return locale in SUPPORTED_LOCALES;
}

export function useLocale() {
  const { locale: i18nLocale } = useI18n();
  const authStore = useAuthStore();

  onMounted(() => {
    // Priority: user.locale > localStorage > DEFAULT_LOCALE
    const userLocale = authStore.isAuthenticated && authStore.user?.locale;
    if (userLocale && isValidLocale(userLocale)) {
      currentLocale.value = userLocale;
    } else {
      const saved = localStorage.getItem('locale');
      if (saved && isValidLocale(saved)) {
        currentLocale.value = saved;
      }
    }

    // Apply initial locale
    i18nLocale.value = currentLocale.value;
    document.documentElement.lang = currentLocale.value;
  });

  watch(currentLocale, (newLocale) => {
    localStorage.setItem('locale', newLocale);
    i18nLocale.value = newLocale;
    document.documentElement.lang = newLocale;

    // Sync to backend if authenticated
    if (authStore.isAuthenticated) {
      authService.updateProfile({ locale: newLocale }).catch(() => {
        // Silently handle sync failure — locale is still saved locally
      });
    }
  });

  function setLocale(locale: LocaleCode) {
    if (!isValidLocale(locale)) return;
    currentLocale.value = locale;
  }

  return {
    currentLocale,
    setLocale,
  };
}

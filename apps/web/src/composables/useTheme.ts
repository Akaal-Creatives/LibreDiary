import { ref, watch, onMounted } from 'vue';

export type Theme = 'light' | 'dark' | 'system';

const theme = ref<Theme>('system');
const resolvedTheme = ref<'light' | 'dark'>('light');

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(newTheme: 'light' | 'dark') {
  resolvedTheme.value = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);
}

export function useTheme() {
  onMounted(() => {
    // Load saved theme preference
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      theme.value = saved;
    }

    // Apply initial theme
    const initial = theme.value === 'system' ? getSystemTheme() : theme.value;
    applyTheme(initial);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme.value === 'system') {
        applyTheme(getSystemTheme());
      }
    };
    mediaQuery.addEventListener('change', handleChange);
  });

  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme);
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyTheme(resolved);
  });

  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
  }

  function toggleTheme() {
    if (theme.value === 'light') {
      setTheme('dark');
    } else if (theme.value === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  }

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
}

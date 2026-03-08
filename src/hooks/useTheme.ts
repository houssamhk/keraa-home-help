import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const THEME_KEY = 'sakani-theme';

function applyTheme(theme: string) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Apply saved theme immediately on load (before React renders)
const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
applyTheme(savedTheme);

export function useTheme() {
  const { profile } = useAuth();

  useEffect(() => {
    const theme = profile?.settings?.theme || localStorage.getItem(THEME_KEY) || 'dark';
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }, [profile?.settings?.theme]);

  const isDark = (profile?.settings?.theme || localStorage.getItem(THEME_KEY) || 'dark') === 'dark';

  return { isDark };
}

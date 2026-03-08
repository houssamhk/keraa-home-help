import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useTheme() {
  const { profile } = useAuth();

  useEffect(() => {
    const theme = profile?.settings?.theme || 'dark';
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.settings?.theme]);

  const isDark = profile?.settings?.theme === 'dark';

  return { isDark };
}

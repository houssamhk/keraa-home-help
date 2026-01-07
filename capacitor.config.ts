import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1ae6fc876c834d3ea18d9457f418caca',
  appName: 'سكني - Sakani',
  webDir: 'dist',
  server: {
    url: 'https://1ae6fc87-6c83-4d3e-a18d-9457f418caca.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Geolocation: {
      // iOS permission text
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

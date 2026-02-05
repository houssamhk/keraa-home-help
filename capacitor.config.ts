import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1ae6fc876c834d3ea18d9457f418caca',
  appName: 'دارك - Darek',
  webDir: 'dist',
  server: {
    url: 'https://1ae6fc87-6c83-4d3e-a18d-9457f418caca.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0C1015'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0C1015',
      showSpinner: false
    }
  },
  ios: {
    scheme: 'Darek',
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

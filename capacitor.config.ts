import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c6e1186030f7439d9d6aa9ab6e71b706',
  appName: 'creatives-takeover',
  webDir: 'dist',
  server: {
    url: 'https://c6e11860-30f7-439d-9d6a-a9ab6e71b706.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e'
    }
  }
};

export default config;
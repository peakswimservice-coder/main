import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.peakswim.app',
  appName: 'PeakSwim',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

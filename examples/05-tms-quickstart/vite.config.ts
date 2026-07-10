import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'maplibre-gl', 'maplibre-gl-draw', 'geoai'],
  },
  define: {
    global: 'globalThis',
  },
});

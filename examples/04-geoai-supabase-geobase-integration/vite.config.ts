import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl', 'maplibre-gl-draw'],
          'supabase': ['@supabase/supabase-js'],
          'geoai': ['geoai'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'maplibre-gl',
      'maplibre-gl-draw',
      '@supabase/supabase-js',
      'geoai',
      'lucide-react',
    ],
  },
  define: {
    global: 'globalThis',
  },
});

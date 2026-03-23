import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // FIX: tell Vite to inline small assets (< 8 KB) as base64 data URLs so
  // they arrive with the JS bundle instead of as separate HTTP requests.
  // Images larger than this threshold are emitted as separate files and
  // served with a content-hash filename (long-term caching).
  build: {
    assetsInlineLimit: 8192, // 8 KB

    rollupOptions: {
      output: {
        // FIX: split vendor chunks so the browser can cache React separately
        // from your app code. When you change app code, only the app chunk
        // re-downloads — not the whole bundle including framer-motion etc.
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-ui':     ['lucide-react'],
        },
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:8080',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
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
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = req.headers['authorization'];
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        },
      },
    },
  },
});
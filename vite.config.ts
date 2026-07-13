import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('@tanstack') || id.includes('recharts') || id.includes('chart.js')) return 'vendor-data';
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/v1/configurations': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/integrations': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/data': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/folders': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/payroll': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/attendance': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/leave': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/employees': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/biometric-mapping': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/acting-allowance-rules': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/acting-assignments': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/approval': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/payment-export': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/auth/login': {
          // target: 'http://localhost:5000',
          target: 'https://adiu-okr.onrender.com/api/v1/',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/users': {
          // target: 'http://localhost:5000',
          target: 'https://adiu-okr.onrender.com/api/v1/',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

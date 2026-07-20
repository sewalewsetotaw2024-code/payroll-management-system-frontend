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
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // ── Payroll backend (port 3000) ──
        '/api/v1/configurations': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/integrations': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/data': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/folders': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/payroll': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/attendance': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/leave': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/employees': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/biometric-mapping': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/acting-allowance-rules': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/acting-assignments': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/approval': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/payment-export': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/roles': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/notifications': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/reports': {
          target: 'https://payroll-management-system-backend-d2y9.onrender.com',
          changeOrigin: true,
          secure: false,
        },
        // ── WebSocket proxy ──
        '/ws': {
          target: 'wss://payroll-management-system-backend-d2y9.onrender.com',
          ws: true,
          changeOrigin: true,
        },
        // ── EMS backend (port 5000) ──
        '/api/v1/auth/login': {
          target: 'https://adiu-okr.onrender.com',
          // target: 'https://adiu-okr.onrender.com/api/v1/',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/users': {
          target: 'https://adiu-okr.onrender.com',
          // target: 'https://adiu-okr.onrender.com/api/v1/',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});


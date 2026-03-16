import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Production: Immer echte API nutzen, falls URL gesetzt (oder Default)
  const apiUrl = env.VITE_API_URL || (mode === 'production' ? 'https://az-schnelltest.berlin/api' : '');
  const useMockApi = env.VITE_USE_MOCK_API === 'true' || env.VITE_API_URL === 'mock' || !apiUrl;

  const proxy = {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  };
  if (!useMockApi) {
    proxy['/socket.io'] = {
      target: 'http://localhost:5000',
      ws: true,
      configure: (proxy) => {
        proxy.on('error', () => {}); // Unterdrückt ECONNREFUSED/ECONNRESET wenn Backend nicht läuft
      }
    };
  }

  return {
  root: path.resolve(__dirname), // Explicitly set root directory (works better with UNC paths)
  plugins: [
    react({
      include: '**/*.{jsx,js}'
    })
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    include: ['xlsx'],
    exclude: [],
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  resolve: {
    alias: {
      'xlsx': path.resolve(__dirname, 'node_modules/xlsx')
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Listen on all interfaces (IPv4 and IPv6)
    strictPort: true, // Fail if port is already in use
    proxy
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite'), // Use resolve to handle UNC paths better
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Erzwinge API-URL in Production-Build (falls .env nicht geladen wird)
    define: mode === 'production' && apiUrl ? {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_USE_MOCK_API': JSON.stringify('false')
    } : {}
  }
  };
});

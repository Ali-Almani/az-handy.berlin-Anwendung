import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Leer = gleicher Origin (/api über Nginx) – kein CORS, funktioniert für Test- und Live-Domain.
  // Nur setzen, wenn du ohne Reverse-Proxy direkt aufs Backend zeigen musst (z. B. http://127.0.0.1:5000/api).
  const apiUrl = (env.VITE_API_URL ?? '').trim();
  const useMockApi =
    env.VITE_USE_MOCK_API === 'true' ||
    env.VITE_API_URL === 'mock' ||
    (mode !== 'production' && !apiUrl);

  const proxy = {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    },
    '/uploads': {
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
    // Production: VITE_API_URL explizit setzen (leer = relativer /api je nach aufgerufener Domain)
    define:
      mode === 'production'
        ? {
            'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
            'import.meta.env.VITE_USE_MOCK_API': JSON.stringify('false')
          }
        : {}
  }
  };
});

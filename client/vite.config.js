import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite'), // Use resolve to handle UNC paths better
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

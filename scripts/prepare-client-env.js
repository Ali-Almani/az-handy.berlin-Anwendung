#!/usr/bin/env node
/**
 * Erstellt client/.env.production mit VITE_API_URL aus .env CLIENT_URL.
 * Muss vor dem Client-Build ausgeführt werden, damit die echte API genutzt wird (kein Mock).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const clientEnvPath = path.join(rootDir, 'client', '.env.production');

let clientUrl = 'https://az-schnelltest.berlin';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/^CLIENT_URL=(.+)$/m);
  if (match) {
    clientUrl = match[1].trim().replace(/^["']|["']$/g, '');
    /* Mehrere Origins für CORS (z. B. az-intranet.de,az-schnelltest.berlin): erste URL für Vite-Build */
    clientUrl = clientUrl.split(',')[0].trim();
  }
}
const apiUrl = clientUrl.replace(/\/$/, '') + '/api';
const envContent = `# Auto-generated for production build - use real API, not Mock
VITE_API_URL=${apiUrl}
VITE_USE_MOCK_API=false
`;

fs.writeFileSync(clientEnvPath, envContent);
console.log(`✅ client/.env.production created with VITE_API_URL=${apiUrl}`);

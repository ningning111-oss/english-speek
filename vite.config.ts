// @ts-nocheck
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

const httpsKey = 'certs/dev-key.pem';
const httpsCert = 'certs/dev-cert.pem';
const useHttps = process.env.VITE_DEV_HTTPS !== 'false';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: 5173,
    strictPort: true,
    https: useHttps && fs.existsSync(httpsKey) && fs.existsSync(httpsCert)
      ? { key: fs.readFileSync(httpsKey), cert: fs.readFileSync(httpsCert) }
      : undefined,
  },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // Libera para rede local
    allowedHosts: true // Libera para túneis (localtunnel/ngrok)
  }
})

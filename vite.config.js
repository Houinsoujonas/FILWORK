import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Par défaut, le frontend interroge l'API de développement branchée sur la
  // base applicative. La base de test reste accessible en définissant
  // VITE_API_PROXY_TARGET=http://localhost:5051 avec `npm run start:test`.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})

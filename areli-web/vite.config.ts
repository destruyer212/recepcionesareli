import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** Debe coincidir con PORT del JAR (`areli-api`); por defecto 8083 si usas ese .env. */
  const devBackend = env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8083'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: devBackend,
          changeOrigin: true,
        },
      },
    },
  }
})

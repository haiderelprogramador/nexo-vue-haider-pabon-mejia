import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  // El prefijo vacío permite leer también API_PROXY_TARGET (no solo las VITE_*).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue()],
    server: {
      proxy: {
        // Todo lo que empiece por /api se reenvía al backend. No quitamos el
        // prefijo porque el backend también usa /api.
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});

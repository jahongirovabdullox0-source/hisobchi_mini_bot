import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Vercel'da ildiz manzilda ('/'), kompyuterda build qilinsa — backend uni /admin manzilida tarqatadi
  base: command === 'build' && !process.env.VERCEL ? '/admin/' : '/',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}));

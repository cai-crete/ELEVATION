import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const serverPort = parseInt(env.SERVER_PORT ?? '3001', 10);

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // API 키는 서버 전용 — 클라이언트에 노출하지 않음
      'process.env.GEMINI_API_KEY': JSON.stringify(''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR은 AI Studio 환경에서 DISABLE_HMR로 제어
      hmr: process.env.DISABLE_HMR !== 'true',
      // /api/* 요청을 Express 서버로 프록시
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          // SSE 스트림을 위해 버퍼링 비활성화
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
                proxyRes.headers['cache-control'] = 'no-cache';
              }
            });
          },
        },
      },
    },
  };
});

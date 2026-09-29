import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const shouldUploadSourcemaps = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT,
  )

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(shouldUploadSourcemaps
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
              },
            }),
          ]
        : []),
    ],
    build: {
      // 인증 토큰이 있을 때만 소스맵을 생성해 Sentry에 업로드한다.
      // 업로드된 .map 파일은 플러그인이 dist에서 삭제한다.
      sourcemap: shouldUploadSourcemaps ? 'hidden' : false,
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  }
})

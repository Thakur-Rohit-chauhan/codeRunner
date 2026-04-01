import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = dirname(fileURLToPath(import.meta.url))

const withTrailingSlash = (value) => value.replace(/\/+$/, '')

const buildProxyEntry = ({ gatewayTarget, directTarget, directRewrite }) => ({
  target: gatewayTarget || directTarget,
  changeOrigin: true,
  ...(gatewayTarget ? {} : { rewrite: directRewrite }),
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const gatewayTarget = env.VITE_API_GATEWAY_URL ? withTrailingSlash(env.VITE_API_GATEWAY_URL) : ''

  const apiProxy = {
    '/api/auth': buildProxyEntry({
      gatewayTarget,
      directTarget: env.VITE_AUTH_SERVICE_URL || 'http://127.0.0.1:8000',
      directRewrite: (path) => path.replace(/^\/api\/auth/, '/auth'),
    }),
    '/api/problem': buildProxyEntry({
      gatewayTarget,
      directTarget: env.VITE_PROBLEM_SERVICE_URL || 'http://127.0.0.1:8001',
      directRewrite: (path) => path.replace(/^\/api\/problem/, ''),
    }),
    '/api/contest': buildProxyEntry({
      gatewayTarget,
      directTarget: env.VITE_CONTEST_SERVICE_URL || 'http://127.0.0.1:8002',
      directRewrite: (path) => path.replace(/^\/api\/contest/, ''),
    }),
    '/api/submission': buildProxyEntry({
      gatewayTarget,
      directTarget: env.VITE_SUBMISSION_SERVICE_URL || 'http://127.0.0.1:8003',
      directRewrite: (path) => path.replace(/^\/api\/submission/, ''),
    }),
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: true,
      proxy: apiProxy,
    },
    preview: {
      host: true,
      proxy: apiProxy,
    },
  }
})

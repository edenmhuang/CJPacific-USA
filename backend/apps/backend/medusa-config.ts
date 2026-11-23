import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/** In production, refuse to start with a missing or placeholder secret (Medusa would otherwise fall back to a public default). */
function secret(name: string) {
  const value = process.env[name]
  if (process.env.NODE_ENV === 'production' && (!value || value.startsWith('change-me') || value.length < 32)) {
    throw new Error(`${name} must be set to a random value of at least 32 characters (openssl rand -hex 32).`)
  }
  return value
}

/** Public base for product photos uploaded in Admin. Files go to static/uploads (mount a Railway Volume there so they survive redeploys). */
const backendUrl = (process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000').replace(/\/$/, '')

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL || undefined,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: secret('JWT_SECRET'),
      cookieSecret: secret('COOKIE_SECRET'),
    }
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || '/',
  },
  modules: [
    {
      // Product photos uploaded in Medusa Admin. Without this, Medusa saves them with a localhost address.
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/file-local',
            id: 'local',
            options: { upload_dir: 'static/uploads', backend_url: `${backendUrl}/static/uploads` },
          },
        ],
      },
    },
    {
      // Order emails: customer confirmation + owner copy for invoice entry.
      // Sends through Resend when RESEND_API_KEY is set; otherwise logs and saves previews.
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            resolve: './src/modules/resend',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.EMAIL_FROM || 'CJPacific USA <onboarding@resend.dev>',
              preview_dir: process.env.EMAIL_PREVIEW_DIR,
            },
          },
        ],
      },
    },
  ],
})

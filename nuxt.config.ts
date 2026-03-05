import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: 'app/',
  css: ['~/assets/css/tailwind.css'],
  modules: [
    'shadcn-nuxt',
    'nuxt-auth-utils',
    '@nuxt/image',
    '@nuxthub/core',
    '@nuxt/test-utils',
  ],
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui'
  },
  image: {
    quality: 80,
    format: ['webp'],
  },
  hub: {
    db: 'postgresql'
  },
  runtimeConfig: {
    mailEnabled: process.env.MAIL_ENABLED ?? 'false',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpSecure: process.env.SMTP_SECURE ?? 'false',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    mailFrom: process.env.MAIL_FROM,
    appBaseUrl: process.env.APP_BASE_URL,
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})

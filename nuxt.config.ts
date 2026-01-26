import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: 'app/',
  css: ['~/assets/css/tailwind.css'],
  modules: ['shadcn-nuxt', 'nuxt-auth-utils', // '@nuxt/test-utils',
  '@nuxthub/core', '@nuxt/test-utils'],
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
  hub: {
    db: 'postgresql'
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
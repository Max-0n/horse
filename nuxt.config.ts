// https://nuxt.com/docs/api/configuration/nuxt-config

import path from 'node:path'
import svgLoader from 'vite-svg-loader'

export default defineNuxtConfig({
  alias: {
    '@cdn': path.resolve(__dirname, '../cdn/src/CDN'),
    '@shared-protocol/*': path.resolve(__dirname, '../protocol/src/shared/*'),
    '@shared-config/*': path.resolve(__dirname, '../config/src/shared/*'),
    '@barcodes-protocol/*': path.resolve(__dirname, '../protocol/src/barcodes/*'),
    '@barcodes-protocol': path.resolve(__dirname, '../protocol/src/barcodes'),
    '@season2-config/*': path.resolve(__dirname, '../config/src/season2/*'),
  },
  app: {
    head: {
      title: 'Horse Defied',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
        },
        { name: 'imagetoolbar', content: 'no' },
        { name: 'google', content: 'notranslate' },
        { name: 'theme-color', content: '#000000' },
        { name: 'cleartype', content: 'on' },
        { name: 'HandheldFriendly', content: 'True' },
      ],
      script: [ { src: 'https://telegram.org/js/telegram-web-app.js', defer: true } ],
    },
  },
  build: {
    transpile: [ '@tonconnect/ui' ],
  },
  compatibilityDate: '2024-11-06',
  components: true,
  css: [ '~/assets/styles/app.scss', 'notivue/notification.css', 'notivue/animations.css' ],
  devServer: {
    // https: true,
    port: process.env.APP_PORT ? Number.parseInt(process.env.APP_PORT, 10) : 3000,
  },
  devtools: { enabled: false },
  experimental: {
    defaults: {
      nuxtLink: {
        activeClass: 'is-active',
        exactActiveClass: 'is-exact-active',
      },
    },
  },
  i18n: {
    defaultLocale: 'en',
    compilation: {
      strictMessage: false,
    },
  },
  imports: {
    dirs: [ './composables/**', './components/**', './types/**', './constants/**' ],
  },
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@vueuse/motion/nuxt',
    [
      '@nuxtjs/google-fonts',
      {
        prefetch: true,
        preconnect: true,
        display: 'swap',
        families: {
          Rubik: [ 300, 400, 500, 600, 700, 800, 900 ],
          Inter: [ 300, 400, 500, 600, 700, 800, 900 ],
        },
      },
    ],
    [
      '@nuxtjs/i18n',
      {
        strategy: 'no_prefix',
        defaultLocale: 'en',
        lazy: true,
        langDir: 'locales',
        detectBrowserLanguage: {
          alwaysRedirect: true,
          fallbackLocale: 'en',
          redirectOn: 'root',
          useCookie: true,
          cookieCrossOrigin: false,
          cookieDomain: null,
          cookieKey: 'i18n_redirected',
          cookieSecure: false,
        },
        locales: [
          {
            code: 'en',
            file: 'en.json',
            name: 'English',
          },
          {
            code: 'ru',
            file: 'ru.json',
            name: 'Русский',
          },
        ],
      },
    ],
    'notivue/nuxt',
  ],
  notivue: {
    position: 'top-center',
    limit: 3,
    enqueue: true,
    notifications: {
      global: {
        duration: 5000,
      },
    },
  },
  pinia: {
    storesDirs: [ './stores/**' ],
  },
  // plugins: ['~/plugins/event-bus.ts', '~/plugins/cdn.ts'],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_URL,
      appEnv: process.env.APP_ENV,
      cdnUrl: process.env.CDN_URL,
      generatorUrl: process.env.GENERATOR_URL,
      botName: process.env.BOT_NAME,
      botUrl: process.env.BOT_URL,
      publicChatUrl: process.env.PUBLIC_CHAT_URL,
      miniAppPath: process.env.MINI_APP_PATH,
      supportBotUrl: process.env.SUPPORT_BOT_URL,
      appVersion: process.env.APP_VERSION,
      shareMonsterUrl: process.env.SHARE_MONSTER_URL,
      shareProductUrl: process.env.SHARE_PRODUCT_URL,
      shareReferralUrl: process.env.SHARE_REFERRAL_URL,
    },
  },
  ssr: false,
  typescript: {
    typeCheck: true,
    strict: true,
  },
  vite: {
    optimizeDeps: {
      include: [ '@tonconnect/ui' ],
    },
    server: {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    resolve: {
      alias: {
        '@cdn': path.resolve(__dirname, '../cdn/src/CDN'),
        '@shared-protocol/*': path.resolve(__dirname, '../protocol/src/shared/*'),
        '@shared-config/*': path.resolve(__dirname, '../config/src/shared/*'),
        '@barcodes-protocol/*': path.resolve(__dirname, '../protocol/src/barcodes/*'),
        '@barcodes-protocol': path.resolve(__dirname, '../protocol/src/barcodes'),
        '@shared-protocol': path.resolve(__dirname, '../protocol/src/shared'),
        '@season2-config/*': path.resolve(__dirname, '../config/src/season2/*'),
      },
    },
    plugins: [ svgLoader() ],
  },
})

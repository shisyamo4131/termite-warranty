export default defineNuxtConfig({
  compatibilityDate: '2026-09-10',
  ssr: false,
  app: {
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
  },
  css: ['~/assets/clear-sky-theme.css'],
  modules: ['vuetify-nuxt-module'],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      firebaseProjectId: 'demo-termite-warranty',
      firebaseDevProjectId: 'termite-warranty-dev',
      firebaseFunctionsRegion: 'asia-northeast1',
    },
  },
  typescript: {
    typeCheck: true,
  },
  vuetify: {
    moduleOptions: {
      importComposables: false,
    },
    vuetifyOptions: {
      localeMessages: ['ja'],
      locale: {
        locale: 'ja',
      },
      labComponents: ['VDateInput'],
      theme: {
        defaultTheme: 'termiteWarranty',
        themes: {
          termiteWarranty: {
            dark: false,
            colors: {
              primary: '#3478C7',
              secondary: '#55B8D1',
              accent: '#55B8D1',
              background: '#F5F9FD',
              surface: '#FFFFFF',
              'surface-variant': '#E7F1FC',
              'on-background': '#26374A',
              'on-surface': '#26374A',
              'on-primary': '#FFFFFF',
              'on-secondary': '#26374A',
              'on-warning': '#203040',
              success: '#39956B',
              warning: '#D88A32',
              error: '#B84A4A',
              info: '#3478C7',
            },
          },
        },
      },
    },
  },
})

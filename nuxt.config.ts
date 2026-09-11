export default defineNuxtConfig({
  compatibilityDate: '2026-09-10',
  ssr: false,
  css: ['~/assets/clear-sky-theme.css'],
  modules: ['vuetify-nuxt-module'],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      firebaseProjectId: 'demo-termite-warranty',
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
              'on-warning': '#26374A',
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

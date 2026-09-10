export default defineNuxtConfig({
  compatibilityDate: '2026-09-10',
  ssr: false,
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
              primary: '#315c47',
              secondary: '#8b5e34',
              background: '#f6f3ec',
              surface: '#fffdf8',
              error: '#b3261e',
              warning: '#a65f00',
            },
          },
        },
      },
    },
  },
})

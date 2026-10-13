import { hostedTarget } from './functions/deployment-target.js'
const target = hostedTarget({
  environment: process.env.TERMITE_DEPLOYMENT_ENVIRONMENT || 'development',
  project: process.env.TERMITE_PRODUCTION_PROJECT || 'termite-warranty-dev',
  appId: process.env.TERMITE_PRODUCTION_APP_ID || '',
})
const recoveryReleaseRevision = process.env.RECOVERY_RELEASE_REVISION
if (recoveryReleaseRevision !== undefined && !/^[a-f0-9]{40}$/.test(recoveryReleaseRevision)) {
  throw new Error('Invalid recovery release revision.')
}

export default defineNuxtConfig({
  ...(recoveryReleaseRevision ? { buildId: recoveryReleaseRevision } : {}),
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
      firebaseDeploymentEnvironment: target.environment,
      firebaseHostedProjectId: target.project,
      firebaseHostedAppId: target.appId,
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
      defaults: {
        VAlert: { density: 'compact', variant: 'tonal', iconSize: 20 },
        VTextField: { autocomplete: 'off' },
        VTextarea: { autocomplete: 'off' },
        VSelect: { autocomplete: 'off' },
        VAutocomplete: { autocomplete: 'off' },
        VCombobox: { autocomplete: 'off' },
        VForm: { autocomplete: 'off' },
      },
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

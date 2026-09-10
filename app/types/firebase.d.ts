import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import type { Functions } from 'firebase/functions'

declare module '#app' {
  interface NuxtApp {
    $firebase: {
      auth: Auth
      firestore: Firestore
      functions: Functions
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $firebase: {
      auth: Auth
      firestore: Firestore
      functions: Functions
    }
  }
}

export {}

import { register } from 'node:module'
register('./functions-sdk-loader.mjs', import.meta.url, {
  data: { packageUrl: new URL('../../functions/package.json', import.meta.url).href },
})

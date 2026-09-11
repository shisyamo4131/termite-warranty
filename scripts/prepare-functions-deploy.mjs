import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourceDirectory = resolve('src/domain')
const outputDirectory = resolve('functions/domain')

await rm(outputDirectory, { recursive: true, force: true })
await mkdir(outputDirectory, { recursive: true })
await cp(sourceDirectory, outputDirectory, { recursive: true })

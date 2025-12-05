#!/usr/bin/env node
import { glob } from 'glob'
import { readFile, writeFile } from 'node:fs/promises'

const PATTERNS = [
  {
    from: /['"]@\/services\/nsiDashboard\.api['"]/g,
    to: "'@entities/nsi-dashboard'",
  },
]

async function run() {
  const files = await glob('src/**/*.{ts,tsx,vue}', { nodir: true })
  let updated = 0

  await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, 'utf8')
      let next = source
      for (const { from, to } of PATTERNS) {
        next = next.replace(from, to)
      }
      if (next !== source) {
        await writeFile(file, next, 'utf8')
        updated += 1
      }
    }),
  )

  console.log(`Updated imports in ${updated} file(s).`)
}

run().catch((error) => {
  console.error('Codemod failed', error)
  process.exit(1)
})

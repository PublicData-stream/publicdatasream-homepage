import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const Root = resolve(import.meta.dirname, '..')
const TsxCli = fileURLToPath(import.meta.resolve('tsx/cli'))

test('tsx imports validators without running them and executes the configuration CLI', async () => {
  const Fixture = await mkdtemp(join(tmpdir(), 'publicdata-scripts-'))
  try {
    for (const Path of ['scripts', 'src/lib', 'src/i18n', 'package.json', 'wrangler.jsonc']) {
      await cp(join(Root, Path), join(Fixture, Path), { recursive: true })
    }
    await symlink(join(Root, 'node_modules'), join(Fixture, 'node_modules'), 'dir')
    const Run = (Script: string) => spawnSync(process.execPath, [TsxCli, Script], {
      cwd: Fixture,
      encoding: 'utf8',
      timeout: 10_000,
    })

    const Valid = Run('scripts/check-cloudflare.ts')
    assert.ifError(Valid.error)
    assert.equal(Valid.status, 0, Valid.stderr)
    assert.match(Valid.stdout, /^Cloudflare configuration verified: static assets only;/)

    await writeFile(join(Fixture, 'wrangler.jsonc'), JSON.stringify({ main: 'src/worker.ts' }))
    const Invalid = Run('scripts/check-cloudflare.ts')
    assert.ifError(Invalid.error)
    assert.equal(Invalid.status, 1)
    assert.match(Invalid.stderr, /static-only deployment contract/)
    assert.equal(Invalid.stdout, '')

    // Neither validator may read configuration/output just because it is imported.
    await rm(join(Fixture, 'wrangler.jsonc'))
    await writeFile(join(Fixture, 'import-validators.ts'),
      'import { AssertStaticDeployment } from \'./scripts/check-cloudflare.ts\';\n' +
      'import { CheckDist } from \'./scripts/check-dist.ts\';\n' +
      'console.log(typeof AssertStaticDeployment, typeof CheckDist);\n')
    const Imported = Run('import-validators.ts')
    assert.ifError(Imported.error)
    assert.equal(Imported.status, 0, Imported.stderr)
    assert.equal(Imported.stdout, 'function function\n')
    assert.equal(Imported.stderr, '')

    const MissingConfig = Run('scripts/check-cloudflare.ts')
    assert.ifError(MissingConfig.error)
    assert.equal(MissingConfig.status, 1)
    assert.match(MissingConfig.stderr, /ENOENT/)
    const MissingOutput = Run('scripts/check-dist.ts')
    assert.ifError(MissingOutput.error)
    assert.equal(MissingOutput.status, 1)
    assert.match(MissingOutput.stderr, /ENOENT/)
  } finally {
    await rm(Fixture, { recursive: true, force: true })
  }
})

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { access, cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { LinkFixtureDependencies } from './fixtures.ts'

const Root = resolve(import.meta.dirname, '..')
const OxlintCli = join(dirname(fileURLToPath(import.meta.resolve('oxlint/package.json'))), 'bin/oxlint')

test('lint initializes clean Astro types, rejects unsafe assignments and forwards fix arguments', { timeout: 60_000 }, async () => {
  const Fixture = await mkdtemp(join(tmpdir(), 'publicdata-clean-lint-'))
  try {
    for (const Path of ['src', 'public', 'scripts', 'tests', 'astro.config.ts', 'tsconfig.json', 'package.json', '.oxlintrc.json', 'oxlint-plugin.mjs']) {
      await cp(join(Root, Path), join(Fixture, Path), { recursive: true })
    }
    await LinkFixtureDependencies(Fixture)
    const Manifest = JSON.parse(await readFile(join(Fixture, 'package.json'), 'utf8')) as Record<'scripts', Record<'lint', string>>
    // Run the actual package script with pinned binaries and fresh Astro types.
    const Run = (Fix = false) => spawnSync('sh', ['-c', `${Manifest.scripts.lint}${Fix ? ' --fix' : ''}`], {
      cwd: Fixture,
      env: { ...process.env, PATH: `${join(Root, 'node_modules/.bin')}${delimiter}${process.env.PATH ?? ''}`, ASTRO_TELEMETRY_DISABLED: '1' },
      encoding: 'utf8',
      timeout: 20_000,
    })
    await assert.rejects(access(join(Fixture, '.astro')))
    const Clean = Run()
    assert.ifError(Clean.error)
    assert.equal(Clean.status, 0, Clean.stdout + Clean.stderr)
    await access(join(Fixture, '.astro/types.d.ts'))
    await access(join(Fixture, '.astro/content.d.ts'))

    const InvalidPath = join(Fixture, 'src/lint-regression.ts')
    await writeFile(InvalidPath, 'export const Invalid: string = JSON.parse(\'{}\')\n')
    const Invalid = Run()
    assert.ifError(Invalid.error)
    assert.equal(Invalid.status, 1, Invalid.stdout + Invalid.stderr)
    assert.match(Invalid.stdout + Invalid.stderr, /no-unsafe-assignment/)

    await writeFile(InvalidPath, 'export const Value = 1;\n')
    await rm(join(Fixture, '.astro'), { recursive: true })
    const Fixed = Run(true)
    assert.ifError(Fixed.error)
    assert.equal(Fixed.status, 0, Fixed.stdout + Fixed.stderr)
    assert.equal(await readFile(InvalidPath, 'utf8'), 'export const Value = 1\n')
    await access(join(Fixture, '.astro/types.d.ts'))
  } finally {
    await rm(Fixture, { recursive: true, force: true })
  }
})

async function WithLintFixture(Check: (Run: (Path: string, Source: string, Fix?: boolean) => Promise<string>) => Promise<void>) {
  const Fixture = await mkdtemp(join(tmpdir(), 'publicdata-lint-'))
  try {
    // Exercise the repository's actual custom rules and scoped exceptions.
    const Config = JSON.parse(await readFile(join(Root, '.oxlintrc.json'), 'utf8')) as Record<string, unknown>
    const Overrides = Config.overrides as Record<string, unknown>[]
    await writeFile(join(Fixture, '.oxlintrc.json'), JSON.stringify({
      plugins: [],
      categories: { correctness: 'off' },
      jsPlugins: [join(Root, 'oxlint-plugin.mjs')],
      rules: Config.rules,
      overrides: Overrides.filter((Override) => {
        const Rules = Override.rules as Record<string, unknown>
        return 'publicdatastream/pascal-case' in Rules
      }),
    }))
    const Run = async (Path: string, Source: string, Fix = false): Promise<string> => {
      const Filename = join(Fixture, Path)
      await mkdir(dirname(Filename), { recursive: true })
      await writeFile(Filename, Source)
      const Result = spawnSync(process.execPath, [OxlintCli, '--config', '.oxlintrc.json', '--deny-warnings', ...(Fix ? ['--fix'] : []), Path], {
        cwd: Fixture,
        encoding: 'utf8',
        timeout: 10_000,
      })
      assert.ifError(Result.error)
      assert(Result.status === 0 || Result.status === 1, Result.stderr)
      return Fix ? readFile(Filename, 'utf8') : Result.stdout + Result.stderr
    }
    await Check(Run)
  } finally {
    await rm(Fixture, { recursive: true, force: true })
  }
}

test('naming exceptions preserve framework exports and nested external fields without exempting local bindings', async () => {
  await WithLintFixture(async (Run) => {
    const Contract = await Run('src/content.config.ts', 'export const collections = {}\nconst local = 1\n')
    assert(!Contract.includes('Identifier \'collections\''))
    assert(Contract.includes('Identifier \'local\''))
    const Unscoped = await Run('other.ts', 'export const collections = {}\nconst getStaticPaths = () => []\n')
    assert(Unscoped.includes('Identifier \'collections\''))
    assert(Unscoped.includes('Identifier \'getStaticPaths\''))
    const Route = await Run('src/pages/example.ts', 'export const getStaticPaths = () => []\nconst Local = () => { const getStaticPaths = 1 }\n')
    assert.equal((Route.match(/Identifier 'getStaticPaths'/g) ?? []).length, 1)
    const FunctionRoute = await Run('src/pages/function.ts', 'export function getStaticPaths(argument) { return [] }\n')
    assert(!FunctionRoute.includes('Identifier \'getStaticPaths\''))
    assert(FunctionRoute.includes('Identifier \'argument\''))
    const Component = await Run('src/components/Example.astro', [
      '---',
      'interface Props { title: string; example: { config: string } }',
      'const { title: Title } = Astro.props',
      'const { example } = Astro.props',
      'interface Internal { value: string }',
      '---',
      '<h1>{Title}</h1>',
    ].join('\n'))
    assert(!Component.includes('Identifier \'title\''))
    assert(!Component.includes('Identifier \'config\''))
    assert(Component.includes('Identifier \'example\''))
    assert(Component.includes('Identifier \'value\''))
    const Records = await Run('src/lib/catalog-validation.ts', 'interface ServerRecord { data: { slug: string } }\ninterface Local { data: string }\n')
    assert(!Records.includes('Identifier \'slug\''))
    assert.equal((Records.match(/Identifier 'data'/g) ?? []).length, 1)
  })
})

test('semicolon fixes preserve statement boundaries, loop separators, and class field hazards', async () => {
  await WithLintFixture(async (Run) => {
    const Source = [
      'const Value = 1;',
      'const SameLine = 1; Call()',
      'for (let Index = 0; Index < 2; Index++) Call();',
      'Call();',
      '[1].forEach(Call);',
      'class Example {',
      '  get;',
      '  Method() {}',
      '  Field;',
      '  *Generator() {}',
      '}',
      'Call();',
      '',
    ].join('\n')
    const Fixed = await Run('example.js', Source, true)
    assert.equal(Fixed, Source.replace('const Value = 1;', 'const Value = 1')
      .replace('Index++) Call();', 'Index++) Call()')
      .replace('[1].forEach(Call);', '[1].forEach(Call)')
      .replace(/Call\(\);\n$/, 'Call()\n'))
  })
})

test('quote rules reject double quotes and plain templates while permitting escaped, interpolated, and tagged strings', async () => {
  await WithLintFixture(async (Run) => {
    const Output = await Run('example.js', [
      'const Double = "text"',
      'const Plain = `text`',
      'const Single = \'can\\\'t\'',
      'const Interpolated = `value: ${Single}`',
      'const Tagged = String.raw`\\n`',
    ].join('\n'))
    assert.equal((Output.match(/Strings must use single quotes/g) ?? []).length, 2)
  })
})

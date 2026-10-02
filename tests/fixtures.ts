import assert from 'node:assert/strict'
import { mkdir, readdir, rm, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const Root = resolve(import.meta.dirname, '..')

export const FontStylesheets = [
  'https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.1/index.min.css',
  'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5.3.0/400.min.css',
]

export function AssertFontStylesheets(Html: string) {
  const Head = Html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/)?.[1] ?? ''
  const Links = Head.match(/<link\b[^>]*>/g) ?? []
  for (const Stylesheet of FontStylesheets) {
    assert.equal(Links.filter((Link) => Link.includes(`href="${Stylesheet}"`) && /\brel="stylesheet"/.test(Link)).length, 1,
      `Every page must load ${Stylesheet} once in its head.`)
  }
  assert.equal(Links.filter((Link) => /\brel="stylesheet"/.test(Link) && /\bhref="https?:/.test(Link)).length,
    FontStylesheets.length, 'Only the pinned external font stylesheets are allowed.')
}

export async function ResetFixtureContent(Fixture: string) {
  for (const Collection of ['servers', 'policies']) {
    const Directory = join(Fixture, 'src/content', Collection)
    await rm(Directory, { recursive: true, force: true })
    await mkdir(Directory, { recursive: true })
  }
}

export async function LinkFixtureDependencies(Fixture: string) {
  const Dependencies = join(Fixture, 'node_modules')
  await mkdir(Dependencies)
  for (const Entry of await readdir(join(Root, 'node_modules'))) {
    // Share installed packages, but keep Astro and Vite caches disposable and
    // independent when multiple fixture builds run concurrently.
    if (Entry.startsWith('.') && !['.bin', '.pnpm'].includes(Entry)) continue
    await symlink(join(Root, 'node_modules', Entry), join(Dependencies, Entry))
  }
}

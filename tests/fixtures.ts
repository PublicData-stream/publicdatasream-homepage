import { mkdir, readdir, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const Root = resolve(import.meta.dirname, '..')

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

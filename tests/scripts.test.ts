import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const tsxCli = fileURLToPath(import.meta.resolve('tsx/cli'));

test('tsx imports validators without running them and executes the configuration CLI', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'publicdata-scripts-'));
  try {
    for (const path of ['scripts', 'src/lib', 'package.json', 'wrangler.jsonc']) {
      await cp(join(root, path), join(fixture, path), { recursive: true });
    }
    await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
    const run = (script: string) => spawnSync(process.execPath, [tsxCli, script], {
      cwd: fixture,
      encoding: 'utf8',
      timeout: 10_000,
    });

    const valid = run('scripts/check-cloudflare.ts');
    assert.ifError(valid.error);
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /^Cloudflare configuration verified: static assets only;/);

    await writeFile(join(fixture, 'wrangler.jsonc'), JSON.stringify({ main: 'src/worker.ts' }));
    const invalid = run('scripts/check-cloudflare.ts');
    assert.ifError(invalid.error);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /static-only deployment contract/);
    assert.equal(invalid.stdout, '');

    // Neither validator may read configuration/output just because it is imported.
    await rm(join(fixture, 'wrangler.jsonc'));
    await writeFile(join(fixture, 'import-validators.ts'),
      "import { assertStaticDeployment } from './scripts/check-cloudflare.ts';\n" +
      "import { checkDist } from './scripts/check-dist.ts';\n" +
      "console.log(typeof assertStaticDeployment, typeof checkDist);\n");
    const imported = run('import-validators.ts');
    assert.ifError(imported.error);
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(imported.stdout, 'function function\n');
    assert.equal(imported.stderr, '');

    const missingConfig = run('scripts/check-cloudflare.ts');
    assert.ifError(missingConfig.error);
    assert.equal(missingConfig.status, 1);
    assert.match(missingConfig.stderr, /ENOENT/);
    const missingOutput = run('scripts/check-dist.ts');
    assert.ifError(missingOutput.error);
    assert.equal(missingOutput.status, 1);
    assert.match(missingOutput.stderr, /ENOENT/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

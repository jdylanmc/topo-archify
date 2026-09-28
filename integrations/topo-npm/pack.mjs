import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnCliSync } from '../deepseek-harness/scripts/resolve-cli.mjs';
import { verifyRuntime } from './index.js';

const source = fileURLToPath(new URL('./', import.meta.url));
const repository = path.resolve(source, '../..');
const release = JSON.parse(readFileSync(path.join(source, 'release.json'), 'utf8'));
const expected = JSON.parse(readFileSync(path.join(source, 'upstream-integrity.json'), 'utf8'));
const output = path.resolve(process.argv[2] ?? 'dist');
const temporary = mkdtempSync(path.join(tmpdir(), 'topo-archify-pack-'));
const stage = path.join(temporary, 'package');
const git = (args) => execFileSync('git', args, { cwd: repository, maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

try {
  if (!/^[a-f0-9]{40}$/.test(release.upstreamCommit)) throw new Error('A full upstream commit is required');
  const archive = git(['show', `${release.upstreamCommit}:archify.zip`]);
  if (createHash('sha256').update(archive).digest('hex') !== release.archiveSha256) {
    throw new Error('Pinned upstream archive SHA-256 mismatch');
  }
  const archivePath = path.join(temporary, 'archify.zip');
  writeFileSync(archivePath, archive);
  const archivePaths = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8' }).trim().split('\n').sort();
  const expectedPaths = expected.files.map((entry) => entry.path.slice('vendor/'.length)).sort();
  if (JSON.stringify(archivePaths) !== JSON.stringify(expectedPaths)) throw new Error('Upstream ZIP inventory mismatch');
  mkdirSync(stage);
  execFileSync('unzip', ['-q', archivePath, '-d', stage]);
  renameSync(path.join(stage, 'archify'), path.join(stage, 'runtime'));
  const runtimeManifest = {
    algorithm: 'sha256',
    files: expected.files.map((entry) => {
      if (!entry.path.startsWith('vendor/archify/')) throw new Error('Invalid upstream inventory path');
      return { ...entry, path: entry.path.slice('vendor/archify/'.length) };
    }),
  };
  writeFileSync(path.join(stage, 'runtime-integrity.json'), `${JSON.stringify(runtimeManifest, null, 2)}\n`);
  // Only this explicit packaging surface and the pinned tracked snapshot ship.
  for (const file of ['package.json', 'release.json', 'index.js', 'index.d.ts', 'README.md']) {
    const entry = path.join(source, file);
    if (!lstatSync(entry).isFile() || lstatSync(entry).isSymbolicLink()) {
      throw new Error(`Refusing package symlink: ${file}`);
    }
    copyFileSync(entry, path.join(stage, file));
  }
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    copyFileSync(path.join(stage, 'runtime', file), path.join(stage, file));
  }
  const integrity = verifyRuntime(stage);
  const runtimePackage = JSON.parse(readFileSync(path.join(stage, 'runtime/package.json'), 'utf8'));
  if (runtimePackage.version !== release.upstreamVersion) throw new Error('Upstream version mismatch');
  mkdirSync(output, { recursive: true });
  const packed = spawnCliSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', output], { cwd: stage, encoding: 'utf8' });
  if (packed.status !== 0) throw new Error(`npm pack failed: ${packed.stderr || packed.error?.message}`);
  const result = JSON.parse(packed.stdout)[0];
  console.log(JSON.stringify({ ...result, destination: path.join(output, result.filename), upstream: integrity }, null, 2));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

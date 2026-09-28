import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('./', import.meta.url));
const repository = path.resolve(source, '../..');
const [commit, mode] = process.argv.slice(2);
if (!/^[a-f0-9]{40}$/.test(commit ?? '') || (mode !== undefined && mode !== '--write')) {
  throw new Error('Usage: node integrations/topo-npm/update-pin.mjs <approved-full-commit> [--write]');
}
const temporary = mkdtempSync(path.join(tmpdir(), 'topo-archify-pin-'));
try {
  const archive = execFileSync('git', ['show', `${commit}:archify.zip`], { cwd: repository, maxBuffer: 128 * 1024 * 1024 });
  const archivePath = path.join(temporary, 'archify.zip');
  writeFileSync(archivePath, archive);
  const paths = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8' }).trim().split('\n');
  if (!paths.length || new Set(paths).size !== paths.length || paths.some((file) =>
    !file.startsWith('archify/') || file.includes('\\') || file.split('/').some((part) => !part || part === '.' || part === '..'))) {
    throw new Error('Upstream archive must contain distinct portable files under archify/');
  }
  // Read entries to stdout, never extract a candidate's paths into a checkout.
  const readEntry = (file) => execFileSync('unzip', ['-p', archivePath, file], { maxBuffer: 16 * 1024 * 1024 });
  const runtimePackage = JSON.parse(readEntry('archify/package.json').toString('utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(runtimePackage.version)) throw new Error('Expected a stable upstream release version');
  const release = {
    upstreamRepository: 'https://github.com/tt-a1i/archify',
    upstreamVersion: runtimePackage.version,
    upstreamCommit: commit,
    archiveSha256: createHash('sha256').update(archive).digest('hex'),
    runtimeFiles: paths.length,
    patches: [],
  };
  const integrity = {
    algorithm: 'sha256',
    files: paths.map((file) => ({
      path: `vendor/${file}`,
      sha256: createHash('sha256').update(readEntry(file)).digest('hex'),
    })).sort((left, right) => left.path.localeCompare(right.path)),
  };
  if (mode === '--write') {
    writeFileSync(path.join(source, 'release.json'), `${JSON.stringify(release, null, 2)}\n`);
    writeFileSync(path.join(source, 'upstream-integrity.json'), `${JSON.stringify(integrity, null, 2)}\n`);
  }
  console.log(JSON.stringify({ written: mode === '--write', release, integrity }, null, 2));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

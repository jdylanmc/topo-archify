import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const runtimeDirectory = fileURLToPath(new URL('./runtime/', import.meta.url));
const packageDirectory = fileURLToPath(new URL('./', import.meta.url));

function inventory(directory, prefix = '') {
  if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) {
    throw new Error(`Archify integrity failure: unsupported file type at ${directory}`);
  }
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) return inventory(path.join(directory, entry.name), `${relative}/`);
    if (!entry.isFile()) throw new Error(`Archify integrity failure: unsupported file type at ${relative}`);
    return [relative];
  }).sort();
}

export function verifyRuntime(root = packageDirectory) {
  const release = JSON.parse(readFileSync(path.join(root, 'release.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(root, 'runtime-integrity.json'), 'utf8'));
  if (manifest.algorithm !== 'sha256' || !Array.isArray(manifest.files) ||
      manifest.files.length !== release.runtimeFiles ||
      !/^[a-f0-9]{40}$/.test(release.upstreamCommit) ||
      !/^[a-f0-9]{64}$/.test(release.archiveSha256) ||
      !/^\d+\.\d+\.\d+$/.test(release.upstreamVersion) ||
      manifest.files.some((entry) => typeof entry.path !== 'string' ||
        !/^[a-f0-9]{64}$/.test(entry.sha256))) {
    throw new Error('Invalid Archify integrity metadata');
  }
  const actual = inventory(path.join(root, 'runtime'));
  const expected = manifest.files.map((entry) => entry.path).sort();
  if (actual.length !== expected.length || actual.some((file, index) => file !== expected[index])) {
    throw new Error('Archify integrity failure: file inventory differs');
  }
  for (const entry of manifest.files) {
    const hash = createHash('sha256').update(readFileSync(path.join(root, 'runtime', entry.path))).digest('hex');
    if (hash !== entry.sha256) throw new Error(`Archify integrity failure: ${entry.path}`);
  }
  return Object.freeze({
    repo: 'github.com/tt-a1i/archify',
    revision: release.upstreamCommit,
    version: release.upstreamVersion,
    archiveSha256: release.archiveSha256,
    files: actual.length,
  });
}

export const cliPath = path.join(runtimeDirectory, 'bin/archify.mjs');
export const architectureRendererPath = path.join(runtimeDirectory, 'renderers/architecture/render-architecture.mjs');
export const outputCheckerPath = path.join(runtimeDirectory, 'scripts/check-render-output.mjs');

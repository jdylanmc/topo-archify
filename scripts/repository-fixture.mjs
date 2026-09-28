import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parseRepositoryRemote } from '../archify/renderers/shared/repository-location.mjs';

export function readRepositoryFixtureMetadata(root) {
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const origin = parseRepositoryRemote(git('remote', 'get-url', 'origin'));
  assert.ok(
    origin?.provider === 'github' && origin.endpoint === 'standard' &&
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(origin.path),
    'Repository evidence fixture requires a standard GitHub origin',
  );
  const revision = git('rev-parse', 'HEAD');
  assert.match(revision, /^[a-f0-9]{40}$/);
  return { url: `https://github.com/${origin.path}`, revision };
}

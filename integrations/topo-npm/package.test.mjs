import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnCliSync } from '../deepseek-harness/scripts/resolve-cli.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const run = (args, cwd, env = process.env) => execFileSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });

test('packed runtime installs cleanly, renders all families offline, and rejects drift', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'topo-archify-consumer-'));
  try {
    const packed = JSON.parse(run(['integrations/topo-npm/pack.mjs', temporary], repository));
    const candidate = JSON.parse(run(['integrations/topo-npm/update-pin.mjs', packed.upstream.revision], repository));
    assert.equal(candidate.written, false);
    assert.deepEqual(candidate.release, JSON.parse(readFileSync(path.join(repository, 'integrations/topo-npm/release.json'), 'utf8')));
    assert.deepEqual(candidate.integrity, JSON.parse(readFileSync(path.join(repository, 'integrations/topo-npm/upstream-integrity.json'), 'utf8')));
    assert.equal(packed.name, '@jdylanmc/topo-archify');
    assert.equal(packed.version, '0.1.0');
    assert.equal(packed.upstream.files, 104);
    const paths = packed.files.map((entry) => entry.path);
    assert.equal(paths.filter((file) => file.startsWith('runtime/')).length, 104);
    for (const required of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'index.js', 'index.d.ts', 'runtime/assets/JetBrainsMono-OFL.txt', 'runtime/assets/template.html']) {
      assert.ok(paths.includes(required), required);
    }
    assert.ok(paths.every((file) => /^(runtime\/|index\.(js|d\.ts)$|package\.json$|release\.json$|runtime-integrity\.json$|LICENSE$|THIRD_PARTY_NOTICES\.md$|README\.md$)/.test(file)));
    writeFileSync(path.join(temporary, 'package.json'), '{"private":true,"type":"module"}\n');
    const installed = spawnCliSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', packed.destination], { cwd: temporary, encoding: 'utf8' });
    assert.equal(installed.status, 0, installed.stderr);
    const modulePath = path.join(temporary, 'node_modules/@jdylanmc/topo-archify');
    const manifest = JSON.parse(readFileSync(path.join(modulePath, 'package.json'), 'utf8'));
    assert.equal(manifest.scripts, undefined);
    assert.equal(manifest.dependencies, undefined);
    const api = JSON.parse(run(['--input-type=module', '-e', `
      import * as api from '@jdylanmc/topo-archify';
      import { existsSync } from 'node:fs';
      for (const key of ['cliPath', 'architectureRendererPath', 'outputCheckerPath', 'runtimeDirectory']) {
        if (!existsSync(api[key])) throw new Error(key);
      }
      console.log(JSON.stringify({...api.verifyRuntime(), cli: api.cliPath, runtime: api.runtimeDirectory}));
    `], temporary));
    assert.equal(api.version, '3.0.0');
    assert.equal(api.revision, '9286c3b9c2cef359e98586b420d769d87bcb163f');
    assert.equal(readFileSync(path.join(modulePath, 'LICENSE'), 'utf8'), readFileSync(path.join(api.runtime, 'LICENSE'), 'utf8'));
    assert.equal(readFileSync(path.join(modulePath, 'THIRD_PARTY_NOTICES.md'), 'utf8'), readFileSync(path.join(api.runtime, 'THIRD_PARTY_NOTICES.md'), 'utf8'));
    const guard = path.join(temporary, 'no-network.mjs');
    writeFileSync(guard, `import http from 'node:http'; import https from 'node:https'; import net from 'node:net';
const denied = () => { throw new Error('Unexpected network access during rendering'); };
globalThis.fetch = denied; http.request = denied; http.get = denied; https.request = denied; https.get = denied; net.connect = denied;
`);
    const env = { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(guard).href}` };
    for (const [family, example] of Object.entries({
      architecture: 'web-app.architecture.json',
      workflow: 'agent-tool-call.workflow.json',
      sequence: 'cache-miss-request.sequence.json',
      dataflow: 'product-analytics.dataflow.json',
      lifecycle: 'agent-run.lifecycle.json',
    })) {
      const input = JSON.parse(readFileSync(path.join(api.runtime, 'examples', example), 'utf8'));
      input.meta.output = `${family}.html`;
      const file = path.join(temporary, `${family}.json`);
      const output = path.join(temporary, `${family}.html`);
      writeFileSync(file, JSON.stringify(input));
      run([api.cli, 'render', family, file, output, '--quality', 'standard'], temporary, env);
      run([api.cli, 'check', output], temporary, env);
      assert.match(readFileSync(output, 'utf8'), /<svg\b/);
    }
    const verify = () => run(['--input-type=module', '-e', "import {verifyRuntime} from '@jdylanmc/topo-archify'; verifyRuntime();"], temporary);
    const license = path.join(api.runtime, 'LICENSE');
    const original = readFileSync(license);
    writeFileSync(license, 'tampered');
    assert.throws(verify, /integrity failure/);
    writeFileSync(license, original);
    const extra = path.join(api.runtime, 'unexpected.txt');
    writeFileSync(extra, 'unexpected');
    assert.throws(verify, /file inventory differs/);
    rmSync(extra);
    rmSync(license);
    assert.throws(verify, /file inventory differs/);
    symlinkSync(path.join(modulePath, 'LICENSE'), license);
    assert.throws(verify, /unsupported file type/);
    assert.ok(!readFileSync(path.join(modulePath, 'index.js'), 'utf8').includes(repository));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

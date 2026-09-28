# @jdylanmc/topo-archify

Packaging-first downstream distribution of [Archify](https://github.com/tt-a1i/archify),
not an upstream-endorsed SDK. Node 22+, no dependencies, install hooks, downloads,
or model invocation. All 104 runtime files, fonts, templates, schemas and notices
are pristine upstream v3.0.0. Package version **0.1.0** is independent of upstream
version **3.0.0**. `release.json` records the commit and official ZIP hash;
`runtime-integrity.json` records every runtime byte.

```js
import { cliPath, verifyRuntime } from '@jdylanmc/topo-archify';
import { execFileSync } from 'node:child_process';
verifyRuntime(); // throws on changed/missing/extra files or symbolic links
execFileSync(process.execPath, [cliPath, 'render', 'architecture', 'diagram.json', 'diagram.html']);
```

The narrow API supplies `runtimeDirectory`, `cliPath`,
`architectureRendererPath`, `outputCheckerPath` and `verifyRuntime()`.
These are filesystem entrypoints for native execution, not a broad renderer
object API. Invoke the native CLI with `--help` for its contract. Keep v3
`meta.output` resolution inside an owned working directory. Rendering is local;
do not infer upstream `deliver`/`finalize` certification for adapted outputs.

## Build and regression

From the fork root, with Git, unzip, npm and Node 22+:

```sh
node integrations/topo-npm/pack.mjs dist
node --test integrations/topo-npm/package.test.mjs
```

The builder extracts the selected commit's official ZIP (already produced by
upstream's clean Skill stager), not the current fork runtime. It verifies the
committed ZIP hash and every extracted file against the original integration
inventory. No runtime is rewritten.
Untracked files and current upstream edits cannot enter the runtime. The test
installs the tarball in a disposable consumer, checks the public entrypoints,
all five native families, notices, inventory and tamper rejection.

The package test is **not** the complete upstream development suite. To test
upstream itself, use a separate checkout of the selected revision, then run
`cd archify && npm ci && npm test` and the browser/WebM gates declared there.
Current fork main is not evidence for the selected older revision.

## Updating and publishing

Topocode ships the context-loading `topo-archify-maintenance` skill. Load its
context before changing this integration. Update `release.json` and the reviewed
`upstream-integrity.json` only from a deliberate pristine upstream candidate;
run this package test and Topocode's full regression plus installed-package
consumer test. Record upstream release notes, byte provenance and visual results.
No generated runtime belongs in this Git repository.

Initial v3.0.1 adoption is **not** authorized by this package: it adds automatic
update-check/reminder behavior to deliver/finalize, requiring deliberate
local-first compatibility assessment. Do not mistake a patch number for
unchanged behavior.

Passing packaging patches and behavior-compatible upstream patches are eligible
for agent releases under the owner's policy. Minor/major upgrades, renderer
patches and changed contracts or behavior require human approval. No scheduler
or automatic publication runs here. After independent review and npm scope/access
verification, the release owner publishes the **tested tarball**:

```sh
npm publish dist/jdylanmc-topo-archify-0.1.0.tgz --access public
```

GitHub ownership does not establish npm ownership. First publication is a
separate authorized owner action. Retain upstream MIT, third-party, embedded font,
brand attribution and trademark notices verbatim.

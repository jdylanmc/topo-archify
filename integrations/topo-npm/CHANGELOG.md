# Changelog

Notable downstream distribution changes follow Keep a Changelog. npm package
versions are independent of the pinned upstream runtime version.

## Unreleased

### Added

- Add GitHub-hosted artifact verification and OIDC publication, plus an explicit
  first-package bootstrap using version/commit-bound tags and a step-local,
  UI-managed token. No local npm authentication or GitHub environment is needed.
- Package pristine upstream Archify 3.0.0 as `@jdylanmc/topo-archify` 0.1.0,
  with explicit provenance, complete runtime resources/notices, narrow filesystem
  entrypoints and integrity verification.
- Exercise clean tarball installation, all five native diagram families without
  network access, and fail-closed inventory/tamper checks in package CI.

### Changed

- Keep initial distribution on 3.0.0 despite upstream main's 3.0.1 movement;
  changed update-check behavior requires deliberate compatibility review.

### Fixed

- Pin distribution Actions to verified immutable commits. Preserve genuine
  fork repository evidence in Windows fixtures and validate upstream notifier
  assets against their actual upstream release, without altering renderer bytes.

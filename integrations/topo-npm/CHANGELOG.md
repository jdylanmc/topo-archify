# Changelog

Notable downstream distribution changes follow Keep a Changelog. npm package
versions are independent of the pinned upstream runtime version.

## Unreleased

### Added

- Add a main-only GitHub-hosted release workflow with artifact verification,
  protected-environment OIDC publishing and explicit npm trust prerequisites.
- Package pristine upstream Archify 3.0.0 as `@jdylanmc/topo-archify` 0.1.0,
  with explicit provenance, complete runtime resources/notices, narrow filesystem
  entrypoints and integrity verification.
- Exercise clean tarball installation, all five native diagram families without
  network access, and fail-closed inventory/tamper checks in package CI.

### Changed

- Keep initial distribution on 3.0.0 despite upstream main's 3.0.1 movement;
  changed update-check behavior requires deliberate compatibility review.

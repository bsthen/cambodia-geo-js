# Releasing & maintenance

## One-time setup

1. **GitHub environment.** Repo -> *Settings -> Environments -> New environment* named `npm`
   (optionally add yourself as *required reviewer* so every publish needs your approval).
2. **First publish, done by hand** (npm Trusted Publishing is configured in the *package's* settings, so the
   package has to exist first; check the current npm docs if this changes):
   ```bash
   npm login                       # opens the browser, 2FA required
   npm ci && npm test && npm run build
   npm publish --access public     # publishes version 1.0.0
   ```
3. **Enable Trusted Publishing.** npmjs.com -> package `cambodia-geo` -> *Settings* -> *Trusted Publisher* ->
   GitHub Actions: owner `bsthen`, repository `cambodia-geo-js`, workflow filename `publish.yml`,
   environment `npm`. From now on the workflow publishes without any stored token.
4. Push the repository to GitHub (the tag `v1.0.0` is created by hand once, or the first workflow run
   simply skips publishing because the version already exists on npm and creates the Release).

## Every release (code or data)

1. Edit `version` in `package.json` and add a section to `CHANGELOG.md`.
2. Commit and push to `main`. The **Publish to npm** workflow runs tests, builds, smoke-tests the tarball,
   publishes, and creates the tag `v<version>` plus a GitHub Release. If the version did not change,
   nothing is published.

## Yearly data refresh (the only routine task)

1. Download the new CSVs and put them in `data/` with their original names (e.g. `CambodiaProvinceList2026.csv`).
   Delete the old-year files. The year is detected from the file names.
2. `npm test`. `test/data.test.ts` catches duplicate codes and orphaned rows. If it fails because of a *new*
   upstream quirk, review it and update the known-quirk lists in that test, never the CSVs.
3. Regenerate the expected results: `pip install -U cambodia-geo` (the Python package must already carry the
   new year) then `python spec/generate_conformance.py`, and commit `spec/conformance.json`.
4. Bump the **MINOR** version (e.g. `1.0.0` -> `1.1.0`), update `CHANGELOG.md`, push to `main`.

## Rules that keep users safe from breaking changes

- Never remove or rename an export or a record field without a MAJOR bump. `test/public-api.test.ts` fails if you do.
- New options must be optional; new record fields go at the end.
- Behaviour changes must first be made in the Python package and `SPEC.md`, then ported (see `spec/`).
- Never re-publish a version. Fix forward with a PATCH release (`npm deprecate` a bad version).
- Dependabot keeps GitHub Actions and dev dependencies up to date. The package has no runtime dependencies.

# Changelog

All notable changes are documented here. The project follows [Semantic Versioning](https://semver.org/):
the **code/API** drives MAJOR.MINOR.PATCH, and every yearly data refresh is a **MINOR** release.
The dataset year is available at runtime as `DATA_YEAR`.

## [1.0.0] - 2026-10-19
### Added
- First stable release. Bundled MEF dataset: **2025**.
- `provinces()`, `districts()`, `communes()`, `villages()` list functions.
- `getProvince()`, `getDistrict()`, `getCommune()`, `getVillage()` single lookups.
- `search()` across all levels.
- Lookups accept codes, Khmer names or English names (case / space insensitive).
- `cambodia-geo/lite` entry point without villages (about 7x smaller).
- Immutable, typed records and `toDict()` (snake_case) for interoperability with the Python package.
- ESM + CommonJS builds with TypeScript types. Zero runtime dependencies. Node 20+.

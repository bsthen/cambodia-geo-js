# cambodia-geo

Lightweight, **zero-dependency** library for Cambodia's administrative divisions:
**provinces (ខេត្ត), districts (ស្រុក/ខណ្ឌ), communes (ឃុំ/សង្កាត់) and villages (ភូមិ)**.
Look things up by **code**, **Khmer name** or **English name**, in any mix. Written in TypeScript,
works in Node 20+, browsers, Deno, Bun and edge runtimes. Same behavior as the
[Python package](https://github.com/bsthen/cambodia-geo-python) (see [SPEC.md](SPEC.md)).

Data source: [data.mef.gov.kh](https://data.mef.gov.kh) (bundled dataset year: `DATA_YEAR`).

```bash
npm install cambodia-geo
```

## Quick start

```js
import { provinces, districts, communes, villages, getProvince, search } from 'cambodia-geo';

provinces();                                   // all provinces
districts('Siemreap');                         // districts of a province
communes('17', 'Angkor Thum');                 // communes of a district
villages('សៀមរាប', 1702, 'ជប់តាត្រាវ');          // villages of a commune

const p = getProvince('សៀមរាប');                // { code: '17', nameKh: 'សៀមរាប', nameEn: 'Siemreap' }
search('angkor', { level: 'district' });       // search names / codes, best matches first
```

CommonJS works too: `const kh = require('cambodia-geo');`. Records can be passed straight back in:

```js
for (const province of provinces()) {
  for (const district of districts(province)) { /* ... */ }
}
```

## API

| Function | Returns | Not found |
|---|---|---|
| `provinces()` | `Province[]` | - |
| `districts(province)` | `District[]` | `[]` |
| `communes(province, district)` | `Commune[]` | `[]` |
| `villages(province, district, commune)` | `Village[]` | `[]` |
| `getProvince(query)` | `Province` | `null` |
| `getDistrict(query, { province })` | `District` | `null` |
| `getCommune(query, { district, province })` | `Commune` | `null` |
| `getVillage(query, { commune, district, province })` | `Village` | `null` |
| `search(query, { level, limit })` | `GeoRecord[]` (default limit 50, `null` = no limit) | `[]` |
| `toDict(record)` | plain object with snake_case keys (`name_kh`, `province_code`, ...) | - |

Also `DATA_YEAR` (number) and `VERSION` (string). Records are frozen objects:

| Type | Fields |
|---|---|
| `Province` | `code, nameKh, nameEn` |
| `District` | `code, nameKh, nameEn, provinceCode` |
| `Commune` | `code, nameKh, nameEn, provinceCode, districtCode` |
| `Village` | `code, nameKh, nameEn, provinceCode, districtCode, communeCode` |

Codes are always **strings** (`"01"`); queries may also be numbers.

### Matching rules

- A *query* is a code (`"17"`, `17`, `"017"` and Khmer digits `"១៧"` are equal), a Khmer name or an English name.
- Names ignore case, spaces and `- ' . ,`: `"Siem Reap"` equals `"siemreap"`.
- With a parent (`province`, `district`, ...) the first match inside it is returned.
- **Without** a parent, a name must be unambiguous; if several places share it, `null` is returned instead of
  guessing. Codes are always safe to use alone.

## Bundle size

The data is bundled (no network, no `fs`), so it works everywhere.

| Entry | Contains | Size (minified source, gzip) |
|---|---|---|
| `cambodia-geo` | provinces, districts, communes, villages | about 1.2 MB, **~220 KB** gzip |
| `cambodia-geo/lite` | provinces, districts, communes (no `villages`, `getVillage`) | about 120 KB, **~30 KB** gzip |

For browser forms that don't need villages, import from `cambodia-geo/lite`. Data is parsed lazily on the
first call, and no work is done at import time. Without a bundler you can use a CDN, e.g.
`https://cdn.jsdelivr.net/npm/cambodia-geo/+esm`.

## Data notes

The bundled MEF files are shipped exactly as published (only re-encoded). The 2025 dataset contains a few quirks:

- Some village codes are shared by several villages of the same commune (e.g. `08120101`, and the placeholder `0506140-`).
  Listing functions return all of them; `getVillage(code)` without a parent returns `null` for these codes.
- Commune `120913` (Phnom Penh, district `1209`) has villages but is missing from the commune list, so
  `villages('12', '1209', '120913')` returns `[]`.

## Stability (no surprise breaking changes)

- [Semantic Versioning](https://semver.org/). Only names exported from `cambodia-geo` and `cambodia-geo/lite` are public.
- Within a major version, functions, parameters and record fields are never removed or renamed; new options are
  optional, new record fields are appended.
- Removals are announced as deprecations and in the changelog first.
- **Data updates** (once a year) ship as a MINOR release. Government reorganisations can change codes or names
  between years: pin the version (`"cambodia-geo": "~1.0.0"`) if you store codes long-term, and check `DATA_YEAR`.

## Data & licence

The code is MIT licensed. The bundled data comes from the Ministry of Economy and Finance
([data.mef.gov.kh](https://data.mef.gov.kh), [terms of use](https://data.mef.gov.kh/terms-of-use)), used with
attribution, and remains subject to its terms (see [NOTICE](NOTICE)). This project is not affiliated with or
endorsed by the Ministry of Economy and Finance.

## ភាសាខ្មែរ (សង្ខេប)

បណ្ណាល័យ JavaScript/TypeScript ស្រាល គ្មាន dependency សម្រាប់ស្វែងរក ខេត្ត ស្រុក ឃុំ ភូមិ នៃកម្ពុជា តាមលេខកូដ ឈ្មោះខ្មែរ ឬឈ្មោះអង់គ្លេស។
ដំឡើងដោយ `npm install cambodia-geo`។ ប្រើ `cambodia-geo/lite` បើមិនត្រូវការភូមិ (តូចជាងប្រហែល 7 ដង)។
ទិន្នន័យអាប់ដេតរៀងរាល់ឆ្នាំ (មើល `DATA_YEAR`)។

## Contributing

`npm ci && npm test`. See [RELEASING.md](RELEASING.md) and [SPEC.md](SPEC.md).

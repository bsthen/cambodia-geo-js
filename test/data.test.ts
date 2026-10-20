/**
 * Data checks every yearly CSV update must pass.
 *
 * The CSVs are published by MEF and bundled *unmodified*. The 2025 files contain a few upstream
 * quirks, listed below. The tests allow exactly those, so any NEW problem in a future dataset
 * fails the build and gets reviewed by a human (update the lists consciously).
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../scripts/csv.mjs';
import loadCommunes from '../src/generated/communes';
import loadDistricts from '../src/generated/districts';
import loadProvinces from '../src/generated/provinces';
import loadVillages from '../src/generated/villages';
import { codeKey } from '../src/normalize';

// Village codes shared by several villages of the same commune (incl. the placeholder "0506140-").
const KNOWN_SHARED_VILLAGE_CODES = new Set([
  '0506140-', '08120101', '08120301', '08120501', '12091101', '12091301', '12091701', '12091801',
]);
// Communes that have villages but are missing from the commune list.
const KNOWN_MISSING_COMMUNES = new Set(['12/1209/120913']);

const dataDir = path.join(import.meta.dirname, '..', 'data');
const csvRows = (prefix: string, parents: string[], level: string): string[][] => {
  const file = readdirSync(dataDir).find((f) => new RegExp(`^${prefix}\\d{4}\\.csv$`).test(f))!;
  const { records } = parseCsv(readFileSync(path.join(dataDir, file), 'utf8'));
  const cell = (r: Record<string, string>, c: string) => (r[c] ?? '').trim();
  return records
    .filter((r) => cell(r, `${level}_code`) !== '')
    .map((r) => [cell(r, `${level}_code`), cell(r, `${level}_kh`), cell(r, `${level}_en`), ...parents.map((p) => cell(r, p))]);
};

const LEVELS = [
  { load: loadProvinces, rows: csvRows('CambodiaProvinceList', [], 'province') },
  { load: loadDistricts, rows: csvRows('CambodiaDistrictList', ['province_code'], 'district') },
  { load: loadCommunes, rows: csvRows('CambodiaCommuneList', ['province_code', 'district_code'], 'commune') },
  {
    load: loadVillages,
    rows: csvRows('CambodiaVillagesList', ['province_code', 'district_code', 'commune_code'], 'village'),
  },
];

const pathOf = (row: string[], parents: number) =>
  [...row.slice(3, 3 + parents).map(codeKey), codeKey(row[0])];
const key = (p: string[]) => p.join('/');

describe('generated data', () => {
  it('matches the CSV files exactly (same rows, same order)', () => {
    for (const { load, rows } of LEVELS) {
      expect(rows.length).toBeGreaterThan(0);
      expect(load()).toEqual(rows);
    }
  });
});

describe('data integrity', () => {
  const [provinces, districts, communes, villages] = LEVELS.map((l) => l.load());

  it('has Khmer names and codes everywhere', () => {
    for (const rows of [provinces, districts, communes, villages]) {
      for (const row of rows) {
        expect(row[0]).not.toBe('');
        expect(row[1]).not.toBe('');
      }
    }
  });

  it('has unique province / district / commune codes', () => {
    for (const [rows, parents] of [[provinces, 0], [districts, 1], [communes, 2]] as const) {
      const keys = rows.map((r) => key(pathOf(r, parents)));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('only has the known village code collisions', () => {
    const counts = new Map<string, number>();
    for (const r of villages) counts.set(key(pathOf(r, 3)), (counts.get(key(pathOf(r, 3))) ?? 0) + 1);
    const colliding = villages.filter((r) => (counts.get(key(pathOf(r, 3))) ?? 0) > 1).map((r) => r[0]);
    expect(colliding.filter((c) => !KNOWN_SHARED_VILLAGE_CODES.has(c))).toEqual([]);
    const names = villages.map((r) => `${key(pathOf(r, 3))}|${r[1]}`);
    expect(new Set(names).size).toBe(names.length); // no exact duplicates
  });

  it('has no orphans except the known ones', () => {
    const provinceKeys = new Set(provinces.map((r) => key(pathOf(r, 0))));
    const districtKeys = new Set(districts.map((r) => key(pathOf(r, 1))));
    const communeKeys = new Set(communes.map((r) => key(pathOf(r, 2))));
    for (const r of districts) expect(provinceKeys.has(key(pathOf(r, 1).slice(0, 1)))).toBe(true);
    for (const r of communes) expect(districtKeys.has(key(pathOf(r, 2).slice(0, 2)))).toBe(true);
    const missing = new Set(villages.map((r) => key(pathOf(r, 3).slice(0, 3))).filter((k) => !communeKeys.has(k)));
    expect([...missing].filter((k) => !KNOWN_MISSING_COMMUNES.has(k))).toEqual([]);
  });
});

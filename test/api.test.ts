import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as kh from '../src/index';

describe('provinces and single lookups', () => {
  it('returns provinces', () => {
    const list = kh.provinces();
    expect(list.length).toBeGreaterThan(0);
    expect(Object.keys(list[0])).toEqual(['code', 'nameKh', 'nameEn']);
  });

  it('accepts code, Khmer name, English name, number, case/space/padding variants', () => {
    const byCode = kh.getProvince('17');
    expect(byCode).not.toBeNull();
    expect(kh.getProvince(17)).toBe(byCode);
    expect(kh.getProvince('សៀមរាប')).toBe(byCode);
    expect(kh.getProvince('Siemreap')).toBe(byCode);
    expect(kh.getProvince('  SIEM reap ')).toBe(byCode);
    expect(kh.getProvince('017')).toBe(byCode);
    expect(kh.getProvince('១៧')).toBe(byCode); // Khmer digits
    expect(kh.getProvince('01')).toBe(kh.getProvince(1));
  });

  it('returns null / [] for unknown or invalid input', () => {
    for (const bad of ['does-not-exist', '', '   ', '-', null, undefined, NaN, -1, 1.5, true, {}, [], 9999]) {
      expect(kh.getProvince(bad as never)).toBeNull();
    }
    expect(kh.districts('does-not-exist')).toEqual([]);
    expect(kh.communes('17', 'does-not-exist')).toEqual([]);
    expect(kh.villages('17', '1702', 'does-not-exist')).toEqual([]);
  });
});

describe('hierarchy', () => {
  it('lists districts, communes and villages with mixed query styles', () => {
    expect(kh.districts('Siemreap').map((d) => d.code)).toContain('1702');
    const communes = kh.communes('17', 'Angkor Thum');
    expect(communes.map((c) => c.code)).toContain('170201');
    expect(kh.communes('សៀមរាប', '1702')).toEqual(communes);

    const villages = kh.villages('17', '1702', 'ជប់តាត្រាវ');
    expect(villages.length).toBeGreaterThan(0);
    expect(villages.every((v) => v.communeCode === '170201')).toBe(true);
    expect(kh.villages('Siemreap', 'Angkor Thum', '170201')).toEqual(villages);
  });

  it('accepts records returned by the library', () => {
    const province = kh.getProvince('17')!;
    const district = kh.getDistrict('1702')!;
    const commune = kh.communes(province, district)[0];
    expect(kh.villages(province, district, commune)).toEqual(kh.villages(province.code, district.code, commune.code));
  });

  it('rejects a record of the wrong level', () => {
    const district = kh.getDistrict('1702')!;
    expect(kh.getProvince(district)).toBeNull();
    expect(kh.districts(district)).toEqual([]);
  });

  it('getDistrict: scoped and unscoped', () => {
    const d = kh.getDistrict('1702')!;
    expect(d.provinceCode).toBe('17');
    expect(d.nameEn).toBe('Angkor Thum');
    expect(kh.getDistrict('Angkor Thum', { province: 'Siemreap' })).toBe(d);
    expect(kh.getDistrict('1702', { province: 'does-not-exist' })).toBeNull();
    expect(kh.getDistrict('1702', { province: '12' })).toBeNull();
  });

  it('getCommune and getVillage', () => {
    const c = kh.getCommune('170201')!;
    expect(c.districtCode).toBe('1702');
    expect(kh.getCommune('ជប់តាត្រាវ', { district: 'Angkor Thum', province: '17' })).toBe(c);
    expect(kh.getCommune('ជប់តាត្រាវ', { province: '17' })).toBe(c); // skipping a level is fine

    const v = kh.villages('17', '1702', '170201')[0];
    expect(kh.getVillage(v.code)).toBe(v);
    expect(kh.getVillage(v.nameKh, { commune: '170201', district: '1702', province: '17' })).toBe(v);
  });
});

describe('search', () => {
  it('orders exact matches first and respects limits', () => {
    const hits = kh.search('Siemreap');
    expect(hits[0]).toBe(kh.getProvince('17'));
    expect(kh.search('Siemreap', { limit: 1 })).toEqual(hits.slice(0, 1));
    expect(kh.search('Siemreap', { limit: 0 })).toEqual([]);
    expect(kh.search('')).toEqual([]);
    expect(kh.search('angkor', { level: 'district', limit: null }).length).toBeGreaterThan(1);
    expect(kh.search('a', { limit: null }).length).toBeGreaterThan(50);
    expect(kh.search('a').length).toBe(50);
  });

  it('validates its options', () => {
    expect(() => kh.search('x', { level: 'country' as never })).toThrow(RangeError);
    expect(() => kh.search('x', { limit: -1 })).toThrow(RangeError);
  });
});

describe('data safety', () => {
  it('returns independent lists', () => {
    const first = kh.provinces();
    first.length = 0;
    expect(kh.provinces().length).toBeGreaterThan(0);
  });

  it('returns frozen records', () => {
    const p = kh.getProvince('17')!;
    expect(Object.isFrozen(p)).toBe(true);
    expect(() => {
      (p as { code: string }).code = '00';
    }).toThrow(TypeError);
  });

  it('toDict returns snake_case keys', () => {
    const v = kh.villages('17', '1702', '170201')[0];
    expect(Object.keys(kh.toDict(v))).toEqual([
      'code', 'name_kh', 'name_en', 'province_code', 'district_code', 'commune_code',
    ]);
    expect(JSON.parse(JSON.stringify(kh.toDict(v)))).toEqual(kh.toDict(v));
  });
});

describe('metadata', () => {
  it('exposes DATA_YEAR and VERSION', () => {
    expect(Number.isInteger(kh.DATA_YEAR)).toBe(true);
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(kh.VERSION).toBe(pkg.version);
  });
});

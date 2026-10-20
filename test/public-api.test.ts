/**
 * Guards against accidental breaking changes. If one of these fails you are changing the public
 * API: removing or renaming something requires a MAJOR version bump (see README: Stability).
 * Adding new names is fine: extend the lists below in the same commit.
 */
import { describe, expect, it } from 'vitest';
import * as full from '../src/index';
import * as lite from '../src/lite';

const FULL = [
  'DATA_YEAR', 'VERSION', 'communes', 'districts', 'getCommune', 'getDistrict',
  'getProvince', 'getVillage', 'provinces', 'search', 'toDict', 'villages',
];
const LITE = FULL.filter((n) => n !== 'villages' && n !== 'getVillage');
const ARITY: Record<string, number> = {
  provinces: 0, districts: 1, communes: 2, villages: 3,
  getProvince: 1, getDistrict: 1, getCommune: 1, getVillage: 1, search: 1,
};

describe('public API', () => {
  it('does not lose exports', () => {
    expect(Object.keys(full)).toEqual(expect.arrayContaining(FULL));
    expect(Object.keys(lite)).toEqual(expect.arrayContaining(LITE));
  });

  it('keeps required parameter counts', () => {
    for (const [name, arity] of Object.entries(ARITY)) {
      expect((full as unknown as Record<string, { length: number }>)[name].length).toBe(arity);
    }
  });

  it('keeps record fields and their order', () => {
    expect(Object.keys(full.getProvince('17')!)).toEqual(['code', 'nameKh', 'nameEn']);
    expect(Object.keys(full.getDistrict('1702')!)).toEqual(['code', 'nameKh', 'nameEn', 'provinceCode']);
    expect(Object.keys(full.getCommune('170201')!)).toEqual([
      'code', 'nameKh', 'nameEn', 'provinceCode', 'districtCode',
    ]);
    expect(Object.keys(full.villages('17', '1702', '170201')[0])).toEqual([
      'code', 'nameKh', 'nameEn', 'provinceCode', 'districtCode', 'communeCode',
    ]);
  });
});

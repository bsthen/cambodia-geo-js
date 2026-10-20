import { describe, expect, it } from 'vitest';
import * as lite from '../src/lite';
import { levelOf } from '../src/core';

describe('cambodia-geo/lite', () => {
  it('has no village functions', () => {
    expect('villages' in lite).toBe(false);
    expect('getVillage' in lite).toBe(false);
  });

  it('works for provinces, districts and communes', () => {
    expect(lite.getProvince('សៀមរាប')?.code).toBe('17');
    expect(lite.districts('17').length).toBeGreaterThan(0);
    expect(lite.getCommune('170201')?.nameKh).toBe('ជប់តាត្រាវ');
  });

  it('never returns villages from search', () => {
    const all = lite.search('a', { limit: null });
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((r) => levelOf(r) === 'village')).toBe(false);
  });
});

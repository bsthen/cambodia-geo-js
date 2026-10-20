/**
 * cambodia-geo/lite: provinces, districts and communes only (no villages).
 * About 7x smaller than the full package, meant for browser forms.
 */
import loadCommunes from './generated/communes';
import loadDistricts from './generated/districts';
import loadProvinces from './generated/provinces';
import { DATA_YEAR, VERSION } from './generated/meta';
import { createGeo, toDict } from './core';
import type { LiteRecord, LiteSearchOptions } from './types';

const geo = createGeo({
  provinces: loadProvinces,
  districts: loadDistricts,
  communes: loadCommunes,
  villages: () => [],
});

export const provinces = geo.provinces;
export const districts = geo.districts;
export const communes = geo.communes;
export const getProvince = geo.getProvince;
export const getDistrict = geo.getDistrict;
export const getCommune = geo.getCommune;
export function search(query: string | number, options: LiteSearchOptions = {}): LiteRecord[] {
  return geo.search(query, options) as LiteRecord[];
}
export { DATA_YEAR, VERSION, toDict };

export type {
  Commune,
  District,
  LiteLevel,
  LiteRecord,
  LiteSearchOptions,
  Province,
  Query,
} from './types';

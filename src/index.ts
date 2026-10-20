/**
 * cambodia-geo: Cambodia's provinces, districts, communes and villages.
 *
 *   import { provinces, districts, getProvince } from 'cambodia-geo';
 *   districts('Siemreap');            // code, Khmer or English name
 *
 * Only the names exported here are public API and follow semantic versioning.
 */
import loadCommunes from './generated/communes';
import loadDistricts from './generated/districts';
import loadProvinces from './generated/provinces';
import loadVillages from './generated/villages';
import { DATA_YEAR, VERSION } from './generated/meta';
import { createGeo, toDict } from './core';

const geo = createGeo({
  provinces: loadProvinces,
  districts: loadDistricts,
  communes: loadCommunes,
  villages: loadVillages,
});

export const provinces = geo.provinces;
export const districts = geo.districts;
export const communes = geo.communes;
export const villages = geo.villages;
export const getProvince = geo.getProvince;
export const getDistrict = geo.getDistrict;
export const getCommune = geo.getCommune;
export const getVillage = geo.getVillage;
export const search = geo.search;
export { DATA_YEAR, VERSION, toDict };

export type {
  Commune,
  District,
  GeoRecord,
  Level,
  Province,
  Query,
  SearchOptions,
  Village,
} from './types';

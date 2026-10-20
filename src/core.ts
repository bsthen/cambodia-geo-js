import { codeKey, norm } from './normalize';
import type { Commune, District, GeoRecord, Level, Province, Query, SearchOptions, Village } from './types';

export const LEVELS: readonly Level[] = ['province', 'district', 'commune', 'village'];

type Row = ReadonlyArray<string>;

/** Data loaders, one per level. Row layout: [code, nameKh, nameEn, ...parent codes]. */
export interface GeoData {
  provinces: () => ReadonlyArray<Row>;
  districts: () => ReadonlyArray<Row>;
  communes: () => ReadonlyArray<Row>;
  villages: () => ReadonlyArray<Row>;
}

const DATA_KEY: Record<Level, keyof GeoData> = {
  province: 'provinces',
  district: 'districts',
  commune: 'communes',
  village: 'villages',
};

// Fields (besides code / nameKh / nameEn) that point at the ancestors, in row order.
const PARENT_FIELDS: Record<Level, readonly string[]> = {
  province: [],
  district: ['provinceCode'],
  commune: ['provinceCode', 'districtCode'],
  village: ['provinceCode', 'districtCode', 'communeCode'],
};

const SNAKE: Record<string, string> = {
  code: 'code',
  nameKh: 'name_kh',
  nameEn: 'name_en',
  provinceCode: 'province_code',
  districtCode: 'district_code',
  communeCode: 'commune_code',
};

interface Entry {
  record: GeoRecord;
  path: readonly string[]; // canonical codes: ancestors..., own code
  codeKey: string;
  kh: string; // normalised Khmer name
  en: string; // normalised English name
}

interface Index {
  entries: Record<Level, Entry[]>;
  byCode: Record<Level, Map<string, Entry[]>>;
  byName: Record<Level, Map<string, Entry[]>>;
  children: Record<Level, Map<string, Entry[]>>;
}

const pathKey = (path: readonly string[]): string => path.join('/');

function push(map: Map<string, Entry[]>, key: string, entry: Entry): void {
  const list = map.get(key);
  if (list) list.push(entry);
  else map.set(key, [entry]);
}

/** Which level a record belongs to, or `null` if the value is not a record. */
export function levelOf(value: unknown): Level | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.code !== 'string') return null;
  if ('communeCode' in v) return 'village';
  if ('districtCode' in v) return 'commune';
  if ('provinceCode' in v) return 'district';
  return 'province';
}

function pathOf(record: GeoRecord): string[] {
  const level = levelOf(record) as Level;
  const bag = record as unknown as Record<string, string>;
  return [...PARENT_FIELDS[level].map((f) => codeKey(bag[f])), codeKey(record.code)];
}

function makeRecord(level: Level, row: Row): GeoRecord {
  const record: Record<string, string> = { code: row[0] ?? '', nameKh: row[1] ?? '', nameEn: row[2] ?? '' };
  PARENT_FIELDS[level].forEach((field, i) => {
    record[field] = row[3 + i] ?? '';
  });
  return Object.freeze(record) as unknown as GeoRecord;
}

function buildIndex(data: GeoData): Index {
  const entries = {} as Record<Level, Entry[]>;
  const byCode = {} as Record<Level, Map<string, Entry[]>>;
  const byName = {} as Record<Level, Map<string, Entry[]>>;
  const children = {} as Record<Level, Map<string, Entry[]>>;

  for (const level of LEVELS) {
    const items: Entry[] = [];
    const codes = new Map<string, Entry[]>();
    const names = new Map<string, Entry[]>();
    const kids = new Map<string, Entry[]>();
    for (const row of data[DATA_KEY[level]]()) {
      const record = makeRecord(level, row);
      if (!record.code) continue; // skip blank / malformed lines
      const path = pathOf(record);
      const entry: Entry = {
        record,
        path,
        codeKey: path[path.length - 1],
        kh: norm(record.nameKh),
        en: norm(record.nameEn),
      };
      items.push(entry);
      push(codes, entry.codeKey, entry);
      for (const name of new Set([entry.kh, entry.en])) if (name) push(names, name, entry);
      push(kids, pathKey(path.slice(0, -1)), entry);
    }
    entries[level] = items;
    byCode[level] = codes;
    byName[level] = names;
    children[level] = kids;
  }
  return { entries, byCode, byName, children };
}

/** Converts a record to a plain object with snake_case keys (the names used by the other languages). */
export function toDict(record: GeoRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) out[SNAKE[key] ?? key] = value as string;
  return out;
}

/** Builds the lookup API on top of a data source. Used by the package entry points. */
export function createGeo(data: GeoData) {
  let index: Index | undefined;
  const getIndex = (): Index => (index ??= buildIndex(data));

  /** Entries of `level` that live somewhere below `scope`. */
  function pool(level: Level, scope: GeoRecord): Entry[] {
    const idx = getIndex();
    const scopePath = pathOf(scope);
    const scopeLevel = levelOf(scope) as Level;
    if (LEVELS.indexOf(scopeLevel) + 1 === LEVELS.indexOf(level)) {
      return idx.children[level].get(pathKey(scopePath)) ?? [];
    }
    return idx.entries[level].filter((e) => scopePath.every((code, i) => e.path[i] === code));
  }

  /**
   * Finds one record of `level` by code / Khmer name / English name.
   * Without a scope a match must be unambiguous, otherwise `null` is returned.
   */
  function resolve(level: Level, query: unknown, scope?: GeoRecord | null): GeoRecord | null {
    if (typeof query === 'object' && query !== null) {
      return levelOf(query) === level ? (query as GeoRecord) : null;
    }
    let text: string;
    if (typeof query === 'string') text = query.trim();
    else if (typeof query === 'number' && Number.isSafeInteger(query) && query >= 0) text = String(query);
    else return null;

    const nameKey = norm(text);
    if (!nameKey) return null;
    const code = codeKey(text);

    if (!scope) {
      const idx = getIndex();
      for (const [table, key] of [
        [idx.byCode[level], code],
        [idx.byName[level], nameKey],
      ] as const) {
        const hits = table.get(key);
        if (hits && hits.length > 0) return hits.length === 1 ? hits[0].record : null;
      }
      return null;
    }

    for (const entry of pool(level, scope)) {
      if (entry.codeKey === code || entry.kh === nameKey || entry.en === nameKey) return entry.record;
    }
    return null;
  }

  /** Resolves the given ancestors in order. `ok` is false if one of them was given but not found. */
  function scopeOf(province?: Query | null, district?: Query | null, commune?: Query | null) {
    let scope: GeoRecord | null = null;
    const steps: Array<[Level, Query | null | undefined]> = [
      ['province', province],
      ['district', district],
      ['commune', commune],
    ];
    for (const [level, query] of steps) {
      if (query === undefined || query === null) continue;
      scope = resolve(level, query, scope);
      if (scope === null) return { ok: false as const, scope: null };
    }
    return { ok: true as const, scope };
  }

  function childrenOf<T extends GeoRecord>(level: Level, parent: GeoRecord): T[] {
    const list = getIndex().children[level].get(pathKey(pathOf(parent))) ?? [];
    return list.map((e) => e.record as T);
  }

  function provinces(): Province[] {
    return getIndex().entries.province.map((e) => e.record as Province);
  }

  function districts(province: Query): District[] {
    const p = resolve('province', province);
    return p === null ? [] : childrenOf<District>('district', p);
  }

  function communes(province: Query, district: Query): Commune[] {
    const p = resolve('province', province);
    if (p === null) return [];
    const d = resolve('district', district, p);
    return d === null ? [] : childrenOf<Commune>('commune', d);
  }

  function villages(province: Query, district: Query, commune: Query): Village[] {
    const p = resolve('province', province);
    if (p === null) return [];
    const d = resolve('district', district, p);
    if (d === null) return [];
    const c = resolve('commune', commune, d);
    return c === null ? [] : childrenOf<Village>('village', c);
  }

  function getProvince(query: Query): Province | null {
    return resolve('province', query) as Province | null;
  }

  function getDistrict(query: Query, options: { province?: Query | null } = {}): District | null {
    const s = scopeOf(options.province);
    return s.ok ? (resolve('district', query, s.scope) as District | null) : null;
  }

  function getCommune(
    query: Query,
    options: { district?: Query | null; province?: Query | null } = {},
  ): Commune | null {
    const s = scopeOf(options.province, options.district);
    return s.ok ? (resolve('commune', query, s.scope) as Commune | null) : null;
  }

  function getVillage(
    query: Query,
    options: { commune?: Query | null; district?: Query | null; province?: Query | null } = {},
  ): Village | null {
    const s = scopeOf(options.province, options.district, options.commune);
    return s.ok ? (resolve('village', query, s.scope) as Village | null) : null;
  }

  /**
   * Searches names (Khmer / English) and codes. Results: exact matches first, then prefix matches,
   * then substring matches; ties are ordered province -> village, then by data order.
   */
  function search(query: string | number, options: SearchOptions = {}): GeoRecord[] {
    const level = options.level ?? null;
    const limit = options.limit === undefined ? 50 : options.limit;
    if (level !== null && !LEVELS.includes(level)) {
      throw new RangeError(`level must be one of ${LEVELS.join(', ')} or null, got ${String(level)}`);
    }
    if (limit !== null && !(limit >= 0)) throw new RangeError('limit must be >= 0 or null');

    let text: string;
    if (typeof query === 'string') text = query.trim();
    else if (typeof query === 'number' && Number.isSafeInteger(query) && query >= 0) text = String(query);
    else return [];
    const nameKey = norm(text);
    if (!nameKey) return [];
    const code = codeKey(text);

    const idx = getIndex();
    const scored: Array<[number, number, number, GeoRecord]> = [];
    (level === null ? LEVELS : [level]).forEach((lv, levelPos) => {
      idx.entries[lv].forEach((e, pos) => {
        let rank: number;
        if (e.codeKey === code || nameKey === e.kh || nameKey === e.en) rank = 0;
        else if (e.kh.startsWith(nameKey) || e.en.startsWith(nameKey)) rank = 1;
        else if (e.kh.includes(nameKey) || e.en.includes(nameKey)) rank = 2;
        else return;
        scored.push([rank, levelPos, pos, e.record]);
      });
    });
    scored.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const found = scored.map((t) => t[3]);
    return limit === null ? found : found.slice(0, limit);
  }

  return { provinces, districts, communes, villages, getProvince, getDistrict, getCommune, getVillage, search };
}

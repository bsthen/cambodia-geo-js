/** The four administrative levels, from largest to smallest. */
export type Level = 'province' | 'district' | 'commune' | 'village';

/** ខេត្ត / រាជធានី */
export interface Province {
  readonly code: string;
  readonly nameKh: string;
  readonly nameEn: string;
}

/** ស្រុក / ខណ្ឌ / ក្រុង */
export interface District {
  readonly code: string;
  readonly nameKh: string;
  readonly nameEn: string;
  readonly provinceCode: string;
}

/** ឃុំ / សង្កាត់ */
export interface Commune {
  readonly code: string;
  readonly nameKh: string;
  readonly nameEn: string;
  readonly provinceCode: string;
  readonly districtCode: string;
}

/** ភូមិ */
export interface Village {
  readonly code: string;
  readonly nameKh: string;
  readonly nameEn: string;
  readonly provinceCode: string;
  readonly districtCode: string;
  readonly communeCode: string;
}

export type GeoRecord = Province | District | Commune | Village;

/** A code (`"17"` or `17`), a Khmer name, an English name, or a record returned by this library. */
export type Query = string | number | GeoRecord;

export interface SearchOptions {
  /** Restrict the search to one level. */
  level?: Level | null;
  /** Maximum number of results (default 50). `null` means no limit. */
  limit?: number | null;
}

/** Levels available in the `cambodia-geo/lite` entry point (no villages). */
export type LiteLevel = Exclude<Level, 'village'>;
export type LiteRecord = Province | District | Commune;
export interface LiteSearchOptions {
  level?: LiteLevel | null;
  limit?: number | null;
}

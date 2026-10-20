// Characters ignored when matching names: zero-width characters, hyphen, apostrophes, dot, comma.
const IGNORED = /[\u200b\u200c\u200d\u2060\ufeff\-'\u2019.,]/g;

/** Case-, space- and punctuation-insensitive form used for name matching. */
export function norm(text: unknown): string {
  return String(text).normalize('NFC').replace(/\s+/g, '').replace(IGNORED, '').toLowerCase();
}

/** ASCII digits for a string made only of ASCII or Khmer digits, otherwise `null`. */
function asciiDigits(value: string): string | null {
  let out = '';
  for (const ch of value) {
    const cp = ch.codePointAt(0) as number;
    if (cp >= 0x30 && cp <= 0x39) out += ch;
    else if (cp >= 0x17e0 && cp <= 0x17e9) out += String(cp - 0x17e0); // Khmer digits ០-៩
    else return null;
  }
  return out;
}

/** Canonical form of a code: '01', '1', ' 1 ' and '០១' all become '1'. */
export function codeKey(code: unknown): string {
  const text = String(code).trim();
  if (text.length > 0 && text.length <= 32) {
    const digits = asciiDigits(text);
    if (digits !== null) return digits.replace(/^0+(?=\d)/, '');
  }
  return norm(text);
}

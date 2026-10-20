/**
 * Minimal RFC 4180 CSV parser (no dependencies).
 * Handles a UTF-8 BOM, quoted fields, escaped quotes ("") and CRLF / LF line endings.
 *
 * @param {string} text
 * @returns {{ header: string[], records: Record<string, string>[] }}
 */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
    } else if (ch === '"') {
      inQuotes = true;
      i += 1;
    } else if (ch === ',') {
      endField();
      i += 1;
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1;
      endRow();
      i += 1;
    } else if (ch === '\n') {
      endRow();
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }
  if (field !== '' || row.length > 0) endRow();

  const header = (rows.shift() ?? []).map((h) => h.trim());
  const records = rows
    .filter((r) => !(r.length === 1 && r[0] === '')) // skip blank lines
    .map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ''])));
  return { header, records };
}

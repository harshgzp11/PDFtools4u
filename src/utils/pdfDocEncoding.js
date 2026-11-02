/**
 * ISO 32000-1:2008 Annex D Table D.1 — PDFDocEncoding Mapping Table
 * Implements standard bidirectional mapping between Unicode and PDFDocEncoding
 * for legacy PDF encryption revisions (R2: RC4 40-bit, R3: RC4 128-bit, R4: AES-128).
 */

// Mapping of Unicode code points that differ from Latin-1 (ISO-8859-1)
const UNICODE_TO_PDFDOC = new Map([
  [0x02D8, 0x18], // BREVE
  [0x02C7, 0x19], // CARON
  [0x02C6, 0x1A], // MODIFIER LETTER CIRCUMFLEX ACCENT
  [0x02D9, 0x1B], // DOT ABOVE
  [0x02DD, 0x1C], // DOUBLE ACUTE ACCENT
  [0x02DB, 0x1D], // OGONEK
  [0x02DA, 0x1E], // RING ABOVE
  [0x02DC, 0x1F], // SMALL TILDE
  [0x2022, 0x80], // BULLET
  [0x2020, 0x81], // DAGGER
  [0x2021, 0x82], // DOUBLE DAGGER
  [0x2026, 0x83], // HORIZONTAL ELLIPSIS
  [0x2014, 0x84], // EM DASH
  [0x2013, 0x85], // EN DASH
  [0x0192, 0x86], // LATIN SMALL LETTER F WITH HOOK
  [0x2044, 0x87], // FRACTION SLASH
  [0x2039, 0x88], // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
  [0x203A, 0x89], // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
  [0x2212, 0x8A], // MINUS SIGN
  [0x2030, 0x8B], // PER MILLE SIGN
  [0x201E, 0x8C], // DOUBLE LOW-9 QUOTATION MARK
  [0x201C, 0x8D], // LEFT DOUBLE QUOTATION MARK
  [0x201D, 0x8E], // RIGHT DOUBLE QUOTATION MARK
  [0x2018, 0x8F], // LEFT SINGLE QUOTATION MARK
  [0x2019, 0x90], // RIGHT SINGLE QUOTATION MARK
  [0x201A, 0x91], // SINGLE LOW-9 QUOTATION MARK
  [0x2122, 0x92], // TRADE MARK SIGN
  [0xFB01, 0x93], // LATIN SMALL LIGATURE FI
  [0xFB02, 0x94], // LATIN SMALL LIGATURE FL
  [0x0141, 0x95], // LATIN CAPITAL LETTER L WITH STROKE
  [0x0152, 0x96], // LATIN CAPITAL LIGATURE OE
  [0x0160, 0x97], // LATIN CAPITAL LETTER S WITH CARON
  [0x0178, 0x98], // LATIN CAPITAL LETTER Y WITH DIAERESIS
  [0x017D, 0x99], // LATIN CAPITAL LETTER Z WITH CARON
  [0x0131, 0x9A], // LATIN SMALL LETTER DOTLESS I
  [0x0142, 0x9B], // LATIN SMALL LETTER L WITH STROKE
  [0x0153, 0x9C], // LATIN SMALL LIGATURE OE
  [0x0161, 0x9D], // LATIN SMALL LETTER S WITH CARON
  [0x017E, 0x9E], // LATIN SMALL LETTER Z WITH CARON
  [0x20AC, 0xA0]  // EURO SIGN
]);

/**
 * Checks whether a string contains any character requiring PDFDocEncoding mapping.
 * @param {string} str
 * @returns {boolean}
 */
export function hasPdfDocEncodingMapping(str) {
  if (typeof str !== 'string') return false;
  for (const char of str) {
    const cp = char.codePointAt(0);
    if (UNICODE_TO_PDFDOC.has(cp)) return true;
  }
  return false;
}

/**
 * Encodes a JavaScript Unicode string into a single-byte string compatible with
 * @cantoo/pdf-lib and standard ISO 32000-1 Annex D PDFDocEncoding.
 * Characters in Latin-1 (<= 0xFF) remain as-is, while PDFDocEncoding special characters
 * (Euro, Bullet, Dagger, Dashes, etc.) are converted to their respective single-byte values.
 *
 * @param {string} str
 * @returns {{ encoded: string, isFullyRepresentable: boolean, unrepresentableChars: string[] }}
 */
export function encodeToPdfDocEncoding(str) {
  if (typeof str !== 'string') {
    return { encoded: '', isFullyRepresentable: true, unrepresentableChars: [] };
  }

  let encoded = '';
  let isFullyRepresentable = true;
  const unrepresentableChars = [];

  for (const char of str) {
    const cp = char.codePointAt(0);

    // 1. Direct PDFDocEncoding special character mapping (Table D.1 differences)
    if (UNICODE_TO_PDFDOC.has(cp)) {
      encoded += String.fromCharCode(UNICODE_TO_PDFDOC.get(cp));
    }
    // 2. Standard ASCII and Latin-1 ranges defined in Table D.1
    else if (cp >= 0x20 && cp <= 0x7E) {
      encoded += char;
    } else if (cp >= 0xA1 && cp <= 0xFF) {
      encoded += char;
    } else if (cp >= 0x00 && cp <= 0x17) {
      // Control codes
      encoded += char;
    } else {
      // Character is not representable in PDFDocEncoding
      isFullyRepresentable = false;
      if (!unrepresentableChars.includes(char)) {
        unrepresentableChars.push(char);
      }
      // Pass char code lower 8 bits as fallback
      encoded += String.fromCharCode(cp & 0xFF);
    }
  }

  return { encoded, isFullyRepresentable, unrepresentableChars };
}


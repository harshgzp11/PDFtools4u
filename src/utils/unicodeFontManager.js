// In-memory cache for base64 font data
let cachedDejaVuBase64 = null;
let cachedDevanagariBase64 = null;

const HAS_DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const NEEDS_UNICODE_REGEX = /[^\x20-\x7E\t\r\n]/;

/**
 * Loads font buffer as Base64 string either from browser fetch or Node.js fs.
 */
async function loadFontAsBase64(fontName) {
  if (fontName === 'DejaVuSans.ttf' && cachedDejaVuBase64) return cachedDejaVuBase64;
  if (fontName === 'NotoSansDevanagari.ttf' && cachedDevanagariBase64) return cachedDevanagariBase64;

  try {
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const response = await fetch(`/fonts/${fontName}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize));
      }
      const b64 = btoa(binary);
      if (fontName === 'DejaVuSans.ttf') cachedDejaVuBase64 = b64;
      if (fontName === 'NotoSansDevanagari.ttf') cachedDevanagariBase64 = b64;
      return b64;
    } else {
      // Node.js environment
      const fs = await (new Function('return import("fs")'))();
      const path = await (new Function('return import("path")'))();
      const fontPath = path.resolve(process.cwd(), 'public', 'fonts', fontName);
      if (fs.existsSync(fontPath)) {
        const buffer = fs.readFileSync(fontPath);
        const b64 = buffer.toString('base64');
        if (fontName === 'DejaVuSans.ttf') cachedDejaVuBase64 = b64;
        if (fontName === 'NotoSansDevanagari.ttf') cachedDevanagariBase64 = b64;
        return b64;
      }
    }
  } catch (err) {
    console.warn(`Could not load font ${fontName}:`, err);
  }
  return null;
}

/**
 * Registers appropriate Unicode TrueType fonts with jsPDF document instance.
 * @param {import('jspdf').jsPDF} doc
 * @param {string} fullText
 * @returns {Promise<{ primaryFont: string, hasDevanagari: boolean }>}
 */
export async function ensureUnicodeFonts(doc, fullText = '') {
  const needsDevanagari = HAS_DEVANAGARI_REGEX.test(fullText);
  const needsUnicode = NEEDS_UNICODE_REGEX.test(fullText);

  // If text is purely ASCII, standard helvetica is fine
  if (!needsUnicode && !needsDevanagari) {
    return { primaryFont: 'helvetica', hasDevanagari: false };
  }

  let primaryFont = 'helvetica';
  const dejavuB64 = await loadFontAsBase64('DejaVuSans.ttf');
  if (dejavuB64) {
    try {
      doc.addFileToVFS('DejaVuSans.ttf', dejavuB64);
      doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
      primaryFont = 'DejaVuSans';
    } catch {
      // Font might already be registered in this document
      primaryFont = 'DejaVuSans';
    }
  }

  let hasDevanagari = false;
  if (needsDevanagari) {
    const devanagariB64 = await loadFontAsBase64('NotoSansDevanagari.ttf');
    if (devanagariB64) {
      try {
        doc.addFileToVFS('NotoSansDevanagari.ttf', devanagariB64);
        doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'normal');
        hasDevanagari = true;
      } catch {
        hasDevanagari = true;
      }
    }
  }

  return { primaryFont, hasDevanagari };
}

/**
 * Determines which font to use for a given string.
 */
export function getFontForString(str, fontInfo) {
  if (fontInfo?.hasDevanagari && HAS_DEVANAGARI_REGEX.test(str)) {
    return 'NotoSansDevanagari';
  }
  return fontInfo?.primaryFont || 'helvetica';
}

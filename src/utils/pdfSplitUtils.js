/**
 * Helper utilities for Split PDF:
 * - Default range calculation
 * - Safe filename sanitization
 * - Strict range parsing and validation
 * - Page set to compressed range string formatting
 */

/**
 * Calculates a balanced, non-overlapping default range string for any page count.
 * Guaranteed: every page appears exactly once, no duplicates, no omissions.
 * 
 * 1 -> '1'
 * 2 -> '1, 2'
 * 3 -> '1-2, 3'
 * 4 -> '1-2, 3-4'
 * 5 -> '1-2, 3-5'
 * 6 -> '1-3, 4-6'
 * 7 -> '1-3, 4-7'
 * 10 -> '1-5, 6-10'
 */
export function getDefaultRange(pages) {
  if (!pages || pages < 1) return '';
  if (pages === 1) return '1';
  if (pages === 2) return '1, 2';
  if (pages === 3) return '1-2, 3';
  const mid = Math.floor(pages / 2);
  return `1-${mid}, ${mid + 1}-${pages}`;
}

/**
 * Sanitizes uploaded filenames to generate safe ZIP folder & archive names.
 * Strips path separators, relative traversal sequences, and control characters.
 * Handles uppercase .PDF, multiple extensions, and Unicode safely.
 */
export function getSafeBaseName(filename) {
  if (!filename || typeof filename !== 'string') return 'document';
  let clean = filename.replace(/^.*[\\/]/, '');
  clean = clean.replace(/\.pdf$/i, '');
  clean = clean.replace(/\.\./g, '');
  clean = clean.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F ]/g, '_').trim();
  clean = clean.replace(/[\s_]+/g, '_');
  clean = clean.replace(/^_+|_+$/g, '');
  return clean || 'document';
}

/**
 * Strict range parser and validator.
 * Accepts:
 *   - '1'
 *   - '1, 3, 5'
 *   - '1-3'
 *   - '1-3, 5-7'
 *   - '1-2, 4, 6-8'
 *   - Whitespace around valid tokens
 * Rejects with descriptive errors:
 *   - Decimals ('1.5')
 *   - Out-of-bounds ('1-3, 99' on 5-page PDF)
 *   - Reversed ('5-1')
 *   - Zero / negatives ('0', '-1')
 *   - Non-numeric ('abc')
 *   - Incomplete / malformed ('1-', '-3', '1-2-3', '1,,3')
 * 
 * Returns: { validRanges, error, isValid, selectedIndices }
 */
export function validateAndParseRanges(rangeString, totalPages) {
  if (!totalPages || totalPages < 1) {
    return { validRanges: [], error: null, isValid: false, selectedIndices: new Set() };
  }

  const raw = (rangeString || '').trim();
  if (!raw) {
    return {
      validRanges: [],
      error: 'Please define at least one page range.',
      isValid: false,
      selectedIndices: new Set()
    };
  }

  const parts = raw.split(',');
  const validRanges = [];
  const selectedIndices = new Set();

  for (let idx = 0; idx < parts.length; idx++) {
    const token = parts[idx].trim();
    if (token === '') {
      return {
        validRanges: [],
        error: 'Empty range token found. Check for extra or consecutive commas.',
        isValid: false,
        selectedIndices: new Set()
      };
    }

    if (token.includes('-')) {
      const hyphenCount = (token.match(/-/g) || []).length;
      if (hyphenCount > 1) {
        return {
          validRanges: [],
          error: `Invalid range format: "${token}". Use format "start-end" (e.g. 1-3).`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      const [startStr, endStr] = token.split('-');
      const sTrim = startStr.trim();
      const eTrim = endStr.trim();

      if (!sTrim || !eTrim) {
        return {
          validRanges: [],
          error: `Incomplete range "${token}". Both start and end pages are required (e.g. 1-3).`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      if (!/^\d+$/.test(sTrim) || !/^\d+$/.test(eTrim)) {
        return {
          validRanges: [],
          error: `Invalid page number in range "${token}". Page numbers must be positive whole numbers.`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      const start = parseInt(sTrim, 10);
      const end = parseInt(eTrim, 10);

      if (start < 1) {
        return {
          validRanges: [],
          error: `Page numbers must be 1 or greater. Found page ${start}.`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      if (start > totalPages) {
        return {
          validRanges: [],
          error: `Start page ${start} exceeds total document length of ${totalPages} pages.`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      if (end > totalPages) {
        return {
          validRanges: [],
          error: `Page ${end} exceeds document length of ${totalPages} pages.`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      if (start > end) {
        return {
          validRanges: [],
          error: `Start page (${start}) cannot be greater than end page (${end}) in range "${token}".`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      validRanges.push({ start, end, label: `${start}-${end}` });
      for (let p = start; p <= end; p++) {
        selectedIndices.add(p - 1);
      }
    } else {
      if (!/^\d+$/.test(token)) {
        return {
          validRanges: [],
          error: `Invalid page number "${token}". Page numbers must be positive whole numbers.`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      const num = parseInt(token, 10);
      if (num < 1) {
        return {
          validRanges: [],
          error: `Page numbers must be 1 or greater. Found page ${num}.`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      if (num > totalPages) {
        return {
          validRanges: [],
          error: `Page ${num} exceeds document length of ${totalPages} pages.`,
          isValid: false,
          selectedIndices: new Set()
        };
      }

      validRanges.push({ start: num, end: num, label: `${num}` });
      selectedIndices.add(num - 1);
    }
  }

  return {
    validRanges,
    error: null,
    isValid: validRanges.length > 0,
    selectedIndices
  };
}

/**
 * Compresses an arbitrary Set of page numbers into clean sorted range strings.
 * e.g. Set {1, 2, 3, 5} -> "1-3, 5"
 */
export function formatPageSetToRanges(pageSet) {
  const nums = Array.from(pageSet).sort((a, b) => a - b);
  if (nums.length === 0) return '';
  const ranges = [];
  let start = nums[0];
  let end = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = nums[i];
      end = nums[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

/**
 * Safely converts raw keyword metadata (string, array, or undefined) into an Array of non-empty strings.
 * Supports comma, semicolon, space delimiters, and pre-existing arrays.
 * Handles empty, undefined, and non-string inputs safely.
 * 
 * @param {string|string[]|any} raw
 * @returns {string[]} Array of keyword strings
 */
export function parseKeywords(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(k => String(k).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.includes(',') || trimmed.includes(';')) {
      return trimmed.split(/[,;]+/).map(k => k.trim()).filter(Boolean);
    }
    return trimmed.split(/\s+/).map(k => k.trim()).filter(Boolean);
  }
  return [];
}



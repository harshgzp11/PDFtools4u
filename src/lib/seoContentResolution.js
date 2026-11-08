/**
 * SEO Content Resolution Utilities
 *
 * Implements robust resolution and fallback logic for tool-specific SEO content.
 * Guarantees that valid custom-authored FAQs and technical specifications take
 * precedence without arbitrary count thresholds, while safely falling back to
 * category-level content only when custom data is missing, empty, or invalid.
 */

/**
 * Resolves FAQ items for a tool page.
 *
 * Requirements:
 * 1. If customFaq is a valid, non-empty array with at least one valid FAQ item,
 *    return the valid custom FAQ items.
 * 2. Do not require an arbitrary minimum threshold (e.g. >= 7).
 * 3. Fall back to fallbackFaq only when customFaq is absent, undefined, null,
 *    empty, or contains zero valid FAQ items.
 * 4. Never crash if customFaq or fallbackFaq is malformed or invalid.
 * 5. Normalize items to { q, a } structure.
 *
 * @param {Array|any} customFaq - Tool-specific custom FAQs from seoContent.js
 * @param {Array|any} fallbackFaq - Category-level fallback FAQs from CATEGORY_FALLBACKS
 * @returns {Array<{ q: string, a: string }>}
 */
export function resolveFaqs(customFaq, fallbackFaq) {
  if (Array.isArray(customFaq)) {
    const validCustom = customFaq
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        q: typeof (item.q || item.question) === 'string' ? (item.q || item.question).trim() : '',
        a: typeof (item.a || item.answer) === 'string' ? (item.a || item.answer).trim() : ''
      }))
      .filter(item => item.q.length > 0 && item.a.length > 0);

    if (validCustom.length > 0) {
      return validCustom;
    }
  }

  if (Array.isArray(fallbackFaq)) {
    const validFallback = fallbackFaq
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        q: typeof (item.q || item.question) === 'string' ? (item.q || item.question).trim() : '',
        a: typeof (item.a || item.answer) === 'string' ? (item.a || item.answer).trim() : ''
      }))
      .filter(item => item.q.length > 0 && item.a.length > 0);

    if (validFallback.length > 0) {
      return validFallback;
    }
  }

  return [];
}

/**
 * Resolves technical specifications for a tool page.
 *
 * Requirements:
 * 1. If customSpecs is a valid, non-empty array with at least one valid spec item,
 *    return the valid custom spec items.
 * 2. Fall back to fallbackSpecs only when customSpecs is absent, undefined, null,
 *    empty, or contains zero valid spec items.
 * 3. Never crash if customSpecs or fallbackSpecs is malformed or invalid.
 * 4. Normalize items to { key, value } structure.
 *
 * @param {Array|any} customSpecs - Tool-specific custom specifications
 * @param {Array|any} fallbackSpecs - Category-level fallback specifications
 * @returns {Array<{ key: string, value: string }>}
 */
export function resolveSpecs(customSpecs, fallbackSpecs) {
  if (Array.isArray(customSpecs)) {
    const validCustom = customSpecs
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        key: typeof item.key === 'string' ? item.key.trim() : (item.key ? String(item.key) : ''),
        value: typeof item.value === 'string' ? item.value.trim() : (item.value !== undefined && item.value !== null ? String(item.value) : '')
      }))
      .filter(item => item.key.length > 0 && item.value.length > 0);

    if (validCustom.length > 0) {
      return validCustom;
    }
  }

  if (Array.isArray(fallbackSpecs)) {
    const validFallback = fallbackSpecs
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        key: typeof item.key === 'string' ? item.key.trim() : (item.key ? String(item.key) : ''),
        value: typeof item.value === 'string' ? item.value.trim() : (item.value !== undefined && item.value !== null ? String(item.value) : '')
      }))
      .filter(item => item.key.length > 0 && item.value.length > 0);

    if (validFallback.length > 0) {
      return validFallback;
    }
  }

  return [];
}


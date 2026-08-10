/**
 * Centralized GA4 Analytics Helper
 * Ensures privacy-first, safe tracking without breaking the UI if blockers are active.
 */

export const trackEvent = (eventName, params = {}) => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      // Ensure all parameters are snake_case and sanitized (no raw PII)
      window.gtag('event', eventName, params);
    }
  } catch (error) {
    // Fail silently - do not interrupt user flow
    console.debug(`[Analytics] Failed to track ${eventName}:`, error);
  }
};

export const trackError = (toolName, errorType) => {
  trackEvent('tool_error', {
    tool_name: toolName,
    error_type: errorType,
  });
};

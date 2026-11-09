/**
 * Centralized GA4 Analytics Helper
 * Ensures privacy-first, safe tracking without breaking the UI if blockers are active.
 */

const getGtag = () => {
  if (typeof window === 'undefined') return null;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }
  return window.gtag;
};

export const trackEvent = (eventName, params = {}) => {
  try {
    const gtag = getGtag();
    if (gtag) {
      // Ensure all parameters are snake_case and sanitized (no raw PII)
      gtag('event', eventName, params);
    }
  } catch (error) {
    // Fail silently - do not interrupt user flow
    console.debug(`[Analytics] Failed to track ${eventName}:`, error);
  }
};

export const trackPageView = (path, title) => {
  try {
    const gtag = getGtag();
    if (gtag && typeof window !== 'undefined') {
      const pagePath = path || window.location.pathname;
      const pageTitle = title || document.title;
      gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle,
        page_location: window.location.origin + pagePath + window.location.search,
      });
    }
  } catch (error) {
    console.debug('[Analytics] Failed to track page_view:', error);
  }
};

export const trackError = (toolName, errorType) => {
  trackEvent('tool_error', {
    tool_name: toolName,
    error_type: errorType,
  });
};

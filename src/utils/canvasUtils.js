import html2canvas from 'html2canvas';

/**
 * Sanitizes modern CSS color functions like oklab(), oklch(), lab(), and color(srgb...)
 * in a cloned document so html2canvas can parse styles without throwing errors.
 */
export const sanitizeCssColors = (clonedDoc) => {
  try {
    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((style) => {
      try {
        if (style.innerHTML && /(oklab|oklch|lab|color\(srgb)/i.test(style.innerHTML)) {
          style.innerHTML = style.innerHTML
            .replace(/oklab\([\s\S]*?\)/gi, '#475569')
            .replace(/oklch\([\s\S]*?\)/gi, '#475569')
            .replace(/lab\([\s\S]*?\)/gi, '#475569')
            .replace(/color\(srgb[\s\S]*?\)/gi, '#475569');
        }
      } catch (e) {}
    });

    const allElements = clonedDoc.querySelectorAll('[style]');
    allElements.forEach((el) => {
      try {
        const styleAttr = el.getAttribute('style');
        if (styleAttr && /(oklab|oklch|lab|color\(srgb)/i.test(styleAttr)) {
          el.setAttribute(
            'style',
            styleAttr
              .replace(/oklab\([\s\S]*?\)/gi, '#475569')
              .replace(/oklch\([\s\S]*?\)/gi, '#475569')
              .replace(/lab\([\s\S]*?\)/gi, '#475569')
              .replace(/color\(srgb[\s\S]*?\)/gi, '#475569')
          );
        }
      } catch (e) {}
    });
  } catch (err) {
    console.warn("Color sanitization warning:", err);
  }
};

/**
 * Safe wrapper around html2canvas that automatically sanitizes modern CSS functions
 * like oklab() and oklch() which html2canvas fails to parse.
 */
export const safeHtml2Canvas = async (element, options = {}) => {
  const userOnClone = options.onclone;

  return await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    ...options,
    onclone: (clonedDoc, clonedEl) => {
      sanitizeCssColors(clonedDoc);
      if (userOnClone) {
        userOnClone(clonedDoc, clonedEl);
      }
    },
  });
};


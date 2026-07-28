export function copyToClipboard(text) {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
    return;
  }
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

export function downloadTextAsFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Returns Tailwind grid classes based on the number of items.
 * Ensures that if there are very few pages, they are large, 
 * and if there are many pages, they form a standard grid.
 */
export function getDynamicGridClass(count) {
  if (count <= 2) return "grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto";
  if (count <= 4) return "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";
  if (count <= 8) return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6";
  return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4";
}

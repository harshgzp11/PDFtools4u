
/**
 * Compresses a PDF file by converting pages to JPEGs and adjusting quality.
 * @param {File} file - The original PDF file
 * @param {number} targetSizeMB - Target size in Megabytes
 * @param {Function} onProgress - Callback for progress (0 to 100)
 * @returns {Promise<Uint8Array>} - The compressed PDF bytes
 */
export const compressPdfToTarget = async (file, targetSizeMB, onProgress) => {
  if (!file) throw new Error("No file provided");

  onProgress(0);
  const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);

  const { PDFDocument } = await import('pdf-lib');
  const { getPdfCanvases } = await import('../lib/pdfRenderer');

  // Use 1.5x scale — enough quality, allows reaching smaller file sizes than 2x
  const canvases = await getPdfCanvases(file, 1.5, (pct) => {
    onProgress(Math.floor(pct * 0.4));
  });

  let minQ = 0.01;
  let maxQ = 0.95;
  let bestBytes = null;
  let closestSizeDiff = Infinity;
  const steps = 10; // more iterations = closer to target

  const renderAtQuality = async (quality) => {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < canvases.length; i++) {
      const dataUrl = canvases[i].canvas.toDataURL('image/jpeg', quality);
      const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
      const jpgImage = await pdfDoc.embedJpg(imageBytes);
      const page = pdfDoc.addPage([canvases[i].width, canvases[i].height]);
      page.drawImage(jpgImage, {
        x: 0, y: 0, width: canvases[i].width, height: canvases[i].height,
      });
    }
    return pdfDoc.save();
  };

  for (let step = 0; step < steps; step++) {
    const midQ = (minQ + maxQ) / 2;
    const pdfBytes = await renderAtQuality(midQ);
    const diff = Math.abs(pdfBytes.length - targetBytes);

    // Prefer results under target; only fall back to over-target if nothing else found
    if (pdfBytes.length <= targetBytes) {
      if (diff < closestSizeDiff) {
        closestSizeDiff = diff;
        bestBytes = pdfBytes;
      }
    } else if (bestBytes === null && diff < closestSizeDiff) {
      closestSizeDiff = diff;
      bestBytes = pdfBytes;
    }

    if (pdfBytes.length === targetBytes) {
      break;
    } else if (pdfBytes.length < targetBytes) {
      minQ = midQ; // output too small → raise quality to get closer to target
    } else {
      maxQ = midQ; // output too large → lower quality to shrink further
    }

    onProgress(40 + Math.floor(((step + 1) / steps) * 55));
  }

  // Final fallback: if we still haven't found anything at or below target,
  // run at absolute minimum quality to produce the smallest possible output
  if (bestBytes === null || bestBytes.length > targetBytes) {
    const minQBytes = await renderAtQuality(0.01);
    if (bestBytes === null || minQBytes.length < bestBytes.length) {
      bestBytes = minQBytes;
    }
  }

  onProgress(100);
  return bestBytes;
};

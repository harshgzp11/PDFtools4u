/**
 * Compresses a PDF by rasterizing its pages and tuning JPEG quality to get as
 * close as possible to the requested maximum size without exceeding it.
 * @param {File} file - The original PDF file
 * @param {number} targetSizeMB - Maximum output size in Megabytes
 * @param {Function} onProgress - Callback for progress (0 to 100)
 * @returns {Promise<Uint8Array>} - The compressed PDF bytes
 */
export const compressPdfToTarget = async (file, targetSizeMB, onProgress) => {
  if (!file) throw new Error('No file provided');
  if (!Number.isFinite(targetSizeMB) || targetSizeMB <= 0) {
    throw new Error('Target size must be a positive number');
  }

  const originalBytes = file.size;
  const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);
  let lastReportedProgress = 0;
  const reportProgress = progress => {
    lastReportedProgress = Math.max(lastReportedProgress, Math.min(100, Math.floor(progress)));
    onProgress(lastReportedProgress);
  };

  if (targetBytes >= originalBytes) {
    reportProgress(100);
    return new Uint8Array(await file.arrayBuffer());
  }

  reportProgress(5);
  const { PDFDocument } = await import('pdf-lib');
  const { getPdfCanvases } = await import('../lib/pdfRenderer');
  const ratio = targetBytes / originalBytes;
  const scales = ratio >= 0.85
    ? [1.75, 1.5, 1.2, 1]
    : ratio >= 0.65
      ? [1.5, 1.2, 1, 0.8]
      : ratio >= 0.4
        ? [1.2, 1, 0.8, 0.6]
        : ratio >= 0.2
          ? [1, 0.8, 0.6, 0.45]
          : [0.8, 0.6, 0.45, 0.3];

  const renderFromCanvases = async (canvasList, quality) => {
    const pdfDoc = await PDFDocument.create();
    for (const item of canvasList) {
      const dataUrl = item.canvas.toDataURL('image/jpeg', quality);
      const imageBytes = await fetch(dataUrl).then(response => response.arrayBuffer());
      const jpgImage = await pdfDoc.embedJpg(imageBytes);
      const page = pdfDoc.addPage([item.width, item.height]);
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: item.width,
        height: item.height,
      });
    }
    return pdfDoc.save();
  };

  let bestBytesUnderTarget = null;
  let smallestBytesOverTarget = null;
  const qualitySteps = 10;

  for (let scaleIndex = 0; scaleIndex < scales.length; scaleIndex++) {
    const canvases = await getPdfCanvases(file, scales[scaleIndex], pct => {
      const renderProgress = Math.min(100, Math.max(0, pct));
      reportProgress(5 + (scaleIndex * 20 + renderProgress * 0.2) / scales.length);
    });

    let minQuality = 0.05;
    let maxQuality = 0.95;
    let foundOutputUnderTarget = false;

    for (let step = 0; step < qualitySteps; step++) {
      const quality = (minQuality + maxQuality) / 2;
      const pdfBytes = await renderFromCanvases(canvases, quality);

      if (pdfBytes.length <= targetBytes) {
        foundOutputUnderTarget = true;
        if (!bestBytesUnderTarget || pdfBytes.length > bestBytesUnderTarget.length) {
          bestBytesUnderTarget = pdfBytes;
        }
        minQuality = quality;
      } else {
        if (!smallestBytesOverTarget || pdfBytes.length < smallestBytesOverTarget.length) {
          smallestBytesOverTarget = pdfBytes;
        }
        maxQuality = quality;
      }

      const completedSearches = scaleIndex * qualitySteps + step + 1;
      reportProgress(25 + (completedSearches / (scales.length * qualitySteps)) * 70);
    }

    if (foundOutputUnderTarget) break;
  }

  let bestBytes = bestBytesUnderTarget || smallestBytesOverTarget;
  if (!bestBytes) throw new Error('Unable to produce a compressed PDF');

  if (bestBytes.length >= originalBytes) {
    bestBytes = new Uint8Array(await file.arrayBuffer());
  }

  reportProgress(100);
  return bestBytes;
};


/**
 * Compresses a PDF file by converting pages to JPEGs and adjusting resolution scale and JPEG quality.
 * @param {File} file - The original PDF file
 * @param {number} targetSizeMB - Target size in Megabytes
 * @param {Function} onProgress - Callback for progress (0 to 100)
 * @returns {Promise<Uint8Array>} - The compressed PDF bytes
 */
export const compressPdfToTarget = async (file, targetSizeMB, onProgress) => {
  if (!file) throw new Error("No file provided");

  onProgress(5);
  const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);

  const { PDFDocument } = await import('pdf-lib');
  const { getPdfCanvases } = await import('../lib/pdfRenderer');

  // Choose starting render scale based on target ratio to avoid producing massive images for small target sizes
  const originalBytes = file.size;
  const ratio = originalBytes > 0 ? targetBytes / originalBytes : 0.5;

  // Multi-tier candidate configurations (scale, quality)
  // Higher scales for light compression; lower scales for high compression
  let candidateConfigs = [];
  if (ratio >= 0.75) {
    candidateConfigs = [
      { scale: 1.5, quality: 0.85 },
      { scale: 1.5, quality: 0.7 },
      { scale: 1.2, quality: 0.7 },
      { scale: 1.0, quality: 0.6 }
    ];
  } else if (ratio >= 0.4) {
    candidateConfigs = [
      { scale: 1.2, quality: 0.75 },
      { scale: 1.0, quality: 0.65 },
      { scale: 0.9, quality: 0.55 },
      { scale: 0.75, quality: 0.5 }
    ];
  } else if (ratio >= 0.2) {
    candidateConfigs = [
      { scale: 0.9, quality: 0.6 },
      { scale: 0.75, quality: 0.5 },
      { scale: 0.6, quality: 0.45 },
      { scale: 0.5, quality: 0.4 }
    ];
  } else {
    candidateConfigs = [
      { scale: 0.6, quality: 0.45 },
      { scale: 0.5, quality: 0.35 },
      { scale: 0.4, quality: 0.3 },
      { scale: 0.3, quality: 0.25 }
    ];
  }

  // Pre-render canvases at the primary chosen scale
  let currentScale = candidateConfigs[0].scale;
  let canvases = await getPdfCanvases(file, currentScale, (pct) => {
    onProgress(5 + Math.floor(pct * 0.3));
  });

  const renderFromCanvases = async (canvasList, quality) => {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < canvasList.length; i++) {
      const dataUrl = canvasList[i].canvas.toDataURL('image/jpeg', quality);
      const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
      const jpgImage = await pdfDoc.embedJpg(imageBytes);
      const page = pdfDoc.addPage([canvasList[i].width, canvasList[i].height]);
      page.drawImage(jpgImage, {
        x: 0, y: 0, width: canvasList[i].width, height: canvasList[i].height,
      });
    }
    return pdfDoc.save();
  };

  let bestBytes = null;
  let closestDiff = Infinity;

  // Binary search quality with current canvases
  let minQ = 0.05;
  let maxQ = 0.92;
  const qualitySteps = 6;

  for (let step = 0; step < qualitySteps; step++) {
    const midQ = (minQ + maxQ) / 2;
    const pdfBytes = await renderFromCanvases(canvases, midQ);
    const diff = Math.abs(pdfBytes.length - targetBytes);

    if (pdfBytes.length <= targetBytes) {
      if (diff < closestDiff) {
        closestDiff = diff;
        bestBytes = pdfBytes;
      }
      minQ = midQ; // Output is within target, try raising quality to get closer to target
    } else {
      // Output too big
      if (bestBytes === null || pdfBytes.length < bestBytes.length) {
        bestBytes = pdfBytes;
      }
      maxQ = midQ;
    }

    onProgress(35 + Math.floor(((step + 1) / qualitySteps) * 45));
  }

  // If even lowest quality at this scale is still greater than target,
  // re-render at lower scale to reach aggressive target
  if (bestBytes && bestBytes.length > targetBytes * 1.15 && currentScale > 0.4) {
    onProgress(82);
    const aggressiveScale = Math.max(0.35, currentScale * 0.55);
    const smallerCanvases = await getPdfCanvases(file, aggressiveScale, () => {});
    
    // Quick search at reduced scale
    let sMinQ = 0.1;
    let sMaxQ = 0.8;
    for (let sStep = 0; sStep < 4; sStep++) {
      const midQ = (sMinQ + sMaxQ) / 2;
      const pdfBytes = await renderFromCanvases(smallerCanvases, midQ);
      const diff = Math.abs(pdfBytes.length - targetBytes);

      if (pdfBytes.length <= targetBytes) {
        if (diff < closestDiff || bestBytes.length > targetBytes) {
          closestDiff = diff;
          bestBytes = pdfBytes;
        }
        sMinQ = midQ;
      } else {
        if (pdfBytes.length < bestBytes.length) {
          bestBytes = pdfBytes;
        }
        sMaxQ = midQ;
      }
    }
  }

  // If flattening created a file that is LARGER than the original, return the original file bytes
  // to never produce a compressed file that is larger than the original input!
  if (bestBytes && originalBytes > 0 && bestBytes.length >= originalBytes) {
    const originalBuf = await file.arrayBuffer();
    bestBytes = new Uint8Array(originalBuf);
  }

  onProgress(100);
  return bestBytes;
};

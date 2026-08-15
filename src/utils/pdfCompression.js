

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
  
  const canvases = await getPdfCanvases(file, 2.0, (pct) => {
    onProgress(Math.floor(pct * 0.4));
  });
  
  let minQ = 0.01;
  let maxQ = 1.0;
  let bestBytes = null;
  let closestSizeDiff = Infinity;
  const steps = 5; 
  
  for (let step = 0; step < steps; step++) {
    let midQ = (minQ + maxQ) / 2;
    const pdfDoc = await PDFDocument.create();
    
    for (let i = 0; i < canvases.length; i++) {
      const dataUrl = canvases[i].canvas.toDataURL('image/jpeg', midQ);
      const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
      const jpgImage = await pdfDoc.embedJpg(imageBytes);
      
      const page = pdfDoc.addPage([canvases[i].width, canvases[i].height]);
      page.drawImage(jpgImage, {
        x: 0, y: 0, width: canvases[i].width, height: canvases[i].height,
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    const diff = Math.abs(pdfBytes.length - targetBytes);
    
    if (diff < closestSizeDiff) {
      closestSizeDiff = diff;
      bestBytes = pdfBytes;
    }
    
    if (pdfBytes.length === targetBytes) {
      break;
    } else if (pdfBytes.length < targetBytes) {
      minQ = midQ;
    } else {
      maxQ = midQ;
    }
    
    onProgress(40 + Math.floor(((step + 1) / steps) * 50));
  }
  
  onProgress(95);
  
  let finalBytes = bestBytes;
  
  onProgress(100);
  
  return finalBytes;
};

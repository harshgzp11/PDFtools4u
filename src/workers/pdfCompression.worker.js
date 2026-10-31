/**
 * Dedicated Module Web Worker for PDF Image Recompression
 * Offloads CPU-intensive image decoding, resizing, and JPEG re-encoding
 * off the main browser thread to maintain 60 FPS UI responsiveness.
 */

self.onmessage = async (e) => {
  const { id, type, buffer, maxDimension, quality } = e.data || {};

  if (type === 'PING') {
    const hasOffscreen = typeof OffscreenCanvas !== 'undefined' &&
                         typeof OffscreenCanvas.prototype.convertToBlob === 'function';
    const hasImageBitmap = typeof createImageBitmap === 'function';
    self.postMessage({
      id,
      status: 'PONG',
      hasOffscreen,
      hasImageBitmap,
      supported: hasOffscreen && hasImageBitmap
    });
    return;
  }

  if (type === 'RECOMPRESS') {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      self.postMessage({
        id,
        status: 'UNSUPPORTED_ENVIRONMENT',
        error: 'Browser does not support OffscreenCanvas or createImageBitmap in Web Workers.'
      });
      return;
    }

    let bmp = null;
    let canvas = null;

    try {
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Empty buffer supplied for image recompression.');
      }

      const blob = new Blob([buffer], { type: 'image/jpeg' });
      bmp = await createImageBitmap(blob);

      const origW = bmp.width;
      const origH = bmp.height;
      const maxDim = typeof maxDimension === 'number' && maxDimension > 0 ? maxDimension : 1600;
      const jpegQuality = typeof quality === 'number' && quality > 0 && quality <= 1 ? quality : 0.70;

      let targetW = origW;
      let targetH = origH;

      if (origW > maxDim || origH > maxDim) {
        if (origW >= origH) {
          targetW = maxDim;
          targetH = Math.max(1, Math.round((origH * maxDim) / origW));
        } else {
          targetH = maxDim;
          targetW = Math.max(1, Math.round((origW * maxDim) / origH));
        }
      }

      canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('Failed to acquire 2D context from OffscreenCanvas.');
      }

      ctx.drawImage(bmp, 0, 0, targetW, targetH);

      // Free image bitmap resource immediately
      bmp.close();
      bmp = null;

      const outBlob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: jpegQuality
      });

      // Free canvas buffer memory
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;

      const outBuffer = await outBlob.arrayBuffer();

      // Return recompressed buffer as transferable
      self.postMessage({
        id,
        status: 'OK',
        width: targetW,
        height: targetH,
        origWidth: origW,
        origHeight: origH,
        buffer: outBuffer,
        bytesLength: outBuffer.byteLength
      }, [outBuffer]);

    } catch (err) {
      if (bmp) {
        try { bmp.close(); } catch {}
      }
      if (canvas) {
        try { canvas.width = 0; canvas.height = 0; } catch {}
      }

      self.postMessage({
        id,
        status: 'ERROR',
        error: err.message || String(err)
      });
    }
  }
};

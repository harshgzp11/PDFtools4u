/**
 * OCR Engine Coordinator & Resource Management
 * Handles worker lifecycle, adaptive resolution scaling, cancellation tokens,
 * and deterministic canvas/GPU texture deallocation.
 */

/**
 * Calculates adaptive rendering scale for PDF pages based on intrinsic point dimensions.
 * Avoids the catastrophic memory footprint of fixed 4.4x scaling on high-res documents
 * while guaranteeing sufficient DPI (200-300) for high character recognition accuracy.
 *
 * @param {number} width - PDF page width in points (72 DPI)
 * @param {number} height - PDF page height in points (72 DPI)
 * @param {Object} [options={}]
 * @param {number} [options.targetDpi=200] - Target rendering DPI (default 200 for standard, 300 for high precision)
 * @param {number} [options.maxDimension=2400] - Maximum allowable pixel length on either edge
 * @param {number} [options.maxPixelArea=6000000] - Maximum allowable pixel area (6 Megapixels)
 * @returns {number} Scale factor for PDF.js viewport
 */
export function calculateAdaptiveScale(width, height, options = {}) {
  const {
    targetDpi = 200,
    maxDimension = 2400,
    maxPixelArea = 6000000,
    baseDpi = 72
  } = options;

  if (!width || !height || width <= 0 || height <= 0) {
    return 2.0; // Sensible fallback
  }

  // Base scale from target DPI
  let scale = targetDpi / baseDpi;

  // Clamp by maximum dimension (width or height)
  const currentMax = Math.max(width, height) * scale;
  if (currentMax > maxDimension) {
    scale = maxDimension / Math.max(width, height);
  }

  // Clamp by maximum total pixel area (width * height * scale^2)
  const area = (width * scale) * (height * scale);
  if (area > maxPixelArea) {
    scale = Math.sqrt(maxPixelArea / (width * height));
  }

  // Bound to sensible limits (min 0.5x, max 4.5x)
  return Math.max(0.5, Math.min(scale, 4.5));
}

/**
 * Explicitly deallocates canvas context and resets dimensions to 0x0.
 * Informs the browser graphics engine (Blink/Skia/WebKit) that the backing texture
 * can be deallocated immediately, preventing GPU memory leaks across multi-page runs.
 *
 * @param {HTMLCanvasElement|null} canvas
 */
export function disposeCanvas(canvas) {
  if (!canvas) return;
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  } catch {
    // Ignore context disposal errors
  }
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Cleanly releases PDF.js document resources.
 *
 * @param {Object|null} pdfDoc
 */
export async function cleanupPdfDocument(pdfDoc) {
  if (!pdfDoc) return;
  try {
    if (typeof pdfDoc.destroy === 'function') {
      await pdfDoc.destroy();
    } else if (typeof pdfDoc.cleanup === 'function') {
      pdfDoc.cleanup();
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Initializes a Tesseract.js worker with progress and error logging.
 *
 * @param {string} language - ISO language code (e.g., 'eng')
 * @param {Function} [onProgress] - Callback for worker status updates
 * @returns {Promise<Object>} Active Tesseract.js Worker instance
 */
export async function createOcrWorker(language = 'eng', onProgress = () => {}) {
  const { createWorker } = await import('tesseract.js');
  
  const worker = await createWorker(language, 1, {
    logger: m => {
      try {
        onProgress(m);
      } catch (err) {
        console.warn('[ocrEngine] Progress handler error:', err);
      }
    }
  });

  return worker;
}

/**
 * Safely terminates a Tesseract.js worker instance and releases its Web Worker thread.
 * Guarantees that any errors during termination are caught silently.
 *
 * @param {Object|null} worker
 */
export async function terminateOcrWorker(worker) {
  if (!worker) return;
  try {
    if (typeof worker.terminate === 'function') {
      await worker.terminate();
    }
  } catch (err) {
    console.debug('[ocrEngine] Worker termination caught expected signal:', err);
  }
}

export const SUPPORTED_OCR_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
export const SUPPORTED_OCR_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

/**
 * Sniffs the magic bytes from a File or Blob header.
 *
 * @param {File|Blob} file
 * @returns {Promise<string|null>} Inferred MIME type or null
 */
export async function sniffOcrFileType(file) {
  if (!file || typeof file.slice !== 'function') return null;

  try {
    const slice = file.slice(0, 16);
    const buf = await slice.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D) {
      return 'application/pdf';
    }

    // JPEG: 0xFF 0xD8 0xFF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }

    // WebP: 'RIFF'....'WEBP'
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }

    // HEIC / HEIF: ftypheic, ftypmif1, ftypmsf1, ftypheix
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
      if (['heic', 'mif1', 'msf1', 'heix', 'hevc'].includes(brand)) {
        return 'image/heic';
      }
    }
  } catch {
    // Sniffing failure falls back to MIME/extension
  }

  return null;
}

/**
 * Validates whether an uploaded file is supported for OCR processing.
 * Accepts PDF, JPG, JPEG, PNG, and WebP.
 * Strictly rejects HEIC and unsupported document/image formats.
 *
 * @param {File|Blob|null} file
 * @returns {Promise<{ valid: boolean, type?: 'pdf'|'image', mimeType?: string, error?: string }>}
 */
export async function validateOcrFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a file to process.' };
  }

  const sniffedType = await sniffOcrFileType(file);
  const declaredType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();

  // Check for HEIC first
  if (sniffedType === 'image/heic' || declaredType === 'image/heic' || declaredType === 'image/heif' || /\.(heic|heif)$/i.test(fileName)) {
    return {
      valid: false,
      error: 'HEIC format is not supported. Please upload a JPG, PNG, WebP, or PDF file.'
    };
  }

  // Check PDF
  if (sniffedType === 'application/pdf' || declaredType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
    return {
      valid: true,
      type: 'pdf',
      mimeType: 'application/pdf'
    };
  }

  // Check Supported Images
  const isJpeg = sniffedType === 'image/jpeg' || declaredType === 'image/jpeg' || declaredType === 'image/jpg' || /\.(jpe?g)$/i.test(fileName);
  const isPng = sniffedType === 'image/png' || declaredType === 'image/png' || /\.png$/i.test(fileName);
  const isWebp = sniffedType === 'image/webp' || declaredType === 'image/webp' || /\.webp$/i.test(fileName);

  if (isJpeg) {
    return { valid: true, type: 'image', mimeType: 'image/jpeg' };
  }
  if (isPng) {
    return { valid: true, type: 'image', mimeType: 'image/png' };
  }
  if (isWebp) {
    return { valid: true, type: 'image', mimeType: 'image/webp' };
  }

  return {
    valid: false,
    error: 'Unsupported file format. Please upload a PDF or an image (JPG, PNG, WebP).'
  };
}

/**
 * Calculates live word count and character count for text content.
 *
 * Word count convention:
 * - Trim text.
 * - Empty or whitespace-only strings return 0 words.
 * - Non-empty whitespace-separated tokens are counted as words.
 *
 * Character count convention:
 * - JavaScript string UTF-16 code units (matching textarea.value.length).
 *
 * @param {string} text
 * @returns {{ words: number, characters: number }}
 */
export function calculateTextStats(text) {
  if (!text || typeof text !== 'string') {
    return { words: 0, characters: 0 };
  }
  const characters = text.length;
  const trimmed = text.trim();
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
  return { words, characters };
}

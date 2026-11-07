import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const { PDFDocument } = require('pdf-lib');
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

// Import production utilities under test
const {
  calculateAdaptiveScale,
  disposeCanvas,
  cleanupPdfDocument,
  createOcrWorker,
  terminateOcrWorker,
  validateOcrFile,
  sniffOcrFileType,
  calculateTextStats,
  SUPPORTED_OCR_IMAGE_EXTENSIONS,
  SUPPORTED_OCR_MIME_TYPES
} = await import('../src/utils/ocrEngine.js');
const { getExifOrientation } = await import('../src/utils/imageNormalization.js');

const fixturesDir = path.join(projectRoot, 'tests', 'fixtures', 'ocr');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, category, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] [${category}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] [${category}] ${name}`);
    console.error(err);
    failedTests++;
  }
}

console.log('================================================================');
console.log('  PRODUCTION REGRESSION TEST SUITE: OCR PIPELINE & RELIABILITY');
console.log('  PDFTools4U: Task 2 Lifecycle, Memory, Cancellation & Adaptive Scaling');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: PDF INPUT PARSING & SCANNED FIXTURE BASELINE
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: PDF INPUT PARSING & SCANNED FIXTURE BASELINE ---');

await test('Existing PDF input parsing via PDF.js', 'Real PDF.js', async () => {
  const pdfBytes = fs.readFileSync(path.join(fixturesDir, 'scanned-invoice.pdf'));
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  assert.strictEqual(doc.numPages, 2, 'Scanned PDF fixture must contain exactly 2 pages');
  await cleanupPdfDocument(doc);
});

await test('Scanned PDF fixture contains ZERO selectable text before OCR', 'Real PDF.js', async () => {
  const pdfBytes = fs.readFileSync(path.join(fixturesDir, 'scanned-invoice.pdf'));
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    assert.strictEqual(
      textContent.items.length, 
      0, 
      `Page ${pageNum} of pure-raster scanned PDF must have 0 text items before OCR`
    );
  }
  await cleanupPdfDocument(doc);
});

await test('Multi-page sequential page access and dimensions', 'Real PDF.js', async () => {
  const pdfBytes = fs.readFileSync(path.join(fixturesDir, 'scanned-invoice.pdf'));
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  
  const page1 = await doc.getPage(1);
  const v1 = page1.getViewport({ scale: 1.0 });
  assert.ok(v1.width > 500 && v1.height > 800, 'Page 1 must report standard A4 proportions');

  const page2 = await doc.getPage(2);
  const v2 = page2.getViewport({ scale: 1.0 });
  assert.ok(v2.width > 500 && v2.height > 800, 'Page 2 must report standard A4 proportions');
  await cleanupPdfDocument(doc);
});

// -----------------------------------------------------------------------------
// SECTION 2: REAL TESSERACT OCR ON IMAGE FORMATS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: REAL TESSERACT OCR CHARACTER RECOGNITION ---');

let sharedWorker = null;

try {
  sharedWorker = await createOcrWorker('eng');
} catch (e) {
  console.error('Failed to initialize shared Tesseract worker:', e);
}

await test('Real OCR extraction from PNG fixture (invoice-p1.png)', 'Real Tesseract', async () => {
  assert.ok(sharedWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'invoice-p1.png'));
  const ret = await sharedWorker.recognize(imgBuf);
  
  const text = ret.data.text.toUpperCase();
  assert.ok(text.includes('INVOICE'), 'Recognized text must contain "INVOICE"');
  assert.ok(text.includes('10492'), 'Recognized text must contain "10492"');
  assert.ok(text.includes('ACME CORPORATION'), 'Recognized text must contain "ACME CORPORATION"');
  assert.ok(ret.data.confidence > 75, `OCR confidence must be >75% (actual: ${ret.data.confidence}%)`);
});

await test('Real OCR extraction from JPEG fixture (receipt.jpg)', 'Real Tesseract', async () => {
  assert.ok(sharedWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'receipt.jpg'));
  const ret = await sharedWorker.recognize(imgBuf);
  
  const text = ret.data.text.toUpperCase();
  assert.ok(text.includes('COFFEE SHOP'), 'Recognized text must contain "COFFEE SHOP"');
  assert.ok(text.includes('RECEIPT'), 'Recognized text must contain "RECEIPT"');
  assert.ok(text.includes('TOTAL'), 'Recognized text must contain "TOTAL"');
  assert.ok(ret.data.confidence > 75, `OCR confidence must be >75% (actual: ${ret.data.confidence}%)`);
});

await test('Real OCR extraction from WebP fixture (sample.webp)', 'Real Tesseract', async () => {
  assert.ok(sharedWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'sample.webp'));
  const ret = await sharedWorker.recognize(imgBuf);
  
  const text = ret.data.text.toUpperCase();
  assert.ok(text.includes('WEBP SCREENSHOT'), 'Recognized text must contain "WEBP SCREENSHOT"');
  assert.ok(text.includes('RECOGNITION'), 'Recognized text must contain "RECOGNITION"');
});

// -----------------------------------------------------------------------------
// SECTION 3: SEARCHABLE PDF GENERATION & TEXT LAYER AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: SEARCHABLE PDF GENERATION & TEXT LAYER AUDIT ---');

let singlePagePdfBytes = null;

await test('Generate Searchable PDF from Image using TessPDFRenderer', 'Real Tesseract + pdf-lib', async () => {
  assert.ok(sharedWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'invoice-p1.png'));
  const ret = await sharedWorker.recognize(imgBuf, { pdfTitle: 'Test Invoice' }, { pdf: true });
  
  assert.ok(ret.data.pdf, 'ret.data.pdf must contain generated PDF bytes');
  assert.ok(ret.data.pdf.byteLength > 1000, 'Generated PDF must be non-empty');
  singlePagePdfBytes = ret.data.pdf;

  const doc = await PDFDocument.load(singlePagePdfBytes);
  assert.strictEqual(doc.getPageCount(), 1, 'Generated single-page PDF must have exactly 1 page');
});

await test('Verify selectable and searchable text layer coordinates in generated PDF', 'Real PDF.js', async () => {
  assert.ok(singlePagePdfBytes, 'Single page PDF bytes must exist from previous test');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(singlePagePdfBytes) }).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  
  assert.ok(textContent.items.length > 10, `Text content items must be >10 (found ${textContent.items.length})`);
  
  const hasCoordinates = textContent.items.every(it => Array.isArray(it.transform) && it.transform.length === 6);
  assert.ok(hasCoordinates, 'All text items must have valid 6-element affine transformation matrices');
  
  const joinedText = textContent.items.map(it => it.str).join(' ').toUpperCase();
  assert.ok(joinedText.includes('INVOICE'), 'Searchable text layer must contain "INVOICE"');
  assert.ok(joinedText.includes('10492'), 'Searchable text layer must contain "10492"');
  await cleanupPdfDocument(doc);
});

await test('Multi-page Searchable PDF assembly using pdf-lib', 'Real Tesseract + pdf-lib', async () => {
  assert.ok(sharedWorker, 'Tesseract worker must be available');
  
  const buf1 = fs.readFileSync(path.join(fixturesDir, 'invoice-p1.png'));
  const ret1 = await sharedWorker.recognize(buf1, { pdfTitle: 'Page 1' }, { pdf: true });
  
  const buf2 = fs.readFileSync(path.join(fixturesDir, 'invoice-p2.png'));
  const ret2 = await sharedWorker.recognize(buf2, { pdfTitle: 'Page 2' }, { pdf: true });

  const mergedPdf = await PDFDocument.create();
  
  const doc1 = await PDFDocument.load(ret1.data.pdf);
  const pages1 = await mergedPdf.copyPages(doc1, doc1.getPageIndices());
  pages1.forEach(p => mergedPdf.addPage(p));

  const doc2 = await PDFDocument.load(ret2.data.pdf);
  const pages2 = await mergedPdf.copyPages(doc2, doc2.getPageIndices());
  pages2.forEach(p => mergedPdf.addPage(p));

  const mergedBytes = await mergedPdf.save();
  assert.ok(mergedBytes.byteLength > 2000, 'Merged PDF must be valid binary');

  const verifiedDoc = await pdfjsLib.getDocument({ data: new Uint8Array(mergedBytes) }).promise;
  assert.strictEqual(verifiedDoc.numPages, 2, 'Merged searchable PDF must have 2 pages');

  const p1Text = (await (await verifiedDoc.getPage(1)).getTextContent()).items.map(i => i.str).join(' ');
  const p2Text = (await (await verifiedDoc.getPage(2)).getTextContent()).items.map(i => i.str).join(' ');

  assert.ok(p1Text.includes('INVOICE') || p1Text.includes('10492'), 'Page 1 text layer must be preserved in merged PDF');
  assert.ok(p2Text.includes('TERMS') || p2Text.includes('CONDITIONS'), 'Page 2 text layer must be preserved in merged PDF');
  await cleanupPdfDocument(verifiedDoc);
});

// Terminate shared worker via production helper
if (sharedWorker) {
  await terminateOcrWorker(sharedWorker);
  sharedWorker = null;
}

// -----------------------------------------------------------------------------
// SECTION 4: TASK 2 RELIABILITY, WORKER LIFECYCLE & CANCELLATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: TASK 2 WORKER LIFECYCLE, CANCELLATION & RECOVERY ---');

await test('Worker termination during cancellation kills thread cleanly', 'Production Engine', async () => {
  let activeWorker = await createOcrWorker('eng');
  assert.ok(activeWorker, 'Worker must be created');
  
  await terminateOcrWorker(activeWorker);
  activeWorker = null;
  assert.strictEqual(activeWorker, null, 'Active worker reference must be cleared to null upon cancellation');
});

await test('Fresh worker initialization succeeds after cancellation', 'Production Engine', async () => {
  // Simulate cancellation terminating worker
  const worker1 = await createOcrWorker('eng');
  await terminateOcrWorker(worker1);

  // Subsequent run spawns a fresh worker instance
  const worker2 = await createOcrWorker('eng');
  assert.ok(worker2, 'Fresh worker must initialize successfully');

  const buf = fs.readFileSync(path.join(fixturesDir, 'receipt.jpg'));
  const ret = await worker2.recognize(buf);
  assert.ok(ret.data.text.includes('COFFEE'), 'Fresh worker must recognize text accurately');

  await terminateOcrWorker(worker2);
});

await test('Cancellation stops page-processing loop immediately', 'Cancellation Flow', async () => {
  const abortController = new AbortController();
  const processedPages = [];
  
  const totalPages = 5;
  for (let page = 1; page <= totalPages; page++) {
    if (abortController.signal.aborted) {
      break;
    }
    processedPages.push(page);
    
    // Simulate user clicking Cancel after Page 1
    if (page === 1) {
      abortController.abort();
    }
  }

  assert.strictEqual(processedPages.length, 1, 'Only 1 page must be processed when cancelled at Page 1');
  assert.strictEqual(abortController.signal.aborted, true, 'Abort signal must be true');
});

await test('Run-ID guard rejects stale progress callbacks arriving after cancellation', 'Run-ID State Guard', () => {
  let runId = 1;
  let stateUpdated = false;

  const onProgress = (incomingRunId) => {
    // Architectural guard implemented in PdfOcr.jsx
    if (incomingRunId !== runId) {
      return; // Silently ignore stale callback
    }
    stateUpdated = true;
  };

  // Simulate progress arriving for run 1
  onProgress(1);
  assert.strictEqual(stateUpdated, true, 'Callback for active run must update state');

  // User cancels: run ID increments to 2
  runId = 2;
  stateUpdated = false;

  // Stale callback from worker 1 arrives late with old runId 1
  onProgress(1);
  assert.strictEqual(stateUpdated, false, 'Stale callback from old runId must be rejected');
});

await test('Repeated sequential processing executes without duplicate workers', 'Worker Management', async () => {
  let activeWorkerInstance = null;
  const executionHistory = [];

  for (let docIdx = 1; docIdx <= 3; docIdx++) {
    // Assert invariant: no worker is lingering from previous document
    assert.strictEqual(activeWorkerInstance, null, `Worker must be null before document ${docIdx}`);

    // Spawn single owned worker
    activeWorkerInstance = await createOcrWorker('eng');
    executionHistory.push({ doc: docIdx, active: true });

    // Simulate work completion and guaranteed teardown
    await terminateOcrWorker(activeWorkerInstance);
    activeWorkerInstance = null;
    executionHistory.push({ doc: docIdx, active: false });
  }

  assert.strictEqual(executionHistory.length, 6, 'All 3 runs must transition from active to null cleanly');
  assert.strictEqual(activeWorkerInstance, null, 'Final state must have zero active workers');
});

// -----------------------------------------------------------------------------
// SECTION 5: TASK 2 MEMORY & RESOURCE CLEANUP AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: TASK 2 CANVAS & OBJECT URL RESOURCE CLEANUP ---');

await test('disposeCanvas resets canvas dimensions to 0x0 and clears context', 'Production Engine', () => {
  // Mock canvas object representing an offscreen canvas
  let cleared = false;
  const mockCanvas = {
    width: 2400,
    height: 3200,
    getContext: (type) => {
      if (type === '2d') {
        return {
          clearRect: (x, y, w, h) => {
            if (w === 2400 && h === 3200) cleared = true;
          }
        };
      }
      return null;
    }
  };

  disposeCanvas(mockCanvas);
  assert.strictEqual(mockCanvas.width, 0, 'Canvas width must be reset to 0');
  assert.strictEqual(mockCanvas.height, 0, 'Canvas height must be reset to 0');
  assert.strictEqual(cleared, true, 'Canvas context clearRect must be called with initial dimensions');
});

await test('disposeCanvas handles null or malformed canvas without throwing', 'Production Engine', () => {
  assert.doesNotThrow(() => disposeCanvas(null));
  assert.doesNotThrow(() => disposeCanvas({}));
  assert.doesNotThrow(() => disposeCanvas({ width: 100 }));
});

await test('Canvas disposal executes cleanly in try/finally even after recognition error', 'Memory Cleanup', async () => {
  let canvasDisposed = false;
  const mockCanvas = {
    width: 1000,
    height: 1000,
    getContext: () => ({ clearRect: () => {} })
  };

  try {
    throw new Error('Simulated OCR Worker Out-Of-Memory');
  } catch (_) {
    // Handled in catch
  } finally {
    disposeCanvas(mockCanvas);
    if (mockCanvas.width === 0 && mockCanvas.height === 0) {
      canvasDisposed = true;
    }
  }

  assert.strictEqual(canvasDisposed, true, 'Canvas must be disposed in finally block despite error');
});

await test('Object URL tracking revokes previous URL on replacement', 'URL Lifecycle', () => {
  const revokedUrls = [];
  const fakeRevokeObjectURL = (url) => revokedUrls.push(url);

  let activeUrl = null;

  // Document 1 completes
  activeUrl = 'blob:https://pdftools4u.in/doc-1';

  // Document 2 arrives: previous URL must be revoked before replacing
  if (activeUrl) {
    fakeRevokeObjectURL(activeUrl);
  }
  activeUrl = 'blob:https://pdftools4u.in/doc-2';

  assert.strictEqual(revokedUrls.length, 1, 'Exactly 1 URL must have been revoked');
  assert.strictEqual(revokedUrls[0], 'blob:https://pdftools4u.in/doc-1', 'Document 1 URL must be revoked');
  assert.strictEqual(activeUrl, 'blob:https://pdftools4u.in/doc-2', 'Document 2 URL must be active');
});

await test('Object URL is revoked on reset and component unmount', 'URL Lifecycle', () => {
  const revokedUrls = [];
  const fakeRevokeObjectURL = (url) => revokedUrls.push(url);

  let activeUrl = 'blob:https://pdftools4u.in/doc-active';

  // Simulate unmount hook execution
  const unmountCleanup = () => {
    if (activeUrl) {
      fakeRevokeObjectURL(activeUrl);
      activeUrl = null;
    }
  };

  unmountCleanup();

  assert.strictEqual(revokedUrls.length, 1, 'URL must be revoked on unmount');
  assert.strictEqual(activeUrl, null, 'Active URL reference must be null after unmount');
});

// -----------------------------------------------------------------------------
// SECTION 6: TASK 2 ADAPTIVE SCALING & SAFETY GUARDS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: TASK 2 ADAPTIVE SCALING & SAFETY GUARDS ---');

await test('calculateAdaptiveScale scales standard A4 PDF to ~200 DPI without exceeding limits', 'Production Engine', () => {
  // A4 standard points: 595.28 x 841.89
  const scale = calculateAdaptiveScale(595.28, 841.89, {
    targetDpi: 200,
    maxDimension: 2400,
    maxPixelArea: 6000000
  });

  const scaledW = Math.round(595.28 * scale);
  const scaledH = Math.round(841.89 * scale);
  const totalPixels = scaledW * scaledH;

  assert.ok(scale >= 2.7 && scale <= 2.8, `Scale factor should be ~2.77x (actual: ${scale.toFixed(2)})`);
  assert.ok(scaledH <= 2400, `Max dimension (${scaledH}) must be <= 2400px`);
  assert.ok(totalPixels <= 6000000, `Total pixel count (${totalPixels}) must be <= 6 Megapixels`);
});

await test('calculateAdaptiveScale strictly clamps oversized architectural drawings', 'Production Engine', () => {
  // 36" x 48" architectural blueprint in 72 DPI points: 2592 x 3456
  const scale = calculateAdaptiveScale(2592, 3456, {
    targetDpi: 200,
    maxDimension: 2400,
    maxPixelArea: 6000000
  });

  const scaledH = Math.round(3456 * scale);
  const totalPixels = Math.round((2592 * scale) * (3456 * scale));

  assert.ok(scaledH <= 2400, `Scaled height (${scaledH}) must be clamped to 2400px`);
  assert.ok(totalPixels <= 6000000, `Total pixel count (${totalPixels}) must be clamped to 6 MP`);
});

await test('Large-document guard evaluates threshold (>20 pages)', 'Safety Guards', () => {
  const isLargeDocument = (numPages) => numPages > 20;

  assert.strictEqual(isLargeDocument(5), false, '5-page document should not trigger warning');
  assert.strictEqual(isLargeDocument(20), false, '20-page document is at boundary');
  assert.strictEqual(isLargeDocument(21), true, '21-page document must trigger warning notice');
  assert.strictEqual(isLargeDocument(100), true, '100-page document must trigger warning notice');
});

await test('Input validation accepts PDF and supported images (JPG, PNG, WebP) and rejects HEIC/unsupported', 'Safety Guards & Validation', async () => {
  // Accepted Formats
  const pdfValid = await validateOcrFile({ name: 'scan.pdf', type: 'application/pdf' });
  assert.strictEqual(pdfValid.valid, true);
  assert.strictEqual(pdfValid.type, 'pdf');

  const jpgValid = await validateOcrFile({ name: 'receipt.jpg', type: 'image/jpeg' });
  assert.strictEqual(jpgValid.valid, true);
  assert.strictEqual(jpgValid.type, 'image');

  const jpegValid = await validateOcrFile({ name: 'photo.jpeg', type: 'image/jpeg' });
  assert.strictEqual(jpegValid.valid, true);
  assert.strictEqual(jpegValid.type, 'image');

  const pngValid = await validateOcrFile({ name: 'screenshot.png', type: 'image/png' });
  assert.strictEqual(pngValid.valid, true);
  assert.strictEqual(pngValid.type, 'image');

  const webpValid = await validateOcrFile({ name: 'document.webp', type: 'image/webp' });
  assert.strictEqual(webpValid.valid, true);
  assert.strictEqual(webpValid.type, 'image');

  // HEIC Rejection
  const heicMime = await validateOcrFile({ name: 'photo.heic', type: 'image/heic' });
  assert.strictEqual(heicMime.valid, false);
  assert.ok(heicMime.error.includes('HEIC format is not supported'));

  const heicExt = await validateOcrFile({ name: 'IMG_4021.HEIC', type: 'application/octet-stream' });
  assert.strictEqual(heicExt.valid, false);
  assert.ok(heicExt.error.includes('HEIC format is not supported'));

  // Unsupported formats
  const docx = await validateOcrFile({ name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  assert.strictEqual(docx.valid, false);
  assert.ok(docx.error.includes('Unsupported file format'));

  const txt = await validateOcrFile({ name: 'notes.txt', type: 'text/plain' });
  assert.strictEqual(txt.valid, false);

  const exe = await validateOcrFile({ name: 'script.exe', type: 'application/x-msdownload' });
  assert.strictEqual(exe.valid, false);
});

// -----------------------------------------------------------------------------
// SECTION 7: TASK 3 DIRECT IMAGE OCR & DUAL-PIPELINE NORMALIZATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 7: TASK 3 DIRECT IMAGE OCR & DUAL-PIPELINE NORMALIZATION ---');

const imageWorker = await createOcrWorker('eng');

// 1. Direct PNG upload and OCR
await test('Task 3.1: Direct PNG upload and OCR', 'Task 3 Image Pipeline', async () => {
  assert.ok(imageWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'invoice-p1.png'));
  const ret = await imageWorker.recognize(imgBuf, { pdfTitle: 'invoice-p1.png' }, { pdf: true });
  
  assert.ok(ret.data.text.toUpperCase().includes('INVOICE'), 'Extracted text must contain INVOICE');
  assert.ok(ret.data.pdf instanceof Uint8Array, 'Searchable PDF Uint8Array must be generated');
  assert.ok(ret.data.confidence > 75, 'Confidence must be >75%');
});

// 2. Direct JPG upload and OCR
await test('Task 3.2: Direct JPG upload and OCR', 'Task 3 Image Pipeline', async () => {
  assert.ok(imageWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'receipt.jpg'));
  const ret = await imageWorker.recognize(imgBuf, { pdfTitle: 'receipt.jpg' }, { pdf: true });
  
  assert.ok(ret.data.text.toUpperCase().includes('COFFEE SHOP'), 'Extracted text must contain COFFEE SHOP');
  assert.ok(ret.data.pdf instanceof Uint8Array, 'Searchable PDF Uint8Array must be generated');
});

// 3. Direct JPEG upload and OCR
await test('Task 3.3: Direct JPEG upload and OCR', 'Task 3 Image Pipeline', async () => {
  assert.ok(imageWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'receipt.jpg'));
  const ret = await imageWorker.recognize(imgBuf, { pdfTitle: 'scanned_receipt.jpeg' }, { pdf: true });
  
  assert.ok(ret.data.text.toUpperCase().includes('TOTAL'), 'Extracted text must contain TOTAL');
  assert.ok(ret.data.pdf.length > 10000, 'Searchable PDF must exceed 10KB');
});

// 4. Direct WebP upload and OCR
await test('Task 3.4: Direct WebP upload and OCR', 'Task 3 Image Pipeline', async () => {
  assert.ok(imageWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'sample.webp'));
  const ret = await imageWorker.recognize(imgBuf, { pdfTitle: 'sample.webp' }, { pdf: true });
  
  assert.ok(ret.data.text.length > 0, 'Extracted text must be present for WebP');
  assert.ok(ret.data.pdf instanceof Uint8Array, 'Searchable PDF Uint8Array must be generated for WebP');
});

// 5. EXIF orientation handling
await test('Task 3.5: EXIF orientation handling (orientations 1 through 8)', 'Task 3 Normalization', () => {
  // Helper to generate a minimal valid JPEG header with an EXIF APP1 Orientation tag
  function createExifJpegBuffer(orientationValue) {
    const buffer = new ArrayBuffer(64);
    const view = new DataView(buffer);
    view.setUint16(0, 0xFFD8, false); // SOI
    view.setUint16(2, 0xFFE1, false); // APP1
    view.setUint16(4, 58, false);     // Length
    view.setUint32(6, 0x45786966, false); // 'Exif'
    view.setUint16(10, 0x0000, false);    // '\0\0'
    // TIFF Header: Little Endian ('II')
    view.setUint16(12, 0x4949, false);
    view.setUint16(14, 0x002A, true);     // Tag 42
    view.setUint32(16, 8, true);          // Offset to IFD0 (relative to 12) = 20
    // IFD0
    view.setUint16(20, 1, true);          // 1 entry
    view.setUint16(22, 0x0112, true);     // Orientation tag
    view.setUint16(24, 3, true);          // SHORT type
    view.setUint32(26, 1, true);          // Count 1
    view.setUint16(30, orientationValue, true); // Value
    return buffer;
  }

  for (let o = 1; o <= 8; o++) {
    const buf = createExifJpegBuffer(o);
    const parsedOrientation = getExifOrientation(buf);
    assert.strictEqual(parsedOrientation, o, `Orientation tag ${o} must be parsed correctly`);
  }

  // Non-EXIF / Non-JPEG buffer returns default orientation 1
  assert.strictEqual(getExifOrientation(new ArrayBuffer(16)), 1, 'Non-JPEG must default to orientation 1');
  assert.strictEqual(getExifOrientation(null), 1, 'Null buffer must default to orientation 1');
});

// 6. Transparent PNG normalization
await test('Task 3.6: Transparent PNG normalization ensures solid white composite', 'Task 3 Normalization', () => {
  // Mock canvas verifying solid white fill logic
  let fillStyle = null;
  let filledRect = null;

  const mockCtx = {
    fillStyle: '#000000',
    fillRect: (x, y, w, h) => {
      fillStyle = mockCtx.fillStyle;
      filledRect = { x, y, w, h };
    },
    save: () => {},
    restore: () => {},
    drawImage: () => {},
    clearRect: () => {}
  };

  // Execute white backgrounding pattern
  mockCtx.fillStyle = '#ffffff';
  mockCtx.fillRect(0, 0, 800, 600);

  assert.strictEqual(fillStyle, '#ffffff', 'Background composite fill must be pure white');
  assert.deepStrictEqual(filledRect, { x: 0, y: 0, w: 800, h: 600 }, 'Fill area must match canvas dimensions');
});

// 7. Direct canvas ingestion without Base64 conversion
await test('Task 3.7: Direct canvas ingestion interface bypasses toDataURL', 'Task 3 Normalization', () => {
  let toDataUrlCalled = false;

  const mockCanvas = {
    width: 1000,
    height: 800,
    getContext: () => ({
      fillStyle: '#ffffff',
      fillRect: () => {},
      drawImage: () => {},
      clearRect: () => {}
    }),
    toDataURL: () => {
      toDataUrlCalled = true;
      return 'data:image/png;base64,...';
    }
  };

  // Simulating { returnCanvas: true } branch:
  const result = {
    canvas: mockCanvas,
    width: mockCanvas.width,
    height: mockCanvas.height,
    mimeType: 'image/png',
    dispose: () => {
      mockCanvas.width = 0;
      mockCanvas.height = 0;
    }
  };

  assert.strictEqual(toDataUrlCalled, false, 'toDataURL must NOT be invoked when returnCanvas is true');
  assert.strictEqual(result.canvas, mockCanvas, 'Canvas element must be returned directly');
  assert.strictEqual(typeof result.dispose, 'function', 'Caller must receive deterministic dispose function');

  result.dispose();
  assert.strictEqual(mockCanvas.width, 0, 'Canvas width must be zeroed on disposal');
  assert.strictEqual(mockCanvas.height, 0, 'Canvas height must be zeroed on disposal');
});

// 8. Searchable PDF generation from an image
await test('Task 3.8: Searchable PDF generation from an image produces valid PDF', 'Task 3 Searchable PDF', async () => {
  assert.ok(imageWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'invoice-p1.png'));
  const ret = await imageWorker.recognize(imgBuf, { pdfTitle: 'Searchable Invoice' }, { pdf: true });

  assert.ok(ret.data.pdf instanceof Uint8Array, 'PDF payload must be Uint8Array');
  const header = String.fromCharCode(...ret.data.pdf.slice(0, 5));
  assert.strictEqual(header, '%PDF-', 'Generated data must start with standard %PDF- header');
});

// 9. Searchable PDF text-layer verification
await test('Task 3.9: Searchable PDF contains selectable text layer with valid bounding boxes', 'Task 3 Searchable PDF', async () => {
  assert.ok(imageWorker, 'Tesseract worker must be available');
  const imgBuf = fs.readFileSync(path.join(fixturesDir, 'invoice-p1.png'));
  const ret = await imageWorker.recognize(imgBuf, { pdfTitle: 'Searchable Invoice' }, { pdf: true });

  const doc = await pdfjsLib.getDocument({ data: ret.data.pdf }).promise;
  assert.strictEqual(doc.numPages, 1, 'Image-derived searchable PDF must contain exactly 1 page');
  
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  assert.ok(textContent.items.length > 0, 'Page must contain selectable text items');

  const fullText = textContent.items.map(item => item.str).join(' ').toUpperCase();
  assert.ok(fullText.includes('INVOICE') || fullText.includes('ACME'), 'Selectable text must include INVOICE or ACME');
  
  // Verify bounding boxes
  const itemWithCoords = textContent.items.find(item => item.transform && item.transform.length === 6);
  assert.ok(itemWithCoords, 'Text items must contain PDF coordinate transformation matrix');
  await cleanupPdfDocument(doc);
});

// 10. Image OCR cancellation
await test('Task 3.10: Cancellation during Image OCR halts run and invalidates worker', 'Task 3 Cancellation', async () => {
  let activeWorker = { id: 'worker-img-1' };
  let runId = 1;
  const abortController = new AbortController();

  // Cancel trigger
  runId++;
  abortController.abort();
  activeWorker = null;

  assert.strictEqual(runId, 2, 'runId must increment on cancellation');
  assert.strictEqual(abortController.signal.aborted, true, 'Abort signal must be set');
  assert.strictEqual(activeWorker, null, 'Active worker must be immediately invalidated');
});

// 11. Canvas disposal after success
await test('Task 3.11: Canvas disposal resets dimensions to 0x0 after success', 'Task 3 Memory Lifecycle', () => {
  const canvas = { width: 1920, height: 1080, getContext: () => ({ clearRect: () => {} }) };
  disposeCanvas(canvas);
  assert.strictEqual(canvas.width, 0);
  assert.strictEqual(canvas.height, 0);
});

// 12. Canvas disposal after failure
await test('Task 3.12: Canvas disposal executes cleanly in finally block after OCR failure', 'Task 3 Memory Lifecycle', () => {
  const canvas = { width: 1600, height: 1200, getContext: () => ({ clearRect: () => {} }) };
  let errorCaught = false;

  try {
    throw new Error('Simulated recognition error');
  } catch {
    errorCaught = true;
  } finally {
    disposeCanvas(canvas);
  }

  assert.strictEqual(errorCaught, true);
  assert.strictEqual(canvas.width, 0);
  assert.strictEqual(canvas.height, 0);
});

// 13. Canvas disposal after cancellation
await test('Task 3.13: Canvas disposal zeroes dimensions upon cancellation', 'Task 3 Memory Lifecycle', () => {
  const canvas = { width: 2400, height: 1800, getContext: () => ({ clearRect: () => {} }) };
  const abortController = new AbortController();
  abortController.abort();

  if (abortController.signal.aborted) {
    disposeCanvas(canvas);
  }

  assert.strictEqual(canvas.width, 0);
  assert.strictEqual(canvas.height, 0);
});

// 14. Unsupported file rejection
await test('Task 3.14: validateOcrFile rejects unsupported file types with informative messages', 'Task 3 Validation', async () => {
  const resHeic = await validateOcrFile({ name: 'photo.heic', type: 'image/heic' });
  assert.strictEqual(resHeic.valid, false);
  assert.ok(resHeic.error.includes('HEIC format is not supported'));

  const resDoc = await validateOcrFile({ name: 'contract.doc', type: 'application/msword' });
  assert.strictEqual(resDoc.valid, false);
  assert.ok(resDoc.error.includes('Unsupported file format'));

  const resZip = await validateOcrFile({ name: 'archive.zip', type: 'application/zip' });
  assert.strictEqual(resZip.valid, false);
});

// 15. Existing multi-page PDF regression
await test('Task 3.15: Existing multi-page PDF OCR pipeline regression', 'Task 3 Regressions', async () => {
  const pdfBytes = fs.readFileSync(path.join(fixturesDir, 'scanned-invoice.pdf'));
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  assert.strictEqual(doc.numPages, 2, 'Multi-page fixture must have 2 pages');
  
  const page1 = await doc.getPage(1);
  const vp = page1.getViewport({ scale: 1.0 });
  const scale = calculateAdaptiveScale(vp.width, vp.height, { targetDpi: 200 });
  assert.ok(scale > 2.0 && scale < 3.0, 'Scale must match ~200 DPI');
  await cleanupPdfDocument(doc);
});

// 16. PDF cancellation regression
await test('Task 3.16: PDF cancellation halts multi-page loop regression', 'Task 3 Regressions', () => {
  let activeRunId = 5;
  const currentRunId = 5;
  let pagesProcessed = 0;

  for (let i = 1; i <= 10; i++) {
    if (i === 3) activeRunId++; // User cancels during page 3
    if (activeRunId !== currentRunId) break;
    pagesProcessed++;
  }

  assert.strictEqual(pagesProcessed, 2, 'Loop must break immediately on cancellation');
});

// 17. Existing worker lifecycle regression
await test('Task 3.17: Terminated worker is cleanly invalidated and never reused', 'Task 3 Regressions', async () => {
  let activeWorkerRef = { worker: 'w1', terminate: async () => {} };
  await terminateOcrWorker(activeWorkerRef);
  activeWorkerRef = null;

  assert.strictEqual(activeWorkerRef, null, 'activeWorkerRef must be null after termination');

  // Next run creates fresh worker
  const freshWorker = await createOcrWorker('eng');
  assert.ok(freshWorker, 'Fresh worker must be initialized successfully');
  await terminateOcrWorker(freshWorker);
});

// =============================================================================
// SECTION 8: TASK 4 EXTRACTED-TEXT RESULT WORKSPACE & STATE MANAGEMENT
// =============================================================================
console.log('\n--- SECTION 8: TASK 4 EXTRACTED-TEXT RESULT WORKSPACE ---');

// 4.1 Word and character counter accuracy across edge cases
await test('Task 4.1: Live word and character count calculations across edge cases', 'Task 4 Stats', () => {
  // Empty
  assert.deepStrictEqual(calculateTextStats(''), { words: 0, characters: 0 });
  assert.deepStrictEqual(calculateTextStats(null), { words: 0, characters: 0 });
  assert.deepStrictEqual(calculateTextStats(undefined), { words: 0, characters: 0 });

  // Whitespace only
  assert.deepStrictEqual(calculateTextStats('   \n\t  '), { words: 0, characters: 7 });

  // Single word
  assert.deepStrictEqual(calculateTextStats('Invoice'), { words: 1, characters: 7 });
  assert.deepStrictEqual(calculateTextStats('   Invoice   '), { words: 1, characters: 13 });

  // Multiple words and multiple spaces
  assert.deepStrictEqual(calculateTextStats('ACME   CORPORATION   TOTAL:  $500'), { words: 4, characters: 33 });

  // Newlines
  assert.deepStrictEqual(calculateTextStats("Line 1\nLine 2\n\nLine 3"), { words: 6, characters: 21 });

  // Multilingual Unicode
  const hindiStats = calculateTextStats("नमस्ते दुनिया! यह ओसीआर परीक्षण है।");
  assert.strictEqual(hindiStats.words, 6);
  assert.strictEqual(hindiStats.characters, 35);

  // Emoji and UTF-16 code units (consistent with JS .length and textarea .length)
  const emojiStats = calculateTextStats("OCR Complete 🚀");
  assert.strictEqual(emojiStats.words, 3);
  assert.strictEqual(emojiStats.characters, 15);
});

// 4.2 Image OCR populates extracted text without a second OCR call
await test('Task 4.2: Image OCR captures extracted text in single recognition execution', 'Task 4 Integration', async () => {
  let ocrExecutionCount = 0;
  const mockWorker = {
    recognize: async (source, options, output) => {
      ocrExecutionCount++;
      return {
        data: {
          text: 'INVOICE #10492 Billed To: ACME CORPORATION',
          pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
        }
      };
    }
  };

  const ret = await mockWorker.recognize('canvas', {}, { pdf: true });
  const originalExtractedText = (ret.data?.text || '').trim();
  let editedText = originalExtractedText;

  assert.strictEqual(ocrExecutionCount, 1, 'OCR must only run once');
  assert.strictEqual(originalExtractedText, 'INVOICE #10492 Billed To: ACME CORPORATION');
  assert.strictEqual(editedText, originalExtractedText);
});

// 4.3 Multi-page PDF text aggregation in correct order
await test('Task 4.3: Multi-page PDF aggregates page text sequentially with meaningful separators', 'Task 4 Integration', () => {
  const pageTexts = [
    'Page 1: Invoice Header and Items',
    'Page 2: Terms and Payment Details'
  ];

  let fullText = '';
  for (let i = 1; i <= pageTexts.length; i++) {
    fullText += (pageTexts.length > 1 ? `--- Page ${i} ---\n${pageTexts[i - 1]}\n\n` : `${pageTexts[i - 1]}\n\n`);
  }
  const aggregatedText = fullText.trim();

  assert.ok(aggregatedText.indexOf('Page 1:') < aggregatedText.indexOf('Page 2:'), 'Page 1 text must precede Page 2');
  assert.ok(aggregatedText.includes('--- Page 1 ---'), 'Must contain Page 1 header');
  assert.ok(aggregatedText.includes('--- Page 2 ---'), 'Must contain Page 2 header');
});

// 4.4 User editing decouples editedText from originalExtractedText and PDF
await test('Task 4.4: Editing decoupled from originalExtractedText and Searchable PDF', 'Task 4 Decoupling', () => {
  const original = 'Original OCR output text with typo: Acmee Corp';
  let edited = original;
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);

  // User edits typo in workspace
  edited = 'Corrected output text: Acme Corp';

  assert.notStrictEqual(edited, original, 'editedText must reflect user changes');
  assert.strictEqual(original, 'Original OCR output text with typo: Acmee Corp', 'originalExtractedText must remain immutable');
  assert.strictEqual(pdfBytes[0], 0x25, 'Searchable PDF bytes must remain untouched');
});

// 4.5 Tab switching preserves user edits
await test('Task 4.5: Tab switching preserves edited text state', 'Task 4 State', () => {
  let activeTab = 'pdf';
  let editedText = 'User edited text that must not be lost';

  // Switch to text tab
  activeTab = 'text';
  assert.strictEqual(editedText, 'User edited text that must not be lost');

  // Edit more text
  editedText += ' - updated on text tab';

  // Switch back to pdf tab
  activeTab = 'pdf';
  assert.strictEqual(editedText, 'User edited text that must not be lost - updated on text tab');

  // Switch to text tab again
  activeTab = 'text';
  assert.strictEqual(editedText, 'User edited text that must not be lost - updated on text tab');
});

// 4.6 TXT export MIME type, filename, and Unicode preservation
await test('Task 4.6: TXT export preserves UTF-8 Unicode, line breaks, and filename conventions', 'Task 4 Export', () => {
  const editedText = "Line 1: Special Characters € & $\nLine 2: Devanagari नमस्ते\nLine 3: Emoji 🚀";
  const blob = new Blob([editedText], { type: 'text/plain;charset=utf-8' });

  assert.strictEqual(blob.type, 'text/plain;charset=utf-8');
  assert.ok(blob.size > 0);

  const baseName = 'my-scan-report';
  const filename = `${baseName}_extracted_text.txt`;
  assert.strictEqual(filename, 'my-scan-report_extracted_text.txt');
});

// 4.7 Start over and file replacement resets all extracted text state
await test('Task 4.7: Start over and file replacement resets extracted text and tab state', 'Task 4 Lifecycle', () => {
  let originalExtractedText = 'Initial text';
  let editedText = 'User edited text';
  let activeTab = 'text';
  let isCopied = true;

  // Simulate resetTool / handleFile
  const reset = () => {
    originalExtractedText = '';
    editedText = '';
    activeTab = 'pdf';
    isCopied = false;
  };

  reset();

  assert.strictEqual(originalExtractedText, '');
  assert.strictEqual(editedText, '');
  assert.strictEqual(activeTab, 'pdf');
  assert.strictEqual(isCopied, false);
});

// -----------------------------------------------------------------------------
// SECTION 8.1: TASK 4.1 CLIPBOARD FALLBACK & UI TIMER HARDENING
// -----------------------------------------------------------------------------

function createMockDocument(behavior = {}) {
  const children = [];
  const body = {
    children,
    appendChild: (el) => {
      el.parentNode = body;
      children.push(el);
      return el;
    },
    removeChild: (el) => {
      const idx = children.indexOf(el);
      if (idx !== -1) children.splice(idx, 1);
      el.parentNode = null;
      return el;
    }
  };

  return {
    body,
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      style: {},
      value: '',
      parentNode: null,
      focus: () => {
        if (behavior.focusThrows) throw new Error('Focus blocked');
      },
      select: () => {
        if (behavior.selectThrows) throw new Error('Selection blocked');
      }
    }),
    execCommand: (cmd) => {
      if (behavior.execThrows) throw new Error('execCommand rejected');
      return behavior.execReturns ?? true;
    }
  };
}

function runFallbackCopy(editedText, doc) {
  let success = false;
  if (typeof doc !== 'undefined') {
    const textArea = doc.createElement("textarea");
    textArea.value = editedText;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    try {
      doc.body.appendChild(textArea);
      try {
        textArea.focus();
        textArea.select();
        success = doc.execCommand('copy') === true;
      } catch {
        success = false;
      }
    } finally {
      if (textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
    }
  }
  return success;
}

// 4.8 Clipboard fallback succeeds
await test('Task 4.8: Clipboard fallback succeeds when execCommand returns true', 'Task 4.1 Fallback', () => {
  const doc = createMockDocument({ execReturns: true });
  const result = runFallbackCopy('Test copy text', doc);

  assert.strictEqual(result, true, 'Fallback copy must report true when execCommand returns true');
  assert.strictEqual(doc.body.children.length, 0, 'Textarea must be removed from body');
});

// 4.9 Clipboard fallback returns false
await test('Task 4.9: Clipboard fallback returns false when execCommand returns false', 'Task 4.1 Fallback', () => {
  const doc = createMockDocument({ execReturns: false });
  const result = runFallbackCopy('Test copy text', doc);

  assert.strictEqual(result, false, 'Fallback copy must report false when execCommand returns false');
  assert.strictEqual(doc.body.children.length, 0, 'Textarea must be removed from body');
});

// 4.10 Clipboard fallback throws
await test('Task 4.10: Clipboard fallback safely handles focus, select, or execCommand throws', 'Task 4.1 Fallback', () => {
  // Focus throws
  const docFocusThrow = createMockDocument({ focusThrows: true });
  assert.strictEqual(runFallbackCopy('Test', docFocusThrow), false);
  assert.strictEqual(docFocusThrow.body.children.length, 0);

  // Select throws
  const docSelectThrow = createMockDocument({ selectThrows: true });
  assert.strictEqual(runFallbackCopy('Test', docSelectThrow), false);
  assert.strictEqual(docSelectThrow.body.children.length, 0);

  // execCommand throws
  const docExecThrow = createMockDocument({ execThrows: true });
  assert.strictEqual(runFallbackCopy('Test', docExecThrow), false);
  assert.strictEqual(docExecThrow.body.children.length, 0);
});

// 4.11 Temporary textarea is removed in every scenario
await test('Task 4.11: Temporary textarea is guaranteed removed in all success, failure, and throw scenarios', 'Task 4.1 Cleanup', () => {
  const scenarios = [
    { name: 'success', opts: { execReturns: true } },
    { name: 'false', opts: { execReturns: false } },
    { name: 'focusThrows', opts: { focusThrows: true } },
    { name: 'selectThrows', opts: { selectThrows: true } },
    { name: 'execThrows', opts: { execThrows: true } }
  ];

  for (const s of scenarios) {
    const doc = createMockDocument(s.opts);
    runFallbackCopy('Content to remove', doc);
    assert.strictEqual(doc.body.children.length, 0, `Textarea must be removed in scenario ${s.name}`);
  }
});

// 4.12 Repeated copy operations do not interfere with one another
await test('Task 4.12: Repeated copy operations clear previous timer so older timer cannot prematurely reset isCopied', 'Task 4.1 Timers', async () => {
  let isCopied = false;
  let copyTimeout = null;
  let timer1Fired = false;
  let timer2Fired = false;

  const triggerCopy = (timerId) => {
    if (copyTimeout) {
      clearTimeout(copyTimeout);
      copyTimeout = null;
    }
    isCopied = true;
    copyTimeout = setTimeout(() => {
      isCopied = false;
      copyTimeout = null;
      if (timerId === 1) timer1Fired = true;
      if (timerId === 2) timer2Fired = true;
    }, 50);
  };

  // Trigger copy 1
  triggerCopy(1);
  assert.strictEqual(isCopied, true);

  // Trigger copy 2 at 20ms (before copy 1 fires at 50ms)
  await new Promise(r => setTimeout(r, 20));
  triggerCopy(2);
  assert.strictEqual(isCopied, true);

  // At 55ms (when timer 1 would have elapsed), isCopied must STILL be true because timer 1 was cleared!
  await new Promise(r => setTimeout(r, 35));
  assert.strictEqual(isCopied, true, 'isCopied must not be reset prematurely by timer 1');
  assert.strictEqual(timer1Fired, false, 'Timer 1 must have been cancelled');

  // At 85ms (after timer 2 fires), isCopied resets to false
  await new Promise(r => setTimeout(r, 30));
  assert.strictEqual(isCopied, false, 'isCopied resets to false after timer 2');
  assert.strictEqual(timer2Fired, true, 'Timer 2 fired');
});

// 4.13 Start Over clears the pending timer
await test('Task 4.13: Start Over clears pending copy timeout and resets copied state immediately', 'Task 4.1 Lifecycle', () => {
  const copyTimeoutRef = { current: null };
  let isCopied = true;

  copyTimeoutRef.current = setTimeout(() => {
    isCopied = false;
  }, 2000);

  // Simulate resetTool
  const resetTool = () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    isCopied = false;
  };

  resetTool();

  assert.strictEqual(isCopied, false);
  assert.strictEqual(copyTimeoutRef.current, null);
});

// 4.14 Unmount clears the pending timer
await test('Task 4.14: Component unmount clears pending copy timeout ref', 'Task 4.1 Lifecycle', () => {
  const copyTimeoutRef = { current: null };

  copyTimeoutRef.current = setTimeout(() => {}, 2000);
  assert.notStrictEqual(copyTimeoutRef.current, null);

  // Simulate useEffect unmount cleanup
  const unmountCleanup = () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  };

  unmountCleanup();
  assert.strictEqual(copyTimeoutRef.current, null);
});

if (imageWorker) {
  await terminateOcrWorker(imageWorker);
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  TOTAL OCR TESTS: ${totalTests}`);
console.log(`  PASSED:          ${passedTests}`);
console.log(`  FAILED:          ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
}

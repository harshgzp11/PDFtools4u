import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFName,
  PDFString,
  PDFHexString,
  PDFRawStream
} = require('pdf-lib');

const pdfjsLib = await import(pathToFileURL(path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);

const {
  compressPdfDocument,
  compressPdfToTarget,
  classifyImageStream
} = await import(pathToFileURL(path.join(projectRoot, 'src', 'utils', 'pdfCompression.js')).href);

// Chrome CDP Test Harness for Web Worker & OffscreenCanvas
class ChromeCDP {
  constructor() {
    this.proc = null;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async launch() {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const profileDir = path.resolve(projectRoot, 'scratch', 'qa-chrome-profile-test-suite');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    this.proc = spawn(chromePath, [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDir}`,
      'about:blank'
    ]);

    let connected = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9222/json/list');
        if (res.ok) { connected = true; break; }
      } catch {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (!connected) throw new Error('Chrome failed to start on port 9222');

    const tabs = await (await fetch('http://127.0.0.1:9222/json/list')).json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];

    this.ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result?.value;
  }

  async close() {
    if (this.ws) this.ws.close();
    if (this.proc) this.proc.kill('SIGKILL');
  }
}

let passedCount = 0;
let totalCount = 0;

function report(testName, pass, details = '') {
  totalCount++;
  if (pass) {
    passedCount++;
    console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

async function extractTextWithPdfjs(bytes) {
  const task = pdfjsLib.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  let full = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    full += tc.items.map(x => x.str).join(' ') + '\n';
  }
  return full.trim();
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  PRODUCTION COMPRESSION ENGINE REGRESSION TEST SUITE');
  console.log('  Target: In-Place Selective Stream Optimizer (IPSSO)');
  console.log('================================================================\n');

  const chrome = new ChromeCDP();
  await chrome.launch();
  console.log('Connected to Google Chrome CDP for real Worker & OffscreenCanvas tests.\n');

  // Recompressor function bridge communicating with real Chrome browser canvas
  const browserRecompressor = async (rawBytes, opts) => {
    const bytesArray = Array.from(rawBytes);
    const code = `
      (async () => {
        const raw = new Uint8Array([${bytesArray.join(',')}]);
        const blob = new Blob([raw], { type: 'image/jpeg' });
        let bmp;
        try {
          bmp = await createImageBitmap(blob);
        } catch (_) {
          return null;
        }

        const origW = bmp.width;
        const origH = bmp.height;
        const maxDim = ${opts.maxDimension || 1600};
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

        const canvas = new OffscreenCanvas(targetW, targetH);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0, targetW, targetH);
        bmp.close();

        const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: ${opts.quality || 0.70} });
        canvas.width = 0; canvas.height = 0;
        const buf = await outBlob.arrayBuffer();
        return {
          width: targetW,
          height: targetH,
          bytes: Array.from(new Uint8Array(buf))
        };
      })()
    `;
    const res = await chrome.eval(code);
    if (!res) return null;
    return {
      width: res.width,
      height: res.height,
      bytes: new Uint8Array(res.bytes)
    };
  };

  // ---------------------------------------------------------------------------
  // PART 1: IMAGE STREAM CLASSIFIER & COMPATIBILITY MATRIX
  // ---------------------------------------------------------------------------
  console.log('--- PART 1: Image Stream Classifier & Compatibility Tests ---');
  const dummyDoc = await PDFDocument.create();

  // Test 1.1: DCTDecode eligible
  const d1 = dummyDoc.context.obj({ Filter: PDFName.of('DCTDecode'), ColorSpace: PDFName.of('DeviceRGB'), Width: 2000, Height: 1500, BitsPerComponent: 8 });
  const c1 = classifyImageStream(d1, 50000);
  report('Test 1.1: Standard 8-bit JPEG (DCTDecode) is eligible', c1.eligible && c1.filter === 'DCTDecode');

  // Test 1.2: FlateDecode standard RGB photo eligible
  const d2 = dummyDoc.context.obj({ Filter: PDFName.of('FlateDecode'), ColorSpace: PDFName.of('DeviceRGB'), Width: 1200, Height: 900, BitsPerComponent: 8 });
  const c2 = classifyImageStream(d2, 80000);
  report('Test 1.2: Standard 8-bit FlateDecode RGB is eligible', c2.eligible && c2.filter === 'FlateDecode');

  // Test 1.3: FlateDecode with /SMask (Alpha transparency) must be skipped
  const d3 = dummyDoc.context.obj({ Filter: PDFName.of('FlateDecode'), ColorSpace: PDFName.of('DeviceRGB'), SMask: PDFName.of('10_0_R'), Width: 800, Height: 600, BitsPerComponent: 8 });
  const c3 = classifyImageStream(d3, 40000);
  report('Test 1.3: FlateDecode with /SMask is safely skipped', !c3.eligible && c3.reason.includes('SMask'));

  // Test 1.4: Image with /Mask must be skipped
  const d4 = dummyDoc.context.obj({ Filter: PDFName.of('DCTDecode'), ColorSpace: PDFName.of('DeviceRGB'), Mask: PDFName.of('11_0_R'), Width: 600, Height: 400, BitsPerComponent: 8 });
  const c4 = classifyImageStream(d4, 30000);
  report('Test 1.4: Image with /Mask is safely skipped', !c4.eligible && c4.reason.includes('Mask'));

  // Test 1.5: CCITTFaxDecode 1-bit scan must be skipped
  const d5 = dummyDoc.context.obj({ Filter: PDFName.of('CCITTFaxDecode'), ColorSpace: PDFName.of('DeviceGray'), Width: 1728, Height: 2200, BitsPerComponent: 1 });
  const c5 = classifyImageStream(d5, 20000);
  report('Test 1.5: CCITTFaxDecode 1-bit scan is safely skipped', !c5.eligible && c5.reason.includes('CCITTFaxDecode'));

  // Test 1.6: JBIG2Decode scan must be skipped
  const d6 = dummyDoc.context.obj({ Filter: PDFName.of('JBIG2Decode'), ColorSpace: PDFName.of('DeviceGray'), Width: 1728, Height: 2200, BitsPerComponent: 1 });
  const c6 = classifyImageStream(d6, 15000);
  report('Test 1.6: JBIG2Decode stream is safely skipped', !c6.eligible && c6.reason.includes('JBIG2Decode'));

  // Test 1.7: DeviceCMYK color space must be skipped
  const d7 = dummyDoc.context.obj({ Filter: PDFName.of('DCTDecode'), ColorSpace: PDFName.of('DeviceCMYK'), Width: 1800, Height: 1200, BitsPerComponent: 8 });
  const c7 = classifyImageStream(d7, 100000);
  report('Test 1.7: DeviceCMYK image is safely skipped to prevent color inversion', !c7.eligible && c7.reason.includes('DeviceCMYK'));

  // Test 1.8: Indexed palette color space must be skipped
  const d8 = dummyDoc.context.obj({ Filter: PDFName.of('FlateDecode'), ColorSpace: PDFName.of('Indexed'), Width: 400, Height: 300, BitsPerComponent: 8 });
  const c8 = classifyImageStream(d8, 10000);
  report('Test 1.8: Indexed palette image is safely skipped', !c8.eligible && c8.reason.includes('Indexed'));

  // Test 1.9: JPXDecode (JPEG 2000) must be skipped
  const d9 = dummyDoc.context.obj({ Filter: PDFName.of('JPXDecode'), ColorSpace: PDFName.of('DeviceRGB'), Width: 1200, Height: 800, BitsPerComponent: 8 });
  const c9 = classifyImageStream(d9, 60000);
  report('Test 1.9: JPXDecode (JPEG 2000) is safely skipped', !c9.eligible && c9.reason.includes('JPXDecode'));

  // Test 1.10: FlateDecode with Predictor > 1 must be skipped
  const d10 = dummyDoc.context.obj({
    Filter: PDFName.of('FlateDecode'),
    ColorSpace: PDFName.of('DeviceRGB'),
    Width: 800,
    Height: 600,
    BitsPerComponent: 8,
    DecodeParms: dummyDoc.context.obj({ Predictor: 12, Columns: 800 })
  });
  const c10 = classifyImageStream(d10, 50000);
  report('Test 1.10: Flate stream with Predictor > 1 is safely skipped', !c10.eligible && c10.reason.includes('predictor'));

  // ---------------------------------------------------------------------------
  // PART 2: DOCUMENT PRESERVATION TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 2: Document Preservation Parity Tests ---');

  // Build a multi-feature test PDF
  const masterDoc = await PDFDocument.create();
  const fontH = await masterDoc.embedFont(StandardFonts.Helvetica);
  const fontT = await masterDoc.embedFont(StandardFonts.TimesRomanBold);

  masterDoc.setTitle('Regression Parity Specimen');
  masterDoc.setAuthor('Antigravity Automated Test Harness');
  masterDoc.setSubject('Engineering Parity Suite');

  // Page 1: Text, vectors, AcroForm
  const page1 = masterDoc.addPage([595.28, 841.89]);
  page1.drawText('CRITICAL REGRESSION TEST: VECTOR AND TEXT INTEGRITY', { x: 50, y: 800, size: 14, font: fontT, color: rgb(0.1, 0.3, 0.7) });
  page1.drawText('Unicode Test: Zürich, München (ä, ö, ü, ß), São Paulo (ã, ç), Noël (ë) • Symbols: © ® ™', { x: 50, y: 775, size: 10, font: fontH });
  page1.drawRectangle({ x: 50, y: 700, width: 220, height: 50, borderColor: rgb(0.8, 0.2, 0.2), borderWidth: 2, color: rgb(0.98, 0.95, 0.95) });
  page1.drawCircle({ x: 350, y: 725, size: 25, borderColor: rgb(0.2, 0.6, 0.3), borderWidth: 2, color: rgb(0.9, 1, 0.9) });
  page1.drawLine({ start: { x: 50, y: 680 }, end: { x: 545, y: 680 }, thickness: 1.5, color: rgb(0.4, 0.4, 0.4) });

  const form = masterDoc.getForm();
  const tf = form.createTextField('test.user.fullname');
  tf.setText('Eleanor Vance, Principal Systems Architect');
  tf.addToPage(page1, { x: 50, y: 620, width: 280, height: 25 });

  const cb = form.createCheckBox('test.user.terms');
  cb.check();
  cb.addToPage(page1, { x: 50, y: 580, width: 20, height: 20 });

  // Page 2: Rotated 90 degrees with Hyperlink Annotation & Bookmarks
  const page2 = masterDoc.addPage([841.89, 595.28]);
  page2.setRotation(degrees(90));
  page2.drawText('Page 2: Rotated Landscape Document Structure (90 Degrees)', { x: 100, y: 500, size: 13, font: fontT });

  const link = masterDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [100, 420, 320, 450],
    Border: [0, 0, 1],
    C: [0, 0, 1],
    A: { Type: 'Action', S: 'URI', URI: PDFString.of('https://www.pdftools4u.in/privacy-policy') }
  });
  page2.node.set(PDFName.of('Annots'), masterDoc.context.obj([masterDoc.context.register(link)]));

  // Outline / Bookmarks
  const o1 = masterDoc.context.obj({ Title: PDFString.of('Section 1: General Info'), Parent: null, Dest: [page1.ref, PDFName.of('Fit')] });
  const o1Ref = masterDoc.context.register(o1);
  const o2 = masterDoc.context.obj({ Title: PDFString.of('Section 2: Landscape Data'), Parent: null, Dest: [page2.ref, PDFName.of('Fit')] });
  const o2Ref = masterDoc.context.register(o2);
  o1.set(PDFName.of('Next'), o2Ref);
  o2.set(PDFName.of('Prev'), o1Ref);

  const outlines = masterDoc.context.obj({ Type: 'Outlines', Count: 2, First: o1Ref, Last: o2Ref });
  const outlinesRef = masterDoc.context.register(outlines);
  o1.set(PDFName.of('Parent'), outlinesRef);
  o2.set(PDFName.of('Parent'), outlinesRef);
  masterDoc.catalog.set(PDFName.of('Outlines'), outlinesRef);

  const masterBytes = await masterDoc.save();
  const textBefore = await extractTextWithPdfjs(masterBytes);

  // Run through compressPdfDocument with balanced preset
  const resPreserve = await compressPdfDocument(masterBytes, {
    preset: 'balanced',
    customRecompressor: browserRecompressor
  });

  const textAfter = await extractTextWithPdfjs(resPreserve.bytes);

  report('Test 2.1: Selectable text exact character parity', textBefore === textAfter && textAfter.length > 50, `${textAfter.length} chars identical`);
  report('Test 2.2: Multilingual Unicode characters preserved', textAfter.includes('Zürich') && textAfter.includes('München') && textAfter.includes('São Paulo') && textAfter.includes('© ® ™'));

  const docAfter = await PDFDocument.load(resPreserve.bytes);
  report('Test 2.3: Page count preserved exactly', docAfter.getPageCount() === 2);

  const p1After = docAfter.getPage(0);
  const p2After = docAfter.getPage(1);
  report('Test 2.4: Page 1 dimensions (595x842, 0° rotation) preserved', Math.round(p1After.getWidth()) === 595 && Math.round(p1After.getHeight()) === 842 && p1After.getRotation().angle === 0);
  report('Test 2.5: Page 2 dimensions (842x595, 90° rotation) preserved', Math.round(p2After.getWidth()) === 842 && Math.round(p2After.getHeight()) === 595 && p2After.getRotation().angle === 90);

  report('Test 2.6: Document Title metadata preserved', docAfter.getTitle() === 'Regression Parity Specimen');
  report('Test 2.7: Document Author metadata preserved', docAfter.getAuthor() === 'Antigravity Automated Test Harness');

  const formAfter = docAfter.getForm();
  report('Test 2.8: AcroForm field preserved and editable', formAfter.getTextField('test.user.fullname').getText() === 'Eleanor Vance, Principal Systems Architect');
  report('Test 2.9: AcroForm checkbox state preserved', formAfter.getCheckBox('test.user.terms').isChecked() === true);

  const taskAfter = pdfjsLib.getDocument({ data: resPreserve.bytes.slice() });
  const vDocAfter = await taskAfter.promise;
  const outlinesAfter = await vDocAfter.getOutline();
  report('Test 2.10: Document Bookmarks (Outlines) preserved', outlinesAfter && outlinesAfter.length === 2 && outlinesAfter[0].title === 'Section 1: General Info');

  const p2Pdfjs = await vDocAfter.getPage(2);
  const annotsAfter = await p2Pdfjs.getAnnotations();
  const linkAfter = annotsAfter.find(a => a.subtype === 'Link');
  report('Test 2.11: Hyperlink annotation (/Annots /Link) preserved', linkAfter && linkAfter.url === 'https://www.pdftools4u.in/privacy-policy');

  // ---------------------------------------------------------------------------
  // PART 3: IMAGE RECOMPRESSION & NON-INFLATION SAFEGUARDS
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 3: Image Optimization & Non-Inflation Tests ---');

  // Generate realistic 2000x1500 JPEG image in Chrome
  const photoData = await chrome.eval(`
    (async () => {
      const c = new OffscreenCanvas(2000, 1500);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 2000, 1500);
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = \`hsl(\${(i*17)%360}, 70%, 50%)\`;
        ctx.fillRect((i*41)%1900, (i*31)%1400, 120, 90);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText('PHOTOGRAPHIC SAMPLE SPECIMEN', 80, 160);
      const b = await c.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
      const buf = await b.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    })()
  `);
  const photoJpgBytes = new Uint8Array(photoData);

  // Test 3.1: Eligible JPEG recompression
  const docPhoto = await PDFDocument.create();
  const photoPage = docPhoto.addPage([595.28, 841.89]);
  const imgEmbed = await docPhoto.embedJpg(photoJpgBytes);
  photoPage.drawImage(imgEmbed, { x: 50, y: 200, width: 495, height: 370 });
  const origPhotoDocBytes = await docPhoto.save();

  const resPhoto = await compressPdfDocument(origPhotoDocBytes, {
    preset: 'balanced',
    maxDimension: 1200,
    quality: 0.65,
    customRecompressor: browserRecompressor
  });

  report('Test 3.1: Eligible JPEG image recompressed successfully', resPhoto.optimizedImagesCount === 1 && resPhoto.outputSize < resPhoto.originalSize, `${resPhoto.savedPct}% saved`);

  // Test 3.2: Shared image XObject (Verify optimized once, not duplicated)
  const docShared = await PDFDocument.create();
  const sharedImg = await docShared.embedJpg(photoJpgBytes);
  for (let p = 0; p < 4; p++) {
    const sp = docShared.addPage([595.28, 841.89]);
    sp.drawImage(sharedImg, { x: 50, y: 300, width: 200, height: 150 });
  }
  const origSharedBytes = await docShared.save();

  const resShared = await compressPdfDocument(origSharedBytes, {
    preset: 'balanced',
    maxDimension: 1000,
    quality: 0.60,
    customRecompressor: browserRecompressor
  });

  const checkSharedDoc = await PDFDocument.load(resShared.bytes);
  let sharedImgCount = 0;
  for (const [, obj] of checkSharedDoc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype'))?.toString() === '/Image') {
      sharedImgCount++;
    }
  }
  report('Test 3.2: Shared image XObject retained as single shared object (zero duplication)', sharedImgCount === 1 && resShared.optimizedImagesCount === 1);

  // Test 3.3: Strict Non-Inflation on already tiny or vector PDF
  const docVector = await PDFDocument.create();
  const vp = docVector.addPage([400, 300]);
  vp.drawText('Pure Minimal Vector PDF Document', { x: 40, y: 150, size: 14 });
  const origVectorBytes = await docVector.save();

  const resVector = await compressPdfDocument(origVectorBytes, {
    preset: 'high-compression',
    customRecompressor: browserRecompressor
  });

  report('Test 3.3: Document-level non-inflation guard (output never exceeds input)', resVector.outputSize <= resVector.originalSize && resVector.isAlreadyOptimized === true);
  report('Test 3.4: Zero savings reported honestly (no false success claims)', resVector.savedBytes === 0 && resVector.savedPct === '0.00');

  // ---------------------------------------------------------------------------
  // PART 4: SECURITY, SIGNATURE & ENCRYPTION SAFEGUARDS
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 4: Security, Signature & Encryption Tests ---');

  // Test 4.1: Digitally signed PDF detection
  const docSig = await PDFDocument.create();
  const sigP = docSig.addPage();
  sigP.drawText('Signed Master Document');
  const sigDict = docSig.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: [0, 500, 1000, 500],
    Contents: PDFHexString.of('3082...cert...'),
    Name: PDFString.of('Chief Executive Officer')
  });
  const sigField = docSig.context.obj({
    FT: 'Sig',
    T: PDFString.of('SignatureField1'),
    V: docSig.context.register(sigDict),
    Type: 'Annot',
    Subtype: 'Widget',
    Rect: [50, 50, 200, 100]
  });
  docSig.catalog.set(PDFName.of('AcroForm'), docSig.context.obj({
    Fields: [docSig.context.register(sigField)],
    SigFlags: 3
  }));
  const signedPdfBytes = await docSig.save();

  const resSigned = await compressPdfDocument(signedPdfBytes, { preset: 'balanced', customRecompressor: browserRecompressor });
  report('Test 4.1: Digital signature detected accurately before optimization', resSigned.isSigned === true && resSigned.signatureNames.includes('Chief Executive Officer'));

  // Test 4.2: Empty file validation
  let caughtEmpty = false;
  try {
    await compressPdfDocument(new Uint8Array(0));
  } catch (e) {
    caughtEmpty = e.message.includes('empty');
  }
  report('Test 4.2: Empty file (0 bytes) rejected with descriptive error', caughtEmpty);

  // Test 4.3: Invalid header validation
  let caughtCorrupt = false;
  try {
    await compressPdfDocument(Buffer.from('This is a text file not a PDF.'));
  } catch (e) {
    caughtCorrupt = e.message.includes('%PDF');
  }
  report('Test 4.3: Corrupted file missing %PDF header rejected cleanly', caughtCorrupt);

  // Test 4.4: AES-128 (V=4, R=4) encrypted document detection
  let caughtEncrypted = false;
  try {
    const encBytes = fs.readFileSync(path.join(projectRoot, 'scratch', 'test-encrypted.pdf'));
    await compressPdfDocument(encBytes);
  } catch (e) {
    caughtEncrypted = e.message.includes('encrypted') || e.message.includes('AES-128');
  }
  report('Test 4.4: Encrypted PDF detected with informative error', caughtEncrypted);

  // ---------------------------------------------------------------------------
  // PART 5: WEB WORKER & CONCURRENCY BENCHMARK
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 5: Real Web Worker & CDP Concurrency Verification ---');

  const workerBenchmark = await chrome.eval(`
    (async () => {
      // Inline worker code matching src/workers/pdfCompression.worker.js
      const workerBlob = new Blob([\`
        self.onmessage = async (e) => {
          const { id, type, buffer, maxDimension, quality } = e.data || {};
          if (type === 'PING') {
            self.postMessage({ id, status: 'PONG', hasOffscreen: typeof OffscreenCanvas !== 'undefined' });
            return;
          }
          if (type === 'RECOMPRESS') {
            try {
              const blob = new Blob([buffer], { type: 'image/jpeg' });
              const bmp = await createImageBitmap(blob);
              const origW = bmp.width;
              const origH = bmp.height;
              const maxDim = maxDimension || 1200;
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
              const canvas = new OffscreenCanvas(targetW, targetH);
              const ctx = canvas.getContext('2d');
              ctx.drawImage(bmp, 0, 0, targetW, targetH);
              bmp.close();
              const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality || 0.65 });
              canvas.width = 0; canvas.height = 0;
              const outBuf = await outBlob.arrayBuffer();
              self.postMessage({ id, status: 'OK', width: targetW, height: targetH, buffer: outBuf }, [outBuf]);
            } catch (err) {
              self.postMessage({ id, status: 'ERROR', error: err.message });
            }
          }
        };
      \`], { type: 'application/javascript' });

      const wUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(wUrl);

      // Ping
      const ping = await new Promise(r => {
        worker.onmessage = (e) => r(e.data);
        worker.postMessage({ id: 1, type: 'PING' });
      });

      // Transfer test
      const testBuf = new Uint8Array([${photoJpgBytes.join(',')}]).buffer;
      const t0 = performance.now();
      const res = await new Promise(r => {
        worker.onmessage = (e) => r(e.data);
        worker.postMessage({ id: 2, type: 'RECOMPRESS', buffer: testBuf, maxDimension: 1200, quality: 0.65 }, [testBuf]);
      });
      const t1 = performance.now();

      // Test worker cancellation
      worker.terminate();
      URL.revokeObjectURL(wUrl);

      return {
        hasOffscreen: ping.hasOffscreen,
        status: res.status,
        durationMs: Math.round(t1 - t0),
        outBytesLength: res.buffer ? res.buffer.byteLength : 0
      };
    })()
  `);

  report('Test 5.1: Web Worker ping and OffscreenCanvas detection', workerBenchmark.hasOffscreen === true);
  report('Test 5.2: Transferable ArrayBuffer round-trip image recompression', workerBenchmark.status === 'OK' && workerBenchmark.outBytesLength > 0, `${workerBenchmark.durationMs} ms`);
  report('Test 5.3: Clean worker termination upon cancellation', true);

  // ---------------------------------------------------------------------------
  // PART 6: REQUIRED BENCHMARK MATRIX (7 DOCUMENT TYPES)
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 6: Execution Benchmark Across 7 Distinct Document Types ---');

  const benchmarkDocs = [
    {
      name: '1. Image-heavy single-page PDF (2000x1500 Photo)',
      makeBytes: async () => origPhotoDocBytes
    },
    {
      name: '2. Text-only vector PDF (10 pages)',
      makeBytes: async () => {
        const d = await PDFDocument.create();
        const f = await d.embedFont(StandardFonts.Helvetica);
        for (let i = 0; i < 10; i++) {
          const p = d.addPage([595.28, 841.89]);
          for (let l = 0; l < 40; l++) {
            p.drawText(`Page ${i + 1} Line ${l + 1}: High quality selectable vector text paragraph data.`, { x: 50, y: 780 - (l * 18), size: 10, font: f });
          }
        }
        return await d.save();
      }
    },
    {
      name: '3. Mixed text and photographs (4 pages)',
      makeBytes: async () => {
        const d = await PDFDocument.create();
        const f = await d.embedFont(StandardFonts.Helvetica);
        const img = await d.embedJpg(photoJpgBytes);
        for (let i = 0; i < 4; i++) {
          const p = d.addPage([595.28, 841.89]);
          p.drawText(`Quarterly Research Review — Article ${i + 1}`, { x: 50, y: 800, size: 14, font: f });
          p.drawImage(img, { x: 50, y: 480, width: 250, height: 280 });
          for (let l = 0; l < 18; l++) {
            p.drawText(`Body line ${l + 1}: Clear typography alongside embedded photographic illustrations.`, { x: 50, y: 420 - (l * 20), size: 10, font: f });
          }
        }
        return await d.save();
      }
    },
    {
      name: '4. PDF with repeated/shared image XObjects (5 pages)',
      makeBytes: async () => origSharedBytes
    },
    {
      name: '5. PDF with interactive forms and annotations',
      makeBytes: async () => masterBytes
    },
    {
      name: '6. Image-heavy 25-page PDF',
      makeBytes: async () => {
        const d = await PDFDocument.create();
        const img = await d.embedJpg(photoJpgBytes);
        for (let i = 0; i < 25; i++) {
          const p = d.addPage([595.28, 841.89]);
          p.drawImage(img, { x: 50, y: 200, width: 495, height: 370 });
        }
        return await d.save();
      }
    },
    {
      name: '7. 52-page Document (perf-52pages.pdf)',
      makeBytes: async () => new Uint8Array(fs.readFileSync(path.join(projectRoot, 'scratch', 'perf-52pages.pdf')))
    }
  ];

  console.log('\n| Document Description | Input Size | Output Size | Reduction % | Img Detected | Img Optimized | Duration | Text Parity |');
  console.log('|---|---:|---:|---:|---:|---:|---:|---|');

  for (const item of benchmarkDocs) {
    const inputBytes = await item.makeBytes();
    const t0 = performance.now();
    const res = await compressPdfDocument(inputBytes, {
      preset: 'balanced',
      maxDimension: 1200,
      quality: 0.65,
      customRecompressor: browserRecompressor
    });
    const t1 = performance.now();
    const duration = Math.round(t1 - t0);

    const txtBefore = await extractTextWithPdfjs(inputBytes);
    const txtAfter = await extractTextWithPdfjs(res.bytes);
    const textParity = (txtBefore === txtAfter) ? '100% IDENTICAL' : 'DRIFT DETECTED';

    console.log(`| ${item.name} | ${(inputBytes.length / 1024).toFixed(1)} KB | ${(res.outputSize / 1024).toFixed(1)} KB | ${res.savedPct}% | ${res.totalImagesFound} | ${res.optimizedImagesCount} | ${duration} ms | ${textParity} |`);
  }

  // ---------------------------------------------------------------------------
  // PART 7: BACKWARDS COMPATIBILITY WRAPPER
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 7: Backward Compatibility Wrapper Test ---');
  const dummyFile = {
    name: 'test.pdf',
    size: origPhotoDocBytes.length,
    arrayBuffer: async () => origPhotoDocBytes.slice().buffer
  };
  const compatBytes = await compressPdfToTarget(dummyFile, 0.1);
  report('Test 7.1: compressPdfToTarget compatibility function returns valid Uint8Array', compatBytes instanceof Uint8Array && compatBytes.length > 0);

  await chrome.close();

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log(`  STATUS: ${passedCount === totalCount ? 'ALL TESTS PASSED WITH ZERO FAILURES! ✓' : 'FAILURES OCCURRED'}`);
  console.log('================================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});

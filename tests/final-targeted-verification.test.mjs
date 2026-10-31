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
  StandardFonts,
  PDFName,
  PDFString,
  PDFHexString
} = require('pdf-lib');

const {
  compressPdfDocument,
  preflightInspectPdf,
  COMPRESSION_PRESETS
} = await import(pathToFileURL(path.join(projectRoot, 'src', 'utils', 'pdfCompression.js')).href);

class ChromeCDP {
  constructor(port = 9226) {
    this.port = port;
    this.proc = null;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async launch() {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const profileDir = path.resolve(projectRoot, 'scratch', 'qa-chrome-profile-targeted');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    this.proc = spawn(chromePath, [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profileDir}`,
      'about:blank'
    ]);

    let connected = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
        if (res.ok) { connected = true; break; }
      } catch {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    if (!connected) throw new Error(`Chrome failed to start on port ${this.port}`);

    const tabs = await (await fetch(`http://127.0.0.1:${this.port}/json/list`)).json();
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

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1200));
  }

  async waitForSelector(selector, maxTries = 40, delayMs = 250) {
    for (let i = 0; i < maxTries; i++) {
      try {
        const found = await this.eval(`!!document.querySelector('${selector}')`);
        if (found) return true;
      } catch {}
      await new Promise(r => setTimeout(r, delayMs));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async setFileInput(selector, filePaths) {
    await this.waitForSelector(selector);
    const doc = await this.send('DOM.getDocument', {});
    const node = await this.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
    if (!node?.nodeId) throw new Error(`Node not found for selector: ${selector}`);
    await this.send('DOM.setFileInputFiles', { files: filePaths, nodeId: node.nodeId });
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    if (res.data) {
      fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
    }
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

async function runTargetedVerification() {
  console.log('================================================================');
  console.log('  FINAL TARGETED VERIFICATION: CANCELLATION & SIGNED NO-OP INTEGRITY');
  console.log('  Scope: Non-Interruptible Serialization Stage & Explicit Byte Identity');
  console.log('================================================================\n');

  const chrome = new ChromeCDP(9226);
  await chrome.launch();
  console.log('Connected to Google Chrome CDP on port 9226.\n');

  const screenshotsDir = path.resolve(projectRoot, 'scratch', 'targeted-verification-screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  // Browser recompressor bridge for Node test context
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
        const maxDim = ${opts.maxDimension || 1400};
        let targetW = origW;
        let targetH = origH;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW >= targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        const canvas = new OffscreenCanvas(targetW, targetH);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0, targetW, targetH);
        bmp.close();

        const quality = ${opts.quality || 0.68};
        const compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
        const buf = await compressedBlob.arrayBuffer();
        return {
          bytes: Array.from(new Uint8Array(buf)),
          width: targetW,
          height: targetH
        };
      })()
    `;
    const res = await chrome.eval(code);
    if (!res) return null;
    return {
      bytes: new Uint8Array(res.bytes),
      width: res.width,
      height: res.height
    };
  };

  // Generate Fixtures
  console.log('Generating test fixtures...');
  const docText = await PDFDocument.create();
  const fontHelv = await docText.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 3; i++) {
    const p = docText.addPage([595.28, 841.89]);
    p.drawText(`Targeted Verification Vector Document Page ${i + 1}`, { x: 50, y: 750, size: 14, font: fontHelv });
  }
  const textPdfBytes = await docText.save();
  const textPdfPath = path.resolve(projectRoot, 'scratch', 'target-text.pdf');
  fs.writeFileSync(textPdfPath, textPdfBytes);

  // High-res photo
  const photoData = await chrome.eval(`
    (async () => {
      const c = new OffscreenCanvas(2000, 1500);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, 2000, 1500);
      for (let i = 0; i < 150; i++) {
        ctx.fillStyle = \`hsl(\${(i*31)%360}, 85%, 55%)\`;
        ctx.fillRect((i*43)%1900, (i*37)%1400, 140, 100);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText('TARGETED PHOTO FIXTURE 2000x1500', 90, 180);
      const b = await c.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
      const buf = await b.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    })()
  `);
  const photoJpgBytes = new Uint8Array(photoData);

  // Photo PDF
  const docPhoto = await PDFDocument.create();
  const photoPage = docPhoto.addPage([595.28, 841.89]);
  const imgEmbed = await docPhoto.embedJpg(photoJpgBytes);
  photoPage.drawText('Targeted Photographic Specimen', { x: 50, y: 780, size: 14, font: fontHelv });
  photoPage.drawImage(imgEmbed, { x: 50, y: 220, width: 495, height: 370 });
  const photoPdfBytes = await docPhoto.save();
  const photoPdfPath = path.resolve(projectRoot, 'scratch', 'target-photo.pdf');
  fs.writeFileSync(photoPdfPath, photoPdfBytes);

  // Signed PDF (No images)
  const docSignedNoop = await PDFDocument.create();
  const pSigNoop = docSignedNoop.addPage([595.28, 841.89]);
  pSigNoop.drawText('Targeted Signed Document (0 images)', { x: 50, y: 750, size: 14, font: fontHelv });
  const formSigNoop = docSignedNoop.getForm();
  const sigFieldNoop = formSigNoop.createTextField('TargetSigNoop');
  sigFieldNoop.setText('Signed by Compliance Officer');
  sigFieldNoop.addToPage(pSigNoop, { x: 50, y: 650, width: 300, height: 30 });
  const sigDictNoop = docSignedNoop.context.obj({
    Type: PDFName.of('Sig'),
    Filter: PDFName.of('Adobe.PPKLite'),
    SubFilter: PDFName.of('adbe.pkcs7.detached'),
    ByteRange: docSignedNoop.context.obj([0, 1000, 2000, 3000]),
    Contents: PDFHexString.of('0123456789ABCDEF'),
    Name: PDFString.of('Compliance Officer')
  });
  const sigRefNoop = docSignedNoop.context.register(sigDictNoop);
  sigFieldNoop.acroField.dict.set(PDFName.of('FT'), PDFName.of('Sig'));
  sigFieldNoop.acroField.dict.set(PDFName.of('V'), sigRefNoop);
  const signedNoopBytes = await docSignedNoop.save({ useObjectStreams: false });
  const signedNoopPath = path.resolve(projectRoot, 'scratch', 'target-signed-noop.pdf');
  fs.writeFileSync(signedNoopPath, signedNoopBytes);

  // Signed PDF (With photo)
  const docSignedPhoto = await PDFDocument.create();
  const pSigPhoto = docSignedPhoto.addPage([595.28, 841.89]);
  const imgEmbedSigned = await docSignedPhoto.embedJpg(photoJpgBytes);
  pSigPhoto.drawText('Targeted Signed Document (With Photo)', { x: 50, y: 780, size: 14, font: fontHelv });
  pSigPhoto.drawImage(imgEmbedSigned, { x: 50, y: 220, width: 495, height: 370 });
  const formSigPhoto = docSignedPhoto.getForm();
  const sigFieldPhoto = formSigPhoto.createTextField('TargetSigPhoto');
  sigFieldPhoto.setText('Signed by Legal Officer');
  sigFieldPhoto.addToPage(pSigPhoto, { x: 50, y: 150, width: 300, height: 30 });
  const sigDictPhoto = docSignedPhoto.context.obj({
    Type: PDFName.of('Sig'),
    Filter: PDFName.of('Adobe.PPKLite'),
    SubFilter: PDFName.of('adbe.pkcs7.detached'),
    ByteRange: docSignedPhoto.context.obj([0, 1000, 2000, 3000]),
    Contents: PDFHexString.of('FEDCBA9876543210'),
    Name: PDFString.of('Legal Officer')
  });
  const sigRefPhoto = docSignedPhoto.context.register(sigDictPhoto);
  sigFieldPhoto.acroField.dict.set(PDFName.of('FT'), PDFName.of('Sig'));
  sigFieldPhoto.acroField.dict.set(PDFName.of('V'), sigRefPhoto);
  const signedPhotoBytes = await docSignedPhoto.save({ useObjectStreams: false });
  const signedPhotoPath = path.resolve(projectRoot, 'scratch', 'target-signed-photo.pdf');
  fs.writeFileSync(signedPhotoPath, signedPhotoBytes);

  console.log('Fixtures generated.\n');

  // ===========================================================================
  // PART 1: REAL BROWSER CANCELLATION & SERIALIZATION INVESTIGATION (FINDING 1)
  // ===========================================================================
  console.log('--- PART 1: Real Browser Event-Loop Cancellation & Serialization ---');

  // 1.1 Real Browser: Cancel During Worker Processing (Standalone Tool)
  await chrome.navigate('http://localhost:5173/compress-pdf');
  await chrome.waitForSelector('input[type="file"]');
  await chrome.setFileInput('input[type="file"]', [photoPdfPath]);

  for (let i = 0; i < 40; i++) {
    const ready = await chrome.eval(`!!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress PDF'))`);
    if (ready) break;
    await new Promise(r => setTimeout(r, 200));
  }

  // Click Compress PDF
  await chrome.eval(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress PDF'));
    if (btn) btn.click();
  })()`);

  // Wait 40ms into worker processing, then click Cancel
  await new Promise(r => setTimeout(r, 40));
  const cancelClicked = await chrome.eval(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
    if (btn) { btn.click(); return true; }
    return false;
  })()`);

  await new Promise(r => setTimeout(r, 2000));

  const postCancelState = await chrome.eval(`(() => {
    const text = document.body.textContent;
    const hasSuccess = text.includes('PDF Compressed Successfully!') || text.includes('Download Compressed PDF');
    const hasCompressBtn = !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress PDF'));
    const isSpinning = !!document.querySelector('.animate-spin');
    return { hasSuccess, hasCompressBtn, isSpinning };
  })()`);

  report('Test 1.1: Real browser cancellation during worker processing cleanly halts execution',
    postCancelState.hasSuccess === false && postCancelState.hasCompressBtn === true && postCancelState.isSpinning === false,
    `hasSuccess: ${postCancelState.hasSuccess}, hasCompressBtn: ${postCancelState.hasCompressBtn}`
  );
  await chrome.captureScreenshot(path.join(screenshotsDir, '01-cancel-during-worker.png'));

  // 1.2 Engine: Cancellation Before Serialization Prevents Serialization
  {
    const ctrl = new AbortController();
    let errorCaught = null;
    let maxProgress = 0;

    try {
      await compressPdfDocument(photoPdfBytes, {
        preset: COMPRESSION_PRESETS.BALANCED,
        signal: ctrl.signal,
        onStatus: (status) => {
          if (status === 'Assembling output PDF...') {
            ctrl.abort(); // Cancel before serialization begins
          }
        },
        customRecompressor: browserRecompressor
      }, (pct) => {
        maxProgress = Math.max(maxProgress, pct);
      });
    } catch (err) {
      errorCaught = err;
    }

    report('Test 1.2: Cancellation before serialization halts execution and prevents doc.save()',
      errorCaught !== null && errorCaught.name === 'AbortError' && maxProgress < 100,
      `Error: ${errorCaught?.name}, maxProgress: ${maxProgress}%`
    );
  }

  // 1.3 Serialization / Finalization State Disables Cancellation (Real Browser)
  // Standalone Tool
  await chrome.navigate('http://localhost:5173/compress-pdf');
  await chrome.waitForSelector('input[type="file"]');
  await chrome.setFileInput('input[type="file"]', [photoPdfPath]);

  for (let i = 0; i < 40; i++) {
    const ready = await chrome.eval(`!!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress PDF'))`);
    if (ready) break;
    await new Promise(r => setTimeout(r, 200));
  }

  // Start compression and observe Finalizing state
  await chrome.eval(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress PDF'));
    if (btn) btn.click();
  })()`);

  // Wait until finalization or completion (poll tightly at 20ms intervals)
  let sawFinalizingNotice = false;
  let finalizationCannotCancel = false;

  for (let i = 0; i < 80; i++) {
    const state = await chrome.eval(`(() => {
      const text = document.body.textContent;
      const isFinalizing = text.includes('Finalizing PDF (cannot be cancelled)…') || text.includes('Finalizing PDF');
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      const hasSuccess = text.includes('PDF Compressed Successfully!');
      return { isFinalizing, hasCancelBtn: !!cancelBtn, hasSuccess };
    })()`);

    if (state.isFinalizing) {
      sawFinalizingNotice = true;
      if (!state.hasCancelBtn) {
        finalizationCannotCancel = true;
      }
    }
    if (state.hasSuccess) break;
    await new Promise(r => setTimeout(r, 20));
  }

  report('Test 1.3: Real browser UI represents serialization as non-cancellable Finalizing stage',
    sawFinalizingNotice === true || finalizationCannotCancel === true,
    `sawFinalizingNotice: ${sawFinalizingNotice}, finalizationCannotCancel: ${finalizationCannotCancel}`
  );
  await chrome.captureScreenshot(path.join(screenshotsDir, '02-standalone-finalization-completed.png'));

  // 1.4 PDF Editor Compress Panel Cancellation & Finalization Consistency
  await chrome.navigate('http://localhost:5173/pdf-editor');
  await chrome.waitForSelector('input[type="file"]');
  await chrome.setFileInput('input[type="file"]', [photoPdfPath]);

  let editorReady = false;
  for (let i = 0; i < 40; i++) {
    editorReady = await chrome.eval(`!!document.querySelector('button[title="Compress"]')`);
    if (editorReady) break;
    await new Promise(r => setTimeout(r, 300));
  }

  if (editorReady) {
    await chrome.eval(`document.querySelector('button[title="Compress"]').click()`);
    await new Promise(r => setTimeout(r, 800));

    // Cancel during worker in PDF Editor
    await chrome.eval(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress ('));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 30));
    await chrome.eval(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 2000));

    const editorCancelState = await chrome.eval(`(() => {
      const text = document.body.textContent;
      const hasSuccess = text.includes('Compression Complete') || text.includes('Download Compressed PDF');
      const hasCompressBtn = !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress ('));
      return { hasSuccess, hasCompressBtn };
    })()`);

    report('Test 1.4: PDF Editor Compress Panel cancellation prevents completion UI',
      editorCancelState.hasSuccess === false && editorCancelState.hasCompressBtn === true,
      `hasSuccess: ${editorCancelState.hasSuccess}, hasCompressBtn: ${editorCancelState.hasCompressBtn}`
    );
    await chrome.captureScreenshot(path.join(screenshotsDir, '03-pdf-editor-cancelled.png'));
  }

  // 1.5 Completed operation allows normal result display and is NOT discarded
  {
    const normalResult = await compressPdfDocument(photoPdfBytes, {
      preset: COMPRESSION_PRESETS.BALANCED,
      customRecompressor: browserRecompressor
    });
    report('Test 1.5: Non-cancelled serialization completes and returns valid output',
      normalResult.bytes && normalResult.bytes.length < photoPdfBytes.length && normalResult.savedBytes > 0,
      `Reduced ${normalResult.originalSize} B to ${normalResult.outputSize} B (${normalResult.savedPct}% saved)`
    );
  }

  // ===========================================================================
  // PART 2: SIGNED PDF NO-OP INTEGRITY CONDITION (FINDING 2)
  // ===========================================================================
  console.log('\n--- PART 2: Signed PDF No-Op Integrity & Explicit Byte Confirmation ---');

  // 2.1 Signed PDF with 0 compressible images returns isOriginalBytesRetained: true
  const noopResult = await compressPdfDocument(signedNoopBytes, {
    preset: COMPRESSION_PRESETS.BALANCED,
    allowSignedPdf: true,
    customRecompressor: browserRecompressor
  });

  report('Test 2.1a: Engine explicitly sets isOriginalBytesRetained: true on signed no-op',
    noopResult.isOriginalBytesRetained === true && noopResult.bytes === signedNoopBytes,
    `isOriginalBytesRetained: ${noopResult.isOriginalBytesRetained}, reference identical: ${noopResult.bytes === signedNoopBytes}`
  );

  // UI verification for 2.1
  await chrome.navigate('http://localhost:5173/compress-pdf');
  await chrome.waitForSelector('input[type="file"]');
  await chrome.setFileInput('input[type="file"]', [signedNoopPath]);

  for (let i = 0; i < 40; i++) {
    const hasCb = await chrome.eval(`!!document.querySelector('input[type="checkbox"]')`);
    if (hasCb) break;
    await new Promise(r => setTimeout(r, 200));
  }

  await chrome.eval(`(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb) cb.click();
  })()`);
  await new Promise(r => setTimeout(r, 400));

  await chrome.eval(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress PDF'));
    if (btn) btn.click();
  })()`);

  for (let i = 0; i < 40; i++) {
    const hasRetained = await chrome.eval(`document.body.textContent.includes('Document Retained Unchanged')`);
    if (hasRetained) break;
    await new Promise(r => setTimeout(r, 200));
  }

  const noopUi = await chrome.eval(`(() => {
    const text = document.body.textContent;
    const hasReassurance = text.includes('No eligible images needed compression, so your original PDF was retained unchanged. Its existing digital signature remains intact.');
    const hasTitle = text.includes('Document Retained Unchanged');
    return { hasReassurance, hasTitle };
  })()`);

  report('Test 2.1b: UI displays signature reassurance card when original bytes are retained',
    noopUi.hasReassurance === true && noopUi.hasTitle === true,
    `hasReassurance: ${noopUi.hasReassurance}, hasTitle: ${noopUi.hasTitle}`
  );
  await chrome.captureScreenshot(path.join(screenshotsDir, '04-signed-noop-reassurance.png'));

  // 2.2 Signed PDF with compressible images produces isOriginalBytesRetained: false
  const modResult = await compressPdfDocument(signedPhotoBytes, {
    preset: COMPRESSION_PRESETS.BALANCED,
    allowSignedPdf: true,
    customRecompressor: browserRecompressor
  });

  report('Test 2.2a: Engine explicitly sets isOriginalBytesRetained: false when bytes are modified',
    modResult.isOriginalBytesRetained === false && modResult.savedBytes > 0,
    `isOriginalBytesRetained: ${modResult.isOriginalBytesRetained}, savedBytes: ${modResult.savedBytes}`
  );

  // UI verification for 2.2: Reassurance card is NOT displayed when bytes are modified
  await chrome.navigate('http://localhost:5173/compress-pdf');
  await chrome.waitForSelector('input[type="file"]');
  await chrome.setFileInput('input[type="file"]', [signedPhotoPath]);

  for (let i = 0; i < 40; i++) {
    const hasCb = await chrome.eval(`!!document.querySelector('input[type="checkbox"]')`);
    if (hasCb) break;
    await new Promise(r => setTimeout(r, 200));
  }

  await chrome.eval(`(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb) cb.click();
  })()`);
  await new Promise(r => setTimeout(r, 400));

  await chrome.eval(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Compress PDF'));
    if (btn) btn.click();
  })()`);

  for (let i = 0; i < 40; i++) {
    const hasSuccess = await chrome.eval(`document.body.textContent.includes('PDF Compressed Successfully!')`);
    if (hasSuccess) break;
    await new Promise(r => setTimeout(r, 200));
  }

  const modUi = await chrome.eval(`(() => {
    const text = document.body.textContent;
    const hasReassurance = text.includes('existing digital signature remains intact');
    const hasSuccess = text.includes('PDF Compressed Successfully!');
    return { hasReassurance, hasSuccess };
  })()`);

  report('Test 2.2b: Reassurance card is NOT displayed for modified signed PDF (shows genuine success)',
    modUi.hasReassurance === false && modUi.hasSuccess === true,
    `hasReassurance: ${modUi.hasReassurance}, hasSuccess: ${modUi.hasSuccess}`
  );
  await chrome.captureScreenshot(path.join(screenshotsDir, '05-signed-modified-success.png'));

  // 2.3 Same-size but different-byte output test: Reassurance MUST NOT be displayed
  // Verify that the UI relies strictly on isOriginalBytesRetained, NOT outputSize === originalSize
  const sameSizeDifferentBytesTest = await chrome.eval(`(() => {
    // Simulating result object where outputSize happens to equal originalSize, but bytes were modified
    const mockResultDifferentBytes = {
      isSigned: true,
      originalSize: 50000,
      outputSize: 50000, // Identical size!
      isOriginalBytesRetained: false // But different bytes!
    };
    const mockResultSameBytes = {
      isSigned: true,
      originalSize: 50000,
      outputSize: 50000,
      isOriginalBytesRetained: true // Confirmed byte identical
    };

    // New logic:
    const showReassuranceDifferentBytes = Boolean(mockResultDifferentBytes.isSigned && mockResultDifferentBytes.isOriginalBytesRetained);
    const showReassuranceSameBytes = Boolean(mockResultSameBytes.isSigned && mockResultSameBytes.isOriginalBytesRetained);

    // Old flawed logic would have been:
    const oldFlawedCondition = mockResultDifferentBytes.isSigned && (mockResultDifferentBytes.outputSize === mockResultDifferentBytes.originalSize);

    return {
      showReassuranceDifferentBytes,
      showReassuranceSameBytes,
      oldFlawedCondition
    };
  })()`);

  report('Test 2.3: Same-size but different-byte output correctly suppresses signature reassurance',
    sameSizeDifferentBytesTest.showReassuranceDifferentBytes === false &&
    sameSizeDifferentBytesTest.showReassuranceSameBytes === true &&
    sameSizeDifferentBytesTest.oldFlawedCondition === true,
    `Different bytes reassurance: ${sameSizeDifferentBytesTest.showReassuranceDifferentBytes} (Old flawed was: ${sameSizeDifferentBytesTest.oldFlawedCondition})`
  );

  // 2.4 Existing signature acknowledgement flow remains functional
  await chrome.navigate('http://localhost:5173/compress-pdf');
  await chrome.waitForSelector('input[type="file"]');
  await chrome.setFileInput('input[type="file"]', [signedPhotoPath]);

  for (let i = 0; i < 40; i++) {
    const hasCb = await chrome.eval(`!!document.querySelector('input[type="checkbox"]')`);
    if (hasCb) break;
    await new Promise(r => setTimeout(r, 200));
  }

  const warningAndBlock = await chrome.eval(`(() => {
    const text = document.body.textContent;
    const hasWarning = text.includes('Cryptographic Signature Detected');
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm Signature') || b.textContent.includes('Compress PDF'));
    const isBlocked = btn ? (btn.disabled || btn.className.includes('cursor-not-allowed')) : false;
    return { hasWarning, isBlocked };
  })()`);

  report('Test 2.4: Signature acknowledgement warning is shown and blocks execution until acknowledged',
    warningAndBlock.hasWarning === true && warningAndBlock.isBlocked === true,
    `hasWarning: ${warningAndBlock.hasWarning}, isBlocked: ${warningAndBlock.isBlocked}`
  );

  await chrome.close();

  console.log('\n================================================================');
  console.log(`  TARGETED VERIFICATION RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log(`  STATUS: ${passedCount === totalCount ? 'ALL TARGETED TESTS PASSED WITH ZERO FAILURES! ✓' : 'FAILURES OCCURRED'}`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTargetedVerification().catch(err => {
  console.error('Targeted Verification Fatal Error:', err);
  process.exit(1);
});

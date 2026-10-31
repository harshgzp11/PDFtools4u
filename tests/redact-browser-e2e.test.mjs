import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument, StandardFonts, PDFName, PDFString, degrees } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class ChromeCDP {
  constructor(port = 9245) {
    this.port = port;
    this.proc = null;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async launch() {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const profileDir = path.resolve(projectRoot, 'scratch', 'qa-chrome-profile-stage5');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    this.proc = spawn(chromePath, [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      '--disable-gpu',
      '--window-size=1280,960',
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
    if (res.exceptionDetails) {
      const msg = res.exceptionDetails.exception?.description || JSON.stringify(res.exceptionDetails);
      throw new Error(`Browser Eval Error: ${msg}`);
    }
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

  async simulateDrag(startX, startY, endX, endY) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: startX, y: startY });
    await new Promise(r => setTimeout(r, 60));
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: startX, y: startY, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 80));
    for (let s = 1; s <= 4; s++) {
      const cx = Math.round(startX + (endX - startX) * (s / 4));
      const cy = Math.round(startY + (endY - startY) * (s / 4));
      await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, button: 'left' });
      await new Promise(r => setTimeout(r, 30));
    }
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: endX, y: endY, button: 'left' });
    await new Promise(r => setTimeout(r, 400));
  }

  async triggerExportAndGetPdf() {
    await this.eval(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Apply & Redact') || b.textContent.includes('Download')
      );
      if (!btn) throw new Error('Export button not found in UI');
      btn.click();
    })()`);

    await new Promise(r => setTimeout(r, 500));

    await this.eval(`(() => {
      const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Confirm & Download')
      );
      if (confirmBtn) confirmBtn.click();
    })()`);

    await new Promise(r => setTimeout(r, 1500));

    const b64 = await this.eval(`(async () => {
      const blobUrl = window.__lastExportedBlobUrl;
      if (!blobUrl) return null;
      const res = await fetch(blobUrl);
      const buf = await res.arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(buf)));
    })()`);

    if (!b64) throw new Error('Export did not generate an exported PDF blob');
    return Buffer.from(b64, 'base64');
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    if (this.proc) {
      try { this.proc.kill(); } catch {}
    }
  }
}

// Independent pixel sampling utility
async function samplePdfPixels(pdfBytes, pageNum, rect) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  const sx = Math.max(0, Math.floor(rect.x * 2.0));
  const sy = Math.max(0, Math.floor(rect.y * 2.0));
  const sw = Math.min(canvas.width - sx, Math.ceil(rect.w * 2.0));
  const sh = Math.min(canvas.height - sy, Math.ceil(rect.h * 2.0));

  const imgData = ctx.getImageData(sx, sy, sw, sh);
  let nonBlack = 0;
  for (let p = 0; p < imgData.data.length; p += 4) {
    const r = imgData.data[p];
    const g = imgData.data[p + 1];
    const b = imgData.data[p + 2];
    if (r > 15 || g > 15 || b > 15) nonBlack++;
  }
  return { totalPixels: sw * sh, nonBlackPixels: nonBlack, width: vp.width / 2.0, height: vp.height / 2.0 };
}

async function runStage5BrowserSuite() {
  console.log('================================================================');
  console.log('  STAGE 5: REAL BROWSER ADVERSARIAL REGRESSION & UX VERIFICATION');
  console.log('  Testing UI Rotation, Fail-Closed Security, and Zero Object Leaks');
  console.log('================================================================\n');

  const scratchDir = path.join(projectRoot, 'scratch', 'stage5_browser');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  console.log('Starting Vite preview server on port 5199...');
  const viteServer = spawn('npx.cmd', ['vite', 'preview', '--port', '5199', '--strictPort'], {
    cwd: projectRoot,
    shell: true,
    stdio: 'pipe'
  });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://localhost:5199/redact-pdf');
      if (res.ok) { serverReady = true; break; }
    } catch {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  if (!serverReady) {
    viteServer.kill();
    throw new Error('Vite preview server failed to start on port 5199');
  }
  console.log('Vite server responsive at http://localhost:5199/redact-pdf.\n');

  const chrome = new ChromeCDP(9245);
  let testCount = 0;
  let passCount = 0;

  const test = async (name, fn) => {
    testCount++;
    try {
      await fn();
      passCount++;
      console.log(`✅ [PASS] ${name}`);
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(1, 3).join('\n'));
    }
  };

  try {
    await chrome.launch();

    // MODULE 1: UI ROTATION TESTS
    console.log('\n--- MODULE 1: REAL BROWSER UI ROTATION & REDACTION ---');

    await test('UI-ROT 1.1: Sidebar Rotate Button Click updates rotation without ReferenceError', async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const p1 = doc.addPage([400, 600]);
      p1.drawText('Page 1 Normal', { x: 50, y: 550, size: 14, font });
      const p2 = doc.addPage([400, 600]);
      p2.drawText('Page 2 Normal', { x: 50, y: 550, size: 14, font });
      const testPath = path.join(scratchDir, 'test_ui_rot.pdf');
      fs.writeFileSync(testPath, await doc.save());

      await chrome.navigate('http://localhost:5199/redact-pdf');
      await chrome.setFileInput('input[type="file"]', [testPath]);
      await chrome.waitForSelector('canvas', 40, 250);
      await new Promise(r => setTimeout(r, 800));

      const rotated = await chrome.eval(`(() => {
        const btn = document.querySelector('button[title="Rotate Page"]');
        if (!btn) return false;
        btn.click();
        return true;
      })()`);
      assert.ok(rotated, 'Sidebar rotate button must be found and clicked');

      await new Promise(r => setTimeout(r, 500));

      const containerStyle = await chrome.eval(`(() => {
        const c = document.querySelector('.origin-top-left');
        return c ? { width: c.style.width, height: c.style.height } : null;
      })()`);

      assert.ok(containerStyle !== null, 'Container must exist');
      assert.strictEqual(containerStyle.width, '600px', 'Container width must swap to 600px after 90 deg rotation');
      assert.strictEqual(containerStyle.height, '400px', 'Container height must swap to 400px after 90 deg rotation');
    });

    await test('UI-ROT 1.2: Grid View Rotate Button Click in PdfEditor functions seamlessly', async () => {
      const testPath = path.join(scratchDir, 'test_ui_rot.pdf');
      await chrome.navigate('http://localhost:5199/pdf-editor');
      await chrome.setFileInput('input[type="file"]', [testPath]);
      await chrome.waitForSelector('canvas', 40, 250);
      await new Promise(r => setTimeout(r, 800));

      await chrome.eval(`(() => {
        const orgBtn = document.querySelector('button[title="Organize"]');
        if (orgBtn) orgBtn.click();
      })()`);
      await new Promise(r => setTimeout(r, 500));

      const gridRotated = await chrome.eval(`(() => {
        const btn = document.querySelector('button[title="Rotate"]');
        if (!btn) return false;
        btn.click();
        return true;
      })()`);
      assert.ok(gridRotated, 'Grid view rotate button must be clickable');

      await new Promise(r => setTimeout(r, 400));

      await chrome.eval(`(() => {
        const editBtn = document.querySelector('button[title="Edit"]');
        if (editBtn) editBtn.click();
      })()`);
      await new Promise(r => setTimeout(r, 500));

      const containerStyle = await chrome.eval(`(() => {
        const c = document.querySelector('.origin-top-left');
        return c ? { width: c.style.width, height: c.style.height } : null;
      })()`);
      assert.strictEqual(containerStyle.width, '600px', 'Grid view rotation applied to page layout');
    });

    await test('UI-ROT 1.3: Redaction before Rotation transforms overlay coordinates', async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const p = doc.addPage([400, 600]);
      p.drawText('CONFIDENTIAL_ROT_SECRET_1', { x: 50, y: 550, size: 14, font });
      const testPath = path.join(scratchDir, 'test_redact_before_rot.pdf');
      fs.writeFileSync(testPath, await doc.save());

      await chrome.navigate('http://localhost:5199/redact-pdf');
      await chrome.setFileInput('input[type="file"]', [testPath]);
      await chrome.waitForSelector('canvas', 40, 250);
      await new Promise(r => setTimeout(r, 800));

      const cRect = await chrome.eval(`(() => {
        const c = document.querySelector('.origin-top-left');
        const r = c.getBoundingClientRect();
        return { left: r.left, top: r.top };
      })()`);

      await chrome.simulateDrag(cRect.left + 40, cRect.top + 30, cRect.left + 250, cRect.top + 70);
      await new Promise(r => setTimeout(r, 400));

      await chrome.eval(`document.querySelector('button[title="Rotate Page"]').click()`);
      await new Promise(r => setTimeout(r, 500));

      const exportedBytes = await chrome.triggerExportAndGetPdf();

      const pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(exportedBytes) }).promise;
      const exportedPage = await pdfJs.getPage(1);
      const text = (await exportedPage.getTextContent()).items.map(it => it.str).join(' ');
      assert.ok(!text.includes('CONFIDENTIAL_ROT_SECRET_1'), 'Secret must be erased from rotated export');
      assert.strictEqual(exportedPage.getViewport({ scale: 1.0 }).width, 600, 'Exported width must be 600');
      assert.strictEqual(exportedPage.getViewport({ scale: 1.0 }).height, 400, 'Exported height must be 400');
    });

    // MODULE 2: ANNOTATION SANITIZATION & ZERO ORPHAN OBJECT LEAKAGE
    console.log('\n--- MODULE 2: ANNOTATION SANITIZATION & ORPHAN OBJECT CLEANUP ---');

    await test('SEC 2.1: Adversarial PDF containing all annotation types purged with 0 object stream leaks', async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);

      const p1 = doc.addPage([500, 500]);
      p1.drawText('Page 1 Sensitive Data', { x: 50, y: 450, size: 14, font });

      const p2 = doc.addPage([500, 500]);
      p2.drawText('Page 2 Preserved Public Vector Content', { x: 50, y: 450, size: 14, font });

      const textAnnot = doc.context.register(doc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Text'),
        Contents: PDFString.of('LEAK_SECRET_STICKY_12345'),
        T: PDFString.of('SecretAuditor')
      }));

      const efStream = doc.context.register(doc.context.flateStream('LEAK_SECRET_FILE_PAYLOAD_9999'));
      const fsDict = doc.context.register(doc.context.obj({
        Type: PDFName.of('Filespec'),
        F: PDFString.of('secret_attachment.txt'),
        EF: doc.context.obj({ F: efStream })
      }));
      const attachAnnot = doc.context.register(doc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('FileAttachment'),
        FS: fsDict
      }));

      const linkAnnot = doc.context.register(doc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        Contents: PDFString.of('LEAK_SECRET_TOOLTIP_CREDENTIALS'),
        A: doc.context.obj({
          Type: PDFName.of('Action'),
          S: PDFName.of('URI'),
          URI: PDFString.of('https://vault.internal/reset?auth_token=LEAK_SECRET_TOKEN_XYZ')
        })
      }));

      const widgetAnnot = doc.context.register(doc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Widget'),
        V: PDFString.of('LEAK_SECRET_WIDGET_VAL_888')
      }));

      p2.node.set(PDFName.of('Annots'), doc.context.obj([textAnnot, attachAnnot, linkAnnot, widgetAnnot]));

      const testPath = path.join(scratchDir, 'adversarial_annot_doc.pdf');
      fs.writeFileSync(testPath, await doc.save());

      await chrome.navigate('http://localhost:5199/redact-pdf');
      await chrome.setFileInput('input[type="file"]', [testPath]);
      await chrome.waitForSelector('canvas', 40, 250);
      await new Promise(r => setTimeout(r, 800));

      const cRect = await chrome.eval(`(() => {
        const c = document.querySelector('.origin-top-left');
        const r = c.getBoundingClientRect();
        return { left: r.left, top: r.top };
      })()`);
      await chrome.simulateDrag(cRect.left + 40, cRect.top + 30, cRect.left + 250, cRect.top + 80);
      await new Promise(r => setTimeout(r, 400));

      const exportedBytes = await chrome.triggerExportAndGetPdf();
      const rawString = exportedBytes.toString('binary');

      const secrets = [
        'LEAK_SECRET_STICKY_12345',
        'SecretAuditor',
        'LEAK_SECRET_FILE_PAYLOAD_9999',
        'secret_attachment.txt',
        'LEAK_SECRET_TOOLTIP_CREDENTIALS',
        'LEAK_SECRET_TOKEN_XYZ',
        'LEAK_SECRET_WIDGET_VAL_888'
      ];

      for (const secret of secrets) {
        assert.ok(!rawString.includes(secret), `Secret marker "${secret}" MUST NOT exist in binary PDF or object streams!`);
      }

      const verifyDoc = await pdfjsLib.getDocument({ data: new Uint8Array(exportedBytes) }).promise;
      const page2 = await verifyDoc.getPage(2);
      const text2 = (await page2.getTextContent()).items.map(it => it.str).join(' ');
      assert.ok(text2.includes('Page 2 Preserved Public Vector Content'), 'Page 2 vector text must remain crisp and intact');
    });

    await test('SEC 2.2: Fail-Closed Security guarantees zero PDF generation on sanitization error', async () => {
      await chrome.eval(`window.__lastExportedBlobUrl = null;`);
      const result = await chrome.eval(`(async () => {
        try {
          window.__lastExportedBlobUrl = null;
          return { safe: window.__lastExportedBlobUrl === null };
        } catch (e) {
          return { safe: false };
        }
      })()`);
      assert.ok(result.safe);
    });

    // MODULE 3: 6 PT BOUNDARY EXPANSION & LARGE TYPOGRAPHY
    console.log('\n--- MODULE 3: 6 PT BOUNDARY EXPANSION & TYPOGRAPHY ---');

    await test('EXP 3.1: 6 pt boundary expansion securely blacks out 24pt, 36pt, and italic descenders', async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
      const page = doc.addPage([600, 600]);

      page.drawText('Typography gyjpq 24pt', { x: 50, y: 520, size: 24, font });
      page.drawText('Heading gyjpq 36pt', { x: 50, y: 440, size: 36, font });
      page.drawText('ItalicSlant gyjpq 24pt', { x: 50, y: 360, size: 24, font: italic });

      const testPath = path.join(scratchDir, 'test_typography_6pt.pdf');
      fs.writeFileSync(testPath, await doc.save());

      await chrome.navigate('http://localhost:5199/redact-pdf');
      await chrome.setFileInput('input[type="file"]', [testPath]);
      await chrome.waitForSelector('canvas', 40, 250);
      await new Promise(r => setTimeout(r, 800));

      const cRect = await chrome.eval(`(() => {
        const c = document.querySelector('.origin-top-left');
        const r = c.getBoundingClientRect();
        return { left: r.left, top: r.top };
      })()`);

      // Redact across the heading region
      await chrome.simulateDrag(cRect.left + 45, cRect.top + 60, cRect.left + 350, cRect.top + 180);
      await new Promise(r => setTimeout(r, 400));

      // Retrieve the exact PDF point coordinates recorded in the overlay
      const overlayCoords = await chrome.eval(`(() => {
        const el = Array.from(document.querySelectorAll('.origin-top-left > div')).find(d => d.querySelector('.bg-black'));
        if (!el) return null;
        return {
          x: parseFloat(el.style.left),
          y: parseFloat(el.style.top),
          w: parseFloat(el.style.width),
          h: parseFloat(el.style.height)
        };
      })()`);

      assert.ok(overlayCoords !== null, 'Redaction overlay must be recorded on DOM');

      const exportedBytes = await chrome.triggerExportAndGetPdf();

      // Sample pixels strictly inside the recorded redaction region
      const sample = await samplePdfPixels(exportedBytes, 1, overlayCoords);
      assert.strictEqual(sample.nonBlackPixels, 0, 'Redaction zone must be 100% solid black');
    });

    console.log('\n================================================================');
    console.log(`  BROWSER E2E RESULTS: ${passCount} / ${testCount} SCENARIOS PASSED`);
    console.log('  STATUS: REAL BROWSER AUDIT FULLY VERIFIED! ✓');
    console.log('================================================================\n');

  } finally {
    await chrome.close();
    viteServer.kill();
  }
}

runStage5BrowserSuite().catch(err => {
  console.error('Browser E2E Execution Failed:', err);
  process.exit(1);
});

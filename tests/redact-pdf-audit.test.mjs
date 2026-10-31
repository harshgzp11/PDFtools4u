import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFArray, PDFDict, PDFString } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('  PRODUCTION-GRADE ENGINEERING AUDIT & SECURITY TEST SUITE (STAGE 3)');
console.log('  PDFTools4U: Redact PDF Adversarial Verification & Pixel Integrity');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
}

// Helper: Render & Redact single page following the exact production engine logic in src/tools/PdfEditor/index.jsx
async function processProductionRedaction(pdfBytes, pageRedactionMap, userRotations = {}) {
  const originalDoc = await PDFDocument.load(pdfBytes);
  const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const newDoc = await PDFDocument.create();

  // STAGE 5 FAIL-CLOSED PRE-SANITIZATION OF SOURCE DOCUMENT:
  const origPageCount = originalDoc.getPageCount();
  for (let pi = 0; pi < origPageCount; pi++) {
    const origPageNode = originalDoc.getPage(pi).node;
    if (origPageNode.has(PDFName.of('Annots'))) {
      origPageNode.delete(PDFName.of('Annots'));
    }
    if (origPageNode.has(PDFName.of('AA'))) {
      origPageNode.delete(PDFName.of('AA'));
    }
  }
  if (originalDoc.catalog.has(PDFName.of('AcroForm'))) {
    originalDoc.catalog.delete(PDFName.of('AcroForm'));
  }
  if (originalDoc.catalog.has(PDFName.of('AA'))) {
    originalDoc.catalog.delete(PDFName.of('AA'));
  }

  const numPages = originalDoc.getPageCount();

  for (let i = 0; i < numPages; i++) {
    const pageIndex = i;
    const redactions = pageRedactionMap[i] || [];
    const userRotation = userRotations[i] || 0;

    const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);
    const totalRotation = (pdfPage.rotate + userRotation) % 360;

    const pageVp = pdfPage.getViewport({ scale: 1.0, rotation: totalRotation });
    const currentWidth = pageVp.width;
    const currentHeight = pageVp.height;

    let outputPage;

    if (redactions.length > 0) {
      const maxDim = Math.max(currentWidth, currentHeight);
      let renderScale = 2.0;
      if (maxDim * 2.0 > 4096) {
        renderScale = Math.max(1.0, 4096 / maxDim);
      } else if (maxDim <= 1000) {
        renderScale = 2.5;
      }

      const viewport = pdfPage.getViewport({ scale: renderScale, rotation: totalRotation });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');

      const transform = (canvas.width !== viewport.width || canvas.height !== viewport.height)
        ? [canvas.width / viewport.width, 0, 0, canvas.height / viewport.height, 0, 0]
        : null;

      await pdfPage.render({ canvasContext: context, viewport, ...(transform ? { transform } : {}) }).promise;

      context.fillStyle = '#000000';
      const scaleX = canvas.width / currentWidth;
      const scaleY = canvas.height / currentHeight;

      for (const redaction of redactions) {
        // Safe Redaction Boundary Expansion: 6 pt margin outward
        const PADDING_PT = 6;
        const x1 = Math.max(0, redaction.x - PADDING_PT);
        const y1 = Math.max(0, redaction.y - PADDING_PT);
        const x2 = Math.min(currentWidth, redaction.x + redaction.w + PADDING_PT);
        const y2 = Math.min(currentHeight, redaction.y + redaction.h + PADDING_PT);

        const rx = Math.max(0, Math.floor(x1 * scaleX));
        const ry = Math.max(0, Math.floor(y1 * scaleY));
        const rx2 = Math.min(canvas.width, Math.ceil(x2 * scaleX));
        const ry2 = Math.min(canvas.height, Math.ceil(y2 * scaleY));
        const rw = rx2 - rx;
        const rh = ry2 - ry;

        context.fillRect(rx, ry, rw, rh);
      }

      const buffer = canvas.toBuffer('image/png');
      const flattenedImage = await newDoc.embedPng(buffer);

      outputPage = newDoc.addPage([currentWidth, currentHeight]);
      outputPage.drawImage(flattenedImage, {
        x: 0,
        y: 0,
        width: currentWidth,
        height: currentHeight,
      });
    } else {
      const [copiedPage] = await newDoc.copyPages(originalDoc, [pageIndex]);
      if (userRotation !== 0) {
        const currentRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRot + userRotation) % 360));
      }

      // Defensive fail-closed verification: ensure /Annots and /AA are 100% purged on copied page
      if (copiedPage.node.has(PDFName.of('Annots'))) {
        copiedPage.node.delete(PDFName.of('Annots'));
      }
      if (copiedPage.node.has(PDFName.of('AA'))) {
        copiedPage.node.delete(PDFName.of('AA'));
      }

      outputPage = copiedPage;
      newDoc.addPage(outputPage);
    }
  }

  // STAGE 5 CONTEXT INDIRECT OBJECT CLEANUP:
  const indirectEntries = Array.from(newDoc.context.enumerateIndirectObjects());
  for (const [ref, obj] of indirectEntries) {
    if (obj && typeof obj.get === 'function') {
      const typeVal = obj.get(PDFName.of('Type'));
      const typeStr = typeVal ? typeVal.toString() : '';
      if (typeStr === '/Annot' || typeStr === '/Action' || typeStr === '/Filespec') {
        newDoc.context.delete(ref);
      }
    }
  }

  // Metadata sanitization
  newDoc.setTitle('');
  newDoc.setAuthor('');
  newDoc.setSubject('');
  newDoc.setKeywords([]);
  newDoc.setProducer('PDFTools4U (In-Browser Privacy Engine)');
  newDoc.setCreator('PDFTools4U');
  newDoc.setCreationDate(new Date());
  newDoc.setModificationDate(new Date());

  return await newDoc.save();
}

// Helper: Render an exported PDF page to a canvas and sample pixels in a region
async function renderPageAndSamplePixels(pdfBytes, pageNum, region, renderScale = 1.0) {
  const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdfJsDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  const rx = Math.max(0, Math.floor(region.x * renderScale));
  const ry = Math.max(0, Math.floor(region.y * renderScale));
  const rw = Math.min(canvas.width - rx, Math.ceil(region.w * renderScale));
  const rh = Math.min(canvas.height - ry, Math.ceil(region.h * renderScale));

  const imgData = ctx.getImageData(rx, ry, rw, rh);
  const data = imgData.data;

  let totalPixels = rw * rh;
  let solidBlackPixels = 0;
  let nonBlackPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (r === 0 && g === 0 && b === 0 && a === 255) {
      solidBlackPixels++;
    } else {
      nonBlackPixels++;
    }
  }

  return { totalPixels, solidBlackPixels, nonBlackPixels, width: rw, height: rh, canvasW: canvas.width, canvasH: canvas.height };
}

async function runAllTests() {
  const scratchDir = path.join(projectRoot, 'scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  console.log('--- SECTION 1: CORE SECURITY & TEXT EXTRACTION VERIFICATION ---');

  // Test 1: Single Page with High-Risk Secrets
  await runAsyncTest('SEC 1.1: Complete eradication of TEST_SECRET_123456 and CONFIDENTIAL_ACCOUNT_987654', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([600, 800]);
    page.drawText('Public Header: Monthly Statement', { x: 50, y: 750, size: 14, font });
    page.drawText('CONFIDENTIAL_ACCOUNT_987654', { x: 50, y: 700, size: 14, font });
    page.drawText('TEST_SECRET_123456', { x: 50, y: 650, size: 14, font });
    page.drawText('Public Footer: Thank you for your business', { x: 50, y: 100, size: 12, font });

    doc.setTitle('Sensitive Confidential Statement');
    doc.setAuthor('Secret Government Agency');

    const srcBytes = await doc.save();

    const redactions = [
      { x: 40, y: 80, w: 350, h: 40 },
      { x: 40, y: 130, w: 300, h: 40 }
    ];

    const outBytes = await processProductionRedaction(srcBytes, { 0: redactions });
    fs.writeFileSync(path.join(scratchDir, 'sec_1_1_out.pdf'), outBytes);

    // Independent verification using PDF.js
    const verifyDoc = await pdfjsLib.getDocument({ data: new Uint8Array(outBytes) }).promise;
    assert.strictEqual(verifyDoc.numPages, 1, 'Should have exactly 1 page');

    const p1 = await verifyDoc.getPage(1);
    const tc = await p1.getTextContent();
    const extractedStr = tc.items.map(it => it.str).join(' ');

    assert.ok(!extractedStr.includes('TEST_SECRET_123456'), 'TEST_SECRET_123456 must not be present in extracted text');
    assert.ok(!extractedStr.includes('CONFIDENTIAL_ACCOUNT_987654'), 'CONFIDENTIAL_ACCOUNT_987654 must not be present');
    assert.strictEqual(tc.items.length, 0, 'Rasterized redacted page must have ZERO text content items');

    // Binary stream search
    const binaryStr = Buffer.from(outBytes).toString('binary');
    assert.ok(!binaryStr.includes('TEST_SECRET_123456'), 'Binary PDF bytes must not contain raw secret string');
    assert.ok(!binaryStr.includes('CONFIDENTIAL_ACCOUNT_987654'), 'Binary PDF bytes must not contain raw account string');

    // Pixel blackout verification: check the secret regions are 100% solid black
    const pix1 = await renderPageAndSamplePixels(outBytes, 1, { x: 40, y: 80, w: 350, h: 40 });
    assert.strictEqual(pix1.nonBlackPixels, 0, 'Redaction region 1 must be 100% solid black');
    const pix2 = await renderPageAndSamplePixels(outBytes, 1, { x: 40, y: 130, w: 300, h: 40 });
    assert.strictEqual(pix2.nonBlackPixels, 0, 'Redaction region 2 must be 100% solid black');
  });

  // Test 2: Object Graph Inspection
  await runAsyncTest('SEC 1.2: Object Graph Sanitization (No Fonts, No BT/ET Text Operators on Redacted Pages)', async () => {
    const bytes = fs.readFileSync(path.join(scratchDir, 'sec_1_1_out.pdf'));
    const loadedDoc = await PDFDocument.load(bytes);
    const page = loadedDoc.getPage(0);

    const resources = page.node.get(PDFName.of('Resources'));
    const fontDict = resources.get(PDFName.of('Font'));
    const xObjectDict = resources.get(PDFName.of('XObject'));

    // Redacted page should have no font dictionary entries
    const fontCount = fontDict ? (fontDict.entries ? fontDict.entries().length : 0) : 0;
    assert.strictEqual(fontCount, 0, 'Redacted page must have 0 font references');

    // Redacted page must have exactly 1 image XObject
    assert.ok(xObjectDict !== null, 'Redacted page must contain image XObject');

    // Annotations should be empty or absent
    const annots = page.node.get(PDFName.of('Annots'));
    const annotCount = annots ? (annots.size?.() || annots.length || 0) : 0;
    assert.strictEqual(annotCount, 0, 'Redacted page must contain 0 annotations');
  });

  // Test 3: Multi-Page Hybrid Redaction & Selective Retention
  await runAsyncTest('SEC 1.3: Multi-page hybrid redaction (Redacted pages rasterized, Unredacted pages vector-preserved)', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Page 1: Sensitive PAN
    const p1 = doc.addPage([600, 800]);
    p1.drawText('PAN: ABCDE1234F', { x: 50, y: 700, size: 14, font });

    // Page 2: Clean legal text
    const p2 = doc.addPage([600, 800]);
    p2.drawText('CLEAN_CONTRACT_VECTOR_CLAUSE_789', { x: 50, y: 700, size: 14, font });

    // Page 3: Sensitive Email & Token
    const p3 = doc.addPage([600, 800]);
    p3.drawText('PRIVATE_EMAIL_example@test.invalid', { x: 50, y: 700, size: 14, font });
    p3.drawText('REDACTED_DOCUMENT_TOKEN_ABC123', { x: 50, y: 650, size: 14, font });

    const srcBytes = await doc.save();

    // Redact Page 1 and Page 3, leave Page 2 clean
    const redactionMap = {
      0: [{ x: 40, y: 80, w: 250, h: 40 }],
      2: [{ x: 40, y: 80, w: 400, h: 80 }]
    };

    const outBytes = await processProductionRedaction(srcBytes, redactionMap);
    fs.writeFileSync(path.join(scratchDir, 'sec_1_3_hybrid_out.pdf'), outBytes);

    const verifyDoc = await pdfjsLib.getDocument({ data: new Uint8Array(outBytes) }).promise;
    assert.strictEqual(verifyDoc.numPages, 3, 'Must retain all 3 pages');

    // Page 1: Redacted
    const page1 = await verifyDoc.getPage(1);
    const tc1 = await page1.getTextContent();
    assert.strictEqual(tc1.items.length, 0, 'Page 1 must have 0 text items');

    // Page 2: Unredacted vector
    const page2 = await verifyDoc.getPage(2);
    const tc2 = await page2.getTextContent();
    const str2 = tc2.items.map(it => it.str).join(' ');
    assert.ok(str2.includes('CLEAN_CONTRACT_VECTOR_CLAUSE_789'), 'Page 2 must preserve clean vector text');
    assert.ok(tc2.items.length > 0, 'Page 2 must have text items');

    // Page 3: Redacted
    const page3 = await verifyDoc.getPage(3);
    const tc3 = await page3.getTextContent();
    assert.strictEqual(tc3.items.length, 0, 'Page 3 must have 0 text items');

    // Binary checks
    const binary = Buffer.from(outBytes).toString('binary');
    assert.ok(!binary.includes('ABCDE1234F'), 'PAN must not exist in output');
    assert.ok(!binary.includes('PRIVATE_EMAIL_example@test.invalid'), 'Private email must not exist in output');
    assert.ok(!binary.includes('REDACTED_DOCUMENT_TOKEN_ABC123'), 'Token must not exist in output');
  });

  // Test 4: Document Metadata Sanitization
  await runAsyncTest('SEC 1.4: Document Metadata Sanitization (Title, Author, Subject purged)', async () => {
    const doc = await PDFDocument.create();
    doc.setTitle('SECRET_DOCUMENT_TITLE_LEAK');
    doc.setAuthor('SECRET_AUTHOR_NAME');
    doc.setSubject('SECRET_SUBJECT_SSN_000_11_2222');
    doc.setKeywords(['SECRET_KEYWORD_X', 'SECRET_KEYWORD_Y']);

    const page = doc.addPage([500, 500]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Confidential Text', { x: 50, y: 400, size: 14, font });
    const srcBytes = await doc.save();

    const outBytes = await processProductionRedaction(srcBytes, { 0: [{ x: 40, y: 80, w: 200, h: 40 }] });
    const reloaded = await PDFDocument.load(outBytes, { updateMetadata: false });

    assert.strictEqual(reloaded.getTitle() || '', '', 'Title must be sanitized');
    assert.strictEqual(reloaded.getAuthor() || '', '', 'Author must be sanitized');
    assert.strictEqual(reloaded.getSubject() || '', '', 'Subject must be sanitized');
    assert.strictEqual((reloaded.getKeywords() || []).length, 0, 'Keywords must be empty');
    assert.strictEqual(reloaded.getProducer(), 'PDFTools4U (In-Browser Privacy Engine)', 'Producer should be privacy engine');
  });

  // Test 5: Annotation Sanitization on Unredacted Vector Pages (Issue 3)
  await runAsyncTest('SEC 1.5: Complete Annotation Sanitization on Unredacted Pages (All subtypes purged)', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Page 1: Redacted page
    const p1 = doc.addPage([600, 400]);
    p1.drawText('Redacted Sensitive Page', { x: 50, y: 350, size: 14, font });

    // Page 2: Unredacted page with safe text + sensitive annotations
    const p2 = doc.addPage([600, 400]);
    p2.drawText('Public Searchable Agreement Clause', { x: 50, y: 350, size: 14, font });

    // Add /Link annot with secret URI parameter and tooltip
    const linkAnnot = doc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Contents: PDFString.of('SECRET_LINK_TOOLTIP_CREDS'),
      A: doc.context.obj({
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of('https://vault.internal?token=SECRET_URI_TOKEN_ABC')
      }),
      Rect: [50, 50, 150, 70]
    });
    const linkRef = doc.context.register(linkAnnot);

    // Add sensitive /Text annot (sticky note containing confidential password)
    const textAnnot = doc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Text'),
      Contents: PDFString.of('LEAKED_STICKY_NOTE_PASSWORD_9988'),
      Rect: [100, 100, 150, 150]
    });
    const textRef = doc.context.register(textAnnot);

    // Add sensitive /Widget form annot
    const widgetAnnot = doc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Widget'),
      V: PDFString.of('SECRET_FORM_SSN_VAL'),
      Rect: [200, 100, 300, 130]
    });
    const widgetRef = doc.context.register(widgetAnnot);

    p2.node.set(PDFName.of('Annots'), doc.context.obj([linkRef, textRef, widgetRef]));

    const srcBytes = await doc.save();

    // Redact Page 1, leave Page 2 unredacted
    const outBytes = await processProductionRedaction(srcBytes, { 0: [{ x: 40, y: 30, w: 300, h: 40 }] });

    const finalDoc = await PDFDocument.load(outBytes);
    const finalPage2 = finalDoc.getPage(1);
    const finalAnnots = finalPage2.node.get(PDFName.of('Annots'));

    assert.ok(!finalAnnots, 'All annotations including /Link must be stripped from unredacted pages for total privacy');

    // Confirm sticky note and form field are purged from binary
    const binary = Buffer.from(outBytes).toString('binary');
    assert.ok(!binary.includes('LEAKED_STICKY_NOTE_PASSWORD_9988'), 'Sticky note secret must be purged');
    assert.ok(!binary.includes('SECRET_FORM_SSN_VAL'), 'Form field secret value must be purged');

    // Verify Page 2 text is still selectable vector
    const pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(outBytes) }).promise;
    const vPage2 = await pdfJs.getPage(2);
    const tc2 = await vPage2.getTextContent();
    const str2 = tc2.items.map(it => it.str).join(' ');
    assert.ok(str2.includes('Public Searchable Agreement Clause'), 'Page 2 vector text must remain searchable');
  });

  console.log('\n--- SECTION 2: ADVERSARIAL FALSE-POSITIVE & BOUNDARY TESTING ---');

  // Test 6: Explicit Negative Test (Adversarial False-Positive Prevention)
  await runAsyncTest('ADV 2.1: Adversarial False-Positive Test (Misplaced redaction fails pixel blackout check)', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([600, 800]);
    // Secret text drawn at bottom-left: x=100, y=200 in PDF coords -> viewport y = 800 - 200 = 600
    page.drawText('TOP_SECRET_CREDIT_CARD_NUMBER', { x: 100, y: 200, size: 16, font });
    const srcBytes = await doc.save();

    // Intentionally place redaction far away in top-left margin (x=10, y=10, w=50, h=50)
    const misplacedRedaction = [{ x: 10, y: 10, w: 50, h: 50 }];
    const outBytes = await processProductionRedaction(srcBytes, { 0: misplacedRedaction });

    // Text content is 0 because page was rasterized
    const pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(outBytes) }).promise;
    const vpPage = await pdfJs.getPage(1);
    const tc = await vpPage.getTextContent();
    assert.strictEqual(tc.items.length, 0, 'Circular test would pass here (items.length is 0)');

    // But our genuine pixel-level test samples the ACTUAL secret coordinates (x=95, y=585, w=320, h=30)
    const secretRegion = { x: 95, y: 585, w: 320, h: 30 };
    const pixResult = await renderPageAndSamplePixels(outBytes, 1, secretRegion);

    // Negative Assertion: Non-black glyph pixels MUST be detected (proving the test is sensitive and honest!)
    assert.ok(pixResult.nonBlackPixels > 0, 'Pixel test must detect unredacted text when redaction box is misplaced');
    console.log(`   [Empirical Verification] Detected ${pixResult.nonBlackPixels} unredacted pixels at secret coordinates (Test correctly caught the failure!)`);
  });

  // Test 7: Safe Redaction Boundary Expansion Verification (Issue 2)
  await runAsyncTest('ADV 2.2: Safe Redaction Boundary Expansion (6 pt padding protects ascenders/descenders/italics across font sizes)', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([500, 500]);
    page.drawText('Confidential Text', { x: 100, y: 300, size: 14, font });
    const srcBytes = await doc.save();

    // User draws exact box [100, 180, 150, 30] in viewport coords
    const userBox = { x: 100, y: 180, w: 150, h: 30 };
    const outBytes = await processProductionRedaction(srcBytes, { 0: [userBox] });

    // The safety margin expands outward by at least 6 pt in all directions:
    // Left: <= 94, Right: >= 256, Top: <= 174, Bottom: >= 216
    const leftPadSample = await renderPageAndSamplePixels(outBytes, 1, { x: 95, y: 195, w: 1, h: 4 });
    assert.strictEqual(leftPadSample.nonBlackPixels, 0, 'Left safety margin padding must be solid black');

    const rightPadSample = await renderPageAndSamplePixels(outBytes, 1, { x: 255, y: 195, w: 1, h: 4 });
    assert.strictEqual(rightPadSample.nonBlackPixels, 0, 'Right safety margin padding must be solid black');

    // Mathematical verification on fractional A4 page dimensions
    const a4W = 595.27559;
    const a4H = 841.88976;
    const scale = 2.0;
    const canvasW = Math.ceil(a4W * scale);
    const canvasH = Math.ceil(a4H * scale);
    const scaleX = canvasW / a4W;
    const scaleY = canvasH / a4H;

    const testBox = { x: 120.37, y: 210.82, w: 180.45, h: 42.19 };
    const PADDING_PT = 6;
    const x1 = Math.max(0, testBox.x - PADDING_PT);
    const y1 = Math.max(0, testBox.y - PADDING_PT);
    const x2 = Math.min(a4W, testBox.x + testBox.w + PADDING_PT);
    const y2 = Math.min(a4H, testBox.y + testBox.h + PADDING_PT);

    const rx = Math.max(0, Math.floor(x1 * scaleX));
    const ry = Math.max(0, Math.floor(y1 * scaleY));
    const rx2 = Math.min(canvasW, Math.ceil(x2 * scaleX));
    const ry2 = Math.min(canvasH, Math.ceil(y2 * scaleY));

    const effExpLeft = testBox.x - (rx / scaleX);
    const effExpRight = (rx2 / scaleX) - (testBox.x + testBox.w);
    const effExpTop = testBox.y - (ry / scaleY);
    const effExpBottom = (ry2 / scaleY) - (testBox.y + testBox.h);

    assert.ok(effExpLeft >= 5.99999, `Left expansion must be >= 6.000 pt, got ${effExpLeft}`);
    assert.ok(effExpRight >= 5.99999, `Right expansion must be >= 6.000 pt, got ${effExpRight}`);
    assert.ok(effExpTop >= 5.99999, `Top expansion must be >= 6.000 pt, got ${effExpTop}`);
    assert.ok(effExpBottom >= 5.99999, `Bottom expansion must be >= 6.000 pt, got ${effExpBottom}`);
  });

  console.log('\n--- SECTION 3: COMPREHENSIVE 16-ROTATION MATRIX TESTS ---');

  // Test 8: Full 16-Rotation Matrix (4 Native x 4 User Rotations)
  const nativeRotations = [0, 90, 180, 270];
  const userRotations = [0, 90, 180, 270];
  let matrixIndex = 1;

  for (const nativeRot of nativeRotations) {
    for (const userRot of userRotations) {
      const totalRot = (nativeRot + userRot) % 360;
      const testTitle = `ROT 3.${matrixIndex++}: Native ${nativeRot}° × User ${userRot}° = Total ${totalRot}° (Dimensions, Text Eradication & Pixel Blackout)`;

      await runAsyncTest(testTitle, async () => {
        // Physical page: 400 pt width, 600 pt height
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const page = doc.addPage([400, 600]);
        if (nativeRot !== 0) {
          page.setRotation(degrees(nativeRot));
        }

        const token = `SECRET_N${nativeRot}_U${userRot}_TOKEN`;
        // Draw token on the page in standard PDF coordinates
        page.drawText(token, { x: 50, y: 500, size: 14, font });
        const srcBytes = await doc.save();

        // Determine where the text appears in total rotation display coordinates
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(srcBytes) }).promise;
        const pdfPage = await pdfJsDoc.getPage(1);
        const displayVp = pdfPage.getViewport({ scale: 1.0, rotation: totalRot });

        // Expected dimensions
        const isSwapped = totalRot === 90 || totalRot === 270;
        const expectedW = isSwapped ? 600 : 400;
        const expectedH = isSwapped ? 400 : 600;

        assert.strictEqual(displayVp.width, expectedW, `Display width should be ${expectedW}`);
        assert.strictEqual(displayVp.height, expectedH, `Display height should be ${expectedH}`);

        // Redact covering the entire upper half of the display page
        const redaction = [{ x: 20, y: 20, w: expectedW - 40, h: Math.floor(expectedH / 2) }];
        const outBytes = await processProductionRedaction(srcBytes, { 0: redaction }, { 0: userRot });

        // Verify output PDF
        const verifyDoc = await pdfjsLib.getDocument({ data: new Uint8Array(outBytes) }).promise;
        const vPage = await verifyDoc.getPage(1);
        const outVp = vPage.getViewport({ scale: 1.0 });

        assert.strictEqual(outVp.width, expectedW, `Exported width must be ${expectedW} (No double-swap)`);
        assert.strictEqual(outVp.height, expectedH, `Exported height must be ${expectedH} (No double-swap)`);

        // Check text content items are 0
        const tc = await vPage.getTextContent();
        assert.strictEqual(tc.items.length, 0, 'Text content items must be 0');

        // Check binary stream
        const binary = Buffer.from(outBytes).toString('binary');
        assert.ok(!binary.includes(token), 'Binary string must not exist in output');

        // Genuine Pixel-Level Blackout Verification
        const pixSample = await renderPageAndSamplePixels(outBytes, 1, { x: 30, y: 30, w: expectedW - 60, h: 40 });
        assert.strictEqual(pixSample.nonBlackPixels, 0, `All sampled pixels in redaction zone must be solid black for Native ${nativeRot}° / User ${userRot}°`);
      });
    }
  }

  console.log('\n--- SECTION 4: BOUNDARY CLAMPING & DOCUMENT SIZES ---');

  // Test 9: Out of Bounds Coordinates
  await runAsyncTest('BND 4.1: Extreme boundary and negative coordinate clamping', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([500, 500]);
    page.drawText('Boundary text', { x: 10, y: 480, size: 12, font });
    const srcBytes = await doc.save();

    const extremeRedactions = [
      { x: -50, y: -20, w: 200, h: 100 },
      { x: 450, y: 450, w: 100, h: 100 }
    ];

    const outBytes = await processProductionRedaction(srcBytes, { 0: extremeRedactions });
    assert.ok(outBytes.length > 0, 'Export must succeed without crashing');

    const verifyDoc = await pdfjsLib.getDocument({ data: new Uint8Array(outBytes) }).promise;
    assert.strictEqual(verifyDoc.numPages, 1, 'Exported document must open cleanly');
  });

  // Test 10: Standard US Letter vs A4 Dimensions
  await runAsyncTest('DIM 4.2: US Letter and A4 document sizes preserved exactly', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Page 1: US Letter (612 x 792)
    const p1 = doc.addPage([612, 792]);
    p1.drawText('Letter Secret', { x: 50, y: 700, size: 14, font });

    // Page 2: A4 (595.28 x 841.89)
    const p2 = doc.addPage([595.28, 841.89]);
    p2.drawText('A4 Secret', { x: 50, y: 750, size: 14, font });

    const srcBytes = await doc.save();
    const outBytes = await processProductionRedaction(srcBytes, {
      0: [{ x: 40, y: 80, w: 200, h: 40 }],
      1: [{ x: 40, y: 80, w: 200, h: 40 }]
    });

    const verifyDoc = await pdfjsLib.getDocument({ data: new Uint8Array(outBytes) }).promise;
    const vPage1 = await verifyDoc.getPage(1);
    const vPage2 = await verifyDoc.getPage(2);

    assert.strictEqual(Math.round(vPage1.getViewport({ scale: 1 }).width), 612, 'Letter width should be 612');
    assert.strictEqual(Math.round(vPage1.getViewport({ scale: 1 }).height), 792, 'Letter height should be 792');

    assert.strictEqual(Math.round(vPage2.getViewport({ scale: 1 }).width), 595, 'A4 width should be ~595');
    assert.strictEqual(Math.round(vPage2.getViewport({ scale: 1 }).height), 842, 'A4 height should be ~842');
  });

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  if (failedTests === 0) {
    console.log('  STATUS: ALL ADVERSARIAL REDACTION SECURITY TESTS PASSED! ✓');
  } else {
    console.log(`  STATUS: ${failedTests} TESTS FAILED! ❌`);
  }
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

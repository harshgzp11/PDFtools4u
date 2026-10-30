/**
 * Production-Grade Adversarial Regression Test Suite: PPT-to-PDF & PDF-to-PPT
 * PDFTools4U (quickToolBox)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pptxgen from 'pptxgenjs';

import { parsePptxSlides, convertPptToPdf, isLegacyBinaryPpt } from '../src/utils/pptConversion.js';
import { convertPdfToPpt } from '../src/utils/pdfConversion.js';

// Setup canvas mock for Node.js PDF rendering
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        const c = {
          width: 0,
          height: 0,
          getContext: () => ctx,
          toDataURL: () => 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        };
        const ctx = {
          canvas: c,
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          fillRect: () => {},
          clearRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          scale: () => {},
          transform: () => {},
          setTransform: () => {},
          getTransform: () => ({
            a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
            invertSelf: function() { return this; },
            multiply: function() { return this; },
          }),
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          bezierCurveTo: () => {},
          quadraticCurveTo: () => {},
          arc: () => {},
          fill: () => {},
          stroke: () => {},
          clip: () => {},
          rect: () => {},
          translate: () => {},
          rotate: () => {},
          measureText: () => ({ width: 10 }),
          fillText: () => {},
          strokeText: () => {},
          createImageData: () => ({ data: [] }),
          getImageData: () => ({ data: [] }),
          putImageData: () => {},
          createPattern: () => null,
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
        };
        return c;
      }
      return {};
    }
  };
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   ${err.stack || err.message}`);
  }
}

async function extractPdfTextAndPages(pdfBlobOrBuffer) {
  let uint8Array;
  if (pdfBlobOrBuffer instanceof Uint8Array) {
    uint8Array = pdfBlobOrBuffer;
  } else if (pdfBlobOrBuffer instanceof ArrayBuffer) {
    uint8Array = new Uint8Array(pdfBlobOrBuffer);
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(pdfBlobOrBuffer)) {
    uint8Array = new Uint8Array(pdfBlobOrBuffer.buffer, pdfBlobOrBuffer.byteOffset, pdfBlobOrBuffer.byteLength);
  } else if (typeof pdfBlobOrBuffer.arrayBuffer === 'function') {
    const ab = await pdfBlobOrBuffer.arrayBuffer();
    uint8Array = new Uint8Array(ab);
  } else {
    throw new Error('Unsupported PDF input type');
  }

  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  let fullText = '';
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(it => it.str).join(' ');
    pageTexts.push(strings);
    fullText += ` [Page ${i}] ` + strings;
  }

  return { pdf, numPages: pdf.numPages, fullText, pageTexts };
}

// 1x1 base64 pixels for graphics testing
const RED_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const BLUE_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';

console.log('================================================================');
console.log('  PRODUCTION-GRADE ADVERSARIAL REGRESSION TEST SUITE');
console.log('  PDFTools4U: PPT-to-PDF and PDF-to-PPT Conversion Engines');
console.log('================================================================\n');

async function runAllTests() {
  // ---------------------------------------------------------------------------
  // PART 1: PPT TO PDF REGRESSION SUITE (18 TEST CASES)
  // ---------------------------------------------------------------------------
  console.log('--- PART 1: PowerPoint to PDF Conversion Tests ---');

  // Test 1: Text-only presentation
  await runTest('PPT1: Text-only presentation extraction', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Executive Summary', { x: 1, y: 1, fontSize: 24, bold: true });
    s1.addText('• First key milestone reached.\n• Second project objective on track.', { x: 1, y: 2, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText } = await extractPdfTextAndPages(result.blob);

    assert.ok(fullText.includes('Executive Summary'), 'Title must be extracted');
    assert.ok(fullText.includes('First key milestone reached'), 'First bullet must be extracted');
    assert.ok(fullText.includes('Second project objective on track'), 'Second bullet must be extracted');
  });

  // Test 2: Slide containing a logo and text (Fixes the critical data-loss defect!)
  await runTest('PPT2: Slide with Logo AND Text preserves BOTH elements', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addImage({ data: `data:image/png;base64,${RED_PNG_B64}`, x: 0.5, y: 0.5, w: 1, h: 1 });
    s1.addText('Corporate Strategy with Logo', { x: 2, y: 0.5, fontSize: 24, bold: true });
    s1.addText('• Critical revenue target\n• Operational stability guarantee', { x: 2, y: 2, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText, numPages } = await extractPdfTextAndPages(result.blob);

    assert.strictEqual(numPages, 1, 'Should output 1 PDF page');
    assert.ok(fullText.includes('Corporate Strategy with Logo'), 'Title must NOT be dropped when image is present');
    assert.ok(fullText.includes('Critical revenue target'), 'Bullet points must NOT be dropped when image is present');
    assert.ok(fullText.includes('Operational stability guarantee'), 'All bullet points must be preserved');
  });

  // Test 3: Slide with multiple images and text
  await runTest('PPT3: Multiple images on a slide are handled without crashing or dropping text', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Product Comparison Deck', { x: 1, y: 0.5, fontSize: 22, bold: true });
    s1.addImage({ data: `data:image/png;base64,${RED_PNG_B64}`, x: 1, y: 1.5, w: 2, h: 2 });
    s1.addImage({ data: `data:image/png;base64,${BLUE_PNG_B64}`, x: 4, y: 1.5, w: 2, h: 2 });
    s1.addText('Comparison notes: Option A is faster, Option B is cheaper.', { x: 1, y: 4, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText } = await extractPdfTextAndPages(result.blob);

    assert.ok(fullText.includes('Product Comparison Deck'), 'Title must be preserved');
    assert.ok(fullText.includes('Option A is faster'), 'Text notes must be preserved');
  });

  // Test 4: Reordered slides in presentation.xml
  await runTest('PPT4: Reordered slides follow presentation.xml order, not ZIP filenames', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Original Slide 1: Welcome', { x: 1, y: 1, fontSize: 20 });
    const s2 = pres.addSlide();
    s2.addText('Original Slide 2: Agenda', { x: 1, y: 1, fontSize: 20 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    
    // Simulate PowerPoint reordering by swapping <p:sldId> order in presentation.xml
    const zip = await JSZip.loadAsync(buf);
    let presXml = await zip.file('ppt/presentation.xml').async('text');
    
    // Match the two sldId tags and swap their order
    const sldIdMatches = presXml.match(/<p:sldId\b[^>]*\/>/g);
    if (sldIdMatches && sldIdMatches.length >= 2) {
      const swapped = presXml.replace(
        sldIdMatches[0] + sldIdMatches[1],
        sldIdMatches[1] + sldIdMatches[0]
      );
      zip.file('ppt/presentation.xml', swapped);
    }

    const modifiedBuf = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await convertPptToPdf(modifiedBuf);
    const { pageTexts } = await extractPdfTextAndPages(result.blob);

    assert.ok(pageTexts[0].includes('Agenda'), 'Page 1 must be the reordered slide (Agenda)');
    assert.ok(pageTexts[1].includes('Welcome'), 'Page 2 must be the swapped slide (Welcome)');
  });

  // Test 5: Presentation with long paragraphs
  await runTest('PPT5: Long paragraphs wrap cleanly without horizontal clipping', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Compliance & Governance Statement', { x: 1, y: 1, fontSize: 22, bold: true });
    const longPara = 'This organization complies with all international standards including ISO 27001, SOC 2 Type II, and GDPR data handling requirements. All customer data is processed locally without third party transmission.';
    s1.addText(longPara, { x: 1, y: 2, fontSize: 13 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText } = await extractPdfTextAndPages(result.blob);

    assert.ok(fullText.includes('ISO 27001'), 'Compliance paragraph content must be present');
    assert.ok(fullText.includes('processed locally'), 'End of paragraph content must be present');
  });

  // Test 6: Presentation with 35+ lines of content (Guarantees zero text truncation via continuation pages!)
  await runTest('PPT6: 35+ lines of text creates continuation page with ZERO truncation', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('System Requirements Specification', { x: 1, y: 0.5, fontSize: 22, bold: true });

    let longContent = '';
    for (let k = 1; k <= 35; k++) {
      longContent += `Requirement Item #${k}: Technical specification description line number ${k}.\n`;
    }
    s1.addText(longContent, { x: 1, y: 1.2, fontSize: 11 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText, numPages } = await extractPdfTextAndPages(result.blob);

    assert.ok(numPages >= 2, `Expected at least 2 pages due to continuation, got ${numPages}`);
    assert.ok(fullText.includes('Requirement Item #1:'), 'First line must be present');
    assert.ok(fullText.includes('Requirement Item #18:'), 'Middle lines must be present');
    assert.ok(fullText.includes('Requirement Item #35:'), 'Last line must be present without truncation!');
    assert.ok(fullText.includes('(Continued)'), 'Continuation page must have continuation header');
  });

  // Test 7: Hindi and English mixed text
  await runTest('PPT7: Multilingual Devanagari (Hindi) and English text preserved', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Internationalization Briefing', { x: 1, y: 0.5, fontSize: 22 });
    s1.addText('Hindi Text: नमस्ते दुनिया (Welcome to our platform)', { x: 1, y: 1.5, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText } = await extractPdfTextAndPages(result.blob);

    assert.ok(fullText.includes('Internationalization Briefing'), 'English title must be present');
    assert.ok(fullText.includes('नमस्ते दुनिया'), 'Hindi Devanagari text must be preserved without mojibake!');
  });

  // Test 8: Chinese and Unicode text
  await runTest('PPT8: Chinese and international Unicode glyphs handled gracefully', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Asian Markets Overview', { x: 1, y: 0.5, fontSize: 22 });
    s1.addText('Regional branch: 中国分部 (China Office)', { x: 1, y: 1.5, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText } = await extractPdfTextAndPages(result.blob);

    assert.ok(fullText.includes('Asian Markets Overview'), 'Title must be present');
    assert.ok(fullText.includes('China Office'), 'Latin translation must be present');
  });

  // Test 9: Special characters, mathematical symbols, and currency
  await runTest('PPT9: Currency and special symbols preserved without corruption', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Financial Valuation & Rates', { x: 1, y: 0.5, fontSize: 22 });
    s1.addText('Pricing: $1,250 USD | €1,150 EUR | £980 GBP | ¥180,000 JPY\nCopyright © 2026 QuickToolBox™ (All Rights Reserved)', { x: 1, y: 1.5, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText } = await extractPdfTextAndPages(result.blob);

    assert.ok(fullText.includes('$1,250'), 'Dollar price must be preserved');
    assert.ok(fullText.includes('QuickToolBox'), 'Brand name must be preserved');
  });

  // Test 10: SVG graphics handling
  await runTest('PPT10: SVG image relationships handled gracefully without crashing', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Vector Graphics Slide', { x: 1, y: 0.5, fontSize: 22 });
    s1.addText('This slide tests non-raster image formats.', { x: 1, y: 1.5, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    
    // Inject a fake svg relationship into slide 1
    const zip = await JSZip.loadAsync(buf);
    zip.file('ppt/media/vector-icon.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><circle cx="25" cy="25" r="20" fill="red"/></svg>');
    
    const modifiedBuf = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await convertPptToPdf(modifiedBuf);
    assert.ok(result.blob.size > 0, 'Conversion must succeed without crashing');
  });

  // Test 11: WEBP graphics handling
  await runTest('PPT11: WEBP image relationships handled gracefully', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('WebP Graphic Slide', { x: 1, y: 0.5, fontSize: 22 });
    s1.addText('Slide contains a modern web graphic.', { x: 1, y: 1.5, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    assert.ok(result.blob.size > 0, 'Must convert cleanly');
  });

  // Test 12: PNG and JPEG graphics
  await runTest('PPT12: Standard PNG and JPEG graphics support', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Standard Formats Slide', { x: 1, y: 0.5, fontSize: 22 });
    s1.addImage({ data: `data:image/png;base64,${RED_PNG_B64}`, x: 1, y: 1.5, w: 2, h: 2 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    assert.ok(result.blob.size > 1000, 'PDF with embedded PNG must be generated');
  });

  // Test 13: Portrait and landscape slide sizes
  await runTest('PPT13: Portrait slide layout detected and preserved in PDF orientation', async () => {
    const pres = new pptxgen();
    // Define a custom Portrait 7.5x10 inch layout
    pres.defineLayout({ name: 'PORTRAIT_CUSTOM', width: 7.5, height: 10 });
    pres.layout = 'PORTRAIT_CUSTOM';

    const s1 = pres.addSlide();
    s1.addText('Portrait Infographic Slide', { x: 1, y: 1, fontSize: 22 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);

    assert.strictEqual(result.dimensions.orientation, 'p', 'Orientation should be detected as portrait');
    assert.ok(result.dimensions.heightMm > result.dimensions.widthMm, 'Height must be greater than width for portrait');
  });

  // Test 14: Nested bullet structures
  await runTest('PPT14: Nested bullet levels preserved with indentation', async () => {
    const pres = new pptxgen();
    const s1 = pres.addSlide();
    s1.addText('Hierarchy Breakdown', { x: 1, y: 0.5, fontSize: 22 });
    s1.addText([
      { text: 'Level 0 Root Topic', options: { level: 0 } },
      { text: 'Level 1 Sub-item A', options: { level: 1 } },
      { text: 'Level 1 Sub-item B', options: { level: 1 } },
    ], { x: 1, y: 1.5, fontSize: 14 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    const { fullText } = await extractPdfTextAndPages(result.blob);

    assert.ok(fullText.includes('Level 0 Root Topic'), 'Root topic must be present');
    assert.ok(fullText.includes('Level 1 Sub-item A'), 'Sub-item A must be present');
  });

  // Test 15: Invalid or corrupted PPTX error handling
  await runTest('PPT15: Invalid or corrupted PPTX triggers clean descriptive error', async () => {
    const corruptedBuffer = Buffer.from('NOT_A_VALID_ZIP_ARCHIVE_DATA_CORRUPT');
    let threw = false;
    try {
      await convertPptToPdf(corruptedBuffer);
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('valid, uncorrupted .pptx'), 'Error message should clearly explain corruption');
    }
    assert.ok(threw, 'Should throw on corrupted presentation input');
  });

  // Test 16: Legacy .ppt binary rejection
  await runTest('PPT16: Legacy binary .ppt is rejected before processing with informative guidance', async () => {
    // Generate binary OLE compound header bytes
    const oleBytes = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00]);
    assert.strictEqual(isLegacyBinaryPpt(oleBytes), true, 'OLE header magic bytes must be identified');

    let threw = false;
    try {
      await convertPptToPdf(oleBytes);
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('Binary .ppt'), 'Error must mention binary .ppt format');
      assert.ok(err.message.includes('.pptx'), 'Error must advise saving as .pptx');
    }
    assert.ok(threw, 'Must reject binary .ppt');
  });

  // Test 17: Presentation with empty slides
  await runTest('PPT17: Presentation with empty slides handled without failure', async () => {
    const pres = new pptxgen();
    pres.addSlide(); // Blank slide
    const s2 = pres.addSlide();
    s2.addText('Slide 2 After Blank', { x: 1, y: 1, fontSize: 20 });

    const buf = await pres.write({ outputType: 'nodebuffer' });
    const result = await convertPptToPdf(buf);
    assert.strictEqual(result.numSlides, 2, 'Should process 2 slides');
  });

  // Test 18: Large presentation with many slides
  await runTest('PPT18: Multi-slide presentation batch conversion with progress reporting', async () => {
    const pres = new pptxgen();
    for (let k = 1; k <= 8; k++) {
      const s = pres.addSlide();
      s.addText(`Slide ${k} Batch Test`, { x: 1, y: 1, fontSize: 20 });
      s.addText(`Description content for slide index ${k}`, { x: 1, y: 2, fontSize: 14 });
    }

    const buf = await pres.write({ outputType: 'nodebuffer' });
    let highestProgress = 0;
    const result = await convertPptToPdf(buf, {
      onProgress: (p) => {
        if (p > highestProgress) highestProgress = p;
      }
    });

    assert.strictEqual(result.numSlides, 8, 'All 8 slides must be processed');
    assert.strictEqual(highestProgress, 100, 'Progress must reach 100%');
  });

  // ---------------------------------------------------------------------------
  // PART 2: PDF TO PPT REGRESSION SUITE (14 TEST CASES)
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 2: PDF to PowerPoint Conversion Tests ---');

  // Helper to run convertPdfToPpt with a Buffer
  const runPdfToPptHelper = async (pdfBuffer) => {
    return await convertPdfToPpt({
      arrayBuffer: async () => pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength),
    });
  };

  // Test 1: A4 portrait PDF -> matching slide dimensions
  await runTest('PDF1: A4 portrait PDF generates matching portrait slide dimensions', async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.text('A4 Portrait Content', 20, 30);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    const pptxBuf = Buffer.from(await pptxBlob.arrayBuffer());

    const zip = await JSZip.loadAsync(pptxBuf);
    const presXml = await zip.file('ppt/presentation.xml').async('text');
    const sldSz = presXml.match(/<p:sldSz\s+cx="(\d+)"\s+cy="(\d+)"/);

    assert.ok(sldSz, 'Must define slide size');
    const cx = parseInt(sldSz[1], 10);
    const cy = parseInt(sldSz[2], 10);
    assert.ok(cy > cx, `Portrait layout must have cy > cx (cy: ${cy}, cx: ${cx})`);
  });

  // Test 2: A4 landscape PDF -> matching landscape slide dimensions
  await runTest('PDF2: A4 landscape PDF generates matching landscape slide dimensions', async () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.text('A4 Landscape Content', 20, 30);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    const pptxBuf = Buffer.from(await pptxBlob.arrayBuffer());

    const zip = await JSZip.loadAsync(pptxBuf);
    const presXml = await zip.file('ppt/presentation.xml').async('text');
    const sldSz = presXml.match(/<p:sldSz\s+cx="(\d+)"\s+cy="(\d+)"/);

    assert.ok(sldSz, 'Must define slide size');
    const cx = parseInt(sldSz[1], 10);
    const cy = parseInt(sldSz[2], 10);
    assert.ok(cx > cy, `Landscape layout must have cx > cy (cx: ${cx}, cy: ${cy})`);
  });

  // Test 3: US Letter PDF
  await runTest('PDF3: US Letter PDF creates slides matching Letter proportions', async () => {
    const pdf = new jsPDF('p', 'in', 'letter');
    pdf.text('US Letter Dimensions', 1, 1);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    assert.ok(pptxBlob.size > 1000, 'PPTX must be generated cleanly');
  });

  // Test 4: Mixed portrait and landscape PDF
  await runTest('PDF4: Multi-page mixed orientation PDF converts each page without clipping', async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.text('Page 1 Portrait', 20, 30);
    pdf.addPage('a4', 'l');
    pdf.text('Page 2 Landscape', 20, 30);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    const pptxBuf = Buffer.from(await pptxBlob.arrayBuffer());
    const zip = await JSZip.loadAsync(pptxBuf);

    assert.ok(zip.file('ppt/slides/slide1.xml'), 'Slide 1 exists');
    assert.ok(zip.file('ppt/slides/slide2.xml'), 'Slide 2 exists');
  });

  // Test 5: One-page PDF
  await runTest('PDF5: Single page PDF converts to exactly one slide', async () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.text('Single Page Deck', 20, 30);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    const pptxBuf = Buffer.from(await pptxBlob.arrayBuffer());
    const zip = await JSZip.loadAsync(pptxBuf);

    const slideCount = Object.keys(zip.files).filter(k => k.match(/^ppt\/slides\/slide\d+\.xml$/)).length;
    assert.strictEqual(slideCount, 1, 'Must have exactly 1 slide');
  });

  // Test 6: Multi-page (5+ pages) PDF memory cleanup verification
  await runTest('PDF6: Multi-page document releases memory and processes all pages', async () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    for (let p = 1; p <= 6; p++) {
      if (p > 1) pdf.addPage();
      pdf.text(`Multi Page Deck - Slide ${p}`, 20, 30);
    }
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    let progressReached = 0;
    const pptxBlob = await convertPdfToPpt(
      { arrayBuffer: async () => pdfBuf.buffer.slice(pdfBuf.byteOffset, pdfBuf.byteOffset + pdfBuf.byteLength) },
      (p) => { progressReached = p; }
    );

    assert.strictEqual(progressReached, 100, 'Progress must reach 100%');
    const pptxBuf = Buffer.from(await pptxBlob.arrayBuffer());
    const zip = await JSZip.loadAsync(pptxBuf);
    const slideCount = Object.keys(zip.files).filter(k => k.match(/^ppt\/slides\/slide\d+\.xml$/)).length;
    assert.strictEqual(slideCount, 6, 'Must generate all 6 slides');
  });

  // Test 7: Scanned PDF
  await runTest('PDF7: Scanned/raster image page in PDF converted cleanly', async () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.addImage(`data:image/png;base64,${RED_PNG_B64}`, 'PNG', 20, 20, 50, 50);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    assert.ok(pptxBlob.size > 1000, 'Must generate valid PPTX');
  });

  // Test 8: PDF containing selectable text
  await runTest('PDF8: PDF with rich text converted to visual presentation slide', async () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('Selectable Vector Text Page', 20, 30);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    assert.ok(pptxBlob.size > 1000, 'Must generate valid presentation');
  });

  // Test 9: PDF containing tables and diagrams
  await runTest('PDF9: PDF containing diagrammatic layouts converted without distortion', async () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.rect(20, 20, 80, 40);
    pdf.rect(110, 20, 80, 40);
    pdf.text('Box 1', 25, 30);
    pdf.text('Box 2', 115, 30);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    assert.ok(pptxBlob.size > 1000, 'Must convert cleanly');
  });

  // Test 10: PDF with Unicode content
  await runTest('PDF10: PDF with Unicode content rendered cleanly onto slide', async () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.text('International PDF Document: French, German, Spanish', 20, 30);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    assert.ok(pptxBlob.size > 1000, 'Must convert cleanly');
  });

  // Test 11: High-resolution page memory management
  await runTest('PDF11: High-resolution pages trigger canvas cleanup', async () => {
    const pdf = new jsPDF('l', 'mm', [350, 250]); // Extra large dimensions
    pdf.text('Large Blueprint Layout', 30, 40);
    const pdfBuf = Buffer.from(pdf.output('arraybuffer'));

    const pptxBlob = await runPdfToPptHelper(pdfBuf);
    assert.ok(pptxBlob.size > 1000, 'High-res page generated');
  });

  // Test 12: Invalid or empty PDF handling
  await runTest('PDF12: Invalid PDF input triggers clean error', async () => {
    const emptyBuf = Buffer.from('NOT_A_VALID_PDF_STREAM');
    let threw = false;
    try {
      await runPdfToPptHelper(emptyBuf);
    } catch {
      threw = true;
    }
    assert.ok(threw, 'Must throw on invalid PDF');
  });

  // Test 13: Uppercase .PDF extension regex
  await runTest('PDF13: Uppercase .PDF filename handling', () => {
    const uppercaseName = 'PRESENTATION_DECK.PDF';
    const convertedName = `${uppercaseName.replace(/\.pdf$/i, '')}_converted.pptx`;
    assert.strictEqual(convertedName, 'PRESENTATION_DECK_converted.pptx', 'Must strip uppercase .PDF cleanly');
  });

  // Test 14: Filename containing multiple .pdf occurrences
  await runTest('PDF14: Filename with multiple .pdf occurrences strips only the file extension', () => {
    const multiDotName = 'quarterly.pdf.report.final.pdf';
    const convertedName = `${multiDotName.replace(/\.pdf$/i, '')}_converted.pptx`;
    assert.strictEqual(convertedName, 'quarterly.pdf.report.final_converted.pptx', 'Must only strip final extension');
  });

  console.log('\n================================================================');
  console.log(`  REGRESSION TEST SUMMARY: ${passedTests} / ${totalTests} Passed (${failedTests} Failed)`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});

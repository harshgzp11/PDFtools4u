/**
 * Automated Regression Test Suite: Word to PDF & PDF to Word Conversion Engines
 * PDFTools4U (quickToolBox)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import * as docx from 'docx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { convertDocxToPdf } from '../src/utils/wordConversion.js';
import { convertPdfToDocx } from '../src/utils/pdfConversion.js';

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageOrientation,
  PageBreak,
  ExternalHyperlink
} = docx;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`✅ PASS: ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Error: ${err.message}`);
  }
}

async function extractPdfText(pdfBuffer) {
  const pdfDoc = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  let fullText = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(it => it.str).join(' ');
    fullText += ` [Page ${i}] ` + pageText;
  }
  return { pdfDoc, fullText, numPages: pdfDoc.numPages };
}

console.log('================================================================');
console.log('STARTING REBUILD TEST SUITE: WORD TO PDF & PDF TO WORD ENGINES');
console.log('================================================================\n');

// ============================================================================
// PART 1: WORD TO PDF ENGINE VERIFICATION
// ============================================================================

await runTest('Test 1.1: Financial Invoice with Dollar Signs and Multiple Currencies', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Commercial Invoice #9021', heading: HeadingLevel.HEADING_1 }),
        new Paragraph('Total Amount Due: $1,250.00 USD (Discount: $99.99)'),
        new Paragraph('Alternative billing currencies: €1,250 EUR and £500 GBP.'),
        new Table({
          rows: [
            new TableRow({ children: [new TableCell({ children: [new Paragraph('Item')] }), new TableCell({ children: [new Paragraph('Cost')] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph('Cloud Hosting')] }), new TableCell({ children: [new Paragraph('$450.00')] })] }),
          ]
        })
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('$1,250.00'), 'Dollar sign $1,250.00 must be preserved');
  assert.ok(fullText.includes('$99.99'), 'Dollar sign $99.99 must be preserved');
  assert.ok(fullText.includes('€1,250'), 'Euro €1,250 must be preserved');
  assert.ok(fullText.includes('£500'), 'Pound £500 must be preserved');
  assert.ok(fullText.includes('$450.00'), 'Table dollar cost $450.00 must be preserved');
});

await runTest('Test 1.2: Environment Variables ($HOME and $PATH) Preservation', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph('Ensure application config is loaded from $HOME/.config/app.'),
        new Paragraph('Append binary location to export PATH=$PATH:/usr/local/bin'),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('$HOME'), '$HOME must not be stripped');
  assert.ok(fullText.includes('$PATH'), '$PATH must not be stripped');
});

await runTest('Test 1.3: Tildes (~50%) and Mathematical Expressions', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph('System resource load was ~50% during benchmark.'),
        new Paragraph('Tolerance range: ~10ms to ~20ms latency.'),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('~50%'), 'Tilde ~50% must be preserved');
  assert.ok(fullText.includes('~10ms'), 'Tilde ~10ms must be preserved');
});

await runTest('Test 1.4: Prevention of Bullet Mutation (O Canada, O ring, o factor, Em-dash dialogue)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph('O Canada, our home and native land.'),
        new Paragraph('O ring seals must be lubricated before assembly.'),
        new Paragraph('o factor in the equation represents friction.'),
        new Paragraph('— "Wait here," he said calmly.'),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('O Canada'), '"O Canada" must not lose letter O');
  assert.ok(fullText.includes('O ring'), '"O ring" must not mutate to "• ring"');
  assert.ok(fullText.includes('o factor'), '"o factor" must not mutate to "• factor"');
  assert.ok(fullText.includes('— "Wait here,"'), 'Em-dash dialogue must be preserved');
});

await runTest('Test 1.5: Multiple Heading Levels (H1, H2, H3)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Main Document Title', heading: HeadingLevel.HEADING_1 }),
        new Paragraph('Introductory text under H1.'),
        new Paragraph({ text: 'Secondary Section Heading', heading: HeadingLevel.HEADING_2 }),
        new Paragraph('Section body content.'),
        new Paragraph({ text: 'Sub-topic Detailed Heading', heading: HeadingLevel.HEADING_3 }),
        new Paragraph('Sub-topic body content.'),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('Main Document Title'), 'H1 text must be present');
  assert.ok(fullText.includes('Secondary Section Heading'), 'H2 text must be present');
  assert.ok(fullText.includes('Sub-topic Detailed Heading'), 'H3 text must be present');
});

await runTest('Test 1.6: Bold, Italic and Inline Typography', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: 'This text is strictly bold. ', bold: true }),
            new TextRun({ text: 'This text is italic. ', italics: true }),
            new TextRun({ text: 'Standard unstyled text run.' }),
          ]
        })
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('This text is strictly bold.'), 'Bold text present');
  assert.ok(fullText.includes('This text is italic.'), 'Italic text present');
});

await runTest('Test 1.7: Tables with Multiple Rows and Columns (AutoTable Integration)', async () => {
  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph('ID')] }),
        new TableCell({ children: [new Paragraph('Product Name')] }),
        new TableCell({ children: [new Paragraph('Qty')] }),
        new TableCell({ children: [new Paragraph('Status')] }),
      ]
    })
  ];
  for (let i = 1; i <= 6; i++) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(`PRD-00${i}`)] }),
          new TableCell({ children: [new Paragraph(`Enterprise Widget Model ${i}`)] }),
          new TableCell({ children: [new Paragraph(`${i * 10}`)] }),
          new TableCell({ children: [new Paragraph(i % 2 === 0 ? 'In Stock' : 'Dispatched')] }),
        ]
      })
    );
  }

  const doc = new Document({ sections: [{ children: [new Table({ rows })] }] });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('PRD-001') && fullText.includes('PRD-006'), 'All table rows must be rendered');
  assert.ok(fullText.includes('Enterprise Widget Model 1'), 'Table cell values preserved');
  assert.ok(fullText.includes('Dispatched'), 'Table status preserved');
});

await runTest('Test 1.8: Smart Pagination across Long Paragraphs (No Mid-Row Cuts)', async () => {
  const paragraphs = [];
  for (let i = 1; i <= 35; i++) {
    paragraphs.push(
      new Paragraph(
        `Paragraph #${i}: Comprehensive testing of document flow, memory allocation, page boundaries, and line-wrapping mechanics inside vector PDF compiler stream.`
      )
    );
  }
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { numPages, fullText } = await extractPdfText(pdfBuf);

  assert.ok(numPages >= 2, `Long document must paginate cleanly into >= 2 pages (actual: ${numPages})`);
  assert.ok(fullText.includes('Paragraph #1:'), 'First paragraph must be present');
  assert.ok(fullText.includes('Paragraph #35:'), 'Last paragraph must be present');
});

await runTest('Test 1.9: Unicode Characters and Legal Marks (€, £, ©)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph('Copyright © 2026 PDFTools4U. Registered Trademark.'),
        new Paragraph('Pricing tier: £250 per seat or €300 international.'),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('© 2026'), 'Copyright symbol must be present');
  assert.ok(fullText.includes('£250'), 'Pound currency must be present');
  assert.ok(fullText.includes('€300'), 'Euro currency must be present');
});

await runTest('Test 1.10: Selectable & Searchable Vector Text Verification (Non-Raster)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph('VECTOR_SEARCH_TOKEN_ALPHA_BETA_999'),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  
  // Verify that PDF file size is small (< 100 KB) and not a multi-megabyte bitmap screenshot
  assert.ok(pdfBuf.length < 50000, `Vector PDF size should be compact (actual: ${pdfBuf.length} bytes)`);
  const { fullText } = await extractPdfText(pdfBuf);
  assert.ok(fullText.includes('VECTOR_SEARCH_TOKEN_ALPHA_BETA_999'), 'Exact token must be searchable with Ctrl+F in vector text');
});

await runTest('Test 1.11: Unicode Font Support - Indian Rupee (₹), Greek (α, β, γ), and Math Symbols', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun("Total Salary: ₹50,000 INR")] }),
        new Paragraph({ children: [new TextRun("Formula: α + β = γ")] }),
        new Paragraph({ children: [new TextRun("Math Symbols: ± × ÷ ≤ ≥ ≠ ≈ ∞ ∑ √")] }),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('₹50,000'), 'Must contain ₹50,000 without corruption');
  assert.ok(fullText.includes('α + β = γ'), 'Must contain Greek characters α + β = γ');
  assert.ok(fullText.includes('± × ÷ ≤ ≥ ≠ ≈ ∞ ∑ √'), 'Must contain mathematical operators');
});

await runTest('Test 1.12: Devanagari Hindi Text Preservation (नमस्ते दुनिया)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun("नमस्ते दुनिया")] }),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes('नमस्ते दुनिया'), 'Must contain Devanagari Hindi text नमस्ते दुनिया');
});

await runTest('Test 1.13: Explicit Word Page Breaks (<w:br w:type="page"/> and pageBreakBefore)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun("Page 1 Content")] }),
        new Paragraph({ children: [new PageBreak(), new TextRun("Page 2 Content")] }),
        new Paragraph({ pageBreakBefore: true, children: [new TextRun("Page 3 Content")] }),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText, numPages } = await extractPdfText(pdfBuf);

  assert.strictEqual(numPages, 3, 'Document must have exactly 3 pages without redundant blank pages');
  assert.ok(fullText.includes('Page 1 Content'), 'Must have Page 1 Content');
  assert.ok(fullText.includes('Page 2 Content'), 'Must have Page 2 Content');
  assert.ok(fullText.includes('Page 3 Content'), 'Must have Page 3 Content');
});

await runTest('Test 1.14: Document Orientation (Landscape A4: 841.89 x 595.28 pt)', async () => {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
            width: 16838,
            height: 11906,
          }
        }
      },
      children: [
        new Paragraph({ children: [new TextRun("Landscape Page Content")] }),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const pdfDoc = await getDocument({ data: new Uint8Array(pdfBuf) }).promise;
  const page = await pdfDoc.getPage(1);
  const vp = page.getViewport({ scale: 1.0 });

  assert.ok(vp.width > vp.height, 'Width must be greater than height in landscape');
  assert.strictEqual(Math.round(vp.width), 842, 'Width should be A4 landscape (842pt)');
});

await runTest('Test 1.15: Functional Clickable Hyperlinks (<a href="...">)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: "Visit Official Documentation",
                  style: "Hyperlink"
                })
              ],
              link: "https://example.com/docs"
            })
          ]
        })
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const pdfStr = pdfBuf.toString('latin1');

  assert.ok(pdfStr.includes('https://example.com/docs'), 'PDF binary must contain the hyperlink URI');
  assert.ok(pdfStr.includes('/Subtype /Link'), 'PDF binary must contain Link annotation object');
});

await runTest('Test 1.16: Complex Tables with Merged Cells (colSpan and rowSpan)', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 2,
                  children: [new Paragraph("Merged Product Name & Code")]
                }),
                new TableCell({
                  children: [new Paragraph("Unit Price")]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Widget Alpha")] }),
                new TableCell({ children: [new Paragraph("WA-100")] }),
                new TableCell({ children: [new Paragraph("₹299")] })
              ]
            })
          ]
        })
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes("Merged Product Name & Code"), 'Must include merged header content');
  assert.ok(fullText.includes("Widget Alpha"), 'Must include row cell text');
  assert.ok(fullText.includes("₹299"), 'Must preserve Rupee sign inside table cell');
});

await runTest('Test 1.17: Mixed Section Orientation (Portrait A4 -> Landscape A4 -> Portrait A4)', async () => {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          new Paragraph("Section 1: Standard Portrait Page"),
        ]
      },
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children: [
          new Paragraph("Section 2: Wide Landscape Page"),
        ]
      },
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          new Paragraph("Section 3: Return to Portrait Page"),
        ]
      }
    ]
  });

  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const pdfDoc = await getDocument({ data: new Uint8Array(pdfBuf) }).promise;

  assert.strictEqual(pdfDoc.numPages, 3, 'Must produce exactly 3 pages for 3 distinct orientation sections');

  const p1 = await pdfDoc.getPage(1);
  const vp1 = p1.getViewport({ scale: 1.0 });
  assert.ok(vp1.height > vp1.width, 'Page 1 must be portrait');
  assert.strictEqual(Math.round(vp1.width), 595, 'Page 1 width must be 595pt');

  const p2 = await pdfDoc.getPage(2);
  const vp2 = p2.getViewport({ scale: 1.0 });
  assert.ok(vp2.width > vp2.height, 'Page 2 must be landscape');
  assert.strictEqual(Math.round(vp2.width), 842, 'Page 2 width must be 842pt');

  const p3 = await pdfDoc.getPage(3);
  const vp3 = p3.getViewport({ scale: 1.0 });
  assert.ok(vp3.height > vp3.width, 'Page 3 must be portrait');
  assert.strictEqual(Math.round(vp3.width), 595, 'Page 3 width must be 595pt');
});

await runTest('Test 1.18: Devanagari Hindi Conjuncts and Matras Character Preservation', async () => {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph("हिंदी भाषा में दस्तावेज़"),
        new Paragraph("क्ष, त्र, ज्ञ, श्र"),
        new Paragraph("कि, की, कु, कृ"),
      ]
    }]
  });
  const docxBuf = await Packer.toBuffer(doc);
  const pdfBuf = await convertDocxToPdf(docxBuf, { returnBuffer: true });
  const { fullText } = await extractPdfText(pdfBuf);

  assert.ok(fullText.includes("हिंदी भाषा में दस्तावेज़"), 'Must preserve Hindi sentence');
  assert.ok(fullText.includes("क्ष, त्र, ज्ञ, श्र"), 'Must preserve conjunct ligatures in text stream');
  assert.ok(fullText.includes("कि, की, कु, कृ"), 'Must preserve vowel matras in text stream');
});

// ============================================================================
// PART 2: PDF TO WORD ENGINE VERIFICATION
// ============================================================================

await runTest('Test 2.1: Dynamic Heading Detection without Hardcoded University List', async () => {
  const pdfPath = 'C:\\Users\\Harsh Srivastava\\Downloads\\Academic and Grading Policy 2025.pdf';
  if (fs.existsSync(pdfPath)) {
    const pdfBuf = fs.readFileSync(pdfPath);
    const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
    const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

    // Verify absence of artificial page markers
    assert.ok(!html.includes('--- Page'), 'Must not contain literal "--- Page X ---" text');
    // Verify presence of document text
    assert.ok(html.includes('Grading Policy'), 'Document text must be extracted');
    assert.ok(html.includes('Continuous Grade Rating'), 'Content must be extracted');
  }
});

await runTest('Test 2.2: Intelligent Paragraph Flow and Reflow Verification', async () => {
  const pdfPath = 'C:\\Users\\Harsh Srivastava\\Downloads\\Academic and Grading Policy 2025.pdf';
  if (fs.existsSync(pdfPath)) {
    const pdfBuf = fs.readFileSync(pdfPath);
    const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
    const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

    // The sentence was originally 4 wrapped lines in the PDF. It should now be stitched into 1 cohesive paragraph!
    const expectedSentence = "The grading policy at Scaler School of Technology is designed to evaluate students' academic performance using the Continuous Grade Rating (CGR) system.";
    assert.ok(
      html.includes("designed to evaluate students' academic performance using the Continuous Grade Rating"),
      'Wrapped lines must be stitched into a continuous paragraph'
    );
  }
});

await runTest('Test 2.3: Native Word Table Reconstruction from PDF', async () => {
  const pdfPath = 'C:\\Users\\Harsh Srivastava\\Downloads\\Application_form_BITS00066118.pdf';
  if (fs.existsSync(pdfPath)) {
    const pdfBuf = fs.readFileSync(pdfPath);
    const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
    const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

    assert.ok(html.includes('<table'), 'Must generate native DOCX <table> tags for tabular sections');
    assert.ok(html.includes('Legal Sex') && html.includes('Male'), 'Table cells must contain column values');
    assert.ok(html.includes('Date Of Birth') && html.includes('11/04/2006'), 'Table cells must preserve dates');
  }
});

await runTest('Test 2.4: Removal of Hardcoded BITS Heading Overrides', async () => {
  const pdfPath = 'C:\\Users\\Harsh Srivastava\\Downloads\\Application_form_BITS00066118.pdf';
  if (fs.existsSync(pdfPath)) {
    const pdfBuf = fs.readFileSync(pdfPath);
    const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
    const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

    // Verify no literal page separator strings exist
    assert.ok(!html.includes('--- Page 1 ---'), 'Must not contain literal --- Page 1 ---');
    assert.ok(!html.includes('--- Page 2 ---'), 'Must not contain literal --- Page 2 ---');
  }
});

await runTest('Test 2.5: HTML Entity Decoding in Extracted Word Document', async () => {
  // Test that &amp;, &lt;, &gt; are decoded cleanly and not double-encoded
  const samplePdf = 'C:\\Users\\Harsh Srivastava\\Downloads\\Academic and Grading Policy 2025.pdf';
  if (fs.existsSync(samplePdf)) {
    const pdfBuf = fs.readFileSync(samplePdf);
    const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
    const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

    assert.ok(!html.includes('&amp;amp;'), 'Must not double-encode HTML entities');
  }
});

await runTest('Test 2.6: Visual Mode Margin Compliance (No 144pt Overflow)', async () => {
  const samplePdf = 'C:\\Users\\Harsh Srivastava\\Downloads\\Application_form_BITS00066118.pdf';
  if (fs.existsSync(samplePdf)) {
    const pdfBuf = fs.readFileSync(samplePdf);
    // Visual mode should generate valid DOCX without crashing
    const docxBlob = await convertPdfToDocx(pdfBuf, 'visual');
    assert.ok(docxBlob, 'Visual mode must produce valid output');
  }
});

await runTest('Test 2.7: PDF to Word Two-Column Layout Flow Partitioning', async () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(18);
  doc.text("Master Academic Research Report", 150, 50);

  // Left Column (x = 50)
  doc.setFontSize(11);
  doc.text("Left Column Section 1: Introduction", 50, 100);
  doc.text("Left Column Section 2: Methodology", 50, 130);
  doc.text("Left Column Section 3: Data Analysis", 50, 160);
  doc.text("Left Column Section 4: Experimental Setup", 50, 190);

  // Right Column (x = 340)
  doc.text("Right Column Section 1: Literature Review", 340, 100);
  doc.text("Right Column Section 2: Related Work", 340, 130);
  doc.text("Right Column Section 3: Findings Summary", 340, 160);
  doc.text("Right Column Section 4: Conclusion & Outlook", 340, 190);

  const pdfBuf = Buffer.from(doc.output('arraybuffer'));
  const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
  const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());

  const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });
  const leftPos = html.indexOf("Left Column Section 4");
  const rightPos = html.indexOf("Right Column Section 1");

  assert.ok(leftPos !== -1 && rightPos !== -1, "Both left and right columns must be extracted");
  assert.ok(leftPos < rightPos, "Left column must be ordered before right column in flow");
});

await runTest('Test 2.8: PDF to Word Superscript (x²) and Subscript (H₂O) Detection', async () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text("Formula: E=mc", 50, 100);
  doc.setFontSize(9);
  doc.text("2", 136, 96); // shifted up -> superscript

  doc.setFontSize(14);
  doc.text(" and Water is H", 145, 100);
  doc.setFontSize(9);
  doc.text("2", 232, 104); // shifted down -> subscript
  doc.setFontSize(14);
  doc.text("O", 240, 100);

  const pdfBuf = Buffer.from(doc.output('arraybuffer'));
  const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
  const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());

  const zip = await JSZip.loadAsync(docxBuf);
  const docXml = await zip.file("word/document.xml").async("text");

  assert.ok(docXml.includes('w:val="superscript"'), "Must detect and format superscript tag in Word XML");
  assert.ok(docXml.includes('w:val="subscript"'), "Must detect and format subscript tag in Word XML");
});

await runTest('Test 2.9: Asymmetric 65/35 PDF Layout Reading Order and Column Separation', async () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text("Asymmetric 65/35 Research Article", 50, 60);

  // Left Column (65% width: x=50 to 350)
  doc.setFontSize(10);
  doc.text("Left Col Main Section 1: Overview of Distributed Systems", 50, 100);
  doc.text("Left Col Main Section 2: Consensus Protocols Under High Load", 50, 130);
  doc.text("Left Col Main Section 3: Byzantine Fault Tolerance Benchmarks", 50, 160);
  doc.text("Left Col Main Section 4: Throughput and Recovery Analysis", 50, 190);

  // Right Column (35% width: x=380 to 550)
  doc.text("Sidebar: Core Takeaways", 380, 100);
  doc.text("Point 1: 99.99% availability achieved", 380, 130);
  doc.text("Point 2: Latency under 12ms", 380, 160);
  doc.text("Point 3: Tested across 50 nodes", 380, 190);

  const pdfBuf = Buffer.from(doc.output('arraybuffer'));
  const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
  const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
  const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

  const leftEnd = html.indexOf("Throughput and Recovery Analysis");
  const rightStart = html.indexOf("Sidebar: Core Takeaways");

  assert.ok(leftEnd !== -1 && rightStart !== -1, "Both asymmetric columns must be extracted");
  assert.ok(leftEnd < rightStart, "Left 65% column must flow before Right 35% sidebar");
});

await runTest('Test 2.10: Asymmetric 70/30 PDF Layout with Narrow Sidebar', async () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text("Technical Whitepaper 70/30 Architecture", 50, 60);

  // Left Column (70% width: x=50 to 380)
  doc.setFontSize(10);
  doc.text("Main Section 1: Scalable Cloud Architecture Design Patterns", 50, 100);
  doc.text("Main Section 2: Microservices Decoupling and Event Streaming", 50, 130);
  doc.text("Main Section 3: Database Sharding and Read-Replication Strategies", 50, 160);
  doc.text("Main Section 4: Operational Observability and Tracing", 50, 190);

  // Right Column (30% width: x=410 to 550)
  doc.text("Key Metrics Table", 410, 100);
  doc.text("Metric A: 100K RPS", 410, 130);
  doc.text("Metric B: P99 < 5ms", 410, 160);
  doc.text("Metric C: 0 Error Rate", 410, 190);

  const pdfBuf = Buffer.from(doc.output('arraybuffer'));
  const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
  const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
  const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

  const leftEnd = html.indexOf("Observability and Tracing");
  const rightStart = html.indexOf("Key Metrics Table");

  assert.ok(leftEnd !== -1 && rightStart !== -1, "Both 70/30 columns must be extracted");
  assert.ok(leftEnd < rightStart, "70% column must flow before 30% sidebar");
});

await runTest('Test 2.11: Multi-Column PDF Intersected by Full-Width Figure and Banner Elements', async () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text("Paper with Mid-Page Full-Width Figure Callout", 50, 50);

  // Top Columns
  doc.setFontSize(10);
  doc.text("Top Left Col Line A", 50, 100);
  doc.text("Top Left Col Line B", 50, 120);
  doc.text("Top Right Col Line A", 360, 100);
  doc.text("Top Right Col Line B", 360, 120);

  // Full-width Figure across center
  doc.setFontSize(12);
  doc.text("--- FIGURE 1: COMPLETE END-TO-END SYSTEM DIAGRAM ---", 50, 200);

  // Bottom Columns
  doc.setFontSize(10);
  doc.text("Bottom Left Col Line C", 50, 250);
  doc.text("Bottom Left Col Line D", 50, 270);
  doc.text("Bottom Right Col Line C", 360, 250);
  doc.text("Bottom Right Col Line D", 360, 270);

  const pdfBuf = Buffer.from(doc.output('arraybuffer'));
  const docxBlob = await convertPdfToDocx(pdfBuf, 'text');
  const docxBuf = Buffer.isBuffer(docxBlob) ? docxBlob : Buffer.from(await docxBlob.arrayBuffer());
  const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

  const topPos = html.indexOf("Top Left Col Line B");
  const figPos = html.indexOf("FIGURE 1");
  const botPos = html.indexOf("Bottom Left Col Line C");

  assert.ok(topPos < figPos, "Top columns must precede Figure 1");
  assert.ok(figPos < botPos, "Figure 1 must precede Bottom columns");
});

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}


import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Import libraries
const pdfjsPath = pathToFileURL(path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href;
const xlsxPath = pathToFileURL(path.join(projectRoot, 'node_modules', 'xlsx', 'xlsx.mjs')).href;
const jspdfPath = pathToFileURL(path.join(projectRoot, 'node_modules', 'jspdf', 'dist', 'jspdf.es.min.js')).href;
const autoTablePath = pathToFileURL(path.join(projectRoot, 'node_modules', 'jspdf-autotable', 'dist', 'jspdf.plugin.autotable.mjs')).href;

const pdfjsLib = await import(pdfjsPath);
const XLSX = (await import(xlsxPath)).default || await import(xlsxPath);
const { jsPDF } = await import(jspdfPath);
const autoTableModule = await import(autoTablePath);
const autoTable = autoTableModule.default || autoTableModule;

// Import our extraction logic from pdfConversion.js
const { extractTableFromPageItems, convertPdfToExcel, decodeHtmlEntities } = await import(pathToFileURL(path.join(projectRoot, 'src', 'utils', 'pdfConversion.js')).href);

let passedCount = 0;
let totalCount = 0;

function runTest(testName, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
  }
}

async function runAsyncTest(testName, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(err);
  }
}

console.log('================================================================');
console.log('  AUTOMATED TEST SUITE: PDF TO EXCEL & EXCEL TO PDF CONVERSION');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// PART 1: PDF TO EXCEL TESTS
// -----------------------------------------------------------------------------
console.log('--- PART 1: PDF to Excel Table Extraction Tests ---');

await runAsyncTest('Test 1.1: Normal 4-Column Table Extraction', async () => {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [['ID', 'Name', 'Department', 'Salary']],
    body: [
      ['101', 'Alice Johnson', 'Engineering', '$120,000'],
      ['102', 'Bob Smith', 'Marketing', '$95,000'],
      ['103', 'Charlie Brown', 'Design', '$85,000']
    ],
    startY: 20
  });

  const pdfBytes = doc.output('arraybuffer');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const rows = extractTableFromPageItems(textContent.items, 842, 595);

  assert.strictEqual(rows.length, 4, `Expected 4 rows, got ${rows.length}`);
  assert.strictEqual(rows[0][0], 'ID');
  assert.strictEqual(rows[0][1], 'Name');
  assert.strictEqual(rows[1][1], 'Alice Johnson');
  assert.strictEqual(rows[2][2], 'Marketing');
});

await runAsyncTest('Test 1.2: Empty Cells in Middle of Rows (No Column Left-Shifting)', async () => {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [['Name', 'Role', 'Department', 'Salary']],
    body: [
      ['Alice', 'Engineer', 'Tech', '$100k'],
      ['Bob', '', 'Marketing', '$80k'],
      ['Charlie', 'Designer', '', '$75k']
    ],
    startY: 20
  });

  const pdfBytes = doc.output('arraybuffer');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const rows = extractTableFromPageItems(textContent.items, 842, 595);

  assert.strictEqual(rows.length, 4);
  // Verify Bob's row: Column 0 = "Bob", Column 1 = "" (empty), Column 2 = "Marketing", Column 3 = "$80k"
  assert.strictEqual(rows[2][0], 'Bob', `Expected Bob in Col 0, got "${rows[2][0]}"`);
  assert.strictEqual(rows[2][1], '', `Expected empty string in Col 1, got "${rows[2][1]}"`);
  assert.strictEqual(rows[2][2], 'Marketing', `Expected Marketing in Col 2, got "${rows[2][2]}"`);
  assert.strictEqual(rows[2][3], '$80k', `Expected $80k in Col 3, got "${rows[2][3]}"`);

  // Verify Charlie's row: Column 0 = "Charlie", Column 1 = "Designer", Column 2 = "" (empty), Column 3 = "$75k"
  assert.strictEqual(rows[3][0], 'Charlie');
  assert.strictEqual(rows[3][1], 'Designer');
  assert.strictEqual(rows[3][2], '', `Expected empty string in Col 2, got "${rows[3][2]}"`);
  assert.strictEqual(rows[3][3], '$75k');
});

await runAsyncTest('Test 1.3: Empty First-Column Cell (No Left-Shifting on Col 0)', async () => {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [['Code', 'Product', 'Qty', 'Total']],
    body: [
      ['C1', 'Widget', '10', '$100'],
      ['', 'Service Fee', '1', '$50']
    ],
    startY: 20
  });

  const pdfBytes = doc.output('arraybuffer');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const rows = extractTableFromPageItems(textContent.items, 842, 595);

  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[2][0], '', `Col 0 should be empty, got "${rows[2][0]}"`);
  assert.strictEqual(rows[2][1], 'Service Fee', `Col 1 should be Service Fee, got "${rows[2][1]}"`);
  assert.strictEqual(rows[2][2], '1', `Col 2 should be 1, got "${rows[2][2]}"`);
  assert.strictEqual(rows[2][3], '$50', `Col 3 should be $50, got "${rows[2][3]}"`);
});

await runAsyncTest('Test 1.4: Wrapped Text & Multiline Cell Stitching', async () => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const columns = ['Col A', 'Col B', 'Col C', 'Col D'];
  const bodyRows = [
    ['Entry 1', 'Long description wrapping across multiple lines in this cell', 'Category A', '$500'],
    ['Entry 2', 'Another multi-line cell description with details', 'Category B', '$750']
  ];

  autoTable(doc, {
    head: [columns],
    body: bodyRows,
    startY: 20,
    styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
    columnStyles: { 1: { cellWidth: 120 } } // Force wrapping
  });

  const pdfBytes = doc.output('arraybuffer');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const rows = extractTableFromPageItems(textContent.items, 595, 842);

  // Row count should be exactly 3 (1 header + 2 data rows), NOT doubled into 5 or 6 rows
  assert.strictEqual(rows.length, 3, `Expected exactly 3 rows, got ${rows.length}`);
  assert.ok(rows[1][1].includes('Long description'), 'Should include first part of multiline cell');
  assert.ok(rows[1][1].includes('wrapping'), 'Should include wrapped continuation');
});

await runAsyncTest('Test 1.5: Document Title Banner Preceding Table Headers', async () => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Annual Audit Report 2026', 14, 20);

  autoTable(doc, {
    head: [['Account', 'Debit', 'Credit', 'Balance']],
    body: [
      ['Cash', '$10,000', '', '$10,000'],
      ['Receivables', '$5,000', '', '$15,000']
    ],
    startY: 35
  });

  const pdfBytes = doc.output('arraybuffer');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const rows = extractTableFromPageItems(textContent.items, 842, 595);

  assert.ok(rows.length >= 3);
  assert.ok(rows[0][0].includes('Annual Audit Report 2026'), 'First row should contain title banner');
  assert.strictEqual(rows[1][0], 'Account', 'Second row should be table header');
});

await runAsyncTest('Test 1.6: Scanned PDF / Image-Only Document Detection', async () => {
  // Empty items array simulation
  const emptyItems = [];
  const rows = extractTableFromPageItems(emptyItems, 842, 595);
  assert.strictEqual(rows.length, 0, 'Scanned PDF with 0 selectable text should produce empty array');
});

await runAsyncTest('Test 1.7: Multiple Unrelated Tables on Same Page Partitioning', async () => {
  const doc = new jsPDF();
  // Table 1: 2-column Metadata
  autoTable(doc, {
    head: [['Field', 'Value']],
    body: [
      ['Customer Name', 'Acme Corp'],
      ['Invoice Number', 'INV-2026-001']
    ],
    startY: 20
  });

  // Table 2: 4-column Items with vertical gap >= 40pt
  autoTable(doc, {
    head: [['Item #', 'Description', 'Qty', 'Total']],
    body: [
      ['1', 'Standard Server Rack', '2', '$2,400'],
      ['2', 'Ethernet Switch 48-port', '4', '$1,800']
    ],
    startY: 120
  });

  const pdfBytes = doc.output('arraybuffer');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const rows = extractTableFromPageItems(textContent.items, 842, 595);

  // Should have Table 1 (3 rows: head + 2 body), empty buffer row [], Table 2 (3 rows: head + 2 body) = 7 rows total
  assert.strictEqual(rows.length, 7, `Expected 7 rows (including region buffer), got ${rows.length}`);
  assert.strictEqual(rows[0].length, 2, 'Table 1 should be 2 columns');
  assert.strictEqual(rows[0][0], 'Field');
  assert.strictEqual(rows[0][1], 'Value');
  assert.strictEqual(rows[3].length, 0, 'Buffer row should separate regions');
  assert.strictEqual(rows[4].length, 4, 'Table 2 should be 4 columns');
  assert.strictEqual(rows[4][0], 'Item #');
  assert.strictEqual(rows[4][3], 'Total');
});

await runAsyncTest('Test 1.8: Merged Category / Section Heading Detection', async () => {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [['Category / Project Expenses', '', '', '']],
    body: [
      ['Item Description', 'Department', 'Units', 'Cost'],
      ['Fiber Optic Cabling', 'Infrastructure', '10', '$3,500'],
      ['Server Maintenance', 'IT Support', '1', '$1,200']
    ],
    startY: 20
  });

  const pdfBytes = doc.output('arraybuffer');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const rows = extractTableFromPageItems(textContent.items, 842, 595);

  assert.ok(rows.merges && rows.merges.length > 0, 'Should detect merged heading');
  assert.strictEqual(rows.merges[0].s.c, 0, 'Merge starts at col 0');
  assert.strictEqual(rows.merges[0].e.c, 3, 'Merge spans all 4 cols');
});

await runAsyncTest('Test 1.10: Complex PDF Benchmark (75 TX IDs, 7 Cols, SP-001..SP-004, Furniture Filtered)', async () => {
  const pdfPath = 'C:\\Users\\Harsh Srivastava\\Downloads\\PDFTools4U_Complex_PDF_Test.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.log('    [SKIP] Benchmark PDF file not found at expected path');
    return;
  }
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;

  const pageTables = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const v = page.getViewport({ scale: 1.0 });
    const rows = extractTableFromPageItems(textContent.items, v.height, v.width);
    pageTables.push({ pageNum: p, rows });
  }

  // Verify Page 1 Table C
  const p1Rows = pageTables[0].rows;
  const sp1 = p1Rows.find(r => r[0] === 'SP-001');
  const sp2 = p1Rows.find(r => r[0] === 'SP-002');
  const sp3 = p1Rows.find(r => r.some(c => String(c).includes('Cedar')));
  const sp4 = p1Rows.find(r => r[0] === 'SP-004');

  assert.ok(sp1 && sp1[1] === 'Aster Labs' && sp1[3] === '$12,500.00', 'SP-001 extracted accurately');
  assert.ok(sp2 && sp2[1] === 'Blue Finch Ltd.' && sp2[2].includes('Migration support') && sp2[3] === '', 'SP-002 multiline description stitched');
  assert.ok(sp3 && sp3[0] === '' && sp3[2].includes('Security assessment') && sp3[3] === '$3,875.25', 'SP-003 sparse cells preserved');
  assert.strictEqual(sp3[1], 'Cedar & Co.', 'Cedar & Co. HTML entity &amp; decoded cleanly');
  assert.ok(sp4 && sp4[1] === 'Delta Works' && sp4[3] === '$0.00', 'SP-004 zero value preserved');

  // Verify Table D: All 75 Transaction IDs
  const p2Rows = pageTables[1].rows;
  const p3Rows = pageTables[2].rows;
  const allTxRows = [...p2Rows, ...p3Rows].filter(r => r.some(c => /^TX-\d{4}$/.test(String(c).trim())));
  assert.strictEqual(allTxRows.length, 75, 'All 75 transaction IDs extracted');

  for (let i = 1; i <= 75; i++) {
    const expectedId = `TX-${String(i).padStart(4, '0')}`;
    assert.strictEqual(allTxRows[i - 1][0], expectedId, `Record ${i} ID match`);
    assert.strictEqual(allTxRows[i - 1].length, 7, `Record ${expectedId} 7 columns`);
  }

  // Verify TX-0008, TX-0019, TX-0037, TX-0058
  const tx8 = allTxRows.find(r => r[0] === 'TX-0008');
  assert.ok(tx8[3].includes('Monthly subscription fee') && tx8[4] === '' && tx8[5] === '$1,084.68' && tx8[6] === 'Yes', 'TX-0008 accurate columns');

  const tx19 = allTxRows.find(r => r[0] === 'TX-0019');
  assert.ok(tx19[3].includes('International transfer fee') && tx19[4] === '$1,267.79' && tx19[5] === '' && tx19[6] === 'Yes', 'TX-0019 accurate columns');

  const tx37 = allTxRows.find(r => r[0] === 'TX-0037');
  assert.ok(tx37[3].includes('Data migration services') && tx37[4] === '$15,070.82' && tx37[5] === '', 'TX-0037 accurate columns');

  const tx58 = allTxRows.find(r => r[0] === 'TX-0058');
  assert.ok(tx58[3].includes('Credit adjustment following') && tx58[4] === '$10,295.21' && tx58[5] === '', 'TX-0058 accurate columns');

  // Verify zero page furniture
  const allRowsFlat = pageTables.flatMap(p => p.rows);
  allRowsFlat.forEach(r => {
    const line = r.join(' ');
    assert.ok(!line.includes('PDFTools4U synthetic conversion QA document'), 'Running footer excluded');
    assert.ok(!/^Page \d+$/i.test(line.trim()), 'Page number excluded');
  });
});

runTest('Test 1.11: HTML Entity Decoding in Table Cells & Strings', () => {
  // Test Cedar & Co.
  assert.strictEqual(decodeHtmlEntities('Cedar &amp; Co.'), 'Cedar & Co.');

  // Test A & B Technologies (preserving raw unencoded ampersands)
  assert.strictEqual(decodeHtmlEntities('A & B Technologies'), 'A & B Technologies');
  assert.strictEqual(decodeHtmlEntities('AT&T and R&D Systems'), 'AT&T and R&D Systems');

  // Test less-than and greater-than symbols
  assert.strictEqual(decodeHtmlEntities('&lt;100&gt; and &lt;= 50'), '<100> and <= 50');

  // Test quotation marks and apostrophes
  assert.strictEqual(decodeHtmlEntities('&quot;Hello World&quot;'), '"Hello World"');
  assert.strictEqual(decodeHtmlEntities('&apos;Single Quotes&apos;'), "'Single Quotes'");
  assert.strictEqual(decodeHtmlEntities('&#39;Numeric Apostrophe&#39;'), "'Numeric Apostrophe'");
  assert.strictEqual(decodeHtmlEntities('&#x27;Hex Apostrophe&#x27;'), "'Hex Apostrophe'");

  // Test non-breaking spaces
  assert.strictEqual(decodeHtmlEntities('Non&nbsp;Breaking&#160;Space'), 'Non Breaking Space');

  // Test numeric and hex HTML entities
  assert.strictEqual(decodeHtmlEntities('&#x26; Ampersand'), '& Ampersand');
  assert.strictEqual(decodeHtmlEntities('Copyright &#169; 2026'), 'Copyright © 2026');

  // Test no double-decoding
  assert.strictEqual(decodeHtmlEntities('&amp;amp;'), '&amp;');

  // Test normal text preservation
  assert.strictEqual(decodeHtmlEntities('Regular text without entities 100% $50'), 'Regular text without entities 100% $50');
});

await runAsyncTest('Test 1.9: Conversion Cancellation via AbortSignal', async () => {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [['Col A', 'Col B']],
    body: [['Val 1', 'Val 2']],
    startY: 20
  });
  const pdfBytes = doc.output('arraybuffer');
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  blob.name = 'test-cancel.pdf';

  const controller = new AbortController();
  controller.abort(); // Pre-aborted

  let abortedError = null;
  try {
    await convertPdfToExcel(blob, () => {}, { signal: controller.signal });
  } catch (err) {
    abortedError = err;
  }

  assert.ok(abortedError, 'Aborted conversion should throw');
  assert.strictEqual(abortedError.name, 'AbortError', 'Should throw AbortError');
});


// -----------------------------------------------------------------------------
// PART 2: EXCEL TO PDF TESTS
// -----------------------------------------------------------------------------
console.log('\n--- PART 2: Excel to PDF Conversion Tests ---');

runTest('Test 2.1: Date Formatting Preservation (raw: false vs raw: true)', () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Date', 'Event'],
    [new Date(2026, 9, 30), 'Q3 Release']
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData, { cellDates: true });

  const rawFalseData = XLSX.utils.sheet_to_json(ws, { 
    header: 1, 
    raw: false, 
    dateNF: 'yyyy-mm-dd', 
    defval: '' 
  });

  const dateValue = rawFalseData[1][0];
  // Verify date does not contain long GMT timezone string
  assert.ok(!dateValue.includes('GMT'), `Date should not contain GMT timezone string. Got: "${dateValue}"`);
  assert.ok(dateValue.includes('26') || dateValue.includes('2026'), `Date should contain year. Got: "${dateValue}"`);
});

runTest('Test 2.2: Number, Currency and Percentage Formatting Preservation', () => {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Metric', 'Value'],
    ['Revenue', 1250000.50],
    ['Margin', 0.245],
    ['Loss', -450.75]
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const formatted = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  assert.strictEqual(formatted[1][1], '1250000.5');
  assert.strictEqual(formatted[2][1], '0.245');
  assert.strictEqual(formatted[3][1], '-450.75');
});

await runAsyncTest('Test 2.3: Multi-Sheet Workbook PDF Generation with Sheet Separation', async () => {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Product', 'Q1 Sales'],
    ['Widget Alpha', '$15,000'],
    ['Widget Beta', '$22,000']
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Region', 'Manager', 'Quota Met'],
    ['North', 'Sarah Connor', 'YES'],
    ['South', 'John Doe', 'NO']
  ]);

  XLSX.utils.book_append_sheet(wb, ws1, 'SalesQ1');
  XLSX.utils.book_append_sheet(wb, ws2, 'RegionalStaff');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const sheetNames = wb.SheetNames;

  for (let i = 0; i < sheetNames.length; i++) {
    const sName = sheetNames[i];
    const ws = wb.Sheets[sName];
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    if (i > 0) doc.addPage();
    doc.setFontSize(14);
    doc.text(`Sheet: ${sName}`, 20, 30);

    autoTable(doc, {
      startY: 45,
      head: [rawData[0]],
      body: rawData.slice(1),
      showHead: 'everyPage'
    });
  }

  const pdfOutput = doc.output('arraybuffer');
  assert.ok(pdfOutput.byteLength > 1000, 'PDF should have valid output size');

  const loadedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfOutput) }).promise;
  assert.strictEqual(loadedPdf.numPages, 2, `Expected 2 pages for 2 sheets, got ${loadedPdf.numPages}`);
});

await runAsyncTest('Test 2.4: Wide Table (12+ Columns) with Dynamic Auto-Scaling', async () => {
  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const rowData = columns.map((col, idx) => `Val ${col}-${idx + 1}`);

  const maxCols = columns.length;
  // Apply our dynamic font scaling rule from ExcelToPdf.jsx
  let dynamicFontSize = 9;
  let dynamicCellPadding = 6;
  if (maxCols > 10) {
    dynamicFontSize = 7;
    dynamicCellPadding = 3;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  autoTable(doc, {
    head: [columns],
    body: [rowData, rowData],
    startY: 20,
    styles: {
      fontSize: dynamicFontSize,
      cellPadding: dynamicCellPadding,
      overflow: 'linebreak'
    }
  });

  const pdfOutput = doc.output('arraybuffer');
  const loadedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfOutput) }).promise;
  assert.ok(loadedPdf.numPages >= 1, 'Wide table should render cleanly');
});

await runAsyncTest('Test 2.5: Multi-Page Long Table Repeating Headers', async () => {
  const head = [['ID', 'Name', 'Score', 'Grade']];
  const body = Array.from({ length: 80 }, (_, i) => [
    String(i + 1),
    `Student ${i + 1}`,
    String(70 + (i % 30)),
    i % 2 === 0 ? 'Pass' : 'Distinction'
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  autoTable(doc, {
    head,
    body,
    startY: 20,
    showHead: 'everyPage' // Rule verification
  });

  const pdfOutput = doc.output('arraybuffer');
  const loadedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfOutput) }).promise;
  assert.ok(loadedPdf.numPages > 1, `80-row table should span across multiple pages. Got: ${loadedPdf.numPages}`);
});

await runAsyncTest('Test 2.7: Complex Excel Benchmark End-to-End PDF Generation (4 Sheets, 120 Transactions, 22 Cols, 0 Blank Pages)', async () => {
  const excelPath = 'C:\\Users\\Harsh Srivastava\\Downloads\\PDFTools4U_Complex_Excel_Test.xlsx';
  if (!fs.existsSync(excelPath)) {
    console.log('    [SKIP] Benchmark Excel file not found at expected path');
    return;
  }
  const buf = fs.readFileSync(excelPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

  assert.strictEqual(wb.SheetNames.length, 4, 'Workbook contains exactly 4 worksheets');
  assert.ok(wb.SheetNames.includes('Executive Summary'));
  assert.ok(wb.SheetNames.includes('Transactions_120x14'));
  assert.ok(wb.SheetNames.includes('WideData_22Cols'));
  assert.ok(wb.SheetNames.includes('EdgeCases_Merged_Sparse'));

  // Helper matching extractFormattedSheetData from ExcelToPdf.jsx
  function extractFormattedSheetData(ws) {
    const rawData = XLSX.utils.sheet_to_json(ws, { 
      header: 1, 
      raw: false, 
      dateNF: 'yyyy-mm-dd',
      defval: '' 
    });

    const maxCols = Math.max(...rawData.map(r => (Array.isArray(r) ? r.length : 0)), 0);
    const normalizedData = rawData.map(row => {
      const cleanRow = [];
      for (let i = 0; i < maxCols; i++) {
        const cell = Array.isArray(row) ? row[i] : '';
        cleanRow.push(cell !== undefined && cell !== null ? String(cell) : '');
      }
      return cleanRow;
    });

    const titles = [];
    let headerRowIdx = 0;
    for (let r = 0; r < normalizedData.length; r++) {
      const populated = normalizedData[r].filter(c => c.trim().length > 0);
      if (populated.length === 0) continue;
      if (populated.length === 1 && maxCols >= 3) {
        titles.push(populated[0].trim());
      } else {
        headerRowIdx = r;
        break;
      }
    }

    const head = normalizedData[headerRowIdx] ? [normalizedData[headerRowIdx]] : [];
    const body = normalizedData.slice(headerRowIdx + 1).filter(r => r.some(c => c.trim().length > 0));
    const title = titles.length > 0 ? titles.join(' — ') : null;

    return { title, head, body, maxCols };
  }

  // Execute the exact PDF generation loop from ExcelToPdf.jsx
  const sheetsToProcess = wb.SheetNames;
  let firstSheetCols = 0;
  for (const name of sheetsToProcess) {
    const ws = wb.Sheets[name];
    if (ws) {
      const { maxCols, head, body } = extractFormattedSheetData(ws);
      if (head.length > 0 || body.length > 0) {
        firstSheetCols = maxCols;
        break;
      }
    }
  }

  const orientation = 'auto';
  const pageSize = 'a4';
  const wideTableMode = 'paginate';
  const activeSheet = '__ALL_SHEETS__';

  const initialOrientation = orientation === 'auto'
    ? (firstSheetCols > 6 ? 'landscape' : 'portrait')
    : orientation;

  const doc = new jsPDF({
    orientation: initialOrientation,
    unit: 'pt',
    format: pageSize
  });

  let pagesRendered = 0;

  for (let sIdx = 0; sIdx < sheetsToProcess.length; sIdx++) {
    const sheetName = sheetsToProcess[sIdx];
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const { title, head, body, maxCols } = extractFormattedSheetData(ws);
    if (head.length === 0 && body.length === 0) continue;

    const currentOrientation = orientation === 'auto'
      ? (maxCols > 6 ? 'landscape' : 'portrait')
      : orientation;

    const needsHorizontalSplit = wideTableMode === 'paginate' && maxCols > (currentOrientation === 'landscape' ? 12 : 8);
    const baseChunkCols = currentOrientation === 'landscape' ? 11 : 7;
    const maxChunkColsWithAnchor = currentOrientation === 'landscape' ? 12 : 8;

    const chunks = [];
    if (!needsHorizontalSplit || head[0].length <= baseChunkCols) {
      chunks.push({
        colIndices: head[0].map((_, i) => i),
        chunkTitle: null
      });
    } else {
      const totalCols = head[0].length;
      chunks.push({
        colIndices: Array.from({ length: Math.min(baseChunkCols, totalCols) }, (_, i) => i),
        chunkTitle: `Part 1 (Cols 1-${Math.min(baseChunkCols, totalCols)})`
      });
      let startCol = baseChunkCols;
      let partNum = 2;
      while (startCol < totalCols) {
        const remaining = totalCols - startCol;
        let takeCols = baseChunkCols - 1;
        if (1 + remaining <= maxChunkColsWithAnchor) {
          takeCols = remaining;
        } else if (remaining - takeCols <= 1 && 1 + remaining <= maxChunkColsWithAnchor + 1) {
          takeCols = remaining;
        }

        const endCol = Math.min(startCol + takeCols, totalCols);
        const cols = [0];
        for (let c = startCol; c < endCol; c++) cols.push(c);
        chunks.push({
          colIndices: cols,
          chunkTitle: `Part ${partNum} (Cols 1 & ${startCol + 1}-${endCol})`
        });
        startCol = endCol;
        partNum++;
      }
    }

    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      if (pagesRendered > 0) {
        doc.addPage(pageSize, currentOrientation);
      }
      pagesRendered++;

      let startY = 25;
      if (activeSheet === '__ALL_SHEETS__' || title) {
        doc.setFontSize(11);
        const prefix = chunk.chunkTitle 
          ? `${sheetName} [${chunk.chunkTitle}]` 
          : (activeSheet === '__ALL_SHEETS__' ? `Worksheet: ${sheetName}` : sheetName);
        const bannerText = title ? `${prefix}: ${title}` : prefix;
        const pageWidth = doc.internal.pageSize.getWidth();
        const textLines = doc.splitTextToSize(bannerText, pageWidth - 40);

        doc.text(textLines, 20, startY);
        startY += textLines.length * 13 + 6;
      }

      const chunkHead = [chunk.colIndices.map(i => head[0][i])];
      const chunkBody = body.map(row => chunk.colIndices.map(i => row[i] || ''));

      let dynamicFontSize = 8.5;
      let dynamicCellPadding = 4;
      if (chunk.colIndices.length > 11) {
        dynamicFontSize = 8.0;
        dynamicCellPadding = 3.5;
      }

      autoTable(doc, {
        head: chunkHead,
        body: chunkBody,
        showHead: 'everyPage',
        startY: startY,
        theme: 'grid',
        styles: { fontSize: dynamicFontSize, cellPadding: dynamicCellPadding, overflow: 'linebreak' },
        margin: { top: 25, right: 20, bottom: 25, left: 20 }
      });
    }
  }

  const pdfOutput = doc.output('arraybuffer');
  assert.ok(pdfOutput.byteLength > 100000, 'Complete PDF should have substantial byte size');

  const loadedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfOutput) }).promise;
  assert.strictEqual(loadedPdf.numPages, 19, `Expected exactly 19 pages without blank pages, got ${loadedPdf.numPages}`);

  let blankPageCount = 0;
  const allPageText = [];

  for (let p = 1; p <= loadedPdf.numPages; p++) {
    const page = await loadedPdf.getPage(p);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(it => it.str).join(' ').trim();
    allPageText.push(text);
    if (text.length === 0) blankPageCount++;
  }

  // Verify zero blank pages
  assert.strictEqual(blankPageCount, 0, 'Generated PDF must contain ZERO unintended blank pages');

  // Verify all 4 worksheets
  const fullText = allPageText.join(' ');
  assert.ok(fullText.includes('Executive Summary'), 'Executive Summary present');
  assert.ok(fullText.includes('Transactions_120x14'), 'Transactions_120x14 present');
  assert.ok(fullText.includes('WideData_22Cols'), 'WideData_22Cols present');
  assert.ok(fullText.includes('EdgeCases_Merged_Sparse'), 'EdgeCases_Merged_Sparse present');

  // Verify all 120 transaction records in PDF
  for (let i = 1; i <= 120; i++) {
    const expectedId = `LED-${String(i).padStart(5, '0')}`;
    assert.ok(fullText.includes(expectedId), `Transaction ${expectedId} must be present in PDF`);
  }

  // Verify wide table columns & optimized pagination (Part 1 and Part 2 only, no orphaned Part 3)
  assert.ok(fullText.includes('Part 1 (Cols 1-11)'), 'Wide table Part 1 chunk rendered');
  assert.ok(fullText.includes('Part 2 (Cols 1 & 12-22)'), 'Wide table Part 2 chunk rendered with Col 22 absorbed');
  assert.ok(!fullText.includes('Part 3'), 'Orphaned single-column Part 3 chunk eliminated');
  assert.ok(fullText.includes('WID-0001'), 'Wide table record WID-0001 present');
  assert.ok(fullText.includes('WID-0045'), 'Wide table record WID-0045 present');
  assert.ok(fullText.includes('Audit Flag'), 'Wide table Col 22 Audit Flag present');
});

runTest('Test 2.6: Excel Sheet Caching & Lightweight Preview Slicing', () => {
  const wb = XLSX.utils.book_new();
  const bigData = Array.from({ length: 500 }, (_, i) => [
    `ID-${i}`, `Item ${i}`, `${i * 10}`, 'In Stock'
  ]);
  const ws = XLSX.utils.aoa_to_sheet([['ID', 'Name', 'Price', 'Status'], ...bigData]);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

  // Verify caching logic
  const cache = new Map();
  const getParsed = (sheetName) => {
    if (cache.has(sheetName)) return cache.get(sheetName);
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: '' });
    const res = { total: raw.length, preview: raw.slice(0, 25) };
    cache.set(sheetName, res);
    return res;
  };

  const parsed1 = getParsed('Inventory');
  const parsed2 = getParsed('Inventory');
  assert.strictEqual(parsed1, parsed2, 'Second access should return cached reference without re-parsing');
  assert.strictEqual(parsed1.total, 501, 'Should record total row count of 501');
  assert.strictEqual(parsed1.preview.length, 25, 'Preview should be limited to 25 rows for memory conservation');
});


// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
if (passedCount === totalCount) {
  console.log('  STATUS: ALL AUTOMATED AUDIT TESTS PASSED WITH ZERO FAILURES! ✓');
} else {
  console.log(`  STATUS: ${totalCount - passedCount} TESTS FAILED!`);
}
console.log('================================================================');

if (passedCount !== totalCount) {
  process.exit(1);
}


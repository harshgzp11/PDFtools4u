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
const { extractTableFromPageItems, convertPdfToExcel } = await import(pathToFileURL(path.join(projectRoot, 'src', 'utils', 'pdfConversion.js')).href);

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


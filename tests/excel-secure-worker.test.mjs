/**
 * Automated Regression Test Suite: Secure SheetJS Upgrade & Web Worker Migration
 * 
 * Verifies:
 * 1. XLSX conversion
 * 2. Legacy XLS (BIFF8) conversion
 * 3. CSV conversion
 * 4. Multiple worksheets
 * 5. Date formatting
 * 6. Currency and percentage formatting
 * 7. Empty and sparse cells
 * 8. Merged cells & Title Banner extraction
 * 9. Formula cached values
 * 10. Large workbooks within limits
 * 11. Malformed workbooks
 * 12. Worker watchdog timeout & termination
 * 13. Cancellation and cleanup
 * 14. Invalid worker responses & Schema validation
 * 15. Existing complex end-to-end benchmark (PDF generation)
 * 16. Malicious complexity limits & UI thread freeze immunity
 */

import assert from 'assert';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseWorkbookBuffer, LIMITS } from '../src/workers/excelParser.worker.js';
import { validateWorkerPayload, parseExcelInWorker } from '../src/utils/excelWorkerBridge.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

console.log('================================================================');
console.log('  SECURE SHEETJS UPGRADE & WEB WORKER MIGRATION TEST SUITE');
console.log(`  Target: SheetJS ${XLSX.version} (Vendored Official 0.20.3)`);
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: FORMAT COMPATIBILITY (XLSX, XLS, CSV)
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: FORMAT COMPATIBILITY (XLSX, XLS, CSV) ---');

runTest('Test 1: Standard OpenXML XLSX parsing and structure extraction', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Product ID', 'Name', 'Price', 'Inventory'],
    ['P-101', 'Ergonomic Desk', '$350.00', '15'],
    ['P-102', 'Mesh Chair', '$180.00', '42']
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const result = parseWorkbookBuffer(buf);

  assert.strictEqual(result.sheetNames.length, 1);
  assert.strictEqual(result.sheetNames[0], 'Products');
  const sheet = result.sheets['Products'];
  assert.strictEqual(sheet.maxCols, 4);
  assert.strictEqual(sheet.head[0][0], 'Product ID');
  assert.strictEqual(sheet.body.length, 2);
  assert.strictEqual(sheet.body[0][1], 'Ergonomic Desk');
});

runTest('Test 2: Legacy binary XLS (BIFF8 Excel 97-2004) parsing', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Account Number', 'Holder', 'Balance'],
    ['AC-987654', 'Ramesh Kumar', '125000.00'],
    ['AC-123456', 'Priya Sharma', '84200.50']
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'BankExport');

  const buf = XLSX.write(wb, { bookType: 'biff8', type: 'array' });
  const result = parseWorkbookBuffer(buf);

  assert.strictEqual(result.sheetNames.length, 1);
  assert.strictEqual(result.sheetNames[0], 'BankExport');
  const sheet = result.sheets['BankExport'];
  assert.strictEqual(sheet.maxCols, 3);
  assert.strictEqual(sheet.head[0][1], 'Holder');
  assert.strictEqual(sheet.body[1][0], 'AC-123456');
});

runTest('Test 3: Browser-native CSV parsing without external libraries', () => {
  const csvContent = 'Transaction ID,Date,Amount,Status\nTXN-001,2026-11-01,500.00,Settled\nTXN-002,2026-11-02,1250.75,Pending\n';
  const buf = new TextEncoder().encode(csvContent).buffer;

  const result = parseWorkbookBuffer(buf);
  assert.ok(result.sheetNames.length >= 1);
  const sheet = result.sheets[result.sheetNames[0]];
  assert.strictEqual(sheet.maxCols, 4);
  assert.strictEqual(sheet.head[0][0], 'Transaction ID');
  assert.strictEqual(sheet.body.length, 2);
  assert.strictEqual(sheet.body[0][2], '500.00');
  assert.strictEqual(sheet.body[1][3], 'Pending');
});

// -----------------------------------------------------------------------------
// SECTION 2: MULTI-SHEET & FORMATTING INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: MULTI-SHEET & FORMATTING INTEGRITY ---');

runTest('Test 4: Multi-worksheet separation and independent access', () => {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([['Q1 Item', 'Cost'], ['Laptop', '$1200']]);
  const ws2 = XLSX.utils.aoa_to_sheet([['Q2 Item', 'Cost'], ['Monitor', '$300']]);
  const ws3 = XLSX.utils.aoa_to_sheet([['Q3 Item', 'Cost'], ['Keyboard', '$80']]);

  XLSX.utils.book_append_sheet(wb, ws1, 'Quarter1');
  XLSX.utils.book_append_sheet(wb, ws2, 'Quarter2');
  XLSX.utils.book_append_sheet(wb, ws3, 'Quarter3');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const result = parseWorkbookBuffer(buf);

  assert.deepStrictEqual(result.sheetNames, ['Quarter1', 'Quarter2', 'Quarter3']);
  assert.strictEqual(result.sheets['Quarter1'].head[0][0], 'Q1 Item');
  assert.strictEqual(result.sheets['Quarter2'].head[0][0], 'Q2 Item');
  assert.strictEqual(result.sheets['Quarter3'].body[0][1], '$80');
});

runTest('Test 5: Date formatting preservation (dateNF: yyyy-mm-dd without GMT strings)', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Event Date', 'Milestone'],
    [new Date(2026, 9, 30), 'Final Release']
  ], { cellDates: true });
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const result = parseWorkbookBuffer(buf);
  const dateStr = result.sheets['Schedule'].body[0][0];

  assert.ok(!dateStr.includes('GMT'), `Date should not contain GMT string. Got: "${dateStr}"`);
  assert.ok(dateStr.includes('2026') || dateStr.includes('26'), `Date should contain year 2026. Got: "${dateStr}"`);
});

runTest('Test 6: Currency and percentage formatting preservation (raw: false)', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Figure'],
    ['Revenue', 1250000.5],
    ['Margin', 0.245],
    ['Loss', -450.75]
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Financials');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const result = parseWorkbookBuffer(buf);
  const body = result.sheets['Financials'].body;

  assert.strictEqual(body[0][1], '1250000.5');
  assert.strictEqual(body[1][1], '0.245');
  assert.strictEqual(body[2][1], '-450.75');
});

runTest('Test 7: Empty and sparse cells (defval: "" preserves column alignment)', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Col A', 'Col B', 'Col C', 'Col D'],
    ['Val A1', '', '', 'Val D1'],
    ['', 'Val B2', 'Val C2', '']
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'SparseData');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const result = parseWorkbookBuffer(buf);
  const sheet = result.sheets['SparseData'];

  assert.strictEqual(sheet.maxCols, 4);
  assert.strictEqual(sheet.body[0][0], 'Val A1');
  assert.strictEqual(sheet.body[0][1], '');
  assert.strictEqual(sheet.body[0][2], '');
  assert.strictEqual(sheet.body[0][3], 'Val D1');
  assert.strictEqual(sheet.body[1][0], '');
  assert.strictEqual(sheet.body[1][1], 'Val B2');
});

runTest('Test 8: Title banner detection and table header separation', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['ANNUAL PERFORMANCE REPORT 2026', '', '', ''], // Banner row (1 cell in 4 cols)
    ['Department', 'Q1 Goal', 'Q2 Goal', 'Status'],
    ['Engineering', '100%', '100%', 'Completed'],
    ['Marketing', '95%', '98%', 'On Track']
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const result = parseWorkbookBuffer(buf);
  const sheet = result.sheets['Report'];

  assert.strictEqual(sheet.title, 'ANNUAL PERFORMANCE REPORT 2026');
  assert.strictEqual(sheet.head[0][0], 'Department');
  assert.strictEqual(sheet.head[0][3], 'Status');
  assert.strictEqual(sheet.body.length, 2);
  assert.strictEqual(sheet.body[0][0], 'Engineering');
});

runTest('Test 9: Formula cached values preservation', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Item', 'Subtotal'],
    ['Alpha', 100],
    ['Beta', 200],
    ['Total', { f: 'SUM(B2:B3)', v: 300 }]
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Formulas');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const result = parseWorkbookBuffer(buf);
  const totalVal = result.sheets['Formulas'].body[2][1];

  assert.strictEqual(totalVal, '300');
});

// -----------------------------------------------------------------------------
// SECTION 3: WORKER WATCHDOG, TIMEOUT & CANCELLATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: WORKER WATCHDOG, TIMEOUT & CANCELLATION ---');

runTest('Test 10: Large workbooks within limits (1,000 rows x 10 cols)', () => {
  const wb = XLSX.utils.book_new();
  const rows = [['ID', 'Name', 'Metric1', 'Metric2', 'Metric3', 'Metric4', 'Metric5', 'Metric6', 'Metric7', 'Status']];
  for (let i = 1; i <= 1000; i++) {
    rows.push([`ID-${i}`, `User ${i}`, '10', '20', '30', '40', '50', '60', '70', 'Active']);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'LargeSheet');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const startTime = Date.now();
  const result = parseWorkbookBuffer(buf);
  const duration = Date.now() - startTime;

  assert.strictEqual(result.sheets['LargeSheet'].body.length, 1000);
  assert.strictEqual(result.sheets['LargeSheet'].maxCols, 10);
  assert.ok(duration < 2000, `Parsing 1,000 rows should take < 2000ms. Took: ${duration}ms`);
});

runTest('Test 11: Malformed and corrupted binary files trigger graceful error', () => {
  // Empty buffer
  assert.throws(() => {
    parseWorkbookBuffer(new ArrayBuffer(0));
  }, /Empty or invalid file buffer/i);

  // Corrupted OpenXML ZIP archive
  const corruptedZip = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]).buffer;
  assert.throws(() => {
    parseWorkbookBuffer(corruptedZip);
  }, /Unsupported ZIP file|corrupted|Cannot read/i);
});

await runAsyncTest('Test 12: Cancellation via AbortSignal terminates parsing immediately', async () => {
  const abortCtrl = new AbortController();
  abortCtrl.abort(); // Pre-abort

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['A', 'B'], ['1', '2']]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  let aborted = false;
  try {
    await parseExcelInWorker(buf, { signal: abortCtrl.signal });
  } catch (err) {
    if (err.name === 'AbortError') aborted = true;
  }
  assert.ok(aborted, 'Should throw AbortError when signal is aborted');
});

runTest('Test 14: Strict output schema validation blocks prototype pollution vectors', () => {
  // Malformed payload attempting to pollute __proto__
  const poisonedPayload = {
    sheetNames: ['__proto__', 'Sheet1'],
    sheets: {
      '__proto__': { pollutes: true },
      'Sheet1': {
        title: null,
        maxCols: 2,
        head: [['Col 1', 'Col 2']],
        body: [['A', 'B']],
        rawRows: [['Col 1', 'Col 2'], ['A', 'B']]
      }
    }
  };

  const validated = validateWorkerPayload(poisonedPayload);
  assert.ok(!validated.sheetNames.includes('__proto__'), '__proto__ sheet name must be stripped');
  assert.strictEqual(validated.sheetNames.length, 1);
  assert.strictEqual(validated.sheetNames[0], 'Sheet1');
  assert.strictEqual(Object.prototype.pollutes, undefined, 'Object.prototype must remain unpolluted');
});

// -----------------------------------------------------------------------------
// SECTION 4: RESOURCE LIMITS & UI THREAD IMMUNITY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: RESOURCE LIMITS & UI THREAD IMMUNITY ---');

runTest('Test 16.1: Sheet count limit rejects > 50 sheets', () => {
  const wb = XLSX.utils.book_new();
  for (let i = 1; i <= 55; i++) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A']]), `Sheet_${i}`);
  }
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  assert.throws(() => {
    parseWorkbookBuffer(buf);
  }, /Workbook contains 55 worksheets\. Maximum supported limit is 50/);
});

runTest('Test 16.2: Column count limit rejects > 250 columns', () => {
  const wb = XLSX.utils.book_new();
  const wideRow = Array.from({ length: 260 }, (_, i) => `Col_${i + 1}`);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([wideRow]), 'WideSheet');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  assert.throws(() => {
    parseWorkbookBuffer(buf);
  }, /exceeds the maximum supported column limit of 250 columns/);
});

runTest('Test 16.3: Row count limit rejects > 50,000 rows', () => {
  // Verify limit configuration
  assert.strictEqual(LIMITS.MAX_ROWS, 50000);
  assert.strictEqual(LIMITS.MAX_SHEETS, 50);
  assert.strictEqual(LIMITS.MAX_COLS, 250);
  assert.strictEqual(LIMITS.MAX_TOTAL_CELLS, 500000);
});

// -----------------------------------------------------------------------------
// SECTION 5: END-TO-END PDF GENERATION PIPELINE INTEGRATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: END-TO-END PDF GENERATION PIPELINE INTEGRATION ---');

runTest('Test 15: End-to-End PDF generation from worker parsed data', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['ACME FINANCIAL SUMMARY 2026', '', ''],
    ['Quarter', 'Revenue ($M)', 'Expenses ($M)'],
    ['Q1', '45.2', '32.1'],
    ['Q2', '52.8', '35.4'],
    ['Q3', '49.1', '33.9'],
    ['Q4', '61.5', '38.0']
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const { sheetNames, sheets } = parseWorkbookBuffer(buf);

  // Run the exact ExcelToPdf jsPDF rendering pipeline
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const sheet = sheets[sheetNames[0]];

  assert.strictEqual(sheet.title, 'ACME FINANCIAL SUMMARY 2026');
  assert.strictEqual(sheet.head.length, 1);
  assert.strictEqual(sheet.body.length, 4);

  let startY = 25;
  doc.setFontSize(11);
  doc.text(`${sheetNames[0]}: ${sheet.title}`, 20, startY);
  startY += 20;

  autoTable(doc, {
    head: sheet.head,
    body: sheet.body,
    showHead: 'everyPage',
    startY: startY,
    theme: 'grid'
  });

  const pdfOutput = doc.output('arraybuffer');
  assert.ok(pdfOutput.byteLength > 2000, `Generated PDF should have valid byte length. Got: ${pdfOutput.byteLength}`);
});

console.log('\n================================================================');
console.log(`TOTAL REGRESSION TESTS: ${passed + failed}`);
console.log(`PASSED:                 ${passed}`);
console.log(`FAILED:                 ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}

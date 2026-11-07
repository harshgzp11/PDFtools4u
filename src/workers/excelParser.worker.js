/**
 * Dedicated Web Worker for Secure Spreadsheet Parsing
 * Offloads untrusted XLSX, XLS, and CSV parsing off the main browser thread.
 * 
 * Security & Reliability Guarantees:
 * - Executes in an isolated DedicatedWorkerGlobalScope.
 * - Zero access to the host DOM, window, document, cookies, or localStorage.
 * - Defense-in-depth isolation against Prototype Pollution and ReDoS loops.
 * - Strict limits on worksheet count, row count, column count, and total cells.
 * - Returns strictly validated primitive POJO data to the main thread.
 */

import * as XLSX from 'xlsx';

// Defensible complexity & resource bounds
export const LIMITS = {
  MAX_SHEETS: 50,
  MAX_ROWS: 50000,
  MAX_COLS: 250,
  MAX_TOTAL_CELLS: 500000,
  MAX_DATA_SIZE_BYTES: 40 * 1024 * 1024 // 40 MB serialized
};

/**
 * Parses raw sheet data into clean formatted strings and extracts layout metadata.
 * Matches PDFTools4U table title banner detection and header extraction logic.
 */
export function extractFormattedSheetData(ws, sheetName = '') {
  if (!ws) {
    return { title: null, head: [], body: [], maxCols: 0, rawRows: [] };
  }

  // Parse worksheet to 2D array of formatted strings
  const rawData = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd',
    defval: ''
  });

  if (!rawData || rawData.length === 0) {
    return { title: null, head: [], body: [], maxCols: 0, rawRows: [] };
  }

  if (rawData.length > LIMITS.MAX_ROWS) {
    throw new Error(`Sheet "${sheetName || 'Worksheet'}" exceeds the maximum supported row limit of ${LIMITS.MAX_ROWS.toLocaleString()} rows (found ${rawData.length.toLocaleString()} rows).`);
  }

  // Calculate maximum column count across all rows
  let maxCols = 0;
  let totalCells = 0;

  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r];
    const rowLen = Array.isArray(row) ? row.length : 0;
    if (rowLen > maxCols) maxCols = rowLen;
    totalCells += rowLen;
  }

  if (maxCols > LIMITS.MAX_COLS) {
    throw new Error(`Sheet "${sheetName || 'Worksheet'}" exceeds the maximum supported column limit of ${LIMITS.MAX_COLS} columns (found ${maxCols} columns).`);
  }

  if (totalCells > LIMITS.MAX_TOTAL_CELLS) {
    throw new Error(`Sheet "${sheetName || 'Worksheet'}" exceeds the maximum supported cell limit of ${LIMITS.MAX_TOTAL_CELLS.toLocaleString()} cells (found ${totalCells.toLocaleString()} cells).`);
  }

  if (maxCols === 0) {
    return { title: null, head: [], body: [], maxCols: 0, rawRows: [] };
  }

  // Normalize rows to uniform length with clean primitive strings
  const normalizedData = new Array(rawData.length);
  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r];
    const cleanRow = new Array(maxCols);
    for (let c = 0; c < maxCols; c++) {
      const cell = Array.isArray(row) ? row[c] : '';
      cleanRow[c] = (cell !== undefined && cell !== null) ? String(cell) : '';
    }
    normalizedData[r] = cleanRow;
  }

  // Detect leading Title / Subtitle / Banner rows preceding the table headers
  const titles = [];
  let headerRowIdx = 0;

  for (let r = 0; r < normalizedData.length; r++) {
    const populated = normalizedData[r].filter(c => c.trim().length > 0);
    if (populated.length === 0) continue;
    // If only 1 cell is populated while sheet has 3+ columns, it's a title/subtitle banner
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

  return {
    title,
    head,
    body,
    maxCols,
    rawRows: normalizedData
  };
}

/**
 * Main workbook parsing function executing SheetJS in worker context.
 */
export function parseWorkbookBuffer(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('Empty or invalid file buffer provided.');
  }

  // Parse workbook using official SheetJS 0.20.3
  const wb = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    dense: false
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('This spreadsheet contains no worksheets.');
  }

  if (wb.SheetNames.length > LIMITS.MAX_SHEETS) {
    throw new Error(`Workbook contains ${wb.SheetNames.length} worksheets. Maximum supported limit is ${LIMITS.MAX_SHEETS} worksheets.`);
  }

  const parsedSheets = Object.create(null);
  const sanitizedSheetNames = [];

  for (let i = 0; i < wb.SheetNames.length; i++) {
    const rawName = wb.SheetNames[i];
    // Sanitize sheet name to string without prototype pollution keys
    const sheetName = String(rawName).replace(/[^\x20-\x7E\xA0-\uFFFF]/g, '').trim() || `Sheet ${i + 1}`;
    if (sheetName === '__proto__' || sheetName === 'constructor' || sheetName === 'prototype') {
      continue;
    }

    sanitizedSheetNames.push(sheetName);
    const ws = wb.Sheets[rawName];
    const sheetData = extractFormattedSheetData(ws, sheetName);
    parsedSheets[sheetName] = sheetData;
  }

  if (sanitizedSheetNames.length === 0) {
    throw new Error('No valid worksheets could be read from this spreadsheet.');
  }

  return {
    sheetNames: sanitizedSheetNames,
    sheets: parsedSheets
  };
}

// Worker message listener (active when running in Web Worker scope)
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event) => {
    const { id, type, buffer } = event.data || {};

    if (type === 'PING') {
      self.postMessage({ id, status: 'PONG', version: XLSX.version });
      return;
    }

    if (type === 'PARSE_WORKBOOK') {
      try {
        const result = parseWorkbookBuffer(buffer);
        self.postMessage({
          id,
          status: 'SUCCESS',
          sheetNames: result.sheetNames,
          sheets: result.sheets
        });
      } catch (err) {
        self.postMessage({
          id,
          status: 'ERROR',
          error: err.message || 'Failed to parse spreadsheet document.'
        });
      }
    }
  };
}

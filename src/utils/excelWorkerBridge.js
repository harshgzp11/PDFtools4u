/**
 * Secure Web Worker Bridge for Excel/Spreadsheet Parsing
 * 
 * Provides:
 * - Worker lifecycle management and message correlation via message ID
 * - Configurable 30-second watchdog timeout with hard thread termination
 * - AbortSignal support for immediate user cancellation
 * - Zero-copy ArrayBuffer transfer
 * - Strict schema validation on returned worker data
 * - Clean disposal and event listener teardown
 */

let nextMsgId = 1;

/**
 * Validates the schema of parsed data received from the worker.
 * Prevents poisoned payloads, unhandled types, or prototype pollution from polluting main thread state.
 */
export function validateWorkerPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Malformed worker response: payload is not an object.');
  }

  if (!Array.isArray(data.sheetNames)) {
    throw new Error('Malformed worker response: sheetNames is not an array.');
  }

  if (typeof data.sheets !== 'object' || data.sheets === null) {
    throw new Error('Malformed worker response: sheets map is missing or invalid.');
  }

  const sanitizedSheets = Object.create(null);
  const sanitizedSheetNames = [];

  for (const name of data.sheetNames) {
    if (typeof name !== 'string' || name.length === 0) continue;
    if (name === '__proto__' || name === 'constructor' || name === 'prototype') continue;

    const sheet = data.sheets[name];
    if (!sheet || typeof sheet !== 'object') continue;

    // Validate sheet data structures
    const title = typeof sheet.title === 'string' ? sheet.title : null;
    const maxCols = typeof sheet.maxCols === 'number' && Number.isFinite(sheet.maxCols) ? Math.max(0, sheet.maxCols) : 0;
    
    const head = Array.isArray(sheet.head) ? sheet.head.map(row => 
      Array.isArray(row) ? row.map(cell => String(cell ?? '')) : []
    ) : [];

    const body = Array.isArray(sheet.body) ? sheet.body.map(row => 
      Array.isArray(row) ? row.map(cell => String(cell ?? '')) : []
    ) : [];

    const rawRows = Array.isArray(sheet.rawRows) ? sheet.rawRows.map(row => 
      Array.isArray(row) ? row.map(cell => String(cell ?? '')) : []
    ) : [];

    sanitizedSheetNames.push(name);
    sanitizedSheets[name] = {
      title,
      head,
      body,
      maxCols,
      rawRows
    };
  }

  if (sanitizedSheetNames.length === 0) {
    throw new Error('No valid worksheets could be verified from worker response.');
  }

  return {
    sheetNames: sanitizedSheetNames,
    sheets: sanitizedSheets
  };
}

/**
 * Parses an Excel or CSV file buffer safely off the main thread in a dedicated Web Worker.
 * 
 * @param {ArrayBuffer} arrayBuffer - Raw file data
 * @param {Object} options - Options { timeoutMs?: number, signal?: AbortSignal }
 * @returns {Promise<{ sheetNames: string[], sheets: Record<string, any> }>}
 */
export async function parseExcelInWorker(arrayBuffer, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const signal = options.signal;

  if (signal?.aborted) {
    const err = new Error('Parsing cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  // Check environment for Web Worker support
  const hasWorkerSupport = typeof window !== 'undefined' && typeof window.Worker === 'function';

  if (!hasWorkerSupport) {
    throw new Error('Web Workers are not supported in this environment. A browser with Web Worker support is required to parse spreadsheets.');
  }

  return new Promise((resolve, reject) => {
    let worker = null;
    let timer = null;
    let isSettled = false;

    const cleanup = () => {
      isSettled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    const onAbort = () => {
      if (isSettled) return;
      cleanup();
      const err = new Error('Spreadsheet conversion cancelled by user.');
      err.name = 'AbortError';
      reject(err);
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    // Set 30-second hard watchdog timer
    timer = setTimeout(() => {
      if (isSettled) return;
      cleanup();
      const err = new Error(`Spreadsheet parsing timed out after ${Math.round(timeoutMs / 1000)} seconds. The file may contain complex or unsupported formatting.`);
      err.name = 'TimeoutError';
      reject(err);
    }, timeoutMs);

    try {
      worker = new Worker(
        new URL('../workers/excelParser.worker.js', import.meta.url),
        { type: 'module' }
      );

      const msgId = ++nextMsgId;

      worker.onmessage = (event) => {
        if (isSettled) return;
        const data = event.data || {};
        if (data.id !== msgId) return;

        if (data.status === 'SUCCESS') {
          try {
            const validated = validateWorkerPayload(data);
            cleanup();
            resolve(validated);
          } catch (valErr) {
            cleanup();
            reject(valErr);
          }
        } else {
          cleanup();
          reject(new Error(data.error || 'Failed to parse spreadsheet file.'));
        }
      };

      worker.onerror = (evt) => {
        if (isSettled) return;
        cleanup();
        reject(new Error(evt.message || 'Worker thread encountered a parsing error.'));
      };

      // Transfer the buffer for zero-copy efficiency
      worker.postMessage(
        { id: msgId, type: 'PARSE_WORKBOOK', buffer: arrayBuffer },
        [arrayBuffer]
      );
    } catch (err) {
      cleanup();
      reject(new Error(err?.message || 'Failed to initialize spreadsheet parsing Web Worker.'));
    }
  });
}

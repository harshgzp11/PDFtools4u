let pdfjsLib = null;
async function initPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
  }
  return pdfjsLib;
}

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

const readArrayBuffer = (fileObj) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && e.target.result) resolve(e.target.result);
      else reject(new Error("File content is empty."));
    };
    reader.onerror = () => reject(new Error("Failed to read file from disk."));
    reader.readAsArrayBuffer(fileObj);
  });
};

const loadPdfDocument = async (fileObj) => {
  let arrayBuffer;
  try {
    arrayBuffer = await fileObj.arrayBuffer();
  } catch {
    arrayBuffer = await readArrayBuffer(fileObj);
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    arrayBuffer = await readArrayBuffer(fileObj);
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error("The selected file is empty or corrupted.");
  }

  // Attempt 1: Standard load with Uint8Array copy
  try {
    const _pdfjsLib = await initPdfJs();
    const loadingTask = _pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
    });
    return await loadingTask.promise;
  } catch (err1) {
    console.warn("PDF.js primary load failed, attempting basic load:", err1);
  }

  // Attempt 2: Basic load without cMap parameters
  try {
    const _pdfjsLib = await initPdfJs();
    const loadingTask = _pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
    });
    return await loadingTask.promise;
  } catch (err2) {
    console.warn("PDF.js basic load failed, attempting FileReader fresh slice load:", err2);
  }

  // Attempt 3: FileReader fresh buffer load
  const freshBuffer = await readArrayBuffer(fileObj);
  const _pdfjsLib = await initPdfJs();
  const loadingTaskFinal = _pdfjsLib.getDocument({
    data: new Uint8Array(freshBuffer),
  });
  return await loadingTaskFinal.promise;
};

/**
 * Converts a PDF file to a Word (DOCX) file using two distinct modes: 'text' (heuristic editable) or 'visual' (exact canvas replica).
 * @param {File} file - The PDF file
 * @param {string} mode - 'text' or 'visual'
 * @param {Function} onProgress - Callback for progress (0 to 100)
 * @returns {Promise<Blob>} - The resulting DOCX Blob
 */
export const convertPdfToDocx = async (file, mode = 'text', onProgress) => {
  if (!file) throw new Error("No file provided");
  if (onProgress) onProgress(0);
  
  const { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, HeadingLevel } = await import('docx');

  const pdfDoc = await loadPdfDocument(file);
  const numPages = pdfDoc.numPages;
  
  const docParagraphs = [];
  const commonHeadings = [
    'Personal Details', 'Educational Details', '10th Details', 
    '12th Details', 'Graduation Details', 'Father\'s Details', 
    'Mother\'s Details', 'Declaration', 'Address For Correspondence', 'Upload Documents', 'Application Form'
  ];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);

    // Page Divider
    if (numPages > 1) {
      docParagraphs.push(
        new Paragraph({
          text: `--- Page ${i} ---`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    }

    if (mode === 'visual') {
      // ==========================================
      // MODE: VISUAL LAYOUT (Canvas Rendering)
      // ==========================================
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
      const base64Data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, "");
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      docParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 595, // Standard A4 pt width
                height: 595 * (viewport.height / viewport.width),
              },
            }),
          ],
          spacing: { after: 200 },
        })
      );

      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    } else {
      // ==========================================
      // MODE: EDITABLE TEXT (Heuristic X-Axis Math)
      // ==========================================
      let pageTextExtracted = false;

      try {
        const textContent = await page.getTextContent();
        if (textContent && textContent.items && textContent.items.length > 0) {
          const validItems = textContent.items.filter(item => item.str && item.str.trim() !== '');
          
          if (validItems.length > 0) {
            let linesMap = {};
            validItems.forEach((item) => {
              const y = Math.round(item.transform[5] / 5) * 5; 
              if (!linesMap[y]) linesMap[y] = [];
              
              const startX = item.transform[4];
              const itemWidth = item.width || (item.str ? item.str.length * 6 : 0);
              linesMap[y].push({ 
                text: item.str, 
                startX,
                endX: startX + itemWidth 
              });
            });

            const sortedYs = Object.keys(linesMap).sort((a, b) => Number(b) - Number(a));

            sortedYs.forEach((y) => {
              const lineItems = linesMap[y].sort((a, b) => a.startX - b.startX);
              
              let formattedLine = [];
              let lastEndX = null;

              lineItems.forEach((item) => {
                if (lastEndX !== null) {
                  const gap = item.startX - lastEndX;
                  
                  if (gap > 40) {
                    formattedLine.push(new TextRun({ text: '\t', font: 'Calibri', size: 22 }));
                  } else if (gap > 5) {
                    formattedLine.push(new TextRun({ text: ' ', font: 'Calibri', size: 22 }));
                  }
                }
                
                formattedLine.push(new TextRun({ text: item.text.trim(), font: 'Calibri', size: 22 }));
                lastEndX = item.endX;
              });

              const rawString = lineItems.map(i => i.text).join(' ').trim();
              if (rawString.length === 0) return;

              const isHeading = commonHeadings.some(h => rawString.toLowerCase() === h.toLowerCase() || rawString.toLowerCase().includes(h.toLowerCase()));

              docParagraphs.push(
                new Paragraph({
                  text: isHeading ? rawString : undefined,
                  heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
                  children: isHeading ? undefined : formattedLine,
                  spacing: isHeading ? { before: 240, after: 120 } : { after: 100 },
                })
              );
            });

            pageTextExtracted = true;
          }
        }
      } catch (textErr) {
        console.warn(`Text extraction fallback for page ${i}:`, textErr);
      }

      // Fallback for scanned/empty text pages in 'text' mode
      if (!pageTextExtracted) {
        try {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          
          const base64Data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, "");
          const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          docParagraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: 595,
                    height: 595 * (viewport.height / viewport.width),
                  },
                }),
              ],
              spacing: { after: 200 },
            })
          );
        } catch (imgErr) {
          console.error(`Page ${i} image fallback error:`, imgErr);
        }
      }
    }

    if (onProgress) onProgress(Math.round((i / numPages) * 70));
    await yieldToMain();
  }

  if (onProgress) onProgress(80);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
          },
        },
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  onProgress(100);
  
  return blob;
};

/**
 * Converts a PDF file to a ZIP of images (JPG or PNG)
 * @param {File} file 
 * @param {string} format 'jpeg' or 'png'
 * @param {Function} onProgress 
 */
export const convertPdfToImages = async (file, format = 'jpeg', onProgress) => {
  if (!file) throw new Error("No file provided");
  onProgress(0);

  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const _pdfjsLib = await initPdfJs();
  const pdf = await _pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdf.numPages;
  
  const zip = new JSZip();
  const folderName = `${file.name.replace('.pdf', '')}_images`;
  const folder = zip.folder(folderName);
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Fill white background for JPEG
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpeg' ? 0.9 : undefined;
    
    const dataUrl = canvas.toDataURL(mimeType, quality);
    const base64Data = dataUrl.split(',')[1];
    folder.file(`page-${i}.${format === 'jpeg' ? 'jpg' : 'png'}`, base64Data, { base64: true });
    
    // Explicit Memory Cleanup
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    
    onProgress(Math.round((i / numPages) * 100));
    
    // Yield to main thread to keep UI responsive
    await yieldToMain();
  }
  
  const content = await zip.generateAsync({ type: "blob" });
  return content;
};

/**
 * Converts a PDF file to a native PPTX file (images on slides)
 * @param {File} file 
 * @param {Function} onProgress 
 */
export const convertPdfToPpt = async (file, onProgress) => {
  if (!file) throw new Error("No file provided");
  onProgress(0);

  const pptxgen = (await import('pptxgenjs')).default;
  const arrayBuffer = await file.arrayBuffer();
  const _pdfjsLib = await initPdfJs();
  const pdf = await _pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdf.numPages;
  
  const pres = new pptxgen();
  const SLIDE_W = 10;
  const SLIDE_H = 5.625;
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // Keep scale low for memory
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    
    const scale = Math.min(SLIDE_W / viewport.width, SLIDE_H / viewport.height);
    const finalW = viewport.width * scale;
    const finalH = viewport.height * scale;
    const xOffset = (SLIDE_W - finalW) / 2;
    const yOffset = (SLIDE_H - finalH) / 2;
    
    const slide = pres.addSlide();
    slide.addImage({ data: imgData, x: xOffset, y: yOffset, w: finalW, h: finalH });
    
    // Explicit Memory Cleanup
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    
    onProgress(Math.round((i / numPages) * 100));
    
    // Yield to main thread
    await yieldToMain();
  }
  
  const blob = await pres.write({ outputType: 'blob' });
  return blob;
};

const NAMED_HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&euro;': '€',
  '&pound;': '£',
  '&yen;': '¥',
  '&cent;': '¢',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…'
};

/**
 * Decodes common named and numeric HTML entities into their unicode representations.
 * Preserves normal text, raw ampersands (e.g. "A & B"), and avoids double decoding.
 * @param {string} str
 * @returns {string}
 */
export const decodeHtmlEntities = (str) => {
  if (!str || typeof str !== 'string' || !str.includes('&')) return str;
  return str.replace(/&(?:[a-zA-Z]+|#\d+|#[xX][0-9a-fA-F]+);/g, (entity) => {
    const lower = entity.toLowerCase();
    if (NAMED_HTML_ENTITIES[lower] !== undefined) {
      return NAMED_HTML_ENTITIES[lower];
    }
    if (entity.startsWith('&#x') || entity.startsWith('&#X')) {
      const code = parseInt(entity.slice(3, -1), 16);
      if (!isNaN(code) && code >= 0 && code <= 0x10FFFF) {
        return code === 160 ? ' ' : String.fromCodePoint(code);
      }
    } else if (entity.startsWith('&#')) {
      const code = parseInt(entity.slice(2, -1), 10);
      if (!isNaN(code) && code >= 0 && code <= 0x10FFFF) {
        return code === 160 ? ' ' : String.fromCodePoint(code);
      }
    }
    return entity;
  });
};

/**
 * Extracts structured table rows from PDF page items using coordinate-based clustering.
 * Preserves empty cells, aligns irregular columns, and stitches multiline wrapped text.
 * @param {Array} rawItems - PDF textContent items
 * @param {number} pageHeight - Page viewport height
 * @param {number} pageWidth - Page viewport width
 * @returns {Array<Array<string>>}
 */
export const extractTableFromPageItems = (rawItems, pageHeight = 842, _pageWidth = 595) => {
  if (!rawItems || rawItems.length === 0) return [];

  const validItems = rawItems
    .filter(it => it.str && it.str.trim().length > 0)
    .map(it => {
      const x0 = it.transform[4];
      const y0 = it.transform[5];
      const fontSize = Math.abs(it.transform[0]) || Math.abs(it.transform[3]) || it.height || 10;
      const width = it.width || (it.str.length * fontSize * 0.55);
      return {
        text: it.str,
        x0,
        x1: x0 + width,
        y0,
        yTop: y0 + fontSize,
        fontSize,
        width
      };
    })
    .filter(it => {
      const t = it.text.trim();
      if (!t) return false;

      // Detect generic page number patterns (e.g., "Page 1", "1 of 5", "p. 3")
      const isPageNumPattern = /^(?:page\s+)?(?:p\.?\s*)?\d+(?:\s*(?:of|\/|-)\s*\d+)?$/i.test(t);

      // Extreme edge margin zone (bottom < 26pt, top > pageHeight - 20pt)
      const isExtremeMargin = it.y0 < 26 || it.y0 > (pageHeight - 20);

      if (isExtremeMargin) {
        // Page numbers in extreme margins are always non-table furniture
        if (isPageNumPattern || /page\b/i.test(t)) return false;
        // Generic running footers / margin notes in the unprintable bottom margin (< 26pt)
        if (it.y0 < 26) return false;
      }

      // Page numbers in the secondary margin zone (< 35pt or > pageHeight - 35pt)
      if ((it.y0 < 35 || it.y0 > pageHeight - 35) && isPageNumPattern) {
        return false;
      }

      return true;
    });

  if (validItems.length === 0) return [];

  // Group into physical text lines (tolerance ~ 3pt)
  validItems.sort((a, b) => b.y0 - a.y0);
  const physicalLines = [];
  validItems.forEach(item => {
    let matched = physicalLines.find(l => Math.abs(l.y - item.y0) <= Math.max(3, item.fontSize * 0.35));
    if (!matched) {
      matched = { y: item.y0, fontSize: item.fontSize, items: [] };
      physicalLines.push(matched);
    }
    matched.items.push(item);
  });
  physicalLines.sort((a, b) => b.y - a.y);

  // In each line, sort left to right and merge adjacent tokens with space preservation
  physicalLines.forEach(line => {
    line.items.sort((a, b) => a.x0 - b.x0);
    const merged = [];
    line.items.forEach(it => {
      if (merged.length === 0) {
        merged.push({ ...it });
      } else {
        const prev = merged[merged.length - 1];
        const gap = it.x0 - prev.x1;
        const maxMergeGap = Math.max(3.5, prev.fontSize * 0.45);
        if (gap <= maxMergeGap && gap >= -2) {
          const hasSpace = prev.text.endsWith(' ') || it.text.startsWith(' ');
          const sep = !hasSpace && gap >= 0.4 ? ' ' : '';
          prev.text = prev.text + sep + it.text;
          prev.x1 = Math.max(prev.x1, it.x1);
          prev.width = prev.x1 - prev.x0;
        } else {
          merged.push({ ...it });
        }
      }
    });
    line.items = merged;
  });

  // Partition lines into distinct table regions based on vertical gap
  const regions = [];
  let currentRegion = [];

  for (let i = 0; i < physicalLines.length; i++) {
    const line = physicalLines[i];
    if (currentRegion.length === 0) {
      currentRegion.push(line);
      continue;
    }

    const prevLine = currentRegion[currentRegion.length - 1];
    const verticalGap = prevLine.y - line.y;

    const regionGaps = [];
    for (let j = 0; j < currentRegion.length - 1; j++) {
      regionGaps.push(currentRegion[j].y - currentRegion[j + 1].y);
    }
    const medianGap = regionGaps.length > 0
      ? regionGaps.sort((a, b) => a - b)[Math.floor(regionGaps.length / 2)]
      : 14;

    // Table region boundary when vertical gap is large (>= 25pt or >= 2.0x median)
    const isLargeGap = verticalGap >= Math.max(25, medianGap * 2.0);

    if (isLargeGap) {
      regions.push(currentRegion);
      currentRegion = [line];
    } else {
      currentRegion.push(line);
    }
  }
  if (currentRegion.length > 0) {
    regions.push(currentRegion);
  }

  const allFinalRows = [];
  const allMerges = [];

  regions.forEach((regLines, regIdx) => {
    // Separate cell items from full-width title/caption banners (> 220pt)
    const cellItems = [];
    regLines.forEach(l => {
      if (!(l.items.length === 1 && l.items[0].width > 220)) {
        l.items.forEach(it => cellItems.push(it));
      }
    });

    if (cellItems.length === 0) {
      regLines.forEach(l => {
        allFinalRows.push([decodeHtmlEntities(l.items.map(it => it.text.trim()).join(' '))]);
      });
      return;
    }

    // Determine column clusters from cell items
    const allX0s = cellItems.map(it => it.x0).sort((a, b) => a - b);
    const colClusters = [];
    const CLUSTER_TOLERANCE = 14;

    allX0s.forEach(x => {
      const cluster = colClusters.find(c => Math.abs(c.mean - x) <= CLUSTER_TOLERANCE);
      if (cluster) {
        cluster.points.push(x);
        cluster.mean = cluster.points.reduce((s, v) => s + v, 0) / cluster.points.length;
      } else {
        colClusters.push({ mean: x, points: [x] });
      }
    });
    colClusters.sort((a, b) => a.mean - b.mean);

    const boundaries = [];
    for (let c = 0; c < colClusters.length - 1; c++) {
      boundaries.push((colClusters[c].mean + colClusters[c + 1].mean) / 2);
    }

    const numCols = Math.max(1, colClusters.length);

    const getColIndex = (item) => {
      const x = item.x0;
      for (let b = 0; b < boundaries.length; b++) {
        if (x < boundaries[b]) return b;
      }
      return boundaries.length;
    };

    // Cluster lines into logical records
    const logicalRecords = [];
    let currentRecordLines = [];

    regLines.forEach(line => {
      const isBanner = line.items.length === 1 && line.items[0].width > 220;

      if (isBanner) {
        if (currentRecordLines.length > 0) {
          logicalRecords.push({ isBanner: false, lines: currentRecordLines });
          currentRecordLines = [];
        }
        logicalRecords.push({ isBanner: true, text: line.items[0].text.trim() });
        return;
      }

      if (currentRecordLines.length === 0) {
        currentRecordLines.push(line);
        return;
      }

      const prevLine = currentRecordLines[currentRecordLines.length - 1];
      const gap = prevLine.y - line.y;
      
      // Intra-row wrap step is proportional to font size: <= fontSize * 1.25
      const effectiveFontSize = Math.max(6, Math.min(line.fontSize, prevLine.fontSize));
      const isIntraRowWrap = gap <= (effectiveFontSize * 1.25);

      if (isIntraRowWrap) {
        currentRecordLines.push(line);
      } else {
        logicalRecords.push({ isBanner: false, lines: currentRecordLines });
        currentRecordLines = [line];
      }
    });

    if (currentRecordLines.length > 0) {
      logicalRecords.push({ isBanner: false, lines: currentRecordLines });
    }

    // Buffer row between independent regions (only if previous region was not a single banner)
    const prevWasBanner = allFinalRows.length === 1 && allFinalRows[0].length === 1;
    if (regIdx > 0 && allFinalRows.length > 0 && !prevWasBanner) {
      allFinalRows.push([]);
    }

    // Convert logical records to table rows
    logicalRecords.forEach(rec => {
      if (rec.isBanner) {
        const rIdx = allFinalRows.length;
        const bannerRow = Array(numCols).fill('');
        bannerRow[0] = decodeHtmlEntities(rec.text);
        allFinalRows.push(bannerRow);
        allMerges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: numCols - 1 } });
        return;
      }

      const cells = Array(numCols).fill('');
      rec.lines.sort((a, b) => b.y - a.y);

      rec.lines.forEach(l => {
        l.items.forEach(it => {
          const col = getColIndex(it);
          if (cells[col] === '') {
            cells[col] = it.text.trim();
          } else {
            cells[col] += ' ' + it.text.trim();
          }
        });
      });

      if (cells.some(c => c.length > 0)) {
        const decodedCells = cells.map(c => decodeHtmlEntities(c));
        const rIdx = allFinalRows.length;
        // Detect full-width section headers inside table (col 0 populated, all other cols empty)
        if (decodedCells[0] && decodedCells.slice(1).every(c => c === '') && numCols > 1 && (rec.lines[0].items[0].width > 120 || rec.lines.length === 1)) {
          allMerges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: numCols - 1 } });
        }
        allFinalRows.push(decodedCells);
      }
    });
  });

  allFinalRows.merges = allMerges;
  return allFinalRows;
};

export const convertPdfToExcel = async (file, onProgress, options = {}) => {
  if (!file) throw new Error("No file provided");
  if (onProgress) onProgress(0);

  const format = options.format || 'xlsx';
  const multiSheetMode = options.multiSheetMode || 'single';

  let loadingTask = null;
  let pdf = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const _pdfjsLib = await initPdfJs();
    loadingTask = _pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer)
    });
    pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    const perPageTables = [];
    let totalExtractedItems = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (options.signal?.aborted) {
        throw new DOMException('Conversion cancelled by user', 'AbortError');
      }
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const rawItems = (textContent.items || []).filter(item => item.str && item.str.trim().length > 0);
      totalExtractedItems += rawItems.length;

      const pageRows = extractTableFromPageItems(rawItems, viewport.height, viewport.width);
      perPageTables.push({ pageNum, rows: pageRows, merges: pageRows.merges || [] });

      if (onProgress) onProgress(Math.round((pageNum / numPages) * 75));
      await yieldToMain();
    }

    if (totalExtractedItems === 0) {
      throw new Error(
        "This PDF appears to be a scanned image or photograph without selectable text. " +
        "To extract tables from scanned documents, please run it through our PDF OCR tool first."
      );
    }

    if (options.signal?.aborted) {
      throw new DOMException('Conversion cancelled by user', 'AbortError');
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    if (multiSheetMode === 'per-page' && numPages > 1) {
      perPageTables.forEach(({ pageNum, rows, merges }) => {
        const sheetData = rows.length > 0 ? rows : [['(No table content on this page)']];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        if (merges && merges.length > 0) {
          worksheet['!merges'] = merges;
        }

        const colWidths = [];
        sheetData.forEach(row => {
          row.forEach((cell, i) => {
            const cellLength = cell ? String(cell).length : 0;
            if (!colWidths[i] || colWidths[i].wch < cellLength + 2) {
              colWidths[i] = { wch: Math.min(60, Math.max(10, cellLength + 2)) };
            }
          });
        });
        worksheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${pageNum}`);
      });
    } else {
      const continuousRows = [];
      const continuousMerges = [];

      perPageTables.forEach(({ pageNum, rows, merges }) => {
        if (rows.length === 0) return;

        const rowOffset = continuousRows.length;

        let rowsToAppend = rows;
        let isRepeatedHeader = false;

        if (continuousRows.length > 0 && pageNum > 1) {
          const firstRow = rows[0];
          isRepeatedHeader = continuousRows.some(priorRow => {
            if (priorRow.length !== firstRow.length || firstRow.length < 2) return false;
            const matches = firstRow.filter((val, idx) => {
              const v1 = String(val || '').trim().toLowerCase();
              const v2 = String(priorRow[idx] || '').trim().toLowerCase();
              return v1.length > 0 && v1 === v2;
            }).length;
            return matches >= Math.ceil(firstRow.length * 0.7);
          });

          if (isRepeatedHeader) {
            rowsToAppend = rows.slice(1);
          }
        }

        continuousRows.push(...rowsToAppend);

        if (merges && merges.length > 0) {
          const shift = isRepeatedHeader ? -1 : 0;
          merges.forEach(m => {
            if (!isRepeatedHeader || m.s.r > 0) {
              continuousMerges.push({
                s: { r: m.s.r + shift + rowOffset, c: m.s.c },
                e: { r: m.e.r + shift + rowOffset, c: m.e.c }
              });
            }
          });
        }
      });

      const finalRows = continuousRows.length > 0 ? continuousRows : [['(No table data extracted)']];
      const worksheet = XLSX.utils.aoa_to_sheet(finalRows);

      if (continuousMerges.length > 0) {
        worksheet['!merges'] = continuousMerges;
      }

      const colWidths = [];
      finalRows.forEach(row => {
        row.forEach((cell, i) => {
          const cellLength = cell ? String(cell).length : 0;
          if (!colWidths[i] || colWidths[i].wch < cellLength + 2) {
            colWidths[i] = { wch: Math.min(60, Math.max(10, cellLength + 2)) };
          }
        });
      });
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    }

    if (onProgress) onProgress(90);

    if (format === 'csv') {
      const firstSheetName = workbook.SheetNames[0];
      const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
      if (onProgress) onProgress(100);
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    if (onProgress) onProgress(100);
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } finally {
    if (pdf && typeof pdf.cleanup === 'function') {
      try { await pdf.cleanup(); } catch {}
    }
    if (loadingTask && typeof loadingTask.destroy === 'function') {
      try { await loadingTask.destroy(); } catch {}
    }
  }
};

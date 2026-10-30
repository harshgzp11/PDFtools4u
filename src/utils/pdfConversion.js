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
    });

  if (validItems.length === 0) return [];

  // Filter running header (extreme top 28pt) and running footer (extreme bottom 28pt) if isolated
  const contentItems = validItems.filter(it => {
    const isExtremeTop = it.y0 > pageHeight - 28;
    const isExtremeBottom = it.y0 < 28;
    return !(isExtremeTop || isExtremeBottom);
  });

  const workingItems = contentItems.length > 0 ? contentItems : validItems;

  // Adaptive Baseline Y-clustering for physical line grouping
  workingItems.sort((a, b) => b.y0 - a.y0);

  const physicalLines = [];
  workingItems.forEach(item => {
    let matchedLine = physicalLines.find(line => {
      const lineY = line.y;
      const threshold = Math.max(3, item.fontSize * 0.45);
      return Math.abs(lineY - item.y0) <= threshold;
    });

    if (!matchedLine) {
      matchedLine = { y: item.y0, fontSize: item.fontSize, items: [] };
      physicalLines.push(matchedLine);
    }
    matchedLine.items.push(item);
  });

  physicalLines.sort((a, b) => b.y - a.y);

  // In each line, sort left to right and merge adjacent tokens based on proportional word spacing
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
          const sep = gap > 0.8 ? ' ' : '';
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

  // Separate document title banners (single-item line at top followed by multi-item lines)
  const nonTitleLines = [];
  const titleLines = [];

  physicalLines.forEach((line, idx) => {
    if (line.items.length === 1 && idx === 0 && physicalLines.length > 1) {
      titleLines.push(line.items[0].text.trim());
    } else {
      nonTitleLines.push(line);
    }
  });

  if (nonTitleLines.length === 0) {
    return titleLines.map(t => [t]);
  }

  // Partition lines into distinct table regions based on vertical gap and structure discontinuities
  const regions = [];
  let currentRegion = [];

  for (let i = 0; i < nonTitleLines.length; i++) {
    const line = nonTitleLines[i];
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
      : 15;

    // A distinct table region boundary:
    // 1) Vertical gap >= 32pt or >= 2.5x median row gap
    // 2) Significant shift in item count between rows
    const isLargeGap = verticalGap >= Math.max(32, medianGap * 2.5);
    const isItemCountShift = Math.abs(line.items.length - prevLine.items.length) >= 2;

    if (isLargeGap || (verticalGap >= 28 && isItemCountShift)) {
      regions.push(currentRegion);
      currentRegion = [line];
    } else {
      currentRegion.push(line);
    }
  }
  if (currentRegion.length > 0) {
    regions.push(currentRegion);
  }

  // Helper to extract rows and column clusters for a single table region
  const extractSingleRegion = (tableLines, startRowOffset) => {
    const allX0s = [];
    tableLines.forEach(line => {
      line.items.forEach(it => {
        allX0s.push({ x0: it.x0, x1: it.x1, text: it.text });
      });
    });

    const sortedX0 = allX0s.map(it => it.x0).sort((a, b) => a - b);
    const colClusters = [];
    const CLUSTER_TOLERANCE = 14;

    sortedX0.forEach(x => {
      const cluster = colClusters.find(c => Math.abs(c.mean - x) <= CLUSTER_TOLERANCE);
      if (cluster) {
        cluster.points.push(x);
        cluster.mean = cluster.points.reduce((sum, v) => sum + v, 0) / cluster.points.length;
      } else {
        colClusters.push({ mean: x, points: [x] });
      }
    });

    colClusters.sort((a, b) => a.mean - b.mean);

    const boundaries = [];
    for (let i = 0; i < colClusters.length - 1; i++) {
      boundaries.push((colClusters[i].mean + colClusters[i + 1].mean) / 2);
    }

    const numCols = Math.max(1, colClusters.length);

    const getColIndex = (item) => {
      const x = item.x0;
      for (let i = 0; i < boundaries.length; i++) {
        if (x < boundaries[i]) return i;
      }
      return boundaries.length;
    };

    const regionRows = [];
    const regionMerges = [];
    let prevRow = null;
    let prevLineY = null;

    tableLines.forEach(line => {
      // Check if line is a merged section heading spanning multiple columns
      if (line.items.length === 1 && numCols > 1) {
        const it = line.items[0];
        const lineGap = prevLineY !== null ? Math.abs(prevLineY - line.y) : 999;
        if (lineGap > (line.fontSize * 1.45)) {
          const row = Array(numCols).fill('');
          row[0] = it.text.trim();
          const rIdx = startRowOffset + regionRows.length;
          regionMerges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: numCols - 1 } });
          regionRows.push(row);
          prevRow = row;
          prevLineY = line.y;
          return;
        }
      }

      const currentCells = Array(numCols).fill('');
      const occupiedCols = new Set();

      line.items.forEach(it => {
        const colIdx = getColIndex(it);
        if (currentCells[colIdx] === '') {
          currentCells[colIdx] = it.text.trim();
        } else {
          currentCells[colIdx] += ' ' + it.text.trim();
        }
        occupiedCols.add(colIdx);
      });

      const lineGap = prevLineY !== null ? Math.abs(prevLineY - line.y) : 999;
      const isContinuation = prevRow &&
        lineGap <= (line.fontSize * 1.45) &&
        Array.from(occupiedCols).every(c => prevRow[c] !== '');

      if (isContinuation && prevRow) {
        occupiedCols.forEach(c => {
          prevRow[c] += (prevRow[c] ? ' ' : '') + currentCells[c];
        });
      } else {
        regionRows.push(currentCells);
        prevRow = currentCells;
      }
      prevLineY = line.y;
    });

    return { rows: regionRows, merges: regionMerges, numCols };
  };

  const finalRows = [];
  const allMerges = [];

  // Add leading document title banners
  if (titleLines.length > 0) {
    titleLines.forEach(t => {
      const rIdx = finalRows.length;
      finalRows.push([t]);
      allMerges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: 3 } });
    });
  }

  // Process each table region independently
  regions.forEach((regLines, rIdx) => {
    if (rIdx > 0 && finalRows.length > 0) {
      finalRows.push([]);
    }
    const { rows, merges } = extractSingleRegion(regLines, finalRows.length);
    finalRows.push(...rows);
    allMerges.push(...merges);
  });

  finalRows.merges = allMerges;
  return finalRows;
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

        if (continuousRows.length > 0 && pageNum > 1) {
          const firstRow = rows[0];
          const masterHeader = continuousRows[0];
          const isRepeatedHeader =
            firstRow.length === masterHeader.length &&
            firstRow.filter((val, idx) => val && String(val).toLowerCase() === String(masterHeader[idx] || '').toLowerCase()).length >= Math.ceil(firstRow.length * 0.7);

          if (isRepeatedHeader) {
            continuousRows.push(...rows.slice(1));
            if (merges && merges.length > 0) {
              merges.forEach(m => {
                if (m.s.r > 0) {
                  continuousMerges.push({
                    s: { r: m.s.r - 1 + rowOffset, c: m.s.c },
                    e: { r: m.e.r - 1 + rowOffset, c: m.e.c }
                  });
                }
              });
            }
            return;
          }
        }

        continuousRows.push(...rows);
        if (merges && merges.length > 0) {
          merges.forEach(m => {
            continuousMerges.push({
              s: { r: m.s.r + rowOffset, c: m.s.c },
              e: { r: m.e.r + rowOffset, c: m.e.c }
            });
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

let pdfjsLib = null;
async function initPdfJs() {
  if (!pdfjsLib) {
    if (typeof window === 'undefined') {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } else {
      pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
    }
  }
  return pdfjsLib;
}

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

const readArrayBuffer = (fileObj) => {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileObj)) {
        return resolve(fileObj.buffer.slice(fileObj.byteOffset, fileObj.byteOffset + fileObj.byteLength));
      }
      return reject(new Error("FileReader not available in current environment."));
    }
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
  if (fileObj instanceof ArrayBuffer) {
    arrayBuffer = fileObj;
  } else if (fileObj instanceof Uint8Array) {
    arrayBuffer = fileObj.buffer.slice(fileObj.byteOffset, fileObj.byteOffset + fileObj.byteLength);
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileObj)) {
    arrayBuffer = fileObj.buffer.slice(fileObj.byteOffset, fileObj.byteOffset + fileObj.byteLength);
  } else if (fileObj && typeof fileObj.arrayBuffer === 'function') {
    try {
      arrayBuffer = await fileObj.arrayBuffer();
    } catch {
      arrayBuffer = await readArrayBuffer(fileObj);
    }
  } else {
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
    AlignmentType,
    ImageRun,
    PageOrientation
  } = await import('docx');

  const pdfDoc = await loadPdfDocument(file);
  const numPages = pdfDoc.numPages;
  const isVisual = mode === 'visual';

  // VISUAL MODE: Fit pages cleanly into printable margins without overflow
  if (isVisual) {
    const docSections = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const isLandscape = viewport.width > viewport.height;

      // In A4: Portrait is 595.28 x 841.89 pt (11906 x 16838 dxa)
      // Landscape is 841.89 x 595.28 pt (16838 x 11906 dxa)
      const marginPt = 36; // 0.5 inch margins = 720 dxa
      const marginDxa = 720;
      const targetPageWidthPt = isLandscape ? 841.89 : 595.28;
      const targetPageHeightPt = isLandscape ? 595.28 : 841.89;

      const printableWidthPt = targetPageWidthPt - (marginPt * 2);
      const printableHeightPt = targetPageHeightPt - (marginPt * 2);

      const scaleFactor = Math.min(
        printableWidthPt / (viewport.width / 2.0),
        printableHeightPt / (viewport.height / 2.0)
      );

      const finalImgWidthPt = (viewport.width / 2.0) * scaleFactor;
      const finalImgHeightPt = (viewport.height / 2.0) * scaleFactor;

      let imageBuffer = null;
      if (typeof document !== 'undefined' && document.createElement) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;

        const base64Data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
      }

      const sectionChildren = [];
      if (imageBuffer) {
        sectionChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: finalImgWidthPt,
                  height: finalImgHeightPt,
                },
              }),
            ],
          })
        );
      }

      docSections.push({
        properties: {
          page: {
            size: {
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
              width: isLandscape ? 16838 : 11906,
              height: isLandscape ? 11906 : 16838,
            },
            margin: { top: marginDxa, right: marginDxa, bottom: marginDxa, left: marginDxa },
          },
        },
        children: sectionChildren,
      });

      if (onProgress) onProgress(Math.round((i / numPages) * 90));
      await yieldToMain();
    }

    const doc = new Document({ sections: docSections });
    if (onProgress) onProgress(100);
    if (typeof Blob !== 'undefined') {
      return await Packer.toBlob(doc);
    }
    return await Packer.toBuffer(doc);
  }

  // EDITABLE TEXT MODE
  const clusterItemsIntoLines = (items) => {
    if (!items || items.length === 0) return [];
    const valid = items.filter(it => it.str && it.str.trim().length > 0);
    if (valid.length === 0) return [];

    valid.sort((a, b) => b.transform[5] - a.transform[5]);

    const lines = [];
    valid.forEach(item => {
      const y = item.transform[5];
      const x = item.transform[4];
      const width = item.width || (item.str.length * 6);
      const height = item.height || 10;
      const fontName = (item.fontName || '').toLowerCase();
      const isBold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('heavy') || fontName.includes('b');
      const isItalic = fontName.includes('italic') || fontName.includes('oblique') || fontName.includes('i');

      const line = lines.find(l => Math.abs(l.y - y) <= Math.max(5.0, l.fontSize * 0.45));
      if (line) {
        line.items.push({ x, y, width, height, str: item.str, isBold, isItalic, fontSize: height, fontName });
        if (height > line.fontSize) {
          line.fontSize = height;
          line.y = y;
        }
      } else {
        lines.push({
          y,
          fontSize: height,
          items: [{ x, y, width, height, str: item.str, isBold, isItalic, fontSize: height, fontName }]
        });
      }
    });

    lines.sort((a, b) => b.y - a.y);

    lines.forEach(l => {
      l.items.sort((a, b) => a.x - b.x);
      let text = '';
      let lastEndX = null;

      const baseFontSize = l.fontSize;
      const baselineItem = l.items.reduce((prev, curr) => (curr.fontSize > prev.fontSize ? curr : prev), l.items[0]);
      const baseY = baselineItem ? baselineItem.y : l.y;

      l.items.forEach(it => {
        // Detect superscript / subscript based on relative font size and baseline vertical displacement
        if (it.fontSize <= baseFontSize * 0.85) {
          if (it.y > baseY + 1.2) {
            it.isSuperscript = true;
          } else if (it.y < baseY - 1.2) {
            it.isSubscript = true;
          }
        }

        if (lastEndX !== null) {
          const gap = it.x - lastEndX;
          if (gap > 3.5) text += ' ';
        }
        text += it.str;
        lastEndX = it.x + it.width;
      });
      l.text = text.trim();
      l.minX = l.items[0].x;
      l.maxX = l.items[l.items.length - 1].x + l.items[l.items.length - 1].width;
    });

    return lines;
  };

  const computeBodyFontSize = (allLines) => {
    if (allLines.length === 0) return 10;
    const sizeFreq = {};
    allLines.forEach(l => {
      const sz = Math.round(l.fontSize * 2) / 2;
      sizeFreq[sz] = (sizeFreq[sz] || 0) + 1;
    });
    let maxCount = 0;
    let bodySize = 10;
    Object.keys(sizeFreq).forEach(sz => {
      if (sizeFreq[sz] > maxCount) {
        maxCount = sizeFreq[sz];
        bodySize = Number(sz);
      }
    });
    return bodySize;
  };

  const structureLines = (lines, bodySize) => {
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      const isBig = line.fontSize >= bodySize * 1.2;
      const isBoldHeading = line.fontSize >= bodySize * 1.05 && line.items.some(it => it.isBold);
      const isShort = line.text.length < 120;
      const isNotSentence = !/[.!?]$/.test(line.text.trim());

      if ((isBig || isBoldHeading) && isShort && isNotSentence) {
        let headingLevel = HeadingLevel.HEADING_2;
        if (line.fontSize >= bodySize * 1.45 || line.fontSize >= 15) {
          headingLevel = HeadingLevel.HEADING_1;
        } else if (line.fontSize <= bodySize * 1.1) {
          headingLevel = HeadingLevel.HEADING_3;
        }

        blocks.push({
          type: 'heading',
          level: headingLevel,
          text: line.text,
          fontSize: line.fontSize,
        });
        i++;
        continue;
      }

      const isTableCandidate = (l) => {
        if (l.items.length < 2) return false;
        let gaps = 0;
        for (let j = 0; j < l.items.length - 1; j++) {
          const gap = l.items[j + 1].x - (l.items[j].x + l.items[j].width);
          if (gap > 22) gaps++;
        }
        return gaps >= 1 && l.items.length >= 2;
      };

      if (isTableCandidate(line)) {
        const tableLines = [line];
        let k = i + 1;
        while (k < lines.length) {
          const nextLine = lines[k];
          const gapY = tableLines[tableLines.length - 1].y - nextLine.y;
          if (gapY < 35 && (isTableCandidate(nextLine) || (tableLines.length >= 2 && nextLine.items.length >= 1 && gapY < 18))) {
            tableLines.push(nextLine);
            k++;
          } else {
            break;
          }
        }

        if (tableLines.length >= 2) {
          blocks.push({
            type: 'table',
            lines: tableLines,
          });
          i = k;
          continue;
        }
      }

      const paraLines = [line];
      let m = i + 1;
      while (m < lines.length) {
        const nextLine = lines[m];
        const prevLine = paraLines[paraLines.length - 1];
        const gapY = prevLine.y - nextLine.y;

        const isNextHeading = (nextLine.fontSize >= bodySize * 1.2 || (nextLine.fontSize >= bodySize * 1.05 && nextLine.items.some(it => it.isBold))) && nextLine.text.length < 120 && !/[.!?]$/.test(nextLine.text.trim());
        const isNextTable = isTableCandidate(nextLine);

        if (gapY >= -2 && gapY <= (prevLine.fontSize * 1.6) && !isNextHeading && !isNextTable) {
          paraLines.push(nextLine);
          m++;
        } else {
          break;
        }
      }

      blocks.push({
        type: 'paragraph',
        lines: paraLines,
      });
      i = m;
    }

    return blocks;
  };

  const partitionAdaptiveColumns = (items, pageWidth = 595.28) => {
    if (!items || items.length < 8) return null;

    const minGx = pageWidth * 0.25;
    const maxGx = pageWidth * 0.75;
    const gutterWidth = 14;

    let bestGutter = null;
    let maxScore = -Infinity;

    for (let gx = minGx; gx <= maxGx; gx += 4) {
      const leftBound = gx - gutterWidth / 2;
      const rightBound = gx + gutterWidth / 2;

      let leftCount = 0;
      let rightCount = 0;
      let crossingCount = 0;
      let totalLeftWords = 0;
      let totalRightWords = 0;

      items.forEach(it => {
        const x = it.transform[4];
        const w = it.width || (it.str.length * 6);
        const words = (it.str || '').trim().split(/\s+/).length;
        if (x < leftBound && (x + w) > rightBound) {
          crossingCount++;
        } else if ((x + w) <= rightBound) {
          leftCount++;
          totalLeftWords += words;
        } else if (x >= leftBound) {
          rightCount++;
          totalRightWords += words;
        }
      });

      if (leftCount >= 4 && rightCount >= 4 && totalLeftWords >= 8 && totalRightWords >= 8) {
        const score = (leftCount + rightCount) * 2 - (crossingCount * 3);
        if (score > maxScore) {
          maxScore = score;
          bestGutter = { gx, leftBound, rightBound, leftCount, rightCount, crossingCount };
        }
      }
    }

    if (!bestGutter) return null;

    const { leftBound, rightBound } = bestGutter;
    const crossingItems = [];
    const columnItems = [];

    items.forEach(it => {
      const x = it.transform[4];
      const w = it.width || (it.str.length * 6);
      if (x < leftBound && (x + w) > rightBound) {
        crossingItems.push(it);
      } else {
        columnItems.push(it);
      }
    });

    crossingItems.sort((a, b) => b.transform[5] - a.transform[5]);
    const yBoundaries = [Infinity, ...crossingItems.map(it => it.transform[5]), -Infinity];

    const orderedLines = [];

    for (let b = 0; b < yBoundaries.length - 1; b++) {
      const topY = yBoundaries[b];
      const bottomY = yBoundaries[b + 1];

      const sliceItems = columnItems.filter(it => {
        const y = it.transform[5];
        return y < topY - 3 && y > bottomY + 3;
      });

      if (sliceItems.length > 0) {
        const leftColItems = sliceItems.filter(it => (it.transform[4] + (it.width || 0)) <= rightBound);
        const rightColItems = sliceItems.filter(it => it.transform[4] >= leftBound);

        const leftLines = clusterItemsIntoLines(leftColItems);
        const rightLines = clusterItemsIntoLines(rightColItems);

        orderedLines.push(...leftLines);
        orderedLines.push(...rightLines);
      }

      if (b < crossingItems.length) {
        const crossingLines = clusterItemsIntoLines([crossingItems[b]]);
        orderedLines.push(...crossingLines);
      }
    }

    return orderedLines;
  };

  let allPagesLines = [];
  for (let p = 1; p <= numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const adaptiveLines = partitionAdaptiveColumns(textContent.items, viewport.width || 595.28);
    const pageLines = adaptiveLines || clusterItemsIntoLines(textContent.items);
    allPagesLines.push(pageLines);
    if (onProgress) onProgress(Math.round((p / numPages) * 35));
    await yieldToMain();
  }

  const allLinesFlat = allPagesLines.flat();
  const bodySize = computeBodyFontSize(allLinesFlat);

  const docChildren = [];

  for (let p = 0; p < numPages; p++) {
    const pageLines = allPagesLines[p];
    let isFirstBlockOnPage = (p > 0);

    const totalChars = pageLines.reduce((sum, l) => sum + (l.text ? l.text.length : 0), 0);

    if (pageLines.length === 0 || totalChars < 15) {
      // Scanned or image-only page: Attempt client-side OCR if available
      let ocrRecognized = false;
      const page = await pdfDoc.getPage(p + 1);

      if (typeof document !== 'undefined' && document.createElement) {
        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng', 1, {
            logger: m => {
              if (m.status === 'recognizing text' && onProgress) {
                onProgress(35 + Math.round(((p + (m.progress || 0)) / numPages) * 55));
              }
            }
          });

          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;

          const ret = await worker.recognize(canvas);
          await worker.terminate();
          canvas.width = 0;
          canvas.height = 0;

          const ocrText = ret?.data?.text ? ret.data.text.trim() : '';
          if (ocrText.length > 10) {
            const ocrParagraphs = ocrText.split(/\n\s*\n/).filter(t => t.trim().length > 0);
            ocrParagraphs.forEach((para, paraIdx) => {
              docChildren.push(
                new Paragraph({
                  children: [new TextRun({ text: decodeHtmlEntities(para.trim()), size: Math.round(bodySize * 2) })],
                  spacing: { after: 140 },
                  pageBreakBefore: paraIdx === 0 && isFirstBlockOnPage,
                })
              );
            });
            ocrRecognized = true;
          }
        } catch (ocrErr) {
          console.warn(`Page ${p + 1} OCR attempt note:`, ocrErr);
        }
      }

      // If OCR was unavailable or returned empty, fallback to embedded page image
      if (!ocrRecognized) {
        try {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;

          const base64Data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, "");
          const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          canvas.width = 0;
          canvas.height = 0;

          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              pageBreakBefore: isFirstBlockOnPage,
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: 523,
                    height: 523 * (viewport.height / viewport.width),
                  },
                }),
              ],
              spacing: { after: 200 },
            })
          );
        } catch (imgErr) {
          console.error(`Page ${p + 1} image fallback error:`, imgErr);
        }
      }

      continue;
    }

    const blocks = structureLines(pageLines, bodySize);

    blocks.forEach(block => {
      const pageBreakBefore = isFirstBlockOnPage;
      if (isFirstBlockOnPage) isFirstBlockOnPage = false;

      if (block.type === 'heading') {
        docChildren.push(
          new Paragraph({
            text: decodeHtmlEntities(block.text),
            heading: block.level,
            spacing: { before: 240, after: 120 },
            pageBreakBefore,
          })
        );
      } else if (block.type === 'paragraph') {
        const runs = [];
        block.lines.forEach((l, lIdx) => {
          l.items.forEach((it, itIdx) => {
            runs.push(
              new TextRun({
                text: decodeHtmlEntities(it.str) + (itIdx < l.items.length - 1 ? ' ' : ''),
                bold: it.isBold,
                italics: it.isItalic,
                superScript: !!it.isSuperscript,
                subScript: !!it.isSubscript,
                size: Math.round(it.fontSize * 2),
              })
            );
          });
          if (lIdx < block.lines.length - 1) {
            runs.push(new TextRun({ text: ' ' }));
          }
        });

        docChildren.push(
          new Paragraph({
            children: runs,
            spacing: { after: 140 },
            pageBreakBefore,
          })
        );
      } else if (block.type === 'table') {
        const allX = [];
        block.lines.forEach(l => l.items.forEach(it => allX.push(it.x)));
        allX.sort((a, b) => a - b);

        const colClusters = [];
        allX.forEach(x => {
          const c = colClusters.find(cl => Math.abs(cl.avg - x) < 30);
          if (c) {
            c.points.push(x);
            c.avg = c.points.reduce((a, b) => a + b, 0) / c.points.length;
          } else {
            colClusters.push({ avg: x, points: [x] });
          }
        });
        colClusters.sort((a, b) => a.avg - b.avg);
        const numCols = Math.max(1, colClusters.length);

        const tableRows = [];
        block.lines.forEach(l => {
          const cells = Array(numCols).fill('');
          l.items.forEach(it => {
            let bestCol = 0;
            let minDist = Infinity;
            colClusters.forEach((cl, cIdx) => {
              const d = Math.abs(cl.avg - it.x);
              if (d < minDist) {
                minDist = d;
                bestCol = cIdx;
              }
            });
            cells[bestCol] = cells[bestCol] ? cells[bestCol] + ' ' + it.str : it.str;
          });

          const rowCells = cells.map(cellText => {
            return new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: decodeHtmlEntities(cellText.trim()), size: Math.round(bodySize * 2) })],
                  spacing: { before: 40, after: 40 },
                }),
              ],
            });
          });

          tableRows.push(new TableRow({ children: rowCells }));
        });

        const docxTable = new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        });

        if (pageBreakBefore) {
          docChildren.push(new Paragraph({ pageBreakBefore: true }));
        }
        docChildren.push(docxTable);
        docChildren.push(new Paragraph({ spacing: { after: 140 } }));
      }
    });

    if (onProgress) onProgress(35 + Math.round(((p + 1) / numPages) * 55));
    await yieldToMain();
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: docChildren,
      },
    ],
  });

  if (onProgress) onProgress(100);
  if (typeof Blob !== 'undefined') {
    return await Packer.toBlob(doc);
  }
  return await Packer.toBuffer(doc);
};

/**
 * Quickly checks if a PDF document is encrypted / requires a password.
 * @param {File|Blob|ArrayBuffer} file
 * @returns {Promise<boolean>}
 */
export const isPdfEncrypted = async (file) => {
  if (!file) return false;
  try {
    const _pdfjsLib = await initPdfJs();
    let arrayBuffer;
    if (file instanceof ArrayBuffer) {
      arrayBuffer = file;
    } else if (ArrayBuffer.isView(file)) {
      arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
      arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    } else if (file && typeof file.arrayBuffer === 'function') {
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch {
        arrayBuffer = await readArrayBuffer(file);
      }
    } else {
      arrayBuffer = await readArrayBuffer(file);
    }

    const loadingTask = _pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer)
    });
    await loadingTask.promise;
    return false;
  } catch (err) {
    if (err && (err.name === 'PasswordException' || String(err.message || '').includes('password') || String(err.message || '').includes('Password') || String(err.message || '').includes('PASSWORD_REQUIRED'))) {
      return true;
    }
    return false;
  }
};

/**
 * Converts a PDF file to images (JPG or PNG).
 * Returns { blob, filename, isZip, numPages, format, mimeType }.
 * For 1-page PDF: returns the individual image blob directly with .jpg/.png extension.
 * For multi-page PDF: returns a JSZip blob containing zero-padded page images (e.g. page-01.jpg).
 *
 * @param {File|Blob|ArrayBuffer} file 
 * @param {Object|string} [options={}] - Options object or format string ('jpeg' | 'png')
 * @param {string} [options.format='jpeg'] - 'jpeg' or 'png'
 * @param {string|number} [options.dpi='medium'] - 'low' (1.5x / ~108 DPI), 'medium' (2.0x / ~144 DPI), 'high' (3.0x / ~216 DPI)
 * @param {string} [options.password] - Optional password for encrypted PDFs
 * @param {Function} [onProgress] - Progress callback (0-100)
 */
export const convertPdfToImages = async (file, options = {}, onProgress = () => {}) => {
  if (!file) throw new Error("No file provided");

  // Backwards compatibility if format passed as string
  let format = 'jpeg';
  let dpi = 'medium';
  let password = undefined;
  let progressCb = onProgress;

  if (typeof options === 'string') {
    format = options;
  } else if (typeof options === 'object') {
    format = options.format || 'jpeg';
    dpi = options.dpi || 'medium';
    password = options.password;
    if (typeof options.onProgress === 'function') progressCb = options.onProgress;
  }
  if (typeof progressCb === 'function') progressCb(0);

  // Map DPI to scale
  let scale = 2.0; // Default ~144 DPI
  if (typeof dpi === 'number') {
    scale = dpi;
  } else if (dpi === 'low') {
    scale = 1.5; // ~108 DPI
  } else if (dpi === 'medium') {
    scale = 2.0; // ~144 DPI
  } else if (dpi === 'high') {
    scale = 3.0; // ~216 DPI
  }

  const _pdfjsLib = await initPdfJs();
  let arrayBuffer;
  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else if (ArrayBuffer.isView(file)) {
    arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  } else if (file && typeof file.arrayBuffer === 'function') {
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch {
      arrayBuffer = await readArrayBuffer(file);
    }
  } else {
    arrayBuffer = await readArrayBuffer(file);
  }

  let pdf;
  try {
    const loadingTask = _pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      password: password
    });
    pdf = await loadingTask.promise;
  } catch (err) {
    if (err && err.name === 'PasswordException') {
      const pErr = new Error("PASSWORD_REQUIRED: This document is password-protected.");
      pErr.name = 'PasswordException';
      throw pErr;
    }
    throw err;
  }

  const numPages = pdf.numPages;
  const rawName = file.name || 'document';
  const cleanBaseName = rawName.replace(/\.[^/.]+$/, "") || 'document';
  const ext = format === 'png' ? 'png' : 'jpg';
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'jpeg' ? 0.92 : undefined;

  // Single-page PDF: Direct image download (no ZIP)
  if (numPages === 1) {
    const page = await pdf.getPage(1);
    let pageViewport = page.getViewport({ scale });

    // Safety clamp: avoid exceeding 16 megapixels (e.g. 4096 x 4096)
    const maxDimension = 4096;
    if (pageViewport.width > maxDimension || pageViewport.height > maxDimension) {
      const clampFactor = maxDimension / Math.max(pageViewport.width, pageViewport.height);
      pageViewport = page.getViewport({ scale: scale * clampFactor });
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.round(pageViewport.width);
    canvas.height = Math.round(pageViewport.height);

    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvasContext: ctx, viewport: pageViewport }).promise;
    if (typeof progressCb === 'function') progressCb(100);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, quality);
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;

    return {
      blob,
      filename: `${cleanBaseName}.${ext}`,
      isZip: false,
      numPages: 1,
      format,
      mimeType
    };
  }

  // Multi-page PDF: Generate ZIP archive
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folderName = `${cleanBaseName}_images`;
  const folder = zip.folder(folderName);
  const padLength = Math.max(2, String(numPages).length);

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    let pageViewport = page.getViewport({ scale });

    // Safety clamp
    const maxDimension = 4096;
    if (pageViewport.width > maxDimension || pageViewport.height > maxDimension) {
      const clampFactor = maxDimension / Math.max(pageViewport.width, pageViewport.height);
      pageViewport = page.getViewport({ scale: scale * clampFactor });
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.round(pageViewport.width);
    canvas.height = Math.round(pageViewport.height);

    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvasContext: ctx, viewport: pageViewport }).promise;

    const dataUrl = canvas.toDataURL(mimeType, quality);
    const base64Data = dataUrl.split(',')[1];
    const pageNumPadded = String(i).padStart(padLength, '0');
    folder.file(`page-${pageNumPadded}.${ext}`, base64Data, { base64: true });

    // Explicit Memory Cleanup
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;

    if (typeof progressCb === 'function') {
      progressCb(Math.round((i / numPages) * 100));
    }

    // Yield to main thread to keep UI responsive
    await yieldToMain();
  }

  const content = await zip.generateAsync({ type: "blob" });
  return {
    blob: content,
    filename: `${cleanBaseName}_images.zip`,
    isZip: true,
    numPages,
    format,
    mimeType: 'application/zip'
  };
};

/**
 * Converts a PDF file to a native PPTX presentation (high-fidelity layout preservation).
 * Dynamically detects PDF page aspect ratio (A4 portrait, letter, landscape) to eliminate pillarboxing.
 * @param {File|Blob|ArrayBuffer} file 
 * @param {Function} onProgress 
 */
export const convertPdfToPpt = async (file, onProgress) => {
  if (!file) throw new Error("No file provided");
  if (onProgress) onProgress(0);

  const pptxgen = (await import('pptxgenjs')).default;
  const arrayBuffer = await (file.arrayBuffer ? file.arrayBuffer() : readArrayBuffer(file));
  const _pdfjsLib = await initPdfJs();
  const pdf = await _pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdf.numPages;

  if (numPages === 0) {
    throw new Error("The PDF document contains no pages.");
  }

  // Inspect page 1 dimensions to set presentation slide layout matching source document
  const page1 = await pdf.getPage(1);
  const vp1 = page1.getViewport({ scale: 1.0 });
  const slideWidthInches = Math.max(4, Number((vp1.width / 72).toFixed(2)));
  const slideHeightInches = Math.max(3, Number((vp1.height / 72).toFixed(2)));

  const pres = new pptxgen();
  pres.defineLayout({
    name: 'MATCH_PDF_LAYOUT',
    width: slideWidthInches,
    height: slideHeightInches,
  });
  pres.layout = 'MATCH_PDF_LAYOUT';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const vpPage = page.getViewport({ scale: 1.0 });
    const pageWInches = vpPage.width / 72;
    const pageHInches = vpPage.height / 72;

    // Use scale 2.0 (144 DPI) for sharp, high-fidelity visual rendering
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    // Scale proportionally to fit slide dimensions without stretching
    const scaleFactor = Math.min(slideWidthInches / pageWInches, slideHeightInches / pageHInches);
    const finalW = pageWInches * scaleFactor;
    const finalH = pageHInches * scaleFactor;
    const xOffset = (slideWidthInches - finalW) / 2;
    const yOffset = (slideHeightInches - finalH) / 2;

    const slide = pres.addSlide();
    slide.addImage({ data: imgData, x: xOffset, y: yOffset, w: finalW, h: finalH });

    // Explicit Memory Cleanup to prevent memory spikes on multi-page documents
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;

    if (onProgress) onProgress(Math.round((i / numPages) * 100));

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

import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun } from 'docx';
import * as XLSX from 'xlsx';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Converts a PDF file to a Word (DOCX) file.
 * @param {File} file - The PDF file
 * @param {string} mode - 'editable' or 'visual'
 * @param {Function} onProgress - Callback for progress (0 to 100)
 * @returns {Promise<Blob>} - The resulting DOCX Blob
 */
export const convertPdfToDocx = async (file, mode = 'editable', onProgress) => {
  if (!file) throw new Error("No file provided");
  onProgress(0);
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdf.numPages;
  
  const paragraphs = [];
  
  if (mode === 'visual') {
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      const base64Data = imgDataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let j = 0; j < len; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
      
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: bytes,
              transformation: {
                width: 600, // Standard page width in docx roughly
                height: (600 / viewport.width) * viewport.height
              }
            })
          ],
          spacing: { after: 200 }
        })
      );
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0; 
      canvas.height = 0;
      
      onProgress(Math.round((i / numPages) * 70));
      await yieldToMain();
    }
  } else {
    let totalTextLength = 0;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items;
      
      if (items.length > 0) {
        const rows = [];
        const TOLERANCE = 5; 
        
        items.forEach(item => {
          totalTextLength += item.str.trim().length;
          const y = item.transform[5];
          let foundRow = rows.find(r => Math.abs(r.y - y) < TOLERANCE);
          if (!foundRow) {
            foundRow = { y, items: [] };
            rows.push(foundRow);
          }
          foundRow.items.push(item);
        });
        
        rows.sort((a, b) => b.y - a.y);
        
        rows.forEach(row => {
          row.items.sort((a, b) => a.transform[4] - b.transform[4]);
          
          const children = [];
          let firstX = null;

          row.items.forEach(item => {
             const str = item.str.trim();
             if (!str) return;
             
             if (firstX === null) firstX = item.transform[4];
             const fontSize = item.transform[0];

             children.push(new TextRun({
               text: str + " ",
               size: Math.max(16, Math.round(fontSize * 2)), 
             }));
          });
          
          if (children.length > 0) {
            let alignment = AlignmentType.LEFT;
            if (firstX > 150 && firstX < 450) {
              alignment = AlignmentType.CENTER;
            }

            paragraphs.push(new Paragraph({
              children,
              alignment,
              spacing: { after: 80 }
            }));
          }
        });
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: " " })] }));
      }
      
      onProgress(Math.round((i / numPages) * 70));
    }
    
    if (totalTextLength === 0) {
      throw new Error("No text could be extracted. The PDF might be a scanned image or composed of vectors. Try 'Visual Layout' mode instead.");
    }
  }
  
  onProgress(80);

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
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
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
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
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
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
 * Converts a PDF file to an Excel (.xlsx) file using Sequential Row Mapping with Auto-Sized Columns.
 * @param {File} file - The PDF file to extract tables from
 * @param {Function} onProgress - Progress callback function (0 to 100)
 * @returns {Promise<Blob>} - The resulting Excel (.xlsx) Blob
 */
export const convertPdfToExcel = async (file, onProgress) => {
  if (!file) throw new Error("No file provided");
  onProgress(0);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdf.numPages;

  const allTableRows = [];
  let totalExtractedItems = 0;

  const ROW_Y_TOLERANCE = 5; // Y-tolerance in PDF points (+/- 5px)
  const MERGE_GAP_X_THRESHOLD = 6; // Proximity merge gap (<= 6px)

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Filter out items without non-whitespace content
    const items = (textContent.items || []).filter(item => item.str && item.str.trim().length > 0);

    if (items.length > 0) {
      totalExtractedItems += items.length;

      // 1. Group text items into rows based on Y-coordinate (transform[5])
      const rows = [];
      items.forEach(item => {
        const x = item.transform[4];
        const y = item.transform[5];

        let foundRow = rows.find(r => Math.abs(r.y - y) <= ROW_Y_TOLERANCE);
        if (!foundRow) {
          foundRow = { y, items: [] };
          rows.push(foundRow);
        }
        foundRow.items.push({ text: item.str, x, y, width: item.width || 0 });
      });

      // 2. Sort rows top to bottom (descending Y in PDF coordinates)
      rows.sort((a, b) => b.y - a.y);

      // 3. Process each row: Sort left to right by X, apply Proximity Merging (<= 6px), and map sequentially
      rows.forEach(row => {
        // Sort items within row from left to right by X-coordinate
        row.items.sort((a, b) => a.x - b.x);

        const mergedItems = [];
        row.items.forEach(item => {
          if (mergedItems.length === 0) {
            mergedItems.push({ ...item });
          } else {
            const prevItem = mergedItems[mergedItems.length - 1];
            const prevRightX = prevItem.x + (prevItem.width || 0);
            const gap = item.x - prevRightX;

            // Proximity Merging (<= 6px)
            if (gap <= MERGE_GAP_X_THRESHOLD) {
              const prevText = prevItem.text;
              const currText = item.text;

              let separator = '';

              // 1. Lower threshold: Any gap larger than 1px is a space.
              if (gap > 1) {
                separator = ' ';
              }

              // 2. The CamelCase Safety Net (e.g. "Result" + "Status" -> "Result Status")
              const lastChar = prevText.slice(-1);
              const nextChar = currText.charAt(0);
              const isCamelCaseSmash = /[a-z]/.test(lastChar) && /[A-Z]/.test(nextChar);

              if (isCamelCaseSmash) {
                separator = ' ';
              }

              // 3. The "of" Safety Net (Fixes "Year ofPassing")
              if (prevText.trim().toLowerCase().endsWith('of')) {
                separator = ' ';
              }

              // 4. Protect email/URL kerning when gap <= 1px
              if (gap <= 1) {
                const isSymbolJunction =
                  prevText.trim().endsWith('@') || currText.trim().startsWith('@') ||
                  prevText.trim().endsWith('.') || currText.trim().startsWith('.') ||
                  prevText.trim().endsWith('/') || currText.trim().startsWith('/') ||
                  prevText.trim().endsWith('-') || currText.trim().startsWith('-') ||
                  prevText.trim().endsWith('_') || currText.trim().startsWith('_') ||
                  prevText.trim().endsWith(':') || currText.trim().startsWith(':');

                if (isSymbolJunction) {
                  separator = '';
                }
              }

              // Prevent double spaces
              if (/\s$/.test(prevText) || /^\s/.test(currText)) {
                separator = '';
              }

              prevItem.text = prevText + separator + currText;
              const newRightX = Math.max(prevRightX, item.x + (item.width || 0));
              prevItem.width = newRightX - prevItem.x;
            } else {
              mergedItems.push({ ...item });
            }
          }
        });

        // 4. Sequential Row Mapping
        const rowCells = mergedItems.map(item => item.text.trim()).filter(text => text.length > 0);
        if (rowCells.length > 0) {
          allTableRows.push(rowCells);
        }
      });
    }

    onProgress(Math.round((pageNum / numPages) * 100));
    await yieldToMain();
  }

  if (totalExtractedItems === 0 || allTableRows.length === 0) {
    throw new Error("No tabular text could be extracted. The PDF might be a scanned image or composed of vectors.");
  }

  // Create Excel workbook and worksheet using SheetJS (XLSX)
  const worksheet = XLSX.utils.aoa_to_sheet(allTableRows);

  // Auto-size column widths based on maximum cell string length
  const colWidths = [];
  allTableRows.forEach(row => {
    row.forEach((cell, i) => {
      const cellLength = cell ? cell.toString().length : 0;
      if (!colWidths[i] || colWidths[i].wch < cellLength + 2) {
        colWidths[i] = { wch: cellLength + 2 };
      }
    });
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

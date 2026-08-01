import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun } from 'docx';
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
 * Converts a PDF file to a CSV (acting as Excel) using Text-to-CSV logic
 * @param {File} file 
 * @param {Function} onProgress 
 */
export const convertPdfToExcel = async (file, onProgress) => {
  if (!file) throw new Error("No file provided");
  onProgress(0);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdf.numPages;
  
  let csvText = "";
  let hasText = false;
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items;
    
    if (items.length > 0) {
      hasText = true;
      const rows = [];
      const TOLERANCE = 5;
      
      items.forEach(item => {
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
        const rowText = row.items.map(item => {
          let str = item.str.replace(/"/g, '""');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str}"`;
          }
          return str;
        }).join(',');
        csvText += rowText + '\n';
      });
    }
    
    onProgress(Math.round((i / numPages) * 100));
    await yieldToMain();
  }
  
  if (!hasText || !csvText.trim()) {
    throw new Error("No tabular text could be extracted. The PDF might be a scanned image or composed of vectors.");
  }

  // Add UTF-8 BOM
  const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
  return blob;
};

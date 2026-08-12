let pdfjsLib = null;
async function initPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
  }
  return pdfjsLib;
}

/**
 * Extracts rasterized thumbnails from a PDF file.
 * @param {File} file - The PDF file object
 * @param {number} scale - Resolution scale of the thumbnail (default 1.0)
 * @returns {Promise<Array<{ id: string, originalIndex: number, dataUrl: string }>>} Array of thumbnail objects
 */
export async function getPdfThumbnails(file, scale = 1.0) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const _pdfjsLib = await initPdfJs();
        const typedArray = new Uint8Array(e.target.result);
        const loadingTask = _pdfjsLib.getDocument({ data: typedArray });
        const pdf = await loadingTask.promise;
        
        const thumbnails = [];
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          const viewport = page.getViewport({ scale: scale });
          
          // Prepare canvas using DOM
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Render PDF page into canvas context
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          thumbnails.push({
            id: `page-${pageNum - 1}`, // 0-indexed ID for React keys and sorting
            originalIndex: pageNum - 1,
            dataUrl: dataUrl
          });
        }
        
        resolve(thumbnails);
      } catch (error) {
        console.error("Error generating thumbnails:", error, error.message, error.stack);
        reject(new Error(`PDF render error: ${error.message}`));
      }
    };
    
    reader.onerror = (e) => reject(new Error("File reading error"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts rasterized images from a PDF file specifically for compression.
 * @param {File} file - The PDF file object
 * @param {number} scale - Resolution scale (e.g. 1.0, 1.5, 2.0)
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @param {Function} onProgress - Callback for progress (percentage 0-100)
 * @returns {Promise<Array<{ dataUrl: string, width: number, height: number }>>}
 */
export async function renderPdfForCompression(file, scale = 1.0, quality = 0.6, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const _pdfjsLib = await initPdfJs();
        const typedArray = new Uint8Array(e.target.result);
        const loadingTask = _pdfjsLib.getDocument({ data: typedArray });
        const pdf = await loadingTask.promise;
        
        const pagesData = [];
        const totalPages = pdf.numPages;
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          const viewport = page.getViewport({ scale: scale });
          const originalViewport = page.getViewport({ scale: 1.0 }); // Keep original size for reconstruction
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
          
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          pagesData.push({
            dataUrl,
            width: originalViewport.width,
            height: originalViewport.height
          });
          
          onProgress(Math.round((pageNum / totalPages) * 100));
        }
        
        resolve(pagesData);
      } catch (error) {
        console.error("Error compressing PDF:", error);
        reject(new Error(`PDF render error: ${error.message}`));
      }
    };
    
    reader.onerror = (e) => reject(new Error("File reading error"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extracts pages as canvas elements for iterative compression.
 * @param {File} file - The PDF file object
 * @param {number} scale - Resolution scale
 * @param {Function} onProgress - Callback for progress (percentage 0-100)
 * @returns {Promise<Array<{ canvas: HTMLCanvasElement, width: number, height: number }>>}
 */
export async function getPdfCanvases(file, scale = 2.0, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const _pdfjsLib = await initPdfJs();
        const typedArray = new Uint8Array(e.target.result);
        const loadingTask = _pdfjsLib.getDocument({ data: typedArray });
        const pdf = await loadingTask.promise;
        
        const pagesData = [];
        const totalPages = pdf.numPages;
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          const viewport = page.getViewport({ scale: scale });
          const originalViewport = page.getViewport({ scale: 1.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
          
          pagesData.push({
            canvas,
            width: originalViewport.width,
            height: originalViewport.height
          });
          
          onProgress(Math.round((pageNum / totalPages) * 100));
        }
        
        resolve(pagesData);
      } catch (error) {
        console.error("Error rendering PDF:", error);
        reject(new Error(`PDF render error: ${error.message}`));
      }
    };
    
    reader.onerror = (e) => reject(new Error("File reading error"));
    reader.readAsArrayBuffer(file);
  });
}

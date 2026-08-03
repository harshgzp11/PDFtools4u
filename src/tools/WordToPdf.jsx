import React, { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as docx from 'docx-preview';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const docxContainerRef = useRef(null);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.name.endsWith('.doc') || window.__sharedFile.name.endsWith('.docx') || window.__sharedFile.type.includes('word')) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (!newFile || (!newFile.name.endsWith('.doc') && !newFile.name.endsWith('.docx') && !newFile.type.includes('word'))) {
      alert("Please upload a valid Word document (.doc or .docx).");
      return;
    }

    setFile(newFile);
    setSuccessData(null);
    setIsLoadingPreview(true);

    setTimeout(async () => {
      if (!docxContainerRef.current) {
        setIsLoadingPreview(false);
        return;
      }

      const container = docxContainerRef.current;
      container.innerHTML = '';

      try {
        const arrayBuffer = await newFile.arrayBuffer();
        let usedDocxPreview = false;

        try {
          await docx.renderAsync(arrayBuffer, container, null, {
            breakPages: true,
            useBase64URL: true,
          });
          usedDocxPreview = true;
        } catch (docxErr) {
          console.warn("docx-preview parsing notice, attempting mammoth fallback:", docxErr);
        }

        if (!usedDocxPreview) {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const rawHtml = result.value || '<p>No content found in document.</p>';
          container.innerHTML = `
            <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 40px; color: #111827; background: #ffffff; border-radius: 8px; width: 100%;">
              ${rawHtml}
            </div>
          `;
        }
      } catch (err) {
        console.error("Document preview error:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 100);
  };

  const convertWordToPdf = async () => {
    if (!file) return;
    setIsProcessing(true);

    // 1. Isolated Mounting Container
    const targetContainer = document.createElement('div');
    targetContainer.style.position = 'fixed';
    targetContainer.style.left = '-9999px';
    targetContainer.style.top = '0';
    targetContainer.style.width = '794px';
    targetContainer.style.background = 'white';
    document.body.appendChild(targetContainer);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // 2. Render & Wait Routine
      try {
        await docx.renderAsync(arrayBuffer, targetContainer, null, { breakPages: true, useBase64URL: true });
      } catch (docxErr) {
        console.warn("docx-preview failed in isolated container, falling back to mammoth:", docxErr);
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const rawHtml = result.value || '<p>No content found in document.</p>';
        targetContainer.innerHTML = `
          <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 40px; color: #111827; background: #ffffff; width: 794px;">
            ${rawHtml}
          </div>
        `;
      }

      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 3. CSS Cleanup Before Capture
      targetContainer.querySelectorAll('.docx-wrapper').forEach(el => el.style.padding = '0');
      targetContainer.querySelectorAll('section.docx').forEach(el => {
        el.style.boxShadow = 'none';
        el.style.margin = '0';
      });
      
      // Fix docx-preview table floating/overlapping issues
      targetContainer.querySelectorAll('table').forEach(table => {
        table.style.setProperty('float', 'none', 'important');
        table.style.setProperty('position', 'static', 'important');
        table.style.setProperty('clear', 'both', 'important');
        table.style.marginTop = '15px';
        table.style.marginBottom = '15px';
      });
      targetContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(p => {
        p.style.setProperty('clear', 'both', 'important');
      });

      // 4. Sequential Page Processing with Smart Slicing
      const pageElements = targetContainer.querySelectorAll('section.docx');
      const pagesToProcess = pageElements.length > 0 ? Array.from(pageElements) : [targetContainer];

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 595.28
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 841.89
      const pageRatio = pdfHeight / pdfWidth;

      let isFirstPage = true;

      for (let i = 0; i < pagesToProcess.length; i++) {
        const pageEl = pagesToProcess[i];
        pageEl.style.boxShadow = 'none';
        pageEl.style.margin = '0';
        pageEl.style.background = '#ffffff';

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 794
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) continue;

        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const targetPageH = Math.round(canvasW * pageRatio);

        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Helper to find a clean horizontal gap (white row) to avoid cutting text
        const findPageBreak = (startY) => {
          if (startY >= canvasH) return canvasH;
          const searchLimit = Math.min(startY, 400); // Search up to 400px upwards
          const imgData = ctx.getImageData(0, startY - searchLimit, canvasW, searchLimit).data;
          
          let minNonWhiteCount = canvasW;
          let bestY = startY;

          for (let y = searchLimit - 1; y >= 0; y--) {
            let nonWhiteCount = 0;
            // Ignore edges to avoid scrollbars or borders throwing off the count
            for (let x = 20; x < canvasW - 20; x++) {
              const idx = (y * canvasW + x) * 4;
              const r = imgData[idx];
              const g = imgData[idx+1];
              const b = imgData[idx+2];
              const a = imgData[idx+3];
              
              // Count only darker pixels (text, lines). 
              // Light backgrounds (like #f0f0f0) will have r+g+b > 700 and will be ignored!
              if (a > 50 && (r + g + b) < 700) {
                nonWhiteCount++;
              }
            }

            if (nonWhiteCount === 0) {
              return (startY - searchLimit) + y; // Perfect clean break!
            }

            if (nonWhiteCount < minNonWhiteCount) {
              minNonWhiteCount = nonWhiteCount;
              bestY = (startY - searchLimit) + y;
            }
          }

          // If the row with the fewest dark pixels has very few dark pixels 
          // (e.g. just a few vertical table borders), it's a safe break point!
          if (minNonWhiteCount < canvasW * 0.05) { 
             return bestY;
          }

          return startY; // Fallback if no clean break is found (e.g. massive images or dark blocks)
        };

        let currentY = 0;
        const marginH = Math.round(canvasW * 0.12); // ~1 inch margin (12% of A4 width)

        while (currentY < canvasH) {
          const isFirstSlice = (currentY === 0);
          
          // First slice already has top padding from docx-preview.
          // Middle/last slices need both top and bottom margins.
          const availableH = isFirstSlice 
            ? (targetPageH - marginH) 
            : (targetPageH - marginH * 2);

          let sliceH = availableH;
          let breakY = currentY + sliceH;
          
          if (breakY < canvasH) {
            breakY = findPageBreak(breakY);
            sliceH = breakY - currentY;
          } else {
            sliceH = canvasH - currentY;
          }

          if (sliceH <= 0) break;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvasW;
          sliceCanvas.height = targetPageH; // Force A4 aspect ratio height
          const sliceCtx = sliceCanvas.getContext('2d');
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, canvasW, targetPageH);

          // Draw slice with appropriate top margin offset
          const destY = isFirstSlice ? 0 : marginH;

          // Draw the slice onto the A4 canvas
          sliceCtx.drawImage(
            canvas,
            0, currentY, canvasW, sliceH,
            0, destY, canvasW, sliceH
          );

          const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);

          if (!isFirstPage) {
            pdf.addPage('a4', 'p');
          }
          isFirstPage = false;

          pdf.addImage(sliceImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

          sliceCanvas.width = 0;
          sliceCanvas.height = 0;

          currentY = breakY;
        }

        canvas.width = 0;
        canvas.height = 0;
      }

      const outputFilename = file?.name ? `${file.name.replace(/\.docx?$/i, '')}_converted.pdf` : 'converted.pdf';
      pdf.save(outputFilename);

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      setSuccessData({
        url: pdfUrl,
        filename: outputFilename,
        title: 'Conversion Complete',
        subtitle: 'Your Word document has been successfully converted to PDF.',
      });
    } catch (err) {
      console.error("Word to PDF Error:", err);
      alert(`Conversion error: ${err.message || 'Failed to process document'}`);
    } finally {
      if (targetContainer && targetContainer.parentNode) {
        targetContainer.parentNode.removeChild(targetContainer);
      }
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setIsLoadingPreview(false);
  };

  const processButton = (
    <button 
      onClick={convertWordToPdf} 
      disabled={isProcessing || !file || isLoadingPreview}
      className="w-full px-4 py-3 bg-blue-600 border border-transparent rounded-xl shadow-md text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden"
    >
      {isProcessing ? 'Converting...' : <><FileText className="w-5 h-5"/> Convert to PDF</>}
    </button>
  );

  const previewNode = (
    <div className="w-full flex flex-col items-center p-2 sm:p-4 bg-slate-100/70 rounded-2xl">
      {isLoadingPreview && (
        <div className="w-full flex items-center justify-center py-8 text-blue-600 text-base font-semibold">
          <FileText className="w-6 h-6 animate-bounce mr-3" /> Rendering Word document...
        </div>
      )}

      {file && (
        <div className="w-full flex flex-col items-center">
          <div className={`w-full flex flex-col items-center ${!isLoadingPreview ? 'flex' : 'hidden'}`}>
            <div 
              ref={docxContainerRef} 
              className="w-full max-w-[900px] overflow-x-auto flex flex-col items-center shadow-lg rounded-xl bg-slate-200/50 p-2 sm:p-6"
            />
          </div>
        </div>
      )}

      {!file && (
        <div className="text-center text-gray-400 py-32 font-medium text-lg">
          Upload a Word document to preview and convert to PDF
        </div>
      )}
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Word to PDF"
      description="Convert your Microsoft Word documents (.docx) into standard PDF format instantly with high fidelity."
      icon={FileText}
      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      customPreviewNode={previewNode}
    />
  );
}










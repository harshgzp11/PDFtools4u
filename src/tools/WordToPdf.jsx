import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as docx from 'docx-preview';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { safeHtml2Canvas } from '../utils/canvasUtils';
import { trackError } from '../lib/analytics';

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const docxContainerRef  = useRef(null);

  useEffect(() => {
    if (window.__sharedFile) {
      if (isDocxFile(window.__sharedFile)) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const isDocxFile = (candidate) => {
    const name = candidate?.name?.toLowerCase() || '';
    return name.endsWith('.docx') || candidate?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  };

  const sanitizeWordHtml = (htmlString) => {
    if (!htmlString) return '<p>No content found in document.</p>';

    let rawHtml = htmlString;
    rawHtml = rawHtml.replace(/\$|&#36;|&dollar;/gi, '');
    rawHtml = rawHtml.replace(/~|&#126;/gi, ' ');

    // Standardize all rogue bullets to a single, easily identifiable character (•)
    let cleanHtml = rawHtml
      .replace(/>(\s|&nbsp;)*[Oo·◦▪◆](\s|&nbsp;)+/g, '>• ')
      .replace(/>(\s|&nbsp;)*[Oo·◦▪◆](?=[0-9])/g, '>• ');

    return cleanHtml;
  };

  const getWordThemeCss = () => `
    <style>
      .docx-pdf-wrapper {
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #000000;
        padding: 40px;
        background: #ffffff;
        box-sizing: border-box;
        width: 100%;
      }
      .docx-pdf-wrapper h1, .docx-pdf-wrapper h2, .docx-pdf-wrapper h3, .docx-pdf-wrapper h4, .docx-pdf-wrapper h5, .docx-pdf-wrapper h6 {
        color: #2F5496; /* Microsoft Word Blue */
        font-weight: bold;
        margin-top: 18pt;
        margin-bottom: 6pt;
        page-break-after: avoid;
      }
      .docx-pdf-wrapper table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 12pt;
        page-break-inside: avoid;
      }
      .docx-pdf-wrapper th, .docx-pdf-wrapper td {
        border: 1px solid #000000;
        padding: 6px;
        text-align: left;
      }
      .docx-pdf-wrapper ul, .docx-pdf-wrapper ol {
        padding-left: 24px;
        margin-top: 0;
        margin-bottom: 12pt;
      }
      .docx-pdf-wrapper li {
        list-style-type: disc;
        list-style-position: outside; /* Enforces the hanging indent */
        margin-bottom: 4px;
      }
      .docx-pdf-wrapper p {
        margin-top: 0;
        margin-bottom: 6pt;
      }
    </style>
  `;

  const wrapWithWordTheme = (htmlContent) => {
    let clean = htmlContent || '';
    // Brute-force global strip of MathJax/KaTeX artifacts
    clean = clean.replace(/\$/g, ''); // Nukes all rogue dollar signs
    clean = clean.replace(/~/g, ' '); // Replaces rogue tildes with standard spaces

    return `
      ${getWordThemeCss()}
      <div class="docx-pdf-wrapper docx-pdf-container">
        ${clean}
      </div>
    `;
  };

  const mammothOptions = {
    styleMap: [
      "p[style-name='List Bullet'] => ul > li:fresh",
      "p[style-name='List Bullet 2'] => ul > li:fresh",
      "p[style-name='List Bullet 3'] => ul > li:fresh"
    ],
    convertImage: mammoth.images.imgElement((image) =>
      image.read('base64').then((imageBuffer) => ({
        src: `data:${image.contentType};base64,${imageBuffer}`
      }))
    )
  };

  const handleFile = async (newFile) => {
    if (!isDocxFile(newFile)) {
      alert("Please upload a modern Word document (.docx). Legacy .doc files are not supported in the browser.");
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
      trackError('Word To Pdf', 'processing_error');
          console.warn("docx-preview parsing notice, attempting mammoth fallback:", docxErr);
        }

        if (!usedDocxPreview) {
          const result = await mammoth.convertToHtml({
            arrayBuffer,
            ...mammothOptions
          });
          const cleaned = sanitizeWordHtml(result.value);
          container.innerHTML = wrapWithWordTheme(cleaned);
        }
      } catch (err) {
      trackError('Word To Pdf', 'processing_error');
        console.error("Document preview error:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 100);
  };

  const convertWordToPdf = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'Word to PDF' });
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();

      const result = await mammoth.convertToHtml({
        arrayBuffer,
        ...mammothOptions
      });

      let rawHtml = result.value || '<p>No content found.</p>';
      rawHtml = rawHtml.replace(/\$|&#36;|&dollar;/gi, '').replace(/~|&#126;/gi, ' ');

      const domParserDiv = document.createElement('div');
      domParserDiv.innerHTML = rawHtml;

      const BULLET_PATTERN = /^(\s|&nbsp;)*[•oO·◦▪◆▫■□–—\u2022\u25aa\u25cf\u25cb\u25a0\u25a1\u2013\u2014](\s|&nbsp;)+/;

      domParserDiv.querySelectorAll('li').forEach(li => {
        const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
          if (node.nodeValue && BULLET_PATTERN.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue.replace(BULLET_PATTERN, '');
            break;
          }
        }
      });

      domParserDiv.querySelectorAll('p').forEach(p => {
        if (!p.closest('li')) {
          const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false);
          let node;
          while ((node = walker.nextNode())) {
            if (node.nodeValue && BULLET_PATTERN.test(node.nodeValue)) {
              node.nodeValue = node.nodeValue.replace(BULLET_PATTERN, '');
              p.style.display = 'list-item';
              p.style.listStyleType = 'disc';
              p.style.listStylePosition = 'outside';
              p.style.marginLeft = '24px';
              p.style.marginBottom = '4pt';
              break;
            }
          }
        }
      });

      const perfectedHtml = domParserDiv.innerHTML;
      const pdfFilename = file.name.replace(/\.docx?$/i, '') + '.pdf';

      const printCss = `
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #ffffff;
            color: #000;
            font-family: 'Calibri', 'Arial', sans-serif;
          }
          .docx-pdf-wrapper {
            width: 100%;
            max-width: 100%;
            padding: 18mm 16mm;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
          }
          .docx-pdf-wrapper h1, .docx-pdf-wrapper h2, .docx-pdf-wrapper h3,
          .docx-pdf-wrapper h4, .docx-pdf-wrapper h5, .docx-pdf-wrapper h6 {
            color: #2F5496;
            font-weight: bold;
            margin-top: 18pt;
            margin-bottom: 6pt;
            page-break-after: avoid;
          }
          .docx-pdf-wrapper table {
            table-layout: fixed;
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12pt;
          }
          .docx-pdf-wrapper th, .docx-pdf-wrapper td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
          }
          .docx-pdf-wrapper tr { page-break-inside: avoid; }
          .docx-pdf-wrapper li { page-break-inside: avoid; list-style-position: outside !important; margin-bottom: 4px; }
          .docx-pdf-wrapper ul, .docx-pdf-wrapper ol { padding-left: 24px; margin-top: 0; margin-bottom: 12pt; }
          .docx-pdf-wrapper ul { list-style-type: disc; }
          .docx-pdf-wrapper ul ul { list-style-type: circle; }
          .docx-pdf-wrapper ul ul ul { list-style-type: square; }
          .docx-pdf-wrapper p { margin-top: 0; margin-bottom: 6pt; }
        </style>
      `;

      const renderTarget = document.createElement('div');
      renderTarget.style.position = 'fixed';
      renderTarget.style.left = '-99999px';
      renderTarget.style.top = '0';
      renderTarget.style.width = '794px';
      renderTarget.style.background = '#ffffff';
      renderTarget.style.zIndex = '0';
      renderTarget.innerHTML = `${printCss}<div class="docx-pdf-wrapper">${perfectedHtml}</div>`;
      document.body.appendChild(renderTarget);

      try {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const canvas = await safeHtml2Canvas(renderTarget, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
          windowHeight: Math.max(renderTarget.scrollHeight, 1123),
          scrollX: 0,
          scrollY: 0,
        });

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - margin * 2;
        const contentHeight = (canvas.height * contentWidth) / canvas.width;
        const pageContentHeight = pageHeight - margin * 2;
        const totalPages = Math.max(1, Math.ceil(contentHeight / pageContentHeight));

        const addCanvasPage = (sourceCanvas, yOffset, pageNumber) => {
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = sourceCanvas.width;
          const sliceHeight = Math.min(pageContentHeight * (sourceCanvas.width / contentWidth), sourceCanvas.height - yOffset);
          pageCanvas.height = sliceHeight;

          const ctx = pageCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            sourceCanvas,
            0,
            yOffset,
            sourceCanvas.width,
            sliceHeight,
            0,
            0,
            sourceCanvas.width,
            sliceHeight
          );

          const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          const renderedSliceHeight = (sliceHeight * contentWidth) / sourceCanvas.width;

          if (pageNumber > 1) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, renderedSliceHeight, undefined, 'FAST');
        };

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          const sourceY = (pageNumber - 1) * pageContentHeight * (canvas.width / contentWidth);
          addCanvasPage(canvas, sourceY, pageNumber);
        }

        const pdfBlob = pdf.output('blob');
        const objectUrl = URL.createObjectURL(pdfBlob);

        setSuccessData({
          originalSize: file.size,
          outputSize: pdfBlob.size,
          url: objectUrl,
          filename: pdfFilename,
          title: 'PDF Ready',
          subtitle: 'Your Word document was converted into a downloadable PDF file.',
        });
      } finally {
        if (renderTarget && renderTarget.parentNode) {
          renderTarget.parentNode.removeChild(renderTarget);
        }
      }

      setIsProcessing(false);
    } catch (err) {
      trackError('Word To Pdf', 'processing_error');
      console.error('Word to PDF Error:', err);
      alert(`Conversion error: ${err.message || 'Failed to process document'}`);
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    if (successData?.url) {
      URL.revokeObjectURL(successData.url);
    }
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
      {isProcessing ? 'Preparing Print Dialog...' : <><FileText className="w-5 h-5"/> Convert to PDF</>}
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
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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










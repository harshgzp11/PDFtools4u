import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as docx from 'docx-preview';
import mammoth from 'mammoth';
import { trackError } from '../lib/analytics';

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const docxContainerRef  = useRef(null);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.name.endsWith('.doc') || window.__sharedFile.name.endsWith('.docx') || window.__sharedFile.type.includes('word')) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

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
      trackError('Word To Pdf', 'processing_error');
          console.warn("docx-preview parsing notice, attempting mammoth fallback:", docxErr);
        }

        if (!usedDocxPreview) {
          const result = await mammoth.convertToHtml({
            arrayBuffer,
            styleMap: [
              "p[style-name='List Bullet'] => ul > li:fresh",
              "p[style-name='List Bullet 2'] => ul > li:fresh",
              "p[style-name='List Bullet 3'] => ul > li:fresh"
            ]
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

      // 1. Initial Word Conversion
      const result = await mammoth.convertToHtml({
        arrayBuffer,
        styleMap: [
          "p[style-name='List Bullet'] => ul > li:fresh",
          "p[style-name='List Bullet 2'] => ul > li:fresh",
          "p[style-name='List Bullet 3'] => ul > li:fresh"
        ]
      });

      let rawHtml = result.value || '<p>No content found.</p>';
      
      // Clean math artifacts
      rawHtml = rawHtml.replace(/\$|&#36;|&dollar;/gi, '').replace(/~|&#126;/gi, ' ');

      // 2. In-Memory DOM Parsing for Perfect Hanging Indents & Bullet Removal
      const domParserDiv = document.createElement('div');
      domParserDiv.innerHTML = rawHtml;

      const BULLET_PATTERN = /^(\s|&nbsp;)*[•oO·◦▪◆▫■□–—\u2022\u25aa\u25cf\u25cb\u25a0\u25a1\u2013\u2014](\s|&nbsp;)+/;

      // Fix Native Lists (Strip literal dots so we don't get double-bullets)
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

      // Fix Fake Lists (Convert manual paragraph bullets into real CSS lists)
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

      // 3. Assemble Final Print Payload
      const printCss = `
        <style>
          @media print {
            /* Restores 20mm standard margins on the physical paper and forces A4 */
            @page { margin: 20mm; size: A4 portrait; }
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          .docx-pdf-wrapper { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000; }
          .docx-pdf-wrapper h1, .docx-pdf-wrapper h2, .docx-pdf-wrapper h3 { color: #2F5496; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; page-break-after: avoid; }
          .docx-pdf-wrapper table { table-layout: fixed; width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
          .docx-pdf-wrapper th, .docx-pdf-wrapper td { border: 1px solid #000; padding: 6px; text-align: left; }
          
          /* Pagination Safeguards: Prevent tables and bullets from slicing across pages */
          .docx-pdf-wrapper tr { page-break-inside: avoid; }
          .docx-pdf-wrapper li { page-break-inside: avoid; list-style-position: outside !important; margin-bottom: 4px; }
          
          /* Native List Styles */
          .docx-pdf-wrapper ul, .docx-pdf-wrapper ol { padding-left: 24px; margin-top: 0; margin-bottom: 12pt; }
          
          /* Visual Nesting Hierarchy */
          .docx-pdf-wrapper ul { list-style-type: disc; }
          .docx-pdf-wrapper ul ul { list-style-type: circle; }
          .docx-pdf-wrapper ul ul ul { list-style-type: square; }
        </style>
      `;

      const finalPayload = `
        ${printCss}
        <div class="docx-pdf-wrapper">
          ${perfectedHtml}
        </div>
      `;

      // 4. Print via Iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(finalPayload);
      iframeDoc.close();

      // 4. Print directly
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Cleanup and show success UI after print dialog interaction
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            document.body.removeChild(iframe);
          }

          setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
            url: null, // No blob URL needed since browser handled local save
            filename: file.name.replace(/\.docx?$/i, '') + '.pdf',
            title: 'Document Ready',
            subtitle: 'Your true-text PDF was successfully generated via the browser print dialog.',
          });

          setIsProcessing(false);
        }, 1000);
      }, 500);

    } catch (err) {
      trackError('Word To Pdf', 'processing_error');
      console.error("Word to PDF Error:", err);
      alert(`Conversion error: ${err.message || 'Failed to process document'}`);
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










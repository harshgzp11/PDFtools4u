import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Printer } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as docx from 'docx-preview';
import mammoth from 'mammoth';
import { convertDocxToPdf } from '../utils/wordConversion';
import { trackError } from '../lib/analytics';

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const docxContainerRef = useRef(null);

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
        color: #2F5496;
        font-weight: bold;
        margin-top: 18pt;
        margin-bottom: 6pt;
      }
      .docx-pdf-wrapper table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 12pt;
      }
      .docx-pdf-wrapper th, .docx-pdf-wrapper td {
        border: 1px solid #d1d5db;
        padding: 6px;
        text-align: left;
      }
      .docx-pdf-wrapper ul, .docx-pdf-wrapper ol {
        padding-left: 24px;
        margin-top: 0;
        margin-bottom: 12pt;
      }
      .docx-pdf-wrapper li {
        margin-bottom: 4px;
      }
      .docx-pdf-wrapper p {
        margin-top: 0;
        margin-bottom: 6pt;
      }
    </style>
  `;

  const wrapWithWordTheme = (htmlContent) => {
    return `
      ${getWordThemeCss()}
      <div class="docx-pdf-wrapper docx-pdf-container">
        ${htmlContent || ''}
      </div>
    `;
  };

  const handleFile = async (newFile) => {
    if (!isDocxFile(newFile)) {
      alert("Please upload a Microsoft Word document (.docx). Only modern .docx files are supported.");
      return;
    }

    setFile(newFile);
    setSuccessData(null);
    setIsLoadingPreview(true);
    setProgress(0);

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
          console.warn("docx-preview notice, attempting mammoth preview fallback:", docxErr);
        }

        if (!usedDocxPreview) {
          const result = await mammoth.convertToHtml({
            arrayBuffer,
          });
          container.innerHTML = wrapWithWordTheme(result.value);
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
    setProgress(0);

    try {
      const pdfBlob = await convertDocxToPdf(file, {
        onProgress: (p) => setProgress(p),
      });

      const pdfFilename = file.name.replace(/\.docx?$/i, '') + '.pdf';
      const objectUrl = URL.createObjectURL(pdfBlob);

      // Trigger automatic download
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = pdfFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessData({
        originalSize: file.size,
        outputSize: pdfBlob.size,
        url: objectUrl,
        filename: pdfFilename,
        title: 'PDF Ready',
        subtitle: 'Your Word document was converted into a crisp vector PDF with selectable text.',
      });
    } catch (err) {
      trackError('Word To Pdf', 'processing_error');
      console.error('Word to PDF Error:', err);
      alert(`Conversion error: ${err.message || 'Failed to process document'}`);
    } finally {
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
    setProgress(0);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const processButton = (
    <div className="space-y-3">
      <button
        onClick={convertWordToPdf}
        disabled={isProcessing || !file || isLoadingPreview}
        className="w-full px-6 py-4 bg-blue-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div
            className="absolute left-0 top-0 bottom-0 bg-blue-500/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 inline-flex items-center justify-center min-w-[200px] h-7 text-sm font-bold whitespace-nowrap">
            Converting to PDF... {progress}%
          </span>
        ) : (
          <><FileText className="w-6 h-6 relative z-10"/> Convert to PDF</>
        )}
      </button>

      {file && !isProcessing && (
        <button
          onClick={handleBrowserPrint}
          className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-slate-300 transition-colors"
          title="Print preview directly using browser's native print-to-PDF engine"
        >
          <Printer className="w-4 h-4" /> Print / Save via Browser
        </button>
      )}
    </div>
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
          Upload a Word document (.docx) to preview and convert to PDF
        </div>
      )}
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Word to PDF"
      description="Convert your Microsoft Word documents (.docx) into standard PDF format with selectable vector text."
      icon={FileText}
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      customPreviewNode={previewNode}
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <p className="text-blue-900 text-sm font-medium flex gap-2 items-start">
            <span className="text-lg">✨</span>
            <span>
              <strong>True Vector Text:</strong> Generated PDFs retain 100% copyable, searchable vector text and structured tables without raster blur.
            </span>
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
          <p className="text-green-800 text-sm font-medium flex gap-2 items-start">
            <span className="text-lg">🔒</span>
            <span>
              <strong>Client-Side Privacy:</strong> Documents are converted securely within your browser without uploading to external servers.
            </span>
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

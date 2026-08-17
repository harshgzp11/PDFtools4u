import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect, useRef } from 'react';
import { ScanText, Download, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';



import { trackError } from '../lib/analytics';



export default function PdfOcr() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const [actualProgress, setActualProgress] = useState({
    action: 'Initializing',
    currentPage: 0,
    totalPages: 0,
    percentage: 0,
    isFinished: false,
    successPayload: null
  });

  const [displayStatus, setDisplayStatus] = useState({
    action: 'Initializing',
    currentPage: 0,
    totalPages: 0,
    percentage: 0
  });

  const pageInfoRef = useRef({ current: 1, total: 1 });
  const [language, setLanguage] = useState('eng');

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type === 'application/pdf') {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  // Progress Ticker for smooth sequential and monotonic progress tracking
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setActualProgress(actual => {
        setDisplayStatus(display => {
          // If the process has finished, let's catch up display progress to 100%
          if (actual.isFinished) {
            if (display.percentage < 100) {
              return {
                action: 'Finalizing',
                currentPage: actual.totalPages,
                totalPages: actual.totalPages,
                percentage: Math.min(display.percentage + 4, 100)
              };
            } else {
              return {
                action: 'Complete',
                currentPage: actual.totalPages,
                totalPages: actual.totalPages,
                percentage: 100
              };
            }
          }

          // If we haven't loaded pages yet, smoothly increment initial percentage up to 10%
          if (actual.totalPages === 0) {
            return {
              action: actual.action,
              currentPage: 0,
              totalPages: 0,
              percentage: Math.min(display.percentage + 1, 10)
            };
          }

          // If display page is behind actual page
          if (display.currentPage < actual.currentPage) {
            const nextPage = display.currentPage + 1;
            const nextPagePct = Math.round(((nextPage - 1) / actual.totalPages) * 100);
            return {
              action: actual.action,
              currentPage: nextPage,
              totalPages: actual.totalPages,
              percentage: Math.max(display.percentage, nextPagePct)
            };
          }

          // If display page is same as actual page, but percentage is behind actual percentage
          if (display.percentage < actual.percentage) {
            return {
              action: actual.action,
              currentPage: display.currentPage,
              totalPages: display.totalPages,
              percentage: Math.min(display.percentage + 1, actual.percentage)
            };
          }

          return {
            ...display,
            action: actual.action
          };
        });
        return actual;
      });
    }, 80); // 80ms tick for fluid fluid sequential increments

    return () => clearInterval(interval);
  }, [isProcessing]);

  // Handle completion side-effects outside of state updaters
  useEffect(() => {
    if (actualProgress.isFinished && displayStatus.percentage === 100) {
      const timer = setTimeout(() => {
        setSuccessData(actualProgress.successPayload);
        setIsProcessing(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [actualProgress.isFinished, displayStatus.percentage, actualProgress.successPayload]);

  const updateProgress = (action, currentPage, totalPages, percentage) => {
    setActualProgress(prev => ({
      ...prev,
      action,
      currentPage: currentPage ?? prev.currentPage,
      totalPages: totalPages ?? prev.totalPages,
      percentage: percentage ?? prev.percentage
    }));
  };

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setActualProgress({
        action: 'Initializing',
        currentPage: 0,
        totalPages: 0,
        percentage: 0,
        isFinished: false,
        successPayload: null
      });
      setDisplayStatus({
        action: 'Initializing',
        currentPage: 0,
        totalPages: 0,
        percentage: 0
      });
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const processOcr = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'PDF OCR Extractor' });
    setIsProcessing(true);
    setActualProgress({
      action: 'Initializing',
      currentPage: 0,
      totalPages: 0,
      percentage: 0,
      isFinished: false,
      successPayload: null
    });
    setDisplayStatus({
      action: 'Initializing',
      currentPage: 0,
      totalPages: 0,
      percentage: 0
    });
    
    let worker = null;
    
    try {
      const { createWorker } = await import('tesseract.js');

      worker = await createWorker(language, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const p = pageInfoRef.current;
            if (p) {
              const overallProgress = Math.round((((p.current - 1) + m.progress) / p.total) * 100);
              updateProgress('Processing', p.current, p.total, overallProgress);
            }
          } else if (m.status === 'loading tesseract core') {
            updateProgress('Loading Core', 0, 0, 2);
          } else if (m.status.includes('loading language')) {
            updateProgress('Downloading Model', 0, 0, 5);
          } else if (m.status === 'initializing api' || m.status === 'initializing tesseract') {
            updateProgress('Initializing', 0, 0, 0);
          }
          // Ignore other intermediate statuses to prevent progress bar from stuttering back to 0
        }
      });

      updateProgress('Reading PDF', 0, 0, 8);
      const arrayBuffer = await file.arrayBuffer();

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
    
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      let fullText = "";
      
      const { PDFDocument } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        pageInfoRef.current = { current: i, total: numPages };
        const startPct = Math.round(((i - 1) / numPages) * 100);
        updateProgress('Extracting', i, numPages, startPct);
        
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 4.4 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        const ret = await worker.recognize(imgDataUrl, { pdfTitle: file.name }, { pdf: true });
        fullText += `--- Page ${i} ---\n${ret.data.text}\n\n`;
        
        if (ret.data.pdf) {
           const pagePdfDoc = await PDFDocument.load(ret.data.pdf);
           const copiedPages = await mergedPdf.copyPages(pagePdfDoc, pagePdfDoc.getPageIndices());
           copiedPages.forEach((p) => mergedPdf.addPage(p));
        }
      }
      
      updateProgress('Finalizing', numPages, numPages, 98);
      await worker.terminate();
      worker = null;
      
      if (!fullText.trim()) {
        alert("OCR failed to detect any text in this document.");
        setIsProcessing(false);
        return;
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setActualProgress(prev => ({
        ...prev,
        action: 'Complete',
        currentPage: numPages,
        totalPages: numPages,
        percentage: 100,
        isFinished: true,
        successPayload: {
          url,
          filename: `${file.name.replace('.pdf', '')}_searchable.pdf`,
          title: 'Searchable PDF Ready!',
          subtitle: 'We successfully made your scanned document searchable. You can now download the new PDF.',
          downloadText: 'Download PDF'
        }
      }));
    } catch (err) {
      trackError('Pdf Ocr', 'processing_error');
      console.error(err);
      alert("Failed to perform OCR on this PDF. Please check the console for details.");
      if (worker) {
        await worker.terminate();
      }
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setActualProgress({
      action: 'Initializing',
      currentPage: 0,
      totalPages: 0,
      percentage: 0,
      isFinished: false,
      successPayload: null
    });
    setDisplayStatus({
      action: 'Initializing',
      currentPage: 0,
      totalPages: 0,
      percentage: 0
    });
  };

  // Build the standardized microcopy
  const statusInfo = (() => {
    const { action, currentPage, totalPages, percentage } = displayStatus;
    let text = `${action}...`;
    if (action === 'Complete') {
      text = 'Complete!';
    } else if (totalPages > 0 && currentPage > 0) {
      text = `${action} Page ${currentPage} of ${totalPages}`;
    }
    return { text, percentage };
  })();

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={processOcr} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-indigo-500/30 transition-all duration-300"
            style={{ width: `${statusInfo.percentage}%` }}
          />
        )}
        {isProcessing ? (
          <div className="relative z-10 flex items-center justify-between w-full max-w-[320px] h-7 text-sm font-bold">
            <span className="truncate pr-4 text-left">{statusInfo.text}</span>
            <span className="whitespace-nowrap shrink-0 text-right">{statusInfo.percentage}%</span>
          </div>
        ) : (
          <><ScanText className="w-6 h-6 relative z-10"/> Apply OCR</>
        )}
      </button>
    </div>
  );

  const renderCustomPreview = ({ thumbnails }) => (
    <div className="w-full h-full flex flex-col items-center gap-8 py-8 px-4 bg-gray-50">
      {thumbnails.map((thumb, idx) => (
        <div key={idx} className="relative w-full max-w-2xl flex flex-col items-center">
          <span className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Page {idx + 1}</span>
          <img 
            src={thumb.dataUrl} 
            alt={`Page ${idx + 1}`} 
            className="w-full h-auto shadow-lg rounded-xl border border-gray-200"
          />
        </div>
      ))}
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF OCR Extractor"
      description="Use Optical Character Recognition to extract text from scanned documents and images inside PDFs."
      icon={ScanText}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      gridMode={true}
      gridQuality={1.0}
      customPreviewNode={file && !successData ? renderCustomPreview : null}
    >
      <div className="space-y-6">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2 border-b border-gray-100 pb-2">OCR PDF Options</h3>
        
        {/* Language Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">Document Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-gray-700 font-medium cursor-pointer"
          >
            <option value="eng">English</option>
            <option value="spa">Spanish</option>
            <option value="fra">French</option>
            <option value="deu">German</option>
            <option value="ita">Italian</option>
            <option value="por">Portuguese</option>
            <option value="nld">Dutch</option>
          </select>
          <p className="text-xs text-gray-500">
            Selecting the correct language significantly improves text recognition accuracy.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm">Important Notice</h4>
          </div>
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            First-time use: Downloading OCR engine (approx. 25MB) which will be cached locally for future use. Processing may be slow on older devices or very large documents.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

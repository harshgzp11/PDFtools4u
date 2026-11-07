import React, { useState, useEffect, useRef } from 'react';
import {
  ScanText, AlertTriangle, XCircle, FileText, AlignLeft,
  Copy, Check, Download, CheckCircle, RotateCcw, ArrowLeft, Share2
} from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import DownloadPageExtras from '../components/ui/DownloadPageExtras';
import { trackEvent, trackError } from '../lib/analytics';
import {
  calculateAdaptiveScale,
  disposeCanvas,
  cleanupPdfDocument,
  createOcrWorker,
  terminateOcrWorker,
  validateOcrFile,
  calculateTextStats
} from '../utils/ocrEngine';
import { normalizeImage } from '../utils/imageNormalization';

export default function PdfOcr() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'pdf' | 'image' | null
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Dual-Pipeline Extracted Text Result Workspace State
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'text'
  const [originalExtractedText, setOriginalExtractedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

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

  // Resource & Lifecycle Tracking Refs
  const objectUrlRef = useRef(null);
  const activeWorkerRef = useRef(null);
  const activeRenderTaskRef = useRef(null);
  const activeCanvasRef = useRef(null);
  const runIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    if (window.__sharedFile) {
      handleFile(window.__sharedFile);
      window.__sharedFile = null;
    }
  }, []);

  // Guaranteed unmount teardown: aborts active tasks, terminates worker, frees GPU textures & blob URLs
  useEffect(() => {
    return () => {
      runIdRef.current++;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (activeRenderTaskRef.current) {
        try { activeRenderTaskRef.current.cancel(); } catch {
          // Ignore cancelled task rejection
        }
        activeRenderTaskRef.current = null;
      }
      if (activeWorkerRef.current) {
        terminateOcrWorker(activeWorkerRef.current);
        activeWorkerRef.current = null;
      }
      if (activeCanvasRef.current) {
        disposeCanvas(activeCanvasRef.current);
        activeCanvasRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Progress Ticker for smooth sequential and monotonic progress tracking
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setActualProgress(actual => {
        setDisplayStatus(display => {
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

          if (actual.totalPages === 0) {
            return {
              action: actual.action,
              currentPage: 0,
              totalPages: 0,
              percentage: Math.min(display.percentage + 1, 10)
            };
          }

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
    }, 80);

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
    if (!newFile) return;

    const validation = await validateOcrFile(newFile);
    if (!validation.valid) {
      toast.error(validation.error || "Please upload a valid PDF or image file (JPG, PNG, WebP).");
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }

    setFile(newFile);
    setFileType(validation.type);
    setSuccessData(null);
    setOriginalExtractedText('');
    setEditedText('');
    setActiveTab('pdf');
    setIsCopied(false);
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

  // Immediate Cancellation Handler
  const handleCancel = async () => {
    if (!isProcessing) return;

    // Invalidate current execution run ID
    runIdRef.current++;

    // Signal abort
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Cancel active PDF.js rendering task
    if (activeRenderTaskRef.current) {
      try {
        activeRenderTaskRef.current.cancel();
      } catch {
        // Ignore cancelled task rejection
      }
      activeRenderTaskRef.current = null;
    }

    // Kill active Tesseract Web Worker immediately (a terminated worker is never reused)
    if (activeWorkerRef.current) {
      await terminateOcrWorker(activeWorkerRef.current);
      activeWorkerRef.current = null;
    }

    // Dispose in-progress canvas
    if (activeCanvasRef.current) {
      disposeCanvas(activeCanvasRef.current);
      activeCanvasRef.current = null;
    }

    // Restore UI to idle configuration state
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setIsProcessing(false);
    setSuccessData(null);
    setOriginalExtractedText('');
    setEditedText('');
    setActiveTab('pdf');
    setIsCopied(false);
    setActualProgress({
      action: 'Cancelled',
      currentPage: 0,
      totalPages: 0,
      percentage: 0,
      isFinished: false,
      successPayload: null
    });
    setDisplayStatus({
      action: 'Cancelled',
      currentPage: 0,
      totalPages: 0,
      percentage: 0
    });

    toast.info("OCR operation cancelled.");
  };

  const processOcr = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'PDF OCR Extractor' });

    // Establish fresh execution run context
    const currentRunId = ++runIdRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
    let pdf = null;
    
    try {
      // 1. Initialize fresh Tesseract worker with runId guard in logger
      worker = await createOcrWorker(language, m => {
        if (runIdRef.current !== currentRunId || abortController.signal.aborted) return;
        
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
      });

      if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
        await terminateOcrWorker(worker);
        return;
      }

      activeWorkerRef.current = worker;

      if (fileType === 'image') {
        // -------------------------------------------------------------
        // IMAGE OCR PIPELINE: Direct Canvas -> Tesseract -> Searchable PDF
        // -------------------------------------------------------------
        updateProgress('Normalizing Image', 1, 1, 10);

        // Normalize EXIF orientation, white background, and clamp oversized dimensions
        const norm = await normalizeImage(file, {
          returnCanvas: true,
          maxDimension: 2400,
          maxPixelArea: 6000000
        });

        if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
          norm.dispose();
          await terminateOcrWorker(worker);
          activeWorkerRef.current = null;
          return;
        }

        activeCanvasRef.current = norm.canvas;
        pageInfoRef.current = { current: 1, total: 1 };
        updateProgress('Extracting', 1, 1, 20);

        // Direct Canvas recognition with searchable PDF output
        const ret = await worker.recognize(
          norm.canvas,
          { pdfTitle: file.name },
          { pdf: true }
        );

        // Deterministic canvas texture disposal immediately after recognition
        norm.dispose();
        activeCanvasRef.current = null;

        if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
          await terminateOcrWorker(worker);
          activeWorkerRef.current = null;
          return;
        }

        const extractedText = (ret.data?.text || '').trim();
        if (!extractedText && !ret.data?.pdf) {
          toast.error("OCR failed to detect any text in this image.");
          setIsProcessing(false);
          await terminateOcrWorker(worker);
          activeWorkerRef.current = null;
          return;
        }

        updateProgress('Finalizing', 1, 1, 98);
        await terminateOcrWorker(worker);
        worker = null;
        activeWorkerRef.current = null;

        const pdfData = ret.data.pdf;
        if (!pdfData || !(pdfData instanceof Uint8Array)) {
          throw new Error("Tesseract failed to generate Searchable PDF data.");
        }

        const blob = new Blob([pdfData], { type: 'application/pdf' });
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setOriginalExtractedText(extractedText);
        setEditedText(extractedText);

        setActualProgress(prev => ({
          ...prev,
          action: 'Complete',
          currentPage: 1,
          totalPages: 1,
          percentage: 100,
          isFinished: true,
          successPayload: {
            url,
            filename: `${baseName}_searchable.pdf`,
            title: 'Searchable PDF Ready!',
            subtitle: 'We successfully converted your image into a searchable, selectable PDF document.',
            downloadText: 'Download PDF',
            text: extractedText,
            baseName: baseName
          }
        }));
      } else {
        // -------------------------------------------------------------
        // PDF OCR PIPELINE: Sequential Page Rendering -> Searchable PDF
        // -------------------------------------------------------------
        updateProgress('Reading PDF', 0, 0, 8);

        const arrayBuffer = await file.arrayBuffer();
        if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
          await terminateOcrWorker(worker);
          activeWorkerRef.current = null;
          return;
        }

        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
      
        pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const numPages = pdf.numPages;

        // Non-blocking warning for large documents
        if (numPages > 20) {
          toast.warning(`Large document detected (${numPages} pages). Processing may take several minutes on this device.`, { duration: 6000 });
        }
        
        let fullText = "";
        const { PDFDocument } = await import('pdf-lib');
        const mergedPdf = await PDFDocument.create();

        for (let i = 1; i <= numPages; i++) {
          // Check cancellation before page processing
          if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
            break;
          }

          pageInfoRef.current = { current: i, total: numPages };
          const startPct = Math.round(((i - 1) / numPages) * 100);
          updateProgress('Extracting', i, numPages, startPct);
          
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1.0 });

          // Adaptive scaling: Target 200 DPI, clamped to max 2400px and 6 Megapixels
          const adaptiveScale = calculateAdaptiveScale(baseViewport.width, baseViewport.height, {
            targetDpi: 200,
            maxDimension: 2400,
            maxPixelArea: 6000000
          });
          const viewport = page.getViewport({ scale: adaptiveScale });
          
          const canvas = document.createElement('canvas');
          activeCanvasRef.current = canvas;
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };

          const renderTask = page.render(renderContext);
          activeRenderTaskRef.current = renderTask;

          try {
            await renderTask.promise;
          } catch (renderErr) {
            if (renderErr?.name === 'RenderingCancelledException' || abortController.signal.aborted) {
              disposeCanvas(canvas);
              activeCanvasRef.current = null;
              break;
            }
            throw renderErr;
          } finally {
            activeRenderTaskRef.current = null;
          }

          if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
            disposeCanvas(canvas);
            activeCanvasRef.current = null;
            break;
          }

          const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          
          // Immediate Canvas Disposal to release GPU backing texture
          disposeCanvas(canvas);
          activeCanvasRef.current = null;

          const ret = await worker.recognize(imgDataUrl, { pdfTitle: file.name }, { pdf: true });
          
          if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
            break;
          }

          fullText += `--- Page ${i} ---\n${ret.data.text}\n\n`;
          
          if (ret.data.pdf) {
            const pagePdfDoc = await PDFDocument.load(ret.data.pdf);
            const copiedPages = await mergedPdf.copyPages(pagePdfDoc, pagePdfDoc.getPageIndices());
            copiedPages.forEach((p) => mergedPdf.addPage(p));
          }

          // Clean up individual page resources if supported
          if (typeof page.cleanup === 'function') {
            page.cleanup();
          }
        }
        
        // Clean up PDF document resources
        await cleanupPdfDocument(pdf);
        pdf = null;

        // Handle abort mid-loop
        if (runIdRef.current !== currentRunId || abortController.signal.aborted) {
          if (worker) {
            await terminateOcrWorker(worker);
            activeWorkerRef.current = null;
          }
          return;
        }

        updateProgress('Finalizing', numPages, numPages, 98);
        await terminateOcrWorker(worker);
        worker = null;
        activeWorkerRef.current = null;
        
        const trimmedFullText = fullText.trim();
        if (!trimmedFullText) {
          toast.error("OCR failed to detect any text in this document.");
          setIsProcessing(false);
          return;
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        // Revoke any previous Object URL before creating a new one
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setOriginalExtractedText(trimmedFullText);
        setEditedText(trimmedFullText);

        setActualProgress(prev => ({
          ...prev,
          action: 'Complete',
          currentPage: numPages,
          totalPages: numPages,
          percentage: 100,
          isFinished: true,
          successPayload: {
            url,
            filename: `${baseName}_searchable.pdf`,
            title: 'Searchable PDF Ready!',
            subtitle: 'We successfully made your scanned document searchable. You can now download the new PDF.',
            downloadText: 'Download PDF',
            text: trimmedFullText,
            baseName: baseName
          }
        }));
      }
    } catch (err) {
      // Intentional cancellations are silent; only real processing errors trigger error state
      if (err?.name === 'RenderingCancelledException' || abortController.signal.aborted || runIdRef.current !== currentRunId) {
        return;
      }
      trackError('Pdf Ocr', 'processing_error');
      console.error(err);
      toast.error("Failed to perform OCR on this file. Please check formatting.");
      setIsProcessing(false);
    } finally {
      if (worker) {
        await terminateOcrWorker(worker);
        activeWorkerRef.current = null;
      }
      if (activeCanvasRef.current) {
        disposeCanvas(activeCanvasRef.current);
        activeCanvasRef.current = null;
      }
      if (pdf) {
        await cleanupPdfDocument(pdf);
      }
    }
  };

  const resetTool = () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setFile(null);
    setFileType(null);
    setSuccessData(null);
    setIsProcessing(false);
    setOriginalExtractedText('');
    setEditedText('');
    setActiveTab('pdf');
    setIsCopied(false);
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

      {/* Visible Cancel Action during active OCR processing */}
      {isProcessing && (
        <button
          onClick={handleCancel}
          type="button"
          className="w-full py-2.5 px-4 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <XCircle className="w-4 h-4" /> Cancel OCR Processing
        </button>
      )}
    </div>
  );

  const renderCustomPreview = ({ thumbnails, previewImage }) => {
    if (fileType === 'image' || (previewImage && (!thumbnails || thumbnails.length === 0))) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 bg-gray-50 overflow-y-auto">
          <div className="relative max-w-2xl w-full flex flex-col items-center">
            <span className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Image Preview</span>
            <img 
              src={previewImage} 
              alt={file?.name || 'Image Preview'} 
              className="max-w-full max-h-[65vh] object-contain shadow-lg rounded-xl border border-gray-200 bg-white"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center gap-8 py-8 px-4 bg-gray-50 overflow-y-auto">
        {(thumbnails || []).map((thumb, idx) => (
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
  };

  const handleCopyText = async () => {
    if (!editedText) {
      toast.info("No text to copy.");
      return;
    }

    let success = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(editedText);
        success = true;
      } catch {
        // Fallback for non-secure context or permission denial
      }
    }

    if (!success && typeof document !== 'undefined') {
      const textArea = document.createElement("textarea");
      textArea.value = editedText;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      try {
        document.body.appendChild(textArea);
        try {
          textArea.focus();
          textArea.select();
          success = document.execCommand('copy') === true;
        } catch {
          success = false;
        }
      } finally {
        if (textArea.parentNode) {
          textArea.parentNode.removeChild(textArea);
        }
      }
    }

    if (success) {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      setIsCopied(true);
      toast.success("Text copied to clipboard!");
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } else {
      toast.error("Failed to copy text. Please select and copy manually.");
    }
  };

  const handleDownloadTxt = () => {
    if (!editedText) {
      toast.info("No text to download.");
      return;
    }

    const baseName = (file?.name || 'document').replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_extracted_text.txt`;
    const blob = new Blob([editedText], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Lifecycle: Revoke temporary download Object URL after dispatch
    setTimeout(() => {
      try {
        URL.revokeObjectURL(downloadUrl);
      } catch {}
    }, 1000);

    trackEvent('file_downloaded', {
      tool_name: 'PDF & Image OCR (TXT)',
      file_type: 'txt',
      file_size_kb: Math.round(blob.size / 1024)
    });
    toast.success("Downloaded text file.");
  };

  const renderResultWorkspace = ({ successData, onReset, handleDownload, handleShare }) => {
    const stats = calculateTextStats(editedText);

    return (
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Dual-Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-4 sm:px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'pdf'
                ? 'bg-white border-blue-600 text-blue-600 shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Searchable PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white border-blue-600 text-blue-600 shadow-sm'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
            <span>Extracted Text</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {stats.words} words
            </span>
          </button>
        </div>

        {/* Tab 1: Searchable PDF Output */}
        {activeTab === 'pdf' && (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[50vh]">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">{successData.title || 'Searchable PDF Ready!'}</h3>
            <p className="text-gray-500 mb-8 text-sm max-w-lg">{successData.subtitle || 'Your file is ready with an embedded, selectable text layer.'}</p>

            {successData.url && (
              <button
                onClick={handleDownload}
                className="mx-auto flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg mb-8 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                {successData.downloadText || 'Download PDF'}
              </button>
            )}

            <DownloadPageExtras />

            <div className="mt-8 pt-6 border-t border-gray-100 w-full flex items-center justify-center gap-4">
              <button onClick={onReset} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium py-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" /> Start over
              </button>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded-md hover:bg-blue-50 transition-colors cursor-pointer">
                <Share2 className="w-3.5 h-3.5" /> Share File
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Extracted Text Editor Workspace */}
        {activeTab === 'text' && (
          <div className="p-6 sm:p-8 flex flex-col text-left">
            {/* Header & Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlignLeft className="w-5 h-5 text-blue-600" />
                  Extracted Text
                </h3>
                <p className="text-xs text-gray-500">Edit, copy, or export the OCR-recognized text below.</p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Copy current edited text to clipboard"
                >
                  {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Download current edited text as a .txt file"
                >
                  <Download className="w-4 h-4" />
                  <span>Download TXT</span>
                </button>
              </div>
            </div>

            {/* Editable Textarea */}
            <div className="relative mb-3">
              <label htmlFor="extracted-ocr-textarea" className="sr-only">Extracted OCR Text</label>
              <textarea
                id="extracted-ocr-textarea"
                aria-label="Extracted OCR Text"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="No text recognized."
                rows={14}
                className="w-full p-4 text-sm font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all leading-relaxed custom-scrollbar resize-y"
              />
            </div>

            {/* Live Statistics & Quick Revert Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500 py-2">
              <div className="flex items-center gap-3 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="text-gray-900 font-bold">{stats.words}</span> words
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-gray-900 font-bold">{stats.characters}</span> characters
                </span>
              </div>

              {editedText !== originalExtractedText && (
                <button
                  type="button"
                  onClick={() => setEditedText(originalExtractedText)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer self-start sm:self-auto"
                  title="Revert all edits back to the initial OCR output"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Original OCR</span>
                </button>
              )}
            </div>

            {/* Bottom Navigation */}
            <div className="mt-6 pt-5 border-t border-gray-100 w-full flex items-center justify-center gap-4">
              <button onClick={onReset} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium py-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" /> Start over
              </button>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded-md hover:bg-blue-50 transition-colors cursor-pointer">
                <Share2 className="w-3.5 h-3.5" /> Share Tool
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <ToolPreviewLayout
      title="PDF & Image OCR Extractor"
      description="Extract text from scanned documents, PDFs, and images (JPG, PNG, WebP) to create searchable PDFs."
      icon={ScanText}
      accept="application/pdf,image/jpeg,image/png,image/webp"
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      gridMode={fileType === 'pdf'}
      gridQuality={1.0}
      customPreviewNode={file && !successData ? renderCustomPreview : null}
      customSuccessNode={successData ? renderResultWorkspace : null}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h3 className="text-xl font-extrabold text-gray-900">OCR Options</h3>
          {file && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-100">
              {fileType === 'image' ? (file.type?.split('/')[1]?.toUpperCase() || 'IMAGE') : 'PDF'}
            </span>
          )}
        </div>
        
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
          <p className="text-yellow-800 text-xs font-medium leading-relaxed mb-2">
            First-time use: Downloading OCR engine (approx. 25MB) which will be cached locally for future use.
          </p>
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            <strong className="font-bold">Privacy Note:</strong> Because this processes locally for your privacy (zero uploads), performance depends entirely on your device's memory. Large files may process slower than server-side alternatives.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

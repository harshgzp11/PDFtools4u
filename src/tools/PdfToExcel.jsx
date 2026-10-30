import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, AlertTriangle, Loader2, Layers, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { convertPdfToExcel } from '../utils/pdfConversion';
import { trackEvent, trackError } from '../lib/analytics';

export default function PdfToExcel() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);

  // Conversion options
  const [outputFormat, setOutputFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [multiSheetMode, setMultiSheetMode] = useState('single'); // 'single' | 'per-page'
  const [isScannedPdfError, setIsScannedPdfError] = useState(false);

  // Resource lifecycle & cancellation tracking
  const conversionIdRef = useRef(0);
  const abortControllerRef = useRef(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    const convIdRef = conversionIdRef;
    const abortCtrlRef = abortControllerRef;
    const objUrlRef = objectUrlRef;
    return () => {
      convIdRef.current++;
      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
      if (objUrlRef.current) {
        URL.revokeObjectURL(objUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (window.__sharedFile) {
      const isPdf =
        window.__sharedFile.type === 'application/pdf' ||
        window.__sharedFile.name?.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (!newFile) return;

    const isPdf =
      newFile.type === 'application/pdf' ||
      newFile.name?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      conversionIdRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
      setIsScannedPdfError(false);
    } else {
      toast.error("Please upload a valid PDF document (.pdf).");
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentConversionId = ++conversionIdRef.current;

    trackEvent('tool_executed', { 
      tool_name: 'PDF to Excel',
      format: outputFormat,
      mode: multiSheetMode 
    });
    setIsProcessing(true);
    setProgress(0);
    setIsScannedPdfError(false);

    try {
      const blob = await convertPdfToExcel(
        file,
        (p) => {
          if (currentConversionId === conversionIdRef.current) {
            setProgress(p);
          }
        },
        {
          format: outputFormat,
          multiSheetMode: multiSheetMode,
          signal: abortController.signal
        }
      );

      if (currentConversionId !== conversionIdRef.current) return;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const ext = outputFormat === 'csv' ? 'csv' : 'xlsx';
      const baseName = file.name.replace(/\.pdf$/i, '');

      setSuccessData({
        originalSize: file.size,
        outputSize: blob.size,
        url,
        filename: `${baseName}.${ext}`,
        title: outputFormat === 'csv' ? 'CSV File Ready!' : 'Excel Spreadsheet Ready!',
        subtitle: outputFormat === 'csv'
          ? 'Your PDF tabular data has been converted to standard CSV format.'
          : 'Your PDF tabular data has been converted to an Excel (.xlsx) file.',
      });
      toast.success("Table extracted successfully!");
    } catch (err) {
      if (err.name === 'AbortError' || currentConversionId !== conversionIdRef.current) {
        return;
      }
      trackError('Pdf To Excel', 'processing_error');
      console.error("PDF to Excel extraction error:", err);
      const errMsg = err.message || "Failed to convert PDF to Excel format.";
      
      if (errMsg.toLowerCase().includes("scanned") || errMsg.toLowerCase().includes("ocr")) {
        setIsScannedPdfError(true);
      }
      toast.error(errMsg);
    } finally {
      if (currentConversionId === conversionIdRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const resetTool = () => {
    conversionIdRef.current++;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
    setIsScannedPdfError(false);
  };

  const navigateToOcr = () => {
    if (file) {
      window.__sharedFile = file;
    }
    window.history.pushState({}, '', '/pdf-ocr');
    window.dispatchEvent(new Event('popstate'));
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={handleConvert} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-green-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-green-500/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 inline-flex items-center justify-center gap-2 min-w-[200px] h-7 text-sm font-bold whitespace-nowrap">
            <Loader2 className="w-5 h-5 animate-spin" />
            Extracting Tables... {progress}%
          </span>
        ) : (
          <><FileSpreadsheet className="w-6 h-6 relative z-10"/> Convert to {outputFormat.toUpperCase()}</>
        )}
      </button>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF to Excel"
      description="Extract tabular data from your PDF into a clean Excel spreadsheet using spatial coordinate mapping."
      icon={FileSpreadsheet}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-5">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Extraction Options</h3>

        {/* Output Format Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Output Format
          </label>
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setOutputFormat('xlsx')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                outputFormat === 'xlsx' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Excel (.xlsx)
            </button>
            <button
              onClick={() => setOutputFormat('csv')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                outputFormat === 'csv' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              CSV (.csv)
            </button>
          </div>
        </div>

        {/* Multi-page Layout Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-green-600" />
            Multi-Page Handling
          </label>
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setMultiSheetMode('single')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                multiSheetMode === 'single' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Continuous Sheet
            </button>
            <button
              onClick={() => setMultiSheetMode('per-page')}
              disabled={outputFormat === 'csv'}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all disabled:opacity-40 ${
                multiSheetMode === 'per-page' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sheet per Page
            </button>
          </div>
          <p className="text-xs text-gray-500 ml-1">
            {multiSheetMode === 'single' 
              ? 'Combines multi-page tables and deduplicates repeated table headers.' 
              : 'Places each PDF page into its own spreadsheet tab (Excel only).'}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col gap-2">
           <div className="flex justify-between text-xs text-green-800 font-bold">
             <span>Engine:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">Coordinate Column Anchoring</span>
           </div>
           <div className="flex justify-between text-xs text-green-800 font-bold">
             <span>Empty Cell Preservation:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">Enabled</span>
           </div>
           <div className="flex justify-between text-xs text-green-800 font-bold">
             <span>Processing:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">100% Client-Side</span>
           </div>
        </div>

        {isScannedPdfError && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <h4 className="font-bold text-sm">Scanned Document Detected</h4>
            </div>
            <p className="text-amber-800 text-xs font-medium leading-relaxed">
              This PDF does not contain selectable vector text (scanned photo or image). Table coordinates cannot be extracted directly without Optical Character Recognition.
            </p>
            <button
              onClick={navigateToOcr}
              className="mt-2 w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              Open in PDF OCR Tool <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </ToolPreviewLayout>
  );
}

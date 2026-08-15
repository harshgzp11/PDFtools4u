import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, AlertTriangle, Loader2 } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { convertPdfToExcel } from '../utils/pdfConversion';
import { trackError } from '../lib/analytics';

export default function PdfToExcel() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type === 'application/pdf') {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'PDF to Excel' });
    setIsProcessing(true);
    setProgress(0);

    try {
      const blob = await convertPdfToExcel(file, setProgress);
      const url = URL.createObjectURL(blob);

      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `${file.name.replace(/\.pdf$/i, '')}.xlsx`,
        title: 'Excel Spreadsheet Ready!',
        subtitle: 'Your PDF tabular data has been converted to an Excel (.xlsx) file.',
      });
    } catch (err) {
      trackError('Pdf To Excel', 'processing_error');
      console.error(err);
      alert(err.message || "Failed to convert PDF to Excel format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
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
            Spatial Mapping... {progress}%
          </span>
        ) : (
          <><FileSpreadsheet className="w-6 h-6 relative z-10"/> Convert to Excel (.xlsx)</>
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
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Conversion Details</h3>
        
        <div className="bg-green-50 p-5 rounded-xl border border-green-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-green-800 font-bold">
             <span>Format:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">Excel (.xlsx)</span>
           </div>
           <div className="flex justify-between text-sm text-green-800 font-bold">
             <span>Processing:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">100% Client-Side</span>
           </div>
           <div className="flex justify-between text-sm text-green-800 font-bold">
             <span>Method:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">X/Y Spatial Mapping</span>
           </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm">Spatial Extraction Notice</h4>
          </div>
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            Tables are extracted using X/Y coordinate spatial mapping on your device. 
            Rows and columns are aligned based on physical text positions. Scanned or image-based PDFs require OCR and cannot be converted purely from vector text coordinates.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { Presentation, CheckCircle2 } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackEvent, trackError } from '../lib/analytics';
import { convertPdfToPpt } from '../utils/pdfConversion';

export default function PdfToPpt() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type === 'application/pdf' || window.__sharedFile.name?.toLowerCase().endsWith('.pdf')) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (newFile && (newFile.type === 'application/pdf' || newFile.name?.toLowerCase().endsWith('.pdf'))) {
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const executePdfToPpt = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'PDF to PowerPoint' });
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const blob = await convertPdfToPpt(file, (p) => setProgress(p));
      const url = URL.createObjectURL(blob);
      const cleanBaseName = file.name.replace(/\.pdf$/i, '');
      
      setSuccessData({
        originalSize: file.size || 0,
        outputSize: blob.size || 0,
        url,
        filename: `${cleanBaseName}_converted.pptx`,
        title: 'Conversion Successful!',
        subtitle: 'Your PDF has been converted into a high-fidelity PowerPoint presentation.',
      });
    } catch (err) {
      trackError('Pdf To Ppt', 'processing_error');
      console.error('PDF to PPT conversion error:', err);
      alert(`Failed to convert PDF to PowerPoint: ${err.message || err}`);
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
        onClick={executePdfToPpt} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-orange-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-orange-600/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 inline-flex items-center justify-center min-w-[220px] h-7 text-sm font-bold whitespace-nowrap">
            Generating Slides... {progress}%
          </span>
        ) : (
          <><Presentation className="w-6 h-6 relative z-10"/> Convert to PowerPoint</>
        )}
      </button>
    </div>
  );

  const renderGridItem = (thumb, idx) => (
    <div key={thumb.id} className="relative aspect-[1/1.4] rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col bg-white">
      <img src={thumb.dataUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-bold">
        {idx + 1}
      </div>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF to PowerPoint"
      description="Convert your PDF into an accurate .pptx presentation."
      icon={Presentation}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      gridMode={true}
      renderGridItem={renderGridItem}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Conversion Details</h3>
        
        <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Format:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Native .PPTX</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Slide Dimensions:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Matched to Source PDF</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Quality:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">High-Res Layout Preservation</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Processing:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
            <span>Exact Visual Preservation</span>
          </div>
          <p className="text-blue-800 text-xs font-medium leading-relaxed">
            Layout, graphics, formulas, and fonts from your PDF are preserved as presentation slides matching your source document's aspect ratio. Slide elements are flattened for 100% visual fidelity.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

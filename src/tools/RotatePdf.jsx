import React, { useState } from 'react';

import { Download, RotateCw, RotateCcw, FileText, CheckCircle, ArrowLeft, Loader2, ListOrdered, Scissors, RefreshCw } from 'lucide-react';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function RotatePdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [globalRotation, setGlobalRotation] = useState(0); 
  const [pageRotations, setPageRotations] = useState({}); // { 'page-0': 90, 'page-1': -90 }
  const [successData, setSuccessData] = useState(null);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setGlobalRotation(0);
      setPageRotations({});
      setThumbnails([]);
      setExtractingThumbs(true);
      
      try {
        const thumbs = await getPdfThumbnails(newFile, 0.5);
        setThumbnails(thumbs);
      } catch (e) {
      trackError('Rotate Pdf', 'processing_error');
        console.error(e);
        alert(`Failed to load PDF: ${e.message}`);
        setFile(null);
      } finally {
        setExtractingThumbs(false);
      }
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setGlobalRotation(0);
    setPageRotations({});
    setThumbnails([]);
  };

  const rotateSinglePage = (id, degrees) => {
    setPageRotations(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + degrees
    }));
  };

  const rotatePdf = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'Rotate PDF pages' });
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument, degrees } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      pages.forEach((page, index) => {
        const currentRotation = page.getRotation().angle;
        const pageSpecificRotation = pageRotations[`page-${index}`] || 0;
        page.setRotation(degrees(currentRotation + globalRotation + pageSpecificRotation));
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `rotated_${file.name}`,
        title: 'PDF Rotated Successfully!',
        subtitle: 'Your document is ready to download.',
        quickActions: (
          <>
            <a 
              href="/pdf-split" 
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/pdf-split");
                window.dispatchEvent(new Event('popstate'));
              }} 
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <Scissors className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-medium text-gray-700">Split PDF</span>
            </a>
            <a 
              href="/number-pages" 
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/number-pages");
                window.dispatchEvent(new Event('popstate'));
              }} 
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <ListOrdered className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-medium text-gray-700">Add Numbers</span>
            </a>
            <a 
              href="/compress-pdf" 
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/compress-pdf");
                window.dispatchEvent(new Event('popstate'));
              }} 
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <RefreshCw className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-medium text-gray-700">Compress</span>
            </a>
          </>
        )
      });
      
    } catch (err) {
      trackError('Rotate Pdf', 'processing_error');
      console.error(err);
      alert("Failed to rotate PDF. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const processButton = (
    <button 
      onClick={rotatePdf} 
      disabled={loading || extractingThumbs}
      className="w-full px-6 py-4 bg-blue-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? (
        <><Loader2 className="w-6 h-6 animate-spin"/> Rotating...</>
      ) : (
        <><RotateCw className="w-6 h-6"/> Rotate PDF Now</>
      )}
    </button>
  );

  const pageCount = thumbnails.length;

  const customPreview = (
    <div className="w-full h-full flex flex-col">
      {extractingThumbs ? (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-blue-500 gap-4">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p className="font-medium animate-pulse">Rendering PDF pages...</p>
        </div>
      ) : (
        <div className={getDynamicGridClass(pageCount) + " w-full pb-8"}>
          {thumbnails.map((thumb) => {
            const idx = thumb.originalIndex;
            const pageRotation = pageRotations[thumb.id] || 0;
            const totalRotation = globalRotation + pageRotation;
            
            return (
              <div 
                key={thumb.id} 
                className="group relative aspect-[1/1.4] rounded-xl shadow-md border-4 border-transparent bg-white overflow-hidden flex items-center justify-center p-2 hover:border-blue-300 transition-colors"
              >
                <img 
                  src={thumb.dataUrl} 
                  alt={`Page ${idx + 1}`} 
                  className="w-full h-full object-contain transition-transform duration-500 pointer-events-none"
                  style={{ transform: `rotate(${totalRotation}deg)` }}
                />
                
                <div className="absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center bg-white/90 border-gray-300 text-gray-700 shadow-sm z-10">
                  {idx + 1}
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
                  <button 
                    onClick={() => rotateSinglePage(thumb.id, -90)}
                    className="p-3 bg-white text-gray-700 rounded-full shadow-lg hover:bg-blue-50 hover:text-blue-600 transition-all hover:scale-110"
                    title="Rotate Left"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => rotateSinglePage(thumb.id, 90)}
                    className="p-3 bg-white text-gray-700 rounded-full shadow-lg hover:bg-blue-50 hover:text-blue-600 transition-all hover:scale-110"
                    title="Rotate Right"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Rotate PDF pages"
      description="Rotate your PDF files the way you need them. You can rotate individual pages or the entire document."
      icon={RotateCw}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      customPreviewNode={customPreview}
    >
      <div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Rotation Settings</h3>
        <p className="text-gray-500 text-sm">Choose how you want to rotate your document.</p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Rotate All Pages</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setGlobalRotation(globalRotation + 90)}
            className="flex flex-col items-center justify-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-gray-700 hover:text-blue-700"
          >
            <RotateCw className="w-6 h-6" />
            <span className="text-sm font-medium">Right</span>
          </button>
          <button 
            onClick={() => setGlobalRotation(globalRotation - 90)}
            className="flex flex-col items-center justify-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-gray-700 hover:text-blue-700"
          >
            <RotateCcw className="w-6 h-6" />
            <span className="text-sm font-medium">Left</span>
          </button>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
         <p className="text-sm text-blue-800 font-medium flex flex-col gap-2">
           <span className="flex items-center gap-2">
             <span className="text-xl leading-none">💡</span> 
             <strong>Pro tip:</strong>
           </span>
           Hover over any individual page on the left to rotate just that specific page!
         </p>
      </div>
    </ToolPreviewLayout>
  );
}

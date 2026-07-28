import React, { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { Download, RotateCw, RotateCcw, FileText, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';

export default function RotatePdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [globalRotation, setGlobalRotation] = useState(0); 
  const [pageRotations, setPageRotations] = useState({}); // { 'page-0': 90, 'page-1': -90 }
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      setGlobalRotation(0);
      setPageRotations({});
      setThumbnails([]);
      setExtractingThumbs(true);
      
      try {
        const thumbs = await getPdfThumbnails(newFile, 0.5);
        setThumbnails(thumbs);
      } catch (e) {
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
    setSuccess(false);
    setOutputUrl(null);
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
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
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
      
      setOutputUrl(url);
      setSuccess(true);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `rotated_${file.name}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to rotate PDF. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const pageCount = thumbnails.length;

  // State 1: Upload Focus
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Rotate PDF pages</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Rotate your PDF files the way you need them. You can even rotate multiple PDFs at once!
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={FileText}
            className="p-20 py-32 bg-blue-50/50 hover:bg-blue-50 border-blue-300 hover:border-blue-400"
          />
        </div>
      </div>
    );
  }

  // State 3: Success Screen
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">PDF has been rotated!</h2>
        <p className="text-lg text-gray-600 mb-10">Your document is ready.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`rotated_${file.name}`}
            className="px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download Rotated PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RotateCw className="w-6 h-6" /> Start Over
          </button>
        </div>
      </div>
    );
  }

  // State 2: Workspace View
  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[70vh] gap-6 animate-in slide-in-from-right-8 duration-500 -mx-6 sm:-mx-8 lg:-mx-8">
      {/* Main Workspace Area (Left) */}
      <div className="flex-1 bg-gray-100 rounded-xl lg:rounded-l-none lg:rounded-r-2xl border-y border-r border-gray-200 p-8 relative shadow-inner overflow-y-auto">
        <button 
          onClick={resetTool} 
          className="absolute top-6 left-6 p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 border border-gray-200 z-10"
          title="Back to upload"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="mt-12">
          {extractingThumbs ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-blue-500 gap-4">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Rendering PDF pages...</p>
            </div>
          ) : (
            <div className={getDynamicGridClass(pageCount)}>
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

                    {/* Hover Actions */}
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
      </div>

      {/* Settings Panel (Right Sidebar) */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white border-l border-gray-200 pb-8 px-6 lg:px-0">
        <div className="p-6 lg:p-8 space-y-8 flex-1">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Rotation Settings</h3>
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
               Hover over any individual page to rotate just that specific page!
             </p>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={rotatePdf} 
            disabled={loading}
            className="w-full px-6 py-5 bg-blue-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Rotating...' : (
              <><RotateCw className="w-6 h-6"/> Rotate PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

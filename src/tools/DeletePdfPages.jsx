import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, Trash2, FileText, CheckCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';

export default function DeletePdfPages() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState(new Set()); // Pages to delete (0-indexed)
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      setSelectedPages(new Set());
      setThumbnails([]);
      setExtractingThumbs(true);
      
      try {
        // We use a lower resolution (scale: 0.5) to keep thumbnail generation blazing fast
        const thumbs = await getPdfThumbnails(newFile, 0.5);
        setThumbnails(thumbs);
      } catch (e) {
        console.error(e);
        alert("Failed to load PDF. It might be encrypted or corrupted.");
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
    setSelectedPages(new Set());
    setThumbnails([]);
  };

  const togglePage = (idx) => {
    const newSet = new Set(selectedPages);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedPages(newSet);
  };

  const deletePages = async () => {
    if (!file || selectedPages.size === 0) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Remove pages in reverse order so indices don't shift
      const pagesToRemove = Array.from(selectedPages).sort((a, b) => b - a);
      for (const idx of pagesToRemove) {
        pdfDoc.removePage(idx);
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `deleted_${file.name}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to delete pages. The file might be encrypted or corrupted.");
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
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Remove pages from PDF</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Remove one or multiple pages from your PDF securely and entirely in your browser.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={FileText}
            className="p-20 py-32 bg-red-50/50 hover:bg-red-50 border-red-300 hover:border-red-400"
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
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">PDF pages removed!</h2>
        <p className="text-lg text-gray-600 mb-10">Your new document is ready.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`deleted_${file.name}`}
            className="px-10 py-5 bg-red-600 text-white rounded-xl font-bold text-xl hover:bg-red-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Start Over
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
            <div className="h-[50vh] flex flex-col items-center justify-center text-red-500 gap-4">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Rendering PDF pages...</p>
            </div>
          ) : (
            <div className={getDynamicGridClass(pageCount)}>
              {thumbnails.map((thumb) => {
                const idx = thumb.originalIndex;
                const isSelected = selectedPages.has(idx);
                return (
                  <div 
                    key={thumb.id} 
                    onClick={() => togglePage(idx)}
                    className={`group relative aspect-[1/1.4] rounded-xl shadow-md border-4 overflow-hidden flex flex-col hover:shadow-xl transition-all cursor-pointer ${
                      isSelected ? 'border-red-500' : 'border-transparent hover:-translate-y-1'
                    }`}
                  >
                    <img 
                      src={thumb.dataUrl} 
                      alt={`Page ${idx + 1}`} 
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isSelected ? 'opacity-30' : 'opacity-100 group-hover:opacity-90'}`} 
                    />
                    
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Trash2 className="w-16 h-16 text-red-500 drop-shadow-md" />
                      </div>
                    )}
                    
                    <div className={`absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center transition-colors shadow-sm ${
                      isSelected ? 'bg-red-500 border-red-600 text-white' : 'bg-white/90 border-gray-300 text-gray-700'
                    }`}>
                      {idx + 1}
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
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Delete Pages</h3>
            <p className="text-gray-500 text-sm">Click on the pages you want to remove from your document.</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-2">
             <div className="flex justify-between text-sm text-red-800 font-bold">
               <span>Pages to delete:</span>
               <span>{selectedPages.size}</span>
             </div>
             <div className="flex justify-between text-sm text-gray-600 font-medium">
               <span>Remaining pages:</span>
               <span>{pageCount - selectedPages.size}</span>
             </div>
          </div>

          <div className="space-y-3">
             <p className="text-sm text-gray-600 font-medium">How to use:</p>
             <p className="text-xs text-gray-500 leading-relaxed">Simply click on any page in the grid to mark it for deletion. A red trash icon will appear over deleted pages. Once you're ready, click the button below to generate your new PDF.</p>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={deletePages} 
            disabled={loading || selectedPages.size === 0 || selectedPages.size === pageCount}
            className="w-full px-6 py-5 bg-red-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Processing...' : (
              <><Trash2 className="w-6 h-6"/> Remove pages</>
            )}
          </button>
          {selectedPages.size === pageCount && pageCount > 0 && (
            <p className="text-xs text-red-500 text-center mt-3 font-medium">You cannot delete all pages.</p>
          )}
        </div>
      </div>
    </div>
  );
}

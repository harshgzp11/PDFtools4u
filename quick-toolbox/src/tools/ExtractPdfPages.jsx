import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, FileUp, FileText, CheckCircle, ArrowLeft, RefreshCw, Layers, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';

export default function ExtractPdfPages() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState(new Set()); // Pages to extract (0-indexed)
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

  const selectAll = () => {
    const all = new Set(Array.from({ length: thumbnails.length }, (_, i) => i));
    setSelectedPages(all);
  };

  const extractPages = async () => {
    if (!file || selectedPages.size === 0) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdfDoc = await PDFDocument.create();
      
      // Extract pages in the order they were in the original document
      const pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToExtract);
      
      for (const page of copiedPages) {
        newPdfDoc.addPage(page);
      }
      
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `extracted_${file.name}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to extract pages. The file might be encrypted or corrupted.");
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
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Extract PDF pages</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get a new document containing only the specific pages you need.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={FileText}
            className="p-20 py-32 bg-purple-50/50 hover:bg-purple-50 border-purple-300 hover:border-purple-400"
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
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Pages Extracted!</h2>
        <p className="text-lg text-gray-600 mb-10">Your new document is ready.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`extracted_${file.name}`}
            className="px-10 py-5 bg-purple-600 text-white rounded-xl font-bold text-xl hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
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
        
        <div className="absolute top-6 right-8 z-10">
           <button 
             onClick={selectAll}
             className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
           >
             Select All
           </button>
        </div>
        
        <div className="mt-12">
          {extractingThumbs ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-purple-500 gap-4">
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
                      isSelected ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:-translate-y-1'
                    }`}
                  >
                    <img 
                      src={thumb.dataUrl} 
                      alt={`Page ${idx + 1}`} 
                      className="w-full h-full object-cover transition-opacity duration-300 opacity-100 group-hover:opacity-90"
                    />
                    
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-purple-500/10">
                        <CheckCircle className="w-16 h-16 text-purple-500 drop-shadow-md" />
                      </div>
                    )}
                    
                    <div className={`absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center transition-colors shadow-sm ${
                      isSelected ? 'bg-purple-500 border-purple-600 text-white' : 'bg-white/90 border-gray-300 text-gray-700'
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
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Extract Pages</h3>
            <p className="text-gray-500 text-sm">Select the pages you want to extract into a new PDF.</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col gap-2">
             <div className="flex justify-between text-sm text-purple-800 font-bold">
               <span>Selected pages:</span>
               <span className="bg-purple-200 px-2 py-0.5 rounded-md">{selectedPages.size}</span>
             </div>
             <div className="flex justify-between text-sm text-gray-600 font-medium">
               <span>Total pages:</span>
               <span>{pageCount}</span>
             </div>
          </div>

          <div className="space-y-3">
             <p className="text-sm text-gray-600 font-medium">How to use:</p>
             <p className="text-xs text-gray-500 leading-relaxed">Click on the pages in the grid that you wish to extract. They will be highlighted in purple. When you click extract, a new document containing only those pages will be generated.</p>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={extractPages} 
            disabled={loading || selectedPages.size === 0}
            className="w-full px-6 py-5 bg-purple-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Processing...' : (
              <><FileUp className="w-6 h-6"/> Extract Pages</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

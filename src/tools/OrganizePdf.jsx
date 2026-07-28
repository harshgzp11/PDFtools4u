import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, Files, FileText, CheckCircle, ArrowLeft, RefreshCw, GripHorizontal, Trash2, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';

export default function OrganizePdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagesOrder, setPagesOrder] = useState([]); // Array of { id, originalIndex, dataUrl }
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [extractingThumbs, setExtractingThumbs] = useState(false);
  
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      setExtractingThumbs(true);
      
      try {
        const thumbs = await getPdfThumbnails(newFile, 0.5);
        setPagesOrder(thumbs);
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
    setPagesOrder([]);
  };

  // Drag and Drop handlers
  const onDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    // For Firefox compatibility
    e.dataTransfer.setData("text/html", e.target.parentNode);
    
    // Set a transparent drag image to not obscure UI, but let native HTML5 drag run
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDragOver = (e, index) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedIdx === null || draggedIdx === index) return;
    
    // Reorder the array dynamically
    const newOrder = [...pagesOrder];
    const draggedItem = newOrder[draggedIdx];
    
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setPagesOrder(newOrder);
  };

  const onDragEnd = () => {
    setDraggedIdx(null);
  };

  const removePage = (id) => {
    setPagesOrder(pagesOrder.filter(p => p.id !== id));
  };

  const sortOriginal = () => {
    const sorted = [...pagesOrder].sort((a, b) => a.originalIndex - b.originalIndex);
    setPagesOrder(sorted);
  };

  const organizePdf = async () => {
    if (!file || pagesOrder.length === 0) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdfDoc = await PDFDocument.create();
      
      const indicesToExtract = pagesOrder.map(p => p.originalIndex);
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, indicesToExtract);
      
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
      link.download = `organized_${file.name}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to organize PDF. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  // State 1: Upload Focus
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Organize PDF</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sort, add and delete PDF pages. Drag and drop the page thumbnails to reorder them perfectly.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={Files}
            className="p-20 py-32 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-300 hover:border-indigo-400"
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
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">PDF Reorganized!</h2>
        <p className="text-lg text-gray-600 mb-10">Your perfectly ordered document is ready.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`organized_${file.name}`}
            className="px-10 py-5 bg-indigo-600 text-white rounded-xl font-bold text-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
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
             onClick={sortOriginal}
             className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
           >
             Sort Originally
           </button>
        </div>
        
        <div className="mt-12">
          {extractingThumbs ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-indigo-500 gap-4">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Rendering PDF pages...</p>
            </div>
          ) : pagesOrder.length > 0 ? (
            <div className={getDynamicGridClass(pagesOrder.length)} onDragOver={(e) => e.preventDefault()}>
              {pagesOrder.map((page, index) => {
                const isDragging = draggedIdx === index;
                
                return (
                  <div 
                    key={page.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragEnd={onDragEnd}
                    className={`group relative aspect-[1/1.4] rounded-xl shadow-md border-4 overflow-hidden flex flex-col transition-all cursor-grab active:cursor-grabbing bg-white ${
                      isDragging ? 'opacity-50 border-indigo-500 scale-95 shadow-inner' : 'border-transparent hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1'
                    }`}
                  >
                    <img 
                      src={page.dataUrl} 
                      alt={`Page ${page.originalIndex + 1}`} 
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Drag Handle Top Banner - Hidden by default, shows on hover */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/50 to-transparent flex items-start justify-center pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripHorizontal className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                      title="Remove page"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                    
                    <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-indigo-500/90 text-xs font-bold text-white w-8 h-8 flex items-center justify-center shadow-md border border-indigo-400">
                      {index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <p>No pages left to organize.</p>
              <button onClick={() => setFile(null)} className="mt-4 text-indigo-600 underline">Start over</button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel (Right Sidebar) */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white border-l border-gray-200 pb-8 px-6 lg:px-0">
        <div className="p-6 lg:p-8 space-y-8 flex-1">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Organize Pages</h3>
            <p className="text-gray-500 text-sm">Sort and delete pages exactly how you want them.</p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-2">
             <div className="flex justify-between text-sm text-indigo-800 font-bold">
               <span>Total pages:</span>
               <span className="bg-indigo-200 px-2 py-0.5 rounded-md">{pagesOrder.length}</span>
             </div>
          </div>

          <div className="space-y-3">
             <p className="text-sm text-gray-600 font-medium">How to use:</p>
             <p className="text-xs text-gray-500 leading-relaxed">
               Click and drag any page to move it to a new position. You can also hover over a page and click the trash icon to remove it entirely from the final document.
             </p>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={organizePdf} 
            disabled={loading || pagesOrder.length === 0}
            className="w-full px-6 py-5 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Processing...' : (
              <><Files className="w-6 h-6"/> Organize</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

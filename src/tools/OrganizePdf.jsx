import { trackEvent } from '../lib/analytics';
import React, { useState, useRef } from 'react';

import { Files, GripHorizontal, Trash2, RotateCw, Plus, FilePlus, RefreshCcw, FileText } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';
import { toast } from 'sonner';
import { trackError } from '../lib/analytics';

export default function OrganizePdf() {
  const [files, setFiles] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [pagesOrder, setPagesOrder] = useState([]); 
  const [successData, setSuccessData] = useState(null);
  
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFile = async (newFile) => {
    if (!newFile || newFile.type !== 'application/pdf') {
      toast.error("Please upload a valid PDF file.");
      return;
    }
    
    trackEvent('tool_executed', { tool_name: 'Organize PDF' });
    setLoading(true);
    try {
      const fileIndex = files.length;
      setFiles(prev => [...prev, newFile]);
      setSuccessData(null);
      
      const thumbs = await getPdfThumbnails(newFile, 1.0); 
      
      const newPages = thumbs.map(thumb => ({
        id: `file${fileIndex}-page${thumb.originalIndex}-${Date.now()}`,
        fileIndex,
        originalIndex: thumb.originalIndex,
        dataUrl: thumb.dataUrl,
        rotation: 0,
        isBlank: false
      }));
      
      setPagesOrder(prev => [...prev, ...newPages]);
    } catch (err) {
      trackError('Organize Pdf', 'processing_error');
      console.error(err);
      toast.error("Failed to parse PDF file.");
    } finally {
      setLoading(false);
    }
  };

  const revertToOriginal = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      let newPages = [];
      for (let i = 0; i < files.length; i++) {
        const thumbs = await getPdfThumbnails(files[i], 1.0);
        newPages = [...newPages, ...thumbs.map(t => ({
          id: `file${i}-page${t.originalIndex}-${Date.now()}`,
          fileIndex: i,
          originalIndex: t.originalIndex,
          dataUrl: t.dataUrl,
          rotation: 0,
          isBlank: false
        }))];
      }
      setPagesOrder(newPages);
      toast.success("Workspace reset to original state.");
    } catch (e) {
      trackError('Organize Pdf', 'processing_error');
      console.error(e);
      toast.error("Failed to reset workspace.");
    }
    setLoading(false);
  };

  const resetTool = () => {
    setFiles([]);
    setPagesOrder([]);
    setSuccessData(null);
  };

  const onDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index); // required for Firefox
    
    // Transparent ghost image
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDragOver = (e, index) => {
    e.preventDefault(); 
    if (draggedIdx === null || draggedIdx === index) return;
    setDragOverIdx(index);
  };
  
  const onDrop = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    
    const newOrder = [...pagesOrder];
    const draggedItem = newOrder[draggedIdx];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setPagesOrder(newOrder);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const onDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const removePage = (id) => {
    setPagesOrder(pagesOrder.filter(p => p.id !== id));
  };
  
  const rotatePage = (id) => {
    setPagesOrder(pagesOrder.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };
  
  const insertBlankAfter = (index) => {
    const newOrder = [...pagesOrder];
    newOrder.splice(index + 1, 0, {
      id: `blank-${Date.now()}`,
      isBlank: true,
      rotation: 0
    });
    setPagesOrder(newOrder);
  };

  const organizePdf = async () => {
    if (files.length === 0 || pagesOrder.length === 0) return;
    setLoading(true);
    
    try {
      const loadedPdfs = await Promise.all(
        files.map(async f => {
          const ab = await f.arrayBuffer();
      const { PDFDocument, degrees } = await import('pdf-lib');

          return await PDFDocument.load(ab);
        })
      );
      
      const newPdfDoc = await PDFDocument.create();
      
      for (const pageInfo of pagesOrder) {
        if (pageInfo.isBlank) {
          newPdfDoc.addPage([595.28, 841.89]); // A4 Size
        } else {
          const sourceDoc = loadedPdfs[pageInfo.fileIndex];
          const [copiedPage] = await newPdfDoc.copyPages(sourceDoc, [pageInfo.originalIndex]);
          
          if (pageInfo.rotation !== 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRotation + pageInfo.rotation));
          }
          
          newPdfDoc.addPage(copiedPage);
        }
      }
      
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `organized_${files[0].name}`,
        title: 'PDF Organized Successfully!',
        subtitle: 'Your customized document is ready to download.',
      });
    } catch (err) {
      trackError('Organize Pdf', 'processing_error');
      console.error(err);
      toast.error("Failed to organize PDF. A file might be corrupted or encrypted.");
    } finally {
      setLoading(false);
    }
  };

  const customPreviewNode = (
    <div className="w-full flex flex-col pt-4 pb-8">
      {pagesOrder.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 w-full px-2" onDragOver={(e) => e.preventDefault()}>
          {pagesOrder.map((page, index) => {
            const isDragging = draggedIdx === index;
            const isDragOver = dragOverIdx === index && draggedIdx !== index;
            
            return (
              <div 
                key={page.id} 
                draggable
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDrop={(e) => onDrop(e, index)}
                onDragEnd={onDragEnd}
                className={`group animate-in zoom-in-95 duration-300 relative aspect-[1/1.4] rounded-xl shadow-sm border overflow-visible flex flex-col transition-all cursor-grab active:cursor-grabbing bg-white ${
                  isDragging ? 'opacity-40 border-dashed border-gray-400 scale-95 shadow-none' : 
                  isDragOver ? (draggedIdx < index ? 'shadow-[6px_0_0_0_#4f46e5] -translate-x-1 border-gray-200 z-10' : 'shadow-[-6px_0_0_0_#4f46e5] translate-x-1 border-gray-200 z-10') : 
                  'border-gray-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 pointer-events-none">
                  {page.isBlank ? (
                    <div className="flex items-center justify-center text-gray-400 w-full h-full border border-dashed border-gray-300 m-2 rounded-lg bg-white">
                       <span className="font-bold text-sm tracking-wide uppercase">Blank</span>
                    </div>
                  ) : (
                    <img 
                      src={page.dataUrl} 
                      alt={`Page ${index + 1}`} 
                      className="w-full h-full object-contain pointer-events-none rounded-lg bg-white"
                      style={{ transform: `rotate(${page.rotation}deg)`, transition: 'transform 0.3s ease' }}
                    />
                  )}
                </div>

                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none z-10"></div>

                {/* Toolbar (Centered inside card) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-gray-900/95 text-white rounded-xl p-1.5 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-2xl z-20 pointer-events-auto">
                   <button onClick={(e) => { e.stopPropagation(); rotatePage(page.id); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Rotate 90°">
                     <RotateCw className="w-4 h-4" />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); insertBlankAfter(index); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Insert blank page after">
                     <Plus className="w-4 h-4" />
                   </button>
                   <div className="w-px h-5 bg-white/30 mx-1"></div>
                   <button onClick={(e) => { e.stopPropagation(); removePage(page.id); }} className="p-2 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors" title="Remove page">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
                
                {/* Drag Handle Indicator */}
                <div className="absolute bottom-3 left-3 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md pointer-events-none z-20">
                  <GripHorizontal className="w-4 h-4" />
                </div>
                
                <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-indigo-600 text-xs font-bold text-white w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white z-10 pointer-events-none">
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 mt-20">
          <p>No pages in the workspace.</p>
          <button onClick={() => fileInputRef.current?.click()} className="mt-4 text-indigo-600 underline font-medium">Add a PDF file</button>
        </div>
      )}
    </div>
  );

  const processButton = (
    <button 
      onClick={organizePdf} 
      disabled={loading || pagesOrder.length === 0}
      className="w-full px-6 py-4 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? 'Processing...' : (
        <><Files className="w-6 h-6"/> Organize PDF</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Organize PDF"
      description="Merge, sort, rotate, and delete PDF pages. Drag and drop the page thumbnails to reorder them perfectly."
      icon={Files}
      file={files.length > 0 ? files[0] : null}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      customPreviewNode={customPreviewNode}
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Organize Pages</h3>
          <p className="text-gray-500 text-sm">Sort and edit pages exactly how you want them.</p>
        </div>
        
        {/* Workspace Files List */}
        {files.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
             <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Workspace Files</p>
             <ul className="space-y-1.5 max-h-32 overflow-y-auto">
               {files.map((f, i) => (
                 <li key={i} className="text-sm text-gray-700 truncate font-medium flex items-center gap-2">
                   <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" /> {f.name}
                 </li>
               ))}
             </ul>
          </div>
        )}

        {/* Page Count Badge */}
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-2">
           <div className="flex justify-between text-sm text-indigo-900 font-bold">
             <span>Total Pages:</span>
             <span className="bg-indigo-200 text-indigo-900 px-2.5 py-0.5 rounded-md shadow-sm">{pagesOrder.length}</span>
           </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 bg-white border border-gray-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <FilePlus className="w-5 h-5" /> Add File
          </button>
          
          <button 
            onClick={revertToOriginal}
            disabled={loading || pagesOrder.length === 0}
            className="flex-1 py-3 bg-white border border-gray-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCcw className="w-5 h-5" /> Reset All
          </button>
        </div>

        {/* Hidden file input for "Add File" */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="application/pdf" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
              e.target.value = '';
            }
          }} 
        />

        <div className="space-y-3 pt-2">
           <p className="text-sm text-gray-700 font-bold">How to use:</p>
           <ul className="text-xs text-gray-500 leading-relaxed list-disc pl-4 space-y-1">
             <li>Drag and drop pages to reorder them.</li>
             <li>Hover over a page to rotate, delete, or insert a blank page.</li>
             <li>Click "Add File" to merge more PDFs into this workspace.</li>
           </ul>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

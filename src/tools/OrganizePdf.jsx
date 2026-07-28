import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Files, GripHorizontal, Trash2 } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';

export default function OrganizePdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagesOrder, setPagesOrder] = useState([]); // Array of { id, originalIndex, dataUrl }
  const [successData, setSuccessData] = useState(null);
  
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setPagesOrder([]);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
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
      
      setSuccessData({
        url,
        filename: `organized_${file.name}`,
        title: 'PDF Reorganized!',
        subtitle: 'Your perfectly ordered document is ready to download.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to organize PDF. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const customPreviewNode = (
    <div className="w-full h-full flex flex-col pt-4">
      {pagesOrder.length > 0 ? (
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

                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/50 to-transparent flex items-start justify-center pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripHorizontal className="w-5 h-5 text-white drop-shadow-md" />
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
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
        <div className="h-full flex flex-col items-center justify-center text-gray-500 mt-20">
          <p>No pages left to organize.</p>
          <button onClick={() => setFile(null)} className="mt-4 text-indigo-600 underline">Start over</button>
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
      description="Sort, add and delete PDF pages. Drag and drop the page thumbnails to reorder them perfectly."
      icon={Files}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      customPreviewNode={customPreviewNode}
    >
      {/* We bypass default gridMode because we need to manage our own pagesOrder array */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Organize Pages</h3>
          <p className="text-gray-500 text-sm">Sort and delete pages exactly how you want them.</p>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-2">
           <div className="flex justify-between text-sm text-indigo-800 font-bold">
             <span>Total pages:</span>
             <span className="bg-indigo-200 px-2 py-0.5 rounded-md">{pagesOrder.length}</span>
           </div>
        </div>

        <button 
          onClick={sortOriginal}
          className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Sort Originally
        </button>

        <div className="space-y-3 pt-2">
           <p className="text-sm text-gray-600 font-medium">How to use:</p>
           <p className="text-xs text-gray-500 leading-relaxed">
             Click and drag any page to move it to a new position. You can also hover over a page and click the trash icon to remove it entirely from the final document.
           </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

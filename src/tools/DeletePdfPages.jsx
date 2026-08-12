import React, { useState } from 'react';

import { Download, Trash2, FileText } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function DeletePdfPages() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState(new Set()); // Pages to delete (0-indexed)
  const [successData, setSuccessData] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setSelectedPages(new Set());
      try {
        const arrayBuffer = await newFile.arrayBuffer();
      const { PDFDocument } = await import('pdf-lib');

        const pdf = await PDFDocument.load(arrayBuffer);
        setPageCount(pdf.getPageCount());
      } catch (e) {
      trackError('Delete Pdf Pages', 'processing_error');
        console.error(e);
      }
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setSelectedPages(new Set());
    setPageCount(0);
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
    const all = new Set(Array.from({ length: pageCount }, (_, i) => i));
    setSelectedPages(all);
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
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `deleted_${file.name}`,
        title: 'PDF pages removed!',
        subtitle: 'Your new document is ready to download.',
      });
    } catch (err) {
      trackError('Delete Pdf Pages', 'processing_error');
      console.error(err);
      alert("Failed to delete pages. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const renderGridItem = (thumb, idx) => {
    const isSelected = selectedPages.has(idx);
    return (
      <div 
        key={thumb.id} 
        onClick={() => togglePage(idx)}
        className={`group relative aspect-[1/1.4] rounded-xl shadow-md border-4 overflow-hidden flex flex-col hover:shadow-xl transition-all cursor-pointer ${
          isSelected ? 'border-red-500 bg-red-50' : 'border-transparent hover:-translate-y-1 bg-white'
        }`}
      >
        <img 
          src={thumb.dataUrl} 
          alt={`Page ${idx + 1}`} 
          className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${isSelected ? 'opacity-30' : 'opacity-100 group-hover:opacity-90'}`} 
        />
        
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={deletePages} 
        disabled={loading || selectedPages.size === 0 || selectedPages.size === pageCount}
        className="w-full px-6 py-4 bg-red-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
      >
        {loading ? 'Processing...' : (
          <><Trash2 className="w-6 h-6"/> Remove {selectedPages.size} pages</>
        )}
      </button>
      {selectedPages.size === pageCount && pageCount > 0 && (
        <p className="text-xs text-red-500 text-center font-medium">You cannot delete all pages.</p>
      )}
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Remove pages from PDF"
      description="Remove one or multiple pages from your PDF securely and entirely in your browser."
      icon={Trash2}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      gridMode={true}
      renderGridItem={renderGridItem}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Delete Pages</h3>
        <p className="text-gray-500 text-sm">Click on the pages you want to remove from your document.</p>
      </div>
      
      <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-2">
         <div className="flex justify-between text-sm text-red-800 font-bold">
           <span>Pages to delete:</span>
           <span className="bg-red-200 px-2 py-0.5 rounded-md">{selectedPages.size}</span>
         </div>
         <div className="flex justify-between text-sm text-gray-600 font-medium">
           <span>Remaining pages:</span>
           <span>{pageCount - selectedPages.size}</span>
         </div>
      </div>

      <div className="space-y-3">
         <p className="text-sm text-gray-600 font-bold">How to use:</p>
         <p className="text-sm text-gray-500 leading-relaxed">Simply click on any page in the grid on the left to mark it for deletion. A red trash icon will appear over deleted pages. Once you're ready, click the button below to generate your new PDF.</p>
      </div>
    </ToolPreviewLayout>
  );
}

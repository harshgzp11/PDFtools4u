import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, FileUp, CheckCircle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function ExtractPdfPages() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState(new Set()); // Pages to extract (0-indexed)
  const [successData, setSuccessData] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setSelectedPages(new Set());
      try {
        const arrayBuffer = await newFile.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        setPageCount(pdf.getPageCount());
      } catch (e) {
      trackError('Extract Pdf Pages', 'processing_error');
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

  const extractPages = async () => {
    if (!file || selectedPages.size === 0) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdfDoc = await PDFDocument.create();
      
      const pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToExtract);
      
      for (const page of copiedPages) {
        newPdfDoc.addPage(page);
      }
      
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `extracted_${file.name}`,
        title: 'Pages Extracted Successfully!',
        subtitle: 'Your new document is ready to download.',
      });
    } catch (err) {
      trackError('Extract Pdf Pages', 'processing_error');
      console.error(err);
      alert("Failed to extract pages. The file might be encrypted or corrupted.");
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
          isSelected ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:-translate-y-1 bg-white'
        }`}
      >
        <img 
          src={thumb.dataUrl} 
          alt={`Page ${idx + 1}`} 
          className="w-full h-full object-cover transition-opacity duration-300 opacity-100 group-hover:opacity-90 pointer-events-none"
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
  };

  const processButton = (
    <button 
      onClick={extractPages} 
      disabled={loading || selectedPages.size === 0}
      className="w-full px-6 py-4 bg-purple-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? 'Processing...' : (
        <><FileUp className="w-6 h-6"/> Extract {selectedPages.size} Pages</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Extract PDF pages"
      description="Get a new document containing only the specific pages you need by clicking on them."
      icon={FileUp}
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
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-gray-900">Extract Pages</h3>
          <button 
            onClick={selectAll}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            Select All
          </button>
        </div>
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
         <p className="text-sm text-gray-600 font-bold">How to use:</p>
         <p className="text-sm text-gray-500 leading-relaxed">Click on the pages in the grid on the left that you wish to extract. They will be highlighted in purple. When you click extract, a new document containing only those pages will be generated.</p>
      </div>
    </ToolPreviewLayout>
  );
}

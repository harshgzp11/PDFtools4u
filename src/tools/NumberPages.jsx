import React, { useState } from 'react';
import { Hash, Download, Settings, RefreshCw, FileText, Loader2, ListOrdered, Scissors } from 'lucide-react';

import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function NumberPages() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  // Options
  const [startNumber, setStartNumber] = useState(1);
  const [position, setPosition] = useState('bottom-center');

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument, rgb } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const pageNumber = startNumber + idx;
        const text = String(pageNumber);
        
        const fontSize = 12;
        let x = 0;
        let y = 0;
        const textWidth = fontSize * 0.6 * text.length; 

        switch (position) {
          case 'bottom-center': x = width / 2 - textWidth / 2; y = 30; break;
          case 'bottom-right': x = width - 40 - textWidth; y = 30; break;
          case 'bottom-left': x = 40; y = 30; break;
          case 'top-center': x = width / 2 - textWidth / 2; y = height - 40; break;
          case 'top-right': x = width - 40 - textWidth; y = height - 40; break;
          case 'top-left': x = 40; y = height - 40; break;
          default: x = width / 2 - textWidth / 2; y = 30;
        }

        page.drawText(text, { x, y, size: fontSize, color: rgb(0, 0, 0) });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `numbered_${file.name}`,
        title: 'Pages Numbered Successfully!',
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
    } catch (error) {
      trackError('Number Pages', 'processing_error');
      console.error('Error adding page numbers:', error);
      alert('Failed to process the PDF. It might be encrypted or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSuccessData(null);
    setStartNumber(1);
    setPosition('bottom-center');
  };

  const processButton = (
    <button
      onClick={handleProcess}
      disabled={isProcessing}
      className="w-full py-4 bg-blue-600 text-white rounded-xl font-extrabold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-200 disabled:opacity-50"
    >
      {isProcessing ? (
        <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
      ) : (
        <><Hash className="w-6 h-6" /> Add Page Numbers</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Number Pages"
      description="Add page numbers to your PDF file locally. No server uploads."
      icon={Hash}
      file={file}
      onFileSelect={(f) => { setFile(f); setSuccessData(null); }}
      onReset={handleReset}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-6">
        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" /> Numbering Options
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Starting Page Number</label>
            <input 
              type="number" 
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Position</label>
            <select 
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 outline-none"
            >
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="top-left">Top Left</option>
              <option value="top-center">Top Center</option>
              <option value="top-right">Top Right</option>
            </select>
          </div>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

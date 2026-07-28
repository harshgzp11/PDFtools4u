import React, { useState } from 'react';
import { Hash, Download, Settings, RefreshCw, FileText } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import DragDropZone from '../components/ui/DragDropZone';
import AdSlot from '../components/ui/AdSlot';
import ExportActions from '../components/ui/ExportActions';

export default function NumberPages() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBytes, setPdfBytes] = useState(null);
  
  // Options
  const [startNumber, setStartNumber] = useState(1);
  const [position, setPosition] = useState('bottom-center');

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const pageNumber = startNumber + idx;
        const text = String(pageNumber);
        
        // Typical size
        const fontSize = 12;
        
        let x = 0;
        let y = 0;
        
        // Approximate text width
        const textWidth = fontSize * 0.6 * text.length; 

        // Position logic
        switch (position) {
          case 'bottom-center':
            x = width / 2 - textWidth / 2;
            y = 30;
            break;
          case 'bottom-right':
            x = width - 40 - textWidth;
            y = 30;
            break;
          case 'bottom-left':
            x = 40;
            y = 30;
            break;
          case 'top-center':
            x = width / 2 - textWidth / 2;
            y = height - 40;
            break;
          case 'top-right':
            x = width - 40 - textWidth;
            y = height - 40;
            break;
          case 'top-left':
            x = 40;
            y = height - 40;
            break;
          default:
            x = width / 2 - textWidth / 2;
            y = 30;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
      });

      const bytes = await pdfDoc.save();
      setPdfBytes(bytes);
    } catch (error) {
      console.error('Error adding page numbers:', error);
      alert('Failed to process the PDF. It might be encrypted or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
    setStartNumber(1);
    setPosition('bottom-center');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Number Pages</h2>
        <p className="text-xl text-gray-500">
          Add page numbers to your PDF file locally. No server uploads.
        </p>
      </div>

      {!file && (
        <DragDropZone 
          accept="application/pdf"
          onFileSelect={setFile}
          label="Select a PDF to number"
          icon={Hash}
          className="p-16 py-24"
        />
      )}

      {file && !pdfBytes && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{file.name}</h3>
              <p className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" /> Numbering Options
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Starting Page Number</label>
                <input 
                  type="number" 
                  min="1"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select 
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900"
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

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Hash className="w-5 h-5" />}
              {isProcessing ? 'Processing...' : 'Add Page Numbers'}
            </button>
          </div>
        </div>
      )}

      {pdfBytes && (
        <ExportActions 
          pdfBytes={pdfBytes}
          fileName={`numbered_${file?.name || 'document.pdf'}`}
          onReset={handleReset}
        />
      )}

      <div className="mt-12">
        <AdSlot />
      </div>
    </div>
  );
}

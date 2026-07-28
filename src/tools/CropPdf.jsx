import React, { useState } from 'react';
import { Crop, FileText, RefreshCw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import DragDropZone from '../components/ui/DragDropZone';
import ExportActions from '../components/ui/ExportActions';
import AdSlot from '../components/ui/AdSlot';

export default function CropPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBytes, setPdfBytes] = useState(null);

  // Margins in points (1 pt = 1/72 inch)
  const [marginTop, setMarginTop] = useState(36); // 0.5 inch default
  const [marginBottom, setMarginBottom] = useState(36);
  const [marginLeft, setMarginLeft] = useState(36);
  const [marginRight, setMarginRight] = useState(36);

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        // Calculate new crop box
        // Origin (0,0) is bottom-left in PDF coordinate system
        const cropX = marginLeft;
        const cropY = marginBottom;
        const cropWidth = width - marginLeft - marginRight;
        const cropHeight = height - marginTop - marginBottom;

        // Ensure we don't crop more than the page size
        if (cropWidth > 0 && cropHeight > 0) {
          page.setCropBox(cropX, cropY, cropWidth, cropHeight);
        }
      });

      const newPdfBytes = await pdfDoc.save();
      setPdfBytes(newPdfBytes);
    } catch (error) {
      console.error('Error cropping PDF:', error);
      alert('Failed to crop the PDF. It might be encrypted or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Crop PDF</h2>
        <p className="text-xl text-gray-500">
          Trim margins and remove white space from your PDF documents.
        </p>
      </div>

      {!file && (
        <DragDropZone 
          accept="application/pdf"
          onFileSelect={setFile}
          label="Select a PDF to crop"
          icon={Crop}
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
            <h4 className="text-lg font-bold text-gray-900">Specify Crop Margins (in points)</h4>
            <p className="text-sm text-gray-500">Note: 72 points = 1 inch. Enter the amount to trim from each edge.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Top</label>
                <input 
                  type="number" 
                  min="0"
                  value={marginTop}
                  onChange={(e) => setMarginTop(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bottom</label>
                <input 
                  type="number" 
                  min="0"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Left</label>
                <input 
                  type="number" 
                  min="0"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Right</label>
                <input 
                  type="number" 
                  min="0"
                  value={marginRight}
                  onChange={(e) => setMarginRight(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
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
              {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Crop className="w-5 h-5" />}
              {isProcessing ? 'Processing...' : 'Crop PDF'}
            </button>
          </div>
        </div>
      )}

      {pdfBytes && (
        <ExportActions 
          pdfBytes={pdfBytes}
          fileName={`cropped_${file?.name || 'document.pdf'}`}
          onReset={handleReset}
        />
      )}

      <div className="mt-12">
        <AdSlot />
      </div>
    </div>
  );
}

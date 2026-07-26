import React, { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { Download } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function PdfWatermark() {
  const [file, setFile] = useState(null);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [loading, setLoading] = useState(false);

  const handleFile = (selectedFile) => {
    if (selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    }
  };

  const addWatermark = async () => {
    if (!file || !watermarkText) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        // Very basic centered diagonal watermark
        page.drawText(watermarkText, {
          x: width / 4,
          y: height / 4,
          size: 60,
          color: rgb(0.8, 0.1, 0.1),
          opacity: opacity,
          rotate: degrees(45),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermarked_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to add watermark.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Watermark</h2>
        <p className="text-gray-500">Stamp text across all pages of your PDF document.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Select PDF</label>
          <DragDropZone 
            accept="application/pdf"
            onFileSelect={handleFile}
            label="Drag & drop your PDF here"
          />
        </div>
        
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-800">Watermark Settings</h3>
            {file ? (
              <div className="text-sm text-gray-600">Selected: <span className="font-semibold">{file.name}</span></div>
            ) : (
              <div className="text-sm text-gray-400">No file selected</div>
            )}
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Watermark Text</label>
              <input 
                type="text" 
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL"
                disabled={!file}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Opacity ({Math.round(opacity * 100)}%)</label>
              <input 
                type="range" 
                min="0.1" max="1" step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                disabled={!file}
                className="w-full accent-red-500"
              />
            </div>
          </div>
          
          <button 
            onClick={addWatermark} 
            disabled={!file || !watermarkText || loading}
            className="w-full px-6 py-3 bg-red-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : (
              <><Download className="w-5 h-5"/> Download Watermarked PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

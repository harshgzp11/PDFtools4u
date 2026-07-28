import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function PdfSplitter() {
  const [file, setFile] = useState(null);
  const [pageRange, setPageRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);

  const handleFile = async (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') return;
    setFile(selectedFile);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setPdfInfo({ pages: pdf.getPageCount() });
      setPageRange(`1-${pdf.getPageCount()}`);
    } catch (err) {
      alert("Could not read PDF info.");
    }
  };

  const splitPdf = async () => {
    if (!file || !pageRange) return;
    setLoading(true);
    
    try {
      // Parse range like "1,3,5-7"
      const indicesToKeep = new Set();
      const parts = pageRange.split(',');
      
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n.trim()));
          for (let i = start; i <= end; i++) {
            indicesToKeep.add(i - 1); // 0-indexed
          }
        } else {
          indicesToKeep.add(parseInt(part.trim()) - 1);
        }
      }

      const validIndices = Array.from(indicesToKeep)
        .filter(i => !isNaN(i) && i >= 0 && i < pdfInfo.pages)
        .sort((a, b) => a - b);

      if (validIndices.length === 0) throw new Error("No valid pages selected.");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, validIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `extracted_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to split PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Split / Extract Pages</h2>
        <p className="text-gray-500">Extract specific pages from a PDF to create a new document.</p>
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
            <h3 className="font-medium text-gray-800">Extraction Settings</h3>
            {file ? (
              <div className="text-sm text-gray-600">
                Selected: <span className="font-semibold">{file.name}</span> ({pdfInfo?.pages} pages)
              </div>
            ) : (
              <div className="text-sm text-gray-400">No file selected</div>
            )}
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pages to Extract</label>
              <input 
                type="text" 
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1, 3, 5-10"
                disabled={!file}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated pages or ranges (e.g. 1,3,5-7)</p>
            </div>
          </div>
          
          <button 
            onClick={splitPdf} 
            disabled={!file || !pageRange || loading}
            className="w-full px-6 py-3 bg-indigo-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : (
              <><Download className="w-5 h-5"/> Download Extracted PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

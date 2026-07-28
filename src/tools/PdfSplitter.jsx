import React, { useState, useMemo } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, FileText, CheckCircle, SplitSquareVertical, RefreshCw } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';

export default function PdfSplitter() {
  const [file, setFile] = useState(null);
  const [pageRange, setPageRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const handleFile = async (selectedFile) => {
    if (selectedFile?.type !== 'application/pdf') return;
    setFile(selectedFile);
    setSuccessData(null);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setPdfInfo({ pages: pdf.getPageCount() });
      setPageRange(`1-${pdf.getPageCount()}`);
    } catch (err) {
      alert("Could not read PDF info.");
    }
  };

  const resetTool = () => {
    setFile(null);
    setPageRange('');
    setPdfInfo(null);
    setSuccessData(null);
  };

  // Parse page range to set of 0-indexed valid indices
  const validIndices = useMemo(() => {
    if (!pdfInfo) return new Set();
    const indices = new Set();
    const parts = pageRange.split(',');
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            indices.add(i - 1);
          }
        }
      } else {
        const num = parseInt(part.trim());
        if (!isNaN(num)) indices.add(num - 1);
      }
    }

    // Filter valid indices within bounds
    return new Set(
      Array.from(indices).filter(i => i >= 0 && i < pdfInfo.pages)
    );
  }, [pageRange, pdfInfo]);

  const splitPdf = async () => {
    if (!file || validIndices.size === 0) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      
      const newPdf = await PDFDocument.create();
      const sortedIndices = Array.from(validIndices).sort((a, b) => a - b);
      const copiedPages = await newPdf.copyPages(pdf, sortedIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        url,
        filename: `split_${file.name}`,
        title: 'PDF Split Successfully!',
        subtitle: 'Your new document is ready to download.',
      });
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to split PDF.");
    } finally {
      setLoading(false);
    }
  };

  const renderGridItem = (thumb, idx) => {
    const isSelected = validIndices.has(idx);
    
    return (
      <div 
        key={thumb.id}
        className={`relative aspect-[1/1.4] rounded-xl shadow-md border-4 overflow-hidden flex flex-col transition-all ${
          isSelected ? 'border-indigo-500 bg-indigo-50 opacity-100' : 'border-transparent bg-white opacity-40 grayscale'
        }`}
      >
        <img 
          src={thumb.dataUrl} 
          alt={`Page ${idx + 1}`} 
          className="w-full h-full object-cover pointer-events-none"
        />
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-indigo-500/10">
            <CheckCircle className="w-12 h-12 text-indigo-500 drop-shadow-md" />
          </div>
        )}
        <div className={`absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center shadow-sm ${
          isSelected ? 'bg-indigo-500 border-indigo-600 text-white' : 'bg-white/90 border-gray-300 text-gray-700'
        }`}>
          {idx + 1}
        </div>
      </div>
    );
  };

  const processButton = (
    <button 
      onClick={splitPdf} 
      disabled={loading || validIndices.size === 0}
      className="w-full px-6 py-4 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-medium text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? 'Processing...' : (
        <><Download className="w-6 h-6"/> Extract {validIndices.size} Pages</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Split PDF"
      description="Extract specific pages from a PDF to create a new document using a page range."
      icon={SplitSquareVertical}
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
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Extraction Settings</h3>
        
        <div className="p-5 border border-indigo-100 bg-indigo-50 rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Pages to Extract</label>
            <input 
              type="text" 
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. 1, 3, 5-10"
              className="w-full border border-gray-300 rounded-lg shadow-sm px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-indigo-700 font-medium mt-2">
              Comma-separated pages or ranges (e.g. 1,3,5-7). The preview will highlight the pages that match your range.
            </p>
          </div>
        </div>

        <div className="flex justify-between text-sm font-bold text-gray-600 mt-2 px-2">
          <span>Pages selected:</span>
          <span className="text-indigo-600">{validIndices.size} / {pdfInfo?.pages || 0}</span>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

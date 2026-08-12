import React, { useState, useMemo } from 'react';

import { Download, SplitSquareVertical, CheckCircle, FileOutput, GripHorizontal, File } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function PdfSplitter() {
  const [file, setFile] = useState(null);
  const [splitMode, setSplitMode] = useState('ranges'); // 'ranges' or 'single'
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
      const { PDFDocument } = await import('pdf-lib');

      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPageCount();
      setPdfInfo({ pages });
      setPageRange(`1-${Math.min(3, pages)}, ${Math.min(4, pages)}-${pages}`);
    } catch (err) {
      trackError('Pdf Splitter', 'processing_error');
      alert("Could not read PDF info.");
    }
  };

  const resetTool = () => {
    setFile(null);
    setPageRange('');
    setPdfInfo(null);
    setSuccessData(null);
  };

  const parseRanges = (rangeString) => {
    if (!pdfInfo) return [];
    const ranges = [];
    const parts = rangeString.split(',');
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && start > 0 && end <= pdfInfo.pages && start <= end) {
          ranges.push({ start, end, label: `${start}-${end}` });
        }
      } else {
        const num = parseInt(part.trim());
        if (!isNaN(num) && num > 0 && num <= pdfInfo.pages) {
          ranges.push({ start: num, end: num, label: `${num}` });
        }
      }
    }
    return ranges;
  };

  // For the grid preview highlight
  const validIndices = useMemo(() => {
    if (splitMode === 'single' && pdfInfo) {
      return new Set(Array.from({ length: pdfInfo.pages }, (_, i) => i));
    }
    
    const indices = new Set();
    const ranges = parseRanges(pageRange);
    ranges.forEach(r => {
      for (let i = r.start; i <= r.end; i++) indices.add(i - 1);
    });
    return indices;
  }, [pageRange, pdfInfo, splitMode]);

  const splitPdf = async () => {
    if (!file || (splitMode === 'ranges' && parseRanges(pageRange).length === 0)) return;
    setLoading(true);
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const folderName = `${file.name.replace('.pdf', '')}_split`;
      const folder = zip.folder(folderName);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const numPages = pdf.getPageCount();

      if (splitMode === 'single') {
        for (let i = 1; i <= numPages; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdf, [i - 1]);
          newPdf.addPage(copiedPage);
          const pdfBytes = await newPdf.save();
          folder.file(`page_${i}.pdf`, pdfBytes);
        }
      } else {
        const ranges = parseRanges(pageRange);
        for (let idx = 0; idx < ranges.length; idx++) {
          const range = ranges[idx];
          const newPdf = await PDFDocument.create();
          const indices = [];
          for (let i = range.start; i <= range.end; i++) {
            indices.push(i - 1);
          }
          const copiedPages = await newPdf.copyPages(pdf, indices);
          copiedPages.forEach(p => newPdf.addPage(p));
          const pdfBytes = await newPdf.save();
          
          const filename = range.start === range.end 
            ? `part${idx+1}_page_${range.start}.pdf` 
            : `part${idx+1}_pages_${range.start}-${range.end}.pdf`;
            
          folder.file(filename, pdfBytes);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `${folderName}.zip`,
        title: 'PDF Split Successfully!',
        subtitle: `Your split PDFs are packaged in a ZIP file.`,
      });
    } catch (err) {
      trackError('Pdf Splitter', 'processing_error');
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
      disabled={loading || (splitMode === 'ranges' && validIndices.size === 0)}
      className="w-full px-6 py-4 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-medium text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? 'Processing...' : (
        <><Download className="w-6 h-6"/> Split PDF to ZIP</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Split PDF"
      description="Divide a PDF into multiple smaller PDF files by defining ranges or splitting every page."
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
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Split Mode</h3>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button 
            onClick={() => setSplitMode('ranges')}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-colors ${
              splitMode === 'ranges' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <GripHorizontal className="w-6 h-6 mb-2" />
            <span className="font-bold text-sm">Custom Ranges</span>
          </button>
          
          <button 
            onClick={() => setSplitMode('single')}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-colors ${
              splitMode === 'single' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileOutput className="w-6 h-6 mb-2" />
            <span className="font-bold text-sm">Single Pages</span>
          </button>
        </div>

        {splitMode === 'ranges' && (
          <div className="p-5 border border-indigo-100 bg-indigo-50 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Define Ranges</label>
              <input 
                type="text" 
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1-3, 4-5"
                className="w-full border border-gray-300 rounded-lg shadow-sm px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <p className="text-xs text-indigo-700 font-medium mt-2">
                Comma-separate to create multiple PDF files. For example, "1-3, 4-5" generates two PDF files inside the ZIP.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-medium text-gray-600 mt-2">
          <div className="flex items-center gap-2">
            <File className="w-4 h-4" />
            <span>Output Files:</span>
          </div>
          <span className="text-indigo-600 font-bold bg-indigo-100 px-2 py-0.5 rounded-full">
            {splitMode === 'single' ? (pdfInfo?.pages || 0) : parseRanges(pageRange).length} PDFs
          </span>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

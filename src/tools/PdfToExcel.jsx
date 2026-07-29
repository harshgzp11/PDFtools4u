import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, AlertTriangle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToExcel() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type === 'application/pdf') {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const convertPdfToCsv = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      let csvText = "";
      let hasText = false;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Simple heuristic: Try to group items by Y-coordinate to form rows
        // Then sort by X-coordinate to form columns
        const items = textContent.items;
        if (items.length === 0) continue;

        hasText = true;

        // Group by Y (with some tolerance)
        const rows = [];
        const TOLERANCE = 5;
        
        items.forEach(item => {
          const y = item.transform[5];
          let foundRow = rows.find(r => Math.abs(r.y - y) < TOLERANCE);
          if (!foundRow) {
            foundRow = { y, items: [] };
            rows.push(foundRow);
          }
          foundRow.items.push(item);
        });
        
        // Sort rows top to bottom
        rows.sort((a, b) => b.y - a.y);
        
        rows.forEach(row => {
          // Sort items in row left to right
          row.items.sort((a, b) => a.transform[4] - b.transform[4]);
          
          const rowText = row.items.map(item => {
            let str = item.str.replace(/"/g, '""'); // escape quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str}"`;
            }
            return str;
          }).join(',');
          
          csvText += rowText + '\n';
        });
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      if (!hasText || !csvText.trim()) {
        alert("No tabular text could be extracted. The PDF might be a scanned image or composed of vectors.");
        setIsProcessing(false);
        return;
      }

      // Add UTF-8 BOM for Excel compatibility
      const blob = new Blob(['\uFEFF' + csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        url,
        filename: `${file.name.replace('.pdf', '')}.csv`,
        title: 'Spreadsheet Ready!',
        subtitle: 'Your PDF tabular data has been exported.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to convert PDF to Excel format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={convertPdfToCsv} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-green-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-green-500/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10">Analyzing... {progress}%</span>
        ) : (
          <><FileSpreadsheet className="w-6 h-6 relative z-10"/> Convert to Excel (CSV)</>
        )}
      </button>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF to Excel"
      description="Extract tabular data from your PDF into a CSV spreadsheet."
      icon={FileSpreadsheet}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Conversion Details</h3>
        
        <div className="bg-green-50 p-5 rounded-xl border border-green-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-green-800 font-bold">
             <span>Format:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">CSV</span>
           </div>
           <div className="flex justify-between text-sm text-green-800 font-bold">
             <span>Processing:</span>
             <span className="bg-green-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm">Important Notice</h4>
          </div>
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            Perfectly preserving complex PDF tables in the browser is technically impossible. 
            We generate a CSV file containing all text grouped by rows. You may need to manually format the columns when opening in Excel.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

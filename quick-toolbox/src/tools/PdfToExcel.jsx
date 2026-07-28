import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Loader2, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToExcel() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
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
      convertPdfToCsv(newFile);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const convertPdfToCsv = async (pdfFile) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      let csvText = "";
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Simple heuristic: Try to group items by Y-coordinate to form rows
        // Then sort by X-coordinate to form columns
        const items = textContent.items;
        if (items.length === 0) continue;

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
      
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to convert PDF to Excel format.");
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setIsProcessing(false);
    setProgress(0);
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">PDF to Excel</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Extract tabular data from your PDF into a CSV spreadsheet.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept=".pdf,application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF Document"
            icon={FileSpreadsheet}
            className="p-20 py-32 bg-green-50/50 hover:bg-green-100 border-green-300 hover:border-green-400"
          />
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-green-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Analyzing Data...</h2>
        <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Spreadsheet Ready!</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-8 max-w-lg flex flex-col items-center text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
          <h3 className="text-lg font-bold text-yellow-900 mb-2">Important Notice</h3>
          <p className="text-yellow-800 text-sm">
            Perfectly preserving complex PDF tables in the browser is technically impossible. 
            We have generated a <strong>.CSV file</strong> containing all text grouped by rows. 
            You may need to manually format the columns when opening in Excel.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`${file.name.replace('.pdf', '')}.csv`}
            className="px-10 py-5 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download .CSV
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Convert Another
          </button>
        </div>
      </div>
    );
  }

  return null;
}

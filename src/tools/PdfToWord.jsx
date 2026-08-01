import React, { useState, useEffect } from 'react';
import { FileCode2, Download } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { convertPdfToDocx } from '../utils/pdfConversion';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToWord() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [docxMode, setDocxMode] = useState('editable');

  const [previewText, setPreviewText] = useState("");

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type === 'application/pdf') {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  useEffect(() => {
    if (file && docxMode === 'editable') {
      const extractPreview = async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          
          let fullText = "";
          const maxPages = pdf.numPages; // Extract all pages for preview
          
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const items = textContent.items;
            let pageText = "";
            if (items.length > 0) {
              const rows = [];
              items.forEach(item => {
                const y = item.transform[5];
                let foundRow = rows.find(r => Math.abs(r.y - y) < 5);
                if (!foundRow) {
                  foundRow = { y, items: [] };
                  rows.push(foundRow);
                }
                foundRow.items.push(item);
              });
              rows.sort((a, b) => b.y - a.y);
              rows.forEach(row => {
                row.items.sort((a, b) => a.transform[4] - b.transform[4]);
                pageText += row.items.map(item => item.str).join(' ').trim() + "\n";
              });
            }
            
            if (pageText) {
               fullText += `--- Page ${i} ---\n\n` + pageText + "\n\n";
            }
          }
          
          setPreviewText(fullText.trim() || "No text detected on the first few pages.");
        } catch (err) {
          console.error(err);
        }
      };
      extractPreview();
    }
  }, [file, docxMode]);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
      setPreviewText("");
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
    setPreviewText("");
  };

  const convertPdfToWord = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      const blob = await convertPdfToDocx(file, docxMode, setProgress);
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        url,
        filename: `${file.name.replace('.pdf', '')}.docx`,
        title: 'Word Document Ready!',
        subtitle: 'Your PDF has been converted successfully.',
      });
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to convert PDF to Word. Note: Complex layouts might not be perfectly preserved client-side.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={convertPdfToWord} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-blue-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-blue-500/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 inline-flex items-center justify-center min-w-[200px] h-7 text-sm font-bold whitespace-nowrap">Converting... {progress}%</span>
        ) : (
          <><FileCode2 className="w-6 h-6 relative z-10"/> Convert to Word</>
        )}
      </button>
    </div>
  );

  const customPreview = docxMode === 'editable' ? (
    <div className="w-full min-h-full p-8 bg-white text-left font-serif text-gray-800 text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap">
      {previewText ? previewText : (
         <div className="animate-pulse space-y-4 pt-4">
           <div className="h-4 bg-gray-200 rounded w-1/2"></div>
           <div className="h-4 bg-gray-200 rounded w-full"></div>
           <div className="h-4 bg-gray-200 rounded w-3/4"></div>
           <div className="h-4 bg-gray-200 rounded w-full"></div>
           <div className="h-4 bg-gray-200 rounded w-5/6"></div>
         </div>
      )}
    </div>
  ) : undefined;

  return (
    <ToolPreviewLayout
      title="PDF to Word"
      description="Extract all text from your PDF into an editable Microsoft Word document."
      icon={FileCode2}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      customPreviewNode={customPreview}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Export Mode</h3>
        
        <div className="flex flex-col gap-3 mb-6">
          <label className={`flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-colors ${docxMode === 'editable' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name="docxMode" value="editable" checked={docxMode === 'editable'} onChange={() => setDocxMode('editable')} className="mt-1 w-4 h-4 text-blue-600" />
            <div>
              <div className="font-bold text-gray-900">Editable Text</div>
              <div className="text-sm text-gray-600 mt-1 leading-relaxed">Extracts selectable text and headings. Ideal for re-writing or editing content.</div>
            </div>
          </label>

          <label className={`flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-colors ${docxMode === 'visual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name="docxMode" value="visual" checked={docxMode === 'visual'} onChange={() => setDocxMode('visual')} className="mt-1 w-4 h-4 text-blue-600" />
            <div>
              <div className="font-bold text-gray-900">Visual Layout (Exact Copy)</div>
              <div className="text-sm text-gray-600 mt-1 leading-relaxed">Preserves original fonts, tables, and multi-column designs as high-res images inside Word.</div>
            </div>
          </label>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4">
          <p className="text-green-800 text-sm font-medium flex gap-2 items-start">
            <span className="text-lg">🔒</span>
            <span>
              <strong>100% Private & Local Processing:</strong> Your files never leave your device. Because we process everything securely inside your browser without external servers, complex PDF tables in "Editable Text" mode are extracted as plain structured text.
            </span>
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

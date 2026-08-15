import React, { useState, useEffect } from 'react';
import { FileCode2 } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';


import { convertPdfToDocx } from '../utils/pdfConversion';


export default function PdfToWord() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [exportMode, setExportMode] = useState('text');

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
    if (file) {
      const extractPreview = async () => {
        try {
          let arrayBuffer;
          try {
            arrayBuffer = await file.arrayBuffer();
          } catch {
            arrayBuffer = await new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.onerror = () => rej(new Error("File read error"));
              r.readAsArrayBuffer(file);
            });
          }

          if (!arrayBuffer || arrayBuffer.byteLength === 0) return;
          
          const bufferCopy = arrayBuffer.slice(0);
          let pdf;
          try {

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
    
            pdf = await pdfjsLib.getDocument({
              data: new Uint8Array(bufferCopy),
              cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
              cMapPacked: true,
            }).promise;
          } catch {
            pdf = await pdfjsLib.getDocument({
              data: new Uint8Array(bufferCopy),
            }).promise;
          }
          
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
          
          setPreviewText(fullText.trim() || "No text detected. Scanned image pages will be converted into high-resolution pages in Word.");
        } catch (err) {
      trackError('Pdf To Word', 'processing_error');
          console.error("Preview extraction notice:", err);
        }
      };
      extractPreview();
    }
  }, [file]);

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
    trackEvent('tool_executed', { tool_name: 'PDF to Word' });
    setIsProcessing(true);
    setProgress(0);
    try {
      const blob = await convertPdfToDocx(file, exportMode, setProgress);
      const outputFilename = file?.name ? `${file.name.replace(/\.pdf$/i, '')}_converted.docx` : 'converted.docx';
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = outputFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url: downloadUrl,
        filename: outputFilename,
        title: 'Conversion Complete',
        subtitle: exportMode === 'visual' 
          ? 'Your visual layout PDF has been converted into high-resolution Word pages.' 
          : 'Your PDF text has been successfully structured into an editable Word document.',
      });
    } catch (err) {
      trackError('Pdf To Word', 'processing_error');
      console.error("PDF to Word Error:", err);
      let errorType = 'conversion_failed';
      if (err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('encrypt')) {
         errorType = 'encrypted_file';
      } else if (err.message?.toLowerCase().includes('corrupt') || err.message?.toLowerCase().includes('format error')) {
         errorType = 'corrupted_file';
      }
      trackError('PDF to Word', errorType);
      alert(`Conversion error: ${err.message || 'Failed to process document'}`);
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

  const customPreview = (
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
  );

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
        <div className="mb-6 space-y-3">
          <h3 className="font-bold text-gray-800">Export Mode</h3>
          
          <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${exportMode === 'text' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-3 mb-1">
              <input type="radio" name="exportMode" value="text" checked={exportMode === 'text'} onChange={(e) => setExportMode(e.target.value)} className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-800">Editable Text</span>
            </div>
            <p className="text-sm text-gray-500 ml-7">Extracts selectable text and formats layouts natively. Ideal for re-writing content.</p>
          </label>

          <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${exportMode === 'visual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-3 mb-1">
              <input type="radio" name="exportMode" value="visual" checked={exportMode === 'visual'} onChange={(e) => setExportMode(e.target.value)} className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-800">Visual Layout (Exact Copy)</span>
            </div>
            <p className="text-sm text-gray-500 ml-7">Preserves exact fonts, tables, and scanned images as high-res pictures inside Word.</p>
          </label>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
          <p className="text-green-800 text-sm font-medium flex gap-2 items-start">
            <span className="text-lg">🔒</span>
            <span>
              <strong>100% Private & Local Processing:</strong> Your files never leave your device. We process everything securely inside your browser without external servers.
            </span>
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

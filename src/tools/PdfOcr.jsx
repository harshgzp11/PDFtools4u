import React, { useState, useEffect, useRef } from 'react';
import { ScanText, Download, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { createWorker } from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfOcr() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const pageInfoRef = useRef({ current: 1, total: 1 });

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
      setStatusText('');
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const processOcr = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusText('Initializing OCR Engine...');
    
    let worker = null;
    
    try {
      worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const p = pageInfoRef.current;
            const overallProgress = Math.round((((p.current - 1) + m.progress) / p.total) * 100);
            setStatusText(`Processing Page ${p.current} of ${p.total}`);
            setProgress(overallProgress);
          } else if (m.status === 'loading tesseract core') {
            setStatusText('Loading OCR Core Engine...');
          } else if (m.status.includes('loading language')) {
            setStatusText('Downloading English Model (this may take a moment)...');
          } else {
            setStatusText(m.status);
          }
        }
      });

      setStatusText('Reading PDF Document...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      let fullText = "";

      for (let i = 1; i <= numPages; i++) {
        pageInfoRef.current = { current: i, total: numPages };
        setStatusText(`Extracting image for Page ${i}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High resolution for OCR accuracy
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        const imgDataUrl = canvas.toDataURL('image/png');
        
        // setStatusText updated dynamically by logger
        const ret = await worker.recognize(imgDataUrl);
        fullText += `--- Page ${i} ---\n${ret.data.text}\n\n`;
      }
      
      setStatusText('Finalizing Document...');
      await worker.terminate();
      worker = null;
      
      if (!fullText.trim()) {
        alert("OCR failed to detect any text in this document.");
        setIsProcessing(false);
        return;
      }

      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const handleCopy = () => {
        navigator.clipboard.writeText(fullText);
        toast.success('Text copied to clipboard!');
      };

      const statsComponent = (
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left h-64 overflow-y-auto font-mono text-sm text-gray-700 whitespace-pre-wrap shadow-inner">
            {fullText}
          </div>
          <button 
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm text-gray-800"
          >
            <Copy className="w-5 h-5" /> Copy to Clipboard
          </button>
        </div>
      );

      setSuccessData({
        url,
        filename: `${file.name.replace('.pdf', '')}_ocr.txt`,
        title: 'OCR Complete!',
        subtitle: 'We successfully extracted text from your scanned document.',
        statsComponent
      });
    } catch (err) {
      console.error(err);
      alert("Failed to perform OCR on this PDF. Please check the console for details.");
      if (worker) {
        await worker.terminate();
      }
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
    setStatusText('');
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={processOcr} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-indigo-500/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10">{statusText} {progress > 0 ? `${progress}%` : ''}</span>
        ) : (
          <><ScanText className="w-6 h-6 relative z-10"/> Extract Text (OCR)</>
        )}
      </button>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF OCR Extractor"
      description="Use Optical Character Recognition to extract text from scanned documents and images inside PDFs."
      icon={ScanText}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">OCR Details</h3>
        
        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-indigo-800 font-bold">
             <span>Format:</span>
             <span className="bg-indigo-200 px-2 py-0.5 rounded-md">TXT</span>
           </div>
           <div className="flex justify-between text-sm text-indigo-800 font-bold">
             <span>Processing:</span>
             <span className="bg-indigo-200 px-2 py-0.5 rounded-md">Local Browser (WASM)</span>
           </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm">Important Notice</h4>
          </div>
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            First-time use: Downloading OCR engine (approx. 25MB) which will be cached locally for future use. Processing may be slow on older devices or very large documents.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

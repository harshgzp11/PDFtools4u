import React, { useState, useEffect } from 'react';
import { Presentation, Download, Loader2, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToPpt() {
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
      convertPdfToPpt(newFile);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const convertPdfToPpt = async (pdfFile) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      let textContent = "";
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        
        textContent += `--- Slide ${i} ---\n\n`;
        textContent += text.items.map(item => item.str).join(' ');
        textContent += `\n\n\n`;
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to extract data from PDF.");
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
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">PDF to PowerPoint</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Extract slide text from your PDF presentation.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept=".pdf,application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF Document"
            icon={Presentation}
            className="p-20 py-32 bg-orange-50/50 hover:bg-orange-100 border-orange-300 hover:border-orange-400"
          />
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-orange-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Analyzing Slides...</h2>
        <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-orange-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Content Ready!</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-8 max-w-lg flex flex-col items-center text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
          <h3 className="text-lg font-bold text-yellow-900 mb-2">Important Notice</h3>
          <p className="text-yellow-800 text-sm">
            Generating native `.pptx` files entirely in the browser is currently not possible without severe visual bugs. 
            Instead, we have generated a clean text transcript of all slides that you can easily copy and paste into a new presentation.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`${file.name.replace('.pdf', '')}_slides.txt`}
            className="px-10 py-5 bg-orange-600 text-white rounded-xl font-bold text-xl hover:bg-orange-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download Text Transcript
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

import React, { useState, useEffect } from 'react';
import { Presentation, Download, AlertTriangle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToPpt() {
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

  const convertPdfToPpt = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
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
      
      setSuccessData({
        url,
        filename: `${file.name.replace('.pdf', '')}_slides.txt`,
        title: 'Content Ready!',
        subtitle: 'Slide text has been successfully extracted from your presentation.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to extract data from PDF.");
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
        onClick={convertPdfToPpt} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-orange-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-orange-500/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10">Analyzing... {progress}%</span>
        ) : (
          <><Presentation className="w-6 h-6 relative z-10"/> Convert to PowerPoint</>
        )}
      </button>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF to PowerPoint"
      description="Extract slide text from your PDF presentation."
      icon={Presentation}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Conversion Details</h3>
        
        <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Format:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">TXT (Transcript)</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Processing:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm">Important Notice</h4>
          </div>
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            Generating native `.pptx` files entirely in the browser is currently not possible without severe visual bugs. 
            Instead, we generate a clean text transcript of all slides that you can easily copy and paste into a new presentation.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { FileCode2, Download, Loader2, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToWord() {
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
      convertPdfToWord(newFile);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const convertPdfToWord = async (pdfFile) => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      let fullText = "";
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + "\n\n";
        setProgress(Math.round((i / (numPages * 2)) * 100)); // First 50% is reading
      }
      
      setProgress(60);
      
      // Generate DOCX
      const paragraphs = fullText.split('\n').map(line => {
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
            })
          ],
          spacing: {
            after: 100
          }
        });
      });
      
      setProgress(80);

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      
      setProgress(100);
      setOutputUrl(url);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to convert PDF to Word. Note: Complex layouts might not be perfectly preserved client-side.");
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
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">PDF to Word</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Extract all text from your PDF into an editable Microsoft Word document.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept=".pdf,application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF Document"
            icon={FileCode2}
            className="p-20 py-32 bg-blue-50/50 hover:bg-blue-100 border-blue-300 hover:border-blue-400"
          />
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-blue-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Converting Document...</h2>
        <p className="text-gray-500 mb-6">Extracting text and formatting Word file...</p>
        <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-blue-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Word Document Ready!</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-8 max-w-lg">
          <p className="text-yellow-800 text-sm font-medium text-center">
            <strong>Note:</strong> Since this conversion runs entirely in your browser without a server, complex visual layouts (like tables or multi-column designs) may be simplified to pure text.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`${file.name.replace('.pdf', '')}.docx`}
            className="px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download .DOCX
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

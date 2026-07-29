import React, { useState, useEffect } from 'react';
import { FileCode2, Download } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToWord() {
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

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
  };

  const convertPdfToWord = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
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

      if (!fullText.trim()) {
        alert("No text could be extracted. The PDF might be a scanned image or composed of vectors.");
        setIsProcessing(false);
        return;
      }
      
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
      setSuccessData({
        url,
        filename: `${file.name.replace('.pdf', '')}.docx`,
        title: 'Word Document Ready!',
        subtitle: 'Your PDF has been converted to text successfully.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to convert PDF to Word. Note: Complex layouts might not be perfectly preserved client-side.");
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
          <span className="relative z-10">Converting... {progress}%</span>
        ) : (
          <><FileCode2 className="w-6 h-6 relative z-10"/> Convert to Word</>
        )}
      </button>
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
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Conversion Details</h3>
        
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-blue-800 font-bold">
             <span>Format:</span>
             <span className="bg-blue-200 px-2 py-0.5 rounded-md">DOCX</span>
           </div>
           <div className="flex justify-between text-sm text-blue-800 font-bold">
             <span>Processing:</span>
             <span className="bg-blue-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-4">
          <p className="text-yellow-800 text-sm font-medium">
            <strong>Note:</strong> Since this conversion runs entirely in your browser without a server, complex visual layouts (like tables or multi-column designs) may be simplified to pure text.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

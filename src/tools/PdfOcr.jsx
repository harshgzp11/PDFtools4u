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

  const [language, setLanguage] = useState('eng');

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
      worker = await createWorker(language, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const p = pageInfoRef.current;
            const overallProgress = Math.round((((p.current - 1) + m.progress) / p.total) * 100);
            setStatusText(`Processing Page ${p.current} of ${p.total}`);
            setProgress(overallProgress);
          } else if (m.status === 'loading tesseract core') {
            setStatusText('Loading OCR Core Engine...');
          } else if (m.status.includes('loading language')) {
            setStatusText(`Downloading ${language.toUpperCase()} Model (this may take a moment)...`);
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
      
      // Initialize a new PDF document to merge the searchable pages into
      const { PDFDocument } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.create();

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
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        // setStatusText updated dynamically by logger
        const ret = await worker.recognize(imgDataUrl, { pdfTitle: file.name }, { pdf: true });
        fullText += `--- Page ${i} ---\n${ret.data.text}\n\n`;
        
        if (ret.data.pdf) {
           const pagePdfDoc = await PDFDocument.load(ret.data.pdf);
           const copiedPages = await mergedPdf.copyPages(pagePdfDoc, pagePdfDoc.getPageIndices());
           copiedPages.forEach((p) => mergedPdf.addPage(p));
        }
      }
      
      setStatusText('Finalizing Document...');
      await worker.terminate();
      worker = null;
      
      if (!fullText.trim()) {
        alert("OCR failed to detect any text in this document.");
        setIsProcessing(false);
        return;
      }

      // Generate the final searchable PDF
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        url,
        filename: `${file.name.replace('.pdf', '')}_searchable.pdf`,
        title: 'Searchable PDF Ready!',
        subtitle: 'We successfully made your scanned document searchable. You can now download the new PDF.',
        downloadText: 'Download PDF'
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
          <><ScanText className="w-6 h-6 relative z-10"/> Apply OCR</>
        )}
      </button>
    </div>
  );

  const renderCustomPreview = ({ thumbnails }) => (
    <div className="w-full h-full flex flex-col items-center gap-8 py-8 px-4 bg-gray-50">
      {thumbnails.map((thumb, idx) => (
        <div key={idx} className="relative w-full max-w-2xl flex flex-col items-center">
          <span className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Page {idx + 1}</span>
          <img 
            src={thumb.dataUrl} 
            alt={`Page ${idx + 1}`} 
            className="w-full h-auto shadow-lg rounded-xl border border-gray-200"
          />
        </div>
      ))}
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
      gridMode={true}
      gridQuality={1.0}
      customPreviewNode={file && !successData ? renderCustomPreview : null}
    >
      <div className="space-y-6">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2 border-b border-gray-100 pb-2">OCR PDF Options</h3>
        
        {/* Language Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">Document Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-gray-700 font-medium cursor-pointer"
          >
            <option value="eng">English</option>
            <option value="spa">Spanish</option>
            <option value="fra">French</option>
            <option value="deu">German</option>
            <option value="ita">Italian</option>
            <option value="por">Portuguese</option>
            <option value="nld">Dutch</option>
          </select>
          <p className="text-xs text-gray-500">
            Selecting the correct language significantly improves text recognition accuracy.
          </p>
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

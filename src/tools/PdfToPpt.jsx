import React, { useState, useEffect } from 'react';
import { Presentation, Download, AlertTriangle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import pptxgen from 'pptxgenjs';

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
      
      const pres = new pptxgen();

      const SLIDE_W = 10;
      const SLIDE_H = 5.625;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Lower scale to prevent out-of-memory corruption
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Fill white background for JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        // Use JPEG to drastically reduce file size and avoid base64 memory limits
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Fit within the standard 10 x 5.625 inch PPTX layout
        const scale = Math.min(SLIDE_W / viewport.width, SLIDE_H / viewport.height);
        const finalW = viewport.width * scale;
        const finalH = viewport.height * scale;
        const xOffset = (SLIDE_W - finalW) / 2;
        const yOffset = (SLIDE_H - finalH) / 2;
        
        const slide = pres.addSlide();
        slide.addImage({ data: imgData, x: xOffset, y: yOffset, w: finalW, h: finalH });
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      const blob = await pres.write({ outputType: 'blob' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        url,
        filename: `${file.name.replace('.pdf', '')}_converted.pptx`,
        title: 'Conversion Successful!',
        subtitle: 'Your PDF has been converted to a native PowerPoint presentation.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to convert PDF to PPT.");
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
          <span className="relative z-10 inline-flex items-center justify-center min-w-[220px] h-7 text-sm font-bold whitespace-nowrap">Generating Slides... {progress}%</span>
        ) : (
          <><Presentation className="w-6 h-6 relative z-10"/> Convert to PowerPoint</>
        )}
      </button>
    </div>
  );

  const renderGridItem = (thumb, idx) => (
    <div key={thumb.id} className="relative aspect-[1/1.4] rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col bg-white">
      <img src={thumb.dataUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-bold">
        {idx + 1}
      </div>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF to PowerPoint"
      description="Convert your PDF into an accurate .pptx presentation."
      icon={Presentation}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      gridMode={true}
      renderGridItem={renderGridItem}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Conversion Details</h3>
        
        <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Format:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Native .PPTX</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Quality:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">High-Res Layout</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Processing:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <p className="text-blue-800 text-xs font-medium leading-relaxed">
            Note: The layout is perfectly preserved by rendering PDF pages directly as presentation slides. The text inside the presentation cannot be directly edited as a result.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

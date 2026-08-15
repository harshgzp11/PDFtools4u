import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';

import JSZip from 'jszip';

import { trackError } from '../lib/analytics';



export default function PdfToImage() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState('jpeg'); // 'jpeg' or 'png'

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

  const convertPdfToImages = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'PDF to Image' });
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
    
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      const zip = new JSZip();
      const folderName = `${file.name.replace('.pdf', '')}_images`;
      const folder = zip.folder(folderName);
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 4.4 }); // ~317 DPI (72 * 4.4)
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'jpeg' ? 0.9 : undefined;
        
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64Data = dataUrl.split(',')[1];
        folder.file(`page-${i}.${format === 'jpeg' ? 'jpg' : 'png'}`, base64Data, { base64: true });
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `${folderName}.zip`,
        title: 'Images Ready!',
        subtitle: `Successfully converted ${numPages} pages into ${format === 'jpeg' ? 'JPG' : 'PNG'} format.`,
      });
    } catch (err) {
      trackError('Pdf To Image', 'processing_error');
      console.error(err);
      alert("Failed to convert PDF to images.");
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
        onClick={convertPdfToImages} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-yellow-500 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-yellow-400/50 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 text-yellow-900 inline-flex items-center justify-center min-w-[200px] h-7 text-sm font-bold whitespace-nowrap">Converting... {progress}%</span>
        ) : (
          <><ImageIcon className="w-6 h-6 relative z-10"/> Convert to {format === 'jpeg' ? 'JPG' : 'PNG'}</>
        )}
      </button>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PDF to Image"
      description="Convert every page of your PDF into high-quality JPG or PNG images."
      icon={ImageIcon}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Image Format</h3>
        
        <div className="flex flex-col gap-3">
          <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${format === 'jpeg' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'}`}>
            <input 
              type="radio" 
              name="format" 
              value="jpeg" 
              checked={format === 'jpeg'} 
              onChange={() => setFormat('jpeg')} 
              className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 border-gray-300" 
            />
            <div>
              <p className="font-bold text-gray-900">JPG</p>
              <p className="text-sm text-gray-500">Smaller file size, perfect for web</p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${format === 'png' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'}`}>
            <input 
              type="radio" 
              name="format" 
              value="png" 
              checked={format === 'png'} 
              onChange={() => setFormat('png')} 
              className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 border-gray-300" 
            />
            <div>
              <p className="font-bold text-gray-900">PNG</p>
              <p className="text-sm text-gray-500">High quality, lossless compression</p>
            </div>
          </label>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

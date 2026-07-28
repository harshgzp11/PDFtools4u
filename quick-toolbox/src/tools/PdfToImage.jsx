import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Download, Loader2, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfToImage() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);
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
      // Wait for format selection to start conversion, or start immediately? 
      // Let's start immediately with default format.
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const convertPdfToImages = async () => {
    setIsProcessing(true);
    setProgress(0);
    setImageUrls([]);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;
      
      const newUrls = [];
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'jpeg' ? 0.9 : undefined;
        
        const dataUrl = canvas.toDataURL(mimeType, quality);
        newUrls.push(dataUrl);
        
        setProgress(Math.round((i / numPages) * 100));
      }
      
      setImageUrls(newUrls);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to convert PDF to images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (imageUrls.length === 1) {
      // Just download single image
      const a = document.createElement('a');
      a.href = imageUrls[0];
      a.download = `${file.name.replace('.pdf', '')}-page-1.${format}`;
      a.click();
      return;
    }
    
    // Zip them
    const zip = new JSZip();
    const folder = zip.folder(`${file.name.replace('.pdf', '')}_images`);
    
    imageUrls.forEach((url, index) => {
      const base64Data = url.split(',')[1];
      folder.file(`page-${index + 1}.${format}`, base64Data, { base64: true });
    });
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace('.pdf', '')}_images.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setImageUrls([]);
    setIsProcessing(false);
    setProgress(0);
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">PDF to Image</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Convert every page of your PDF into high-quality JPG or PNG images.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept=".pdf,application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF Document"
            icon={ImageIcon}
            className="p-20 py-32 bg-yellow-50/50 hover:bg-yellow-100 border-yellow-300 hover:border-yellow-400"
          />
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-yellow-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Converting Pages...</h2>
        <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="mt-4 text-gray-500 font-bold">{progress}%</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-6xl mx-auto py-12 animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Conversion Complete</h2>
                <p className="text-sm text-gray-500">{imageUrls.length} pages extracted</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={resetTool}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Start Over
              </button>
              <button 
                onClick={downloadAll}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download All ({imageUrls.length > 1 ? 'ZIP' : format.toUpperCase()})
              </button>
            </div>
          </div>
          
          <div className="p-8 bg-gray-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto max-h-[60vh]">
            {imageUrls.map((url, index) => (
              <div key={index} className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 group relative">
                <img src={url} alt={`Page ${index + 1}`} className="w-full h-auto object-contain bg-gray-50 rounded-lg" />
                <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                  Pg {index + 1}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <a 
                    href={url}
                    download={`${file.name.replace('.pdf', '')}-page-${index + 1}.${format}`}
                    className="px-4 py-2 bg-white text-gray-900 rounded-lg font-bold hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Save
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // State 2: Format Selection
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-200 p-10 text-center">
        <FileText className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Ready to Extract</h2>
        <p className="text-gray-500 mb-8 font-medium truncate px-4">{file.name}</p>
        
        <div className="flex gap-4 justify-center mb-10">
          <button 
            onClick={() => setFormat('jpeg')}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-all border-2 ${format === 'jpeg' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-200'}`}
          >
            JPG (Smaller)
          </button>
          <button 
            onClick={() => setFormat('png')}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-all border-2 ${format === 'png' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-200'}`}
          >
            PNG (High Quality)
          </button>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setFile(null)}
            className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={convertPdfToImages}
            className="flex-1 py-4 bg-yellow-500 text-white rounded-xl font-bold text-lg hover:bg-yellow-600 shadow-lg hover:shadow-xl transition-all"
          >
            Convert Pages
          </button>
        </div>
      </div>
    </div>
  );
}

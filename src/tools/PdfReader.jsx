import React, { useState, useEffect, useRef } from 'react';
import { FileText, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, X, LayoutTemplate, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import DragDropZone from '../components/ui/DragDropZone';
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const Thumbnail = ({ pdfDocument, pageNum, isActive, onClick }) => {
  const canvasRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '100px' });
    
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && pdfDocument && canvasRef.current) {
      let renderTask = null;
      const renderPage = async () => {
        try {
          const page = await pdfDocument.getPage(pageNum);
          // Fixed width thumbnail approach
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = 140 / unscaledViewport.width;
          const viewport = page.getViewport({ scale });
          
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
          await renderTask.promise;
        } catch (e) {
          if (e.name !== 'RenderingCancelledException') {
            console.error("Thumbnail render error:", e);
          }
        }
      };
      renderPage();
      return () => {
        if (renderTask) renderTask.cancel();
      };
    }
  }, [isVisible, pdfDocument, pageNum]);

  return (
    <div 
      ref={containerRef} 
      onClick={() => onClick(pageNum)}
      className={`cursor-pointer p-1 rounded-xl transition-all min-h-[180px] w-full flex flex-col items-center justify-center gap-2 group ${
        isActive ? 'bg-blue-100/50 shadow-sm border border-blue-200' : 'hover:bg-gray-100 border border-transparent'
      }`}
    >
      <div className={`bg-white shadow-sm border ${isActive ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 group-hover:border-gray-300'} transition-all`}>
        <canvas ref={canvasRef} className="w-full h-auto block" />
      </div>
      <span className={`text-xs font-semibold ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{pageNum}</span>
    </div>
  );
};

export default function PdfReader() {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('1');
  
  const mainCanvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.__sharedFile) {
      handleFile(window.__sharedFile);
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (!newFile) return;
    if (newFile.type !== 'application/pdf') {
      toast.error("Please upload a valid PDF file.");
      return;
    }
    
    setFile(newFile);
    setIsLoading(true);
    
    try {
      const buffer = await newFile.arrayBuffer();
      const typedArray = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data: typedArray });
      const pdf = await loadingTask.promise;
      
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setPageInputValue('1');
      setZoom(1.2); // Default comfy zoom
    } catch (err) {
      console.error(err);
      toast.error("Failed to read the PDF. It may be corrupted or encrypted.");
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pdfDocument && mainCanvasRef.current) {
      let renderTask = null;
      
      const renderPage = async () => {
        try {
          const page = await pdfDocument.getPage(currentPage);
          const viewport = page.getViewport({ scale: zoom });
          const canvas = mainCanvasRef.current;
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport,
          };
          
          renderTask = page.render(renderContext);
          await renderTask.promise;
        } catch(e) {
          if (e.name !== 'RenderingCancelledException') {
             console.error("Main page render error:", e);
          }
        }
      };
      
      renderPage();
      
      return () => {
        if (renderTask) renderTask.cancel();
      }
    }
  }, [pdfDocument, currentPage, zoom]);

  const goToPage = (num) => {
    if (num >= 1 && num <= numPages) {
      setCurrentPage(num);
      setPageInputValue(num.toString());
      
      // Scroll to top of viewer when page changes
      if (containerRef.current) {
         containerRef.current.scrollTop = 0;
      }
    }
  };

  const handlePageInput = (e) => {
    setPageInputValue(e.target.value);
  };
  
  const handlePageSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      const num = parseInt(pageInputValue);
      if (!isNaN(num) && num >= 1 && num <= numPages) {
        goToPage(num);
      } else {
        setPageInputValue(currentPage.toString()); // Revert
      }
    }
  };

  const resetReader = () => {
    setFile(null);
    setPdfDocument(null);
    setNumPages(0);
    setCurrentPage(1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => {
        console.error("Error attempting to enable fullscreen:", e);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!file || !pdfDocument) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <FileText className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">PDF Reader</h1>
          </div>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            View any PDF document directly in your browser. Fast, smooth, and highly memory efficient.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
          {isLoading ? (
             <div className="h-64 flex flex-col items-center justify-center text-gray-500 font-medium space-y-4">
               <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
               <p>Opening Document...</p>
             </div>
          ) : (
             <DragDropZone 
              onFileSelect={handleFile}
              accept=".pdf,application/pdf"
              label="Drop your PDF here to read, or click to browse"
             />
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-sm text-gray-500">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <span>Strictly client-side. No files are uploaded to any server. Complete privacy.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-gray-50 border border-gray-200 shadow-xl overflow-hidden transition-all ${isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'h-[calc(100vh-140px)] w-full max-w-7xl mx-auto rounded-3xl'}`}>
      
      {/* Toolbar */}
      <div className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0 shadow-sm z-20">
        
        <div className="flex items-center gap-4 w-1/3">
           <button onClick={resetReader} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Close Document">
             <X className="w-5 h-5" />
           </button>
           <div className="hidden md:flex flex-col">
             <span className="font-bold text-gray-800 truncate max-w-[200px] text-sm">{file.name}</span>
             <span className="text-xs text-gray-400">{numPages} pages</span>
           </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 justify-center w-1/3">
           <button 
             onClick={() => goToPage(currentPage - 1)} 
             disabled={currentPage <= 1}
             className="p-1.5 md:p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 transition-colors"
           >
             <ChevronLeft className="w-5 h-5" />
           </button>
           
           <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
             <input 
               type="text" 
               value={pageInputValue}
               onChange={handlePageInput}
               onKeyDown={handlePageSubmit}
               onBlur={handlePageSubmit}
               className="w-10 text-center bg-transparent outline-none font-medium text-gray-700"
             />
             <span className="text-gray-400 font-medium">/ {numPages}</span>
           </div>
           
           <button 
             onClick={() => goToPage(currentPage + 1)} 
             disabled={currentPage >= numPages}
             className="p-1.5 md:p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 transition-colors"
           >
             <ChevronRight className="w-5 h-5" />
           </button>
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-4 w-1/3">
           <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
             <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-600 transition-all">
               <ZoomOut className="w-4 h-4" />
             </button>
             <span className="px-2 text-xs font-bold text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(z => Math.min(3.0, z + 0.2))} className="p-1.5 hover:bg-white hover:shadow-sm rounded text-gray-600 transition-all">
               <ZoomIn className="w-4 h-4" />
             </button>
           </div>
           <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors hidden md:block" title="Toggle Fullscreen">
             <Maximize className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Thumbnails */}
        <div className="w-48 bg-white border-r border-gray-200 overflow-y-auto hidden lg:flex flex-col p-4 gap-2 shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-10 custom-scrollbar">
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
             <Thumbnail 
               key={pageNum}
               pdfDocument={pdfDocument}
               pageNum={pageNum}
               isActive={pageNum === currentPage}
               onClick={goToPage}
             />
          ))}
        </div>

        {/* Main Viewer Area */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100/80 relative custom-scrollbar p-4 md:p-8 flex justify-center">
           <div className="min-w-fit min-h-fit pb-12 flex justify-center items-start">
             <canvas 
               ref={mainCanvasRef} 
               className="bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-sm max-w-none transition-transform duration-200 origin-top"
             />
           </div>
        </div>
      </div>
    </div>
  );
}

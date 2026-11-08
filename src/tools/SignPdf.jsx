import { trackEvent } from '../lib/analytics';
import React, { useState, useRef, useEffect } from 'react';

import { Download, PenTool, FileText, CheckCircle, ArrowLeft, RefreshCw, Loader2, Plus, Check, X, Layers } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import DownloadPageExtras from '../components/ui/DownloadPageExtras';
import { toast } from 'sonner';
import SignatureModal from '../components/ui/SignatureModal';
import DraggableOverlay from '../components/ui/DraggableOverlay';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { trackError } from '../lib/analytics';

// Pre-rendered base64 data URLs for standard annotations (check, cross)
const CHECKMARK_DATA = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTExODE4IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iMjAgNiA5IDE3IDQgMTIiPjwvcG9seWxpbmU+PC9zdmc+";
const CROSSMARK_DATA = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGxpbmUgeDE9IjE4IiB5MT0iNiIgeDI9IjYiIHkyPSIxOCI+PC9saW5lPjxsaW5lIHgxPSI2IiB5MT0iNiIgeDI9IjE4IiB5Mj0iMTgiPjwvbGluZT48L3N2Zz4=";

export default function SignPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  
  const [thumbnails, setThumbnails] = useState([]);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  // Editor State
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]); // { id, pageIndex, dataUrl, x, y, width, height }
  const [activeAnnotationId, setActiveAnnotationId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const stageRef = useRef(null);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      setThumbnails([]);
      setAnnotations([]);
      setActivePageIndex(0);
      setExtractingThumbs(true);
      
      try {
        const thumbs = await getPdfThumbnails(newFile, 1.5); // High quality for main stage
        setThumbnails(thumbs);
      } catch (e) {
      trackError('Sign Pdf', 'processing_error');
      console.error(e);
      toast.error(`Failed to load PDF: ${e.message}`);
      setFile(null);
      } finally {
        setExtractingThumbs(false);
      }
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setThumbnails([]);
    setAnnotations([]);
  };

  const addAnnotation = (dataUrl, defaultWidth = 150, defaultHeight = 75) => {
    setAnnotations([...annotations, {
      id: Date.now().toString(),
      pageIndex: activePageIndex,
      dataUrl,
      x: 100,
      y: 100,
      width: defaultWidth,
      height: defaultHeight,
      opacity: 1
    }]);
  };

  const handleUpdateAnnotation = (id, newProps) => {
    setAnnotations(annotations.map(a => a.id === id ? { ...a, ...newProps } : a));
  };

  const handleDeleteAnnotation = (id) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    setActiveAnnotationId(null);
  };

  const handleDuplicateAnnotation = (id) => {
    const ann = annotations.find(a => a.id === id);
    if (ann) {
      setAnnotations([...annotations, {
        ...ann,
        id: Date.now().toString(),
        x: ann.x + 30,
        y: ann.y + 30
      }]);
    }
  };

  const exportPdf = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'Sign & Annotate' });
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      // Calculate dimensions from the actual DOM element for accurate mapping
      const domWidth = stageRef.current.clientWidth;
      const domHeight = stageRef.current.clientHeight;

      for (const ann of annotations) {
        const page = pages[ann.pageIndex];
        if (!page) continue;

        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        
        // Map DOM coordinates to PDF coordinates
        const scaleX = pdfWidth / domWidth;
        const scaleY = pdfHeight / domHeight;

        let imageToEmbed;
        const imageBytes = await fetch(ann.dataUrl).then(res => res.arrayBuffer());
        
        // Simple check if data is JPG or PNG based on header
        if (ann.dataUrl.startsWith('data:image/jpeg') || ann.dataUrl.startsWith('data:image/jpg')) {
          imageToEmbed = await pdfDoc.embedJpg(imageBytes);
        } else {
          imageToEmbed = await pdfDoc.embedPng(imageBytes);
        }

        // PDF coordinate system originates at BOTTOM-LEFT
        // DOM coordinate system originates at TOP-LEFT
        const finalX = ann.x * scaleX;
        const finalY = pdfHeight - ((ann.y + ann.height) * scaleY);
        const finalW = ann.width * scaleX;
        const finalH = ann.height * scaleY;

        page.drawImage(imageToEmbed, {
          x: finalX,
          y: finalY,
          width: finalW,
          height: finalH,
          opacity: ann.opacity !== undefined ? ann.opacity : 1,
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed_${file.name}`;
      link.click();
    } catch (err) {
      trackError('Sign Pdf', 'processing_error');
      console.error(err);
      toast.error("Failed to export document. It might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  // State 1: Upload Focus
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Sign & Annotate</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            A professional WYSIWYG editor to sign, stamp, and annotate your PDF.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={PenTool}
            className="p-20 py-32 bg-indigo-50/50 hover:bg-indigo-100 border-indigo-300 hover:border-indigo-400"
          />
        </div>
      </div>
    );
  }

  // State 3: Success Screen
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Document Saved!</h2>
        <p className="text-lg text-gray-600 mb-10">All your signatures and annotations have been permanently applied.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`signed_${file.name}`}
            className="px-10 py-5 bg-indigo-600 text-white rounded-xl font-bold text-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download Signed PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Edit another
          </button>
        </div>
        <DownloadPageExtras toolId="sign-pdf" />
      </div>
    );
  }

  // Active page annotations
  const currentPageAnnotations = annotations.filter(a => a.pageIndex === activePageIndex);

  // State 2: Document Editor View
  return (
    <div className="flex flex-col h-[85vh] bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-inner animate-in slide-in-from-bottom-8 duration-500 w-full relative">
      
      {/* Top Toolbar */}
      <div className="min-h-14 sm:h-16 bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-0 flex items-center justify-between shrink-0 z-20 shadow-sm gap-1 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button 
            onClick={resetTool} 
            className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center cursor-pointer"
            title="Cancel"
            aria-label="Cancel"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          {/* Pages / Thumbnail Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSidebar(s => !s)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all min-h-[32px] cursor-pointer ${
              showSidebar
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title={showSidebar ? "Hide page thumbnails" : "Show page thumbnails"}
            aria-label={showSidebar ? "Hide page thumbnails" : "Show page thumbnails"}
          >
            <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold">
              {activePageIndex + 1}<span className="text-gray-400">/{thumbnails.length || 1}</span>
            </span>
            <span className="hidden sm:inline text-xs text-gray-500 font-normal">Pages</span>
          </button>

          <div className="h-5 w-px bg-gray-200 mx-0.5 sm:mx-1 hidden xs:block"></div>
          
          {/* Annotation Tools */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 sm:px-3.5 sm:py-2 min-[360px]:px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-1.5 transition-colors border border-indigo-200 min-h-[32px] cursor-pointer"
              title="Add Signature"
              aria-label="Add Signature"
            >
              <PenTool className="w-4 h-4 shrink-0" />
              <span className="hidden min-[360px]:inline"><span className="hidden sm:inline">Add </span>Signature</span>
            </button>

            <button 
              onClick={() => addAnnotation(CHECKMARK_DATA, 40, 40)}
              className="p-1.5 sm:p-2 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-2xs min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
              title="Add Checkmark"
              aria-label="Add Checkmark"
            >
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
            </button>
            
            <button 
              onClick={() => addAnnotation(CROSSMARK_DATA, 40, 40)}
              className="p-1.5 sm:p-2 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-2xs min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
              title="Add Crossmark"
              aria-label="Add Crossmark"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </button>
          </div>
        </div>

        <button 
          onClick={exportPdf}
          disabled={loading}
          className="px-2.5 sm:px-5 py-1.5 sm:py-2 bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-lg hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1.5 min-h-[32px] shrink-0 disabled:opacity-50 cursor-pointer"
          title="Export Document"
          aria-label="Export Document"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" /> <span className="hidden min-[360px]:inline">Saving...</span></>
          ) : (
            <><Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span>Export<span className="hidden sm:inline"> Document</span></span></>
          )}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop when sidebar is open */}
        {showSidebar && (
          <div
            className="md:hidden absolute inset-0 bg-black/30 z-30 backdrop-blur-2xs transition-opacity"
            onClick={() => setShowSidebar(false)}
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar - Thumbnails */}
        <aside
          aria-label="Page navigation"
          data-testid="sign-thumbnails-sidebar"
          className={`
          ${showSidebar ? 'flex' : 'hidden md:flex'}
          ${showSidebar ? 'absolute md:relative inset-y-0 left-0 z-40 md:z-auto shadow-2xl md:shadow-[inset_-4px_0_12px_rgba(0,0,0,0.02)]' : ''}
          w-56 sm:w-60 md:w-48 lg:w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4 shrink-0 flex-col transition-all
        `}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Pages ({thumbnails.length})</p>
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              className="md:hidden p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              aria-label="Close thumbnails sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {thumbnails.map((thumb, index) => {
              const isActive = index === activePageIndex;
              const hasAnnotations = annotations.some(a => a.pageIndex === index);
              
              return (
                <div 
                  key={thumb.id}
                  onClick={() => {
                    setActivePageIndex(index);
                    setActiveAnnotationId(null);
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      setShowSidebar(false);
                    }
                  }}
                  className={`relative cursor-pointer transition-all ${
                    isActive ? 'scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`aspect-[1/1.4] bg-white rounded-lg shadow-sm border-2 overflow-hidden flex items-center justify-center p-1 ${
                    isActive ? 'border-indigo-500 shadow-md ring-4 ring-indigo-500/20' : 'border-gray-200'
                  }`}>
                    <img 
                      src={thumb.dataUrl} 
                      alt={`Page ${index + 1}`} 
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    
                    {/* Badge showing if page has annotations */}
                    {hasAnnotations && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm" title="Has annotations" />
                    )}
                  </div>
                  <p className={`text-center text-xs mt-2 font-bold ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>
                    Page {index + 1}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        <div 
          className="flex-1 bg-gray-200/50 overflow-auto flex items-start justify-center p-3 sm:p-6 lg:p-8 relative"
          onMouseDown={(e) => {
            // Only deselect if clicking the background stage or the PDF image itself
            if (e.target === e.currentTarget || e.target.tagName === 'IMG') {
              setActiveAnnotationId(null);
            }
          }}
        >
          {extractingThumbs ? (
            <div className="flex flex-col items-center justify-center text-indigo-500 gap-4 mt-20">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Rendering document...</p>
            </div>
          ) : thumbnails[activePageIndex] && (
            <div 
              ref={stageRef}
              className="relative bg-white shadow-2xl transition-all"
              style={{
                // Let the image dictate the exact size, but set a max height so it fits well on screen
                height: '800px', // A good standard height for the editor viewport
                aspectRatio: '1 / 1.414' // standard A4 aspect ratio approximation
              }}
            >
              {/* The Actual PDF Page Image */}
              <img 
                src={thumbnails[activePageIndex].dataUrl} 
                alt="Active Page"
                className="w-full h-full pointer-events-none select-none"
              />

              {/* Draggable Overlays for current page */}
              {currentPageAnnotations.map(ann => (
                <DraggableOverlay
                  key={ann.id}
                  id={ann.id}
                  dataUrl={ann.dataUrl}
                  initialX={ann.x}
                  initialY={ann.y}
                  initialWidth={ann.width}
                  initialHeight={ann.height}
                  initialOpacity={ann.opacity !== undefined ? ann.opacity : 1}
                  isActive={activeAnnotationId === ann.id}
                  onSelect={(id) => setActiveAnnotationId(id)}
                  onUpdate={handleUpdateAnnotation}
                  onDelete={handleDeleteAnnotation}
                  onDuplicate={handleDuplicateAnnotation}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal Overlay */}
      <SignatureModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(dataUrl) => {
          addAnnotation(dataUrl);
        }}
      />
    </div>
  );
}

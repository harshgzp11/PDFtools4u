import React, { useState, useEffect, useRef } from 'react';
import { PenTool, Download, ChevronLeft, ChevronRight, X, ShieldCheck, Eraser, Palette, Type, Highlighter } from 'lucide-react';
import { toast } from 'sonner';
import DragDropZone from '../components/ui/DragDropZone';



const SignatureCanvas = React.lazy(() => import('react-signature-canvas'));
import { trackError } from '../lib/analytics';



const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'];

export default function PdfAnnotator() {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Annotation state
  const [activeMode, setActiveMode] = useState('pen'); // 'pen' | 'highlighter' | 'text'
  const [penColor, setPenColor] = useState('#EF4444');
  const [pageDrawings, setPageDrawings] = useState({}); // { pageNum: dataUrl }
  const [textAnnotations, setTextAnnotations] = useState({}); // { pageNum: [{ id, text, x, y, color }] }
  const [mobileToolbarSection, setMobileToolbarSection] = useState('tools'); // 'tools' | 'colors'

  const mainCanvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

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

      const [pdfjsLib] = await Promise.all([
        import('pdfjs-dist'),
        import('react-signature-canvas')
      ]);
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

      const loadingTask = pdfjsLib.getDocument({ data: typedArray });
      const pdf = await loadingTask.promise;

      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      setPageDrawings({});
      setTextAnnotations({});
    } catch (err) {
      trackError('Pdf Annotator', 'processing_error');
      console.error(err);
      toast.error("Failed to read the PDF.");
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentPageDrawing = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataUrl = sigPadRef.current.toDataURL('image/png');
      setPageDrawings(prev => ({ ...prev, [currentPage]: dataUrl }));
    } else {
      setPageDrawings(prev => {
        const copy = { ...prev };
        delete copy[currentPage];
        return copy;
      });
    }
  };

  const loadCurrentPageDrawing = (pageNum) => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      if (pageDrawings[pageNum]) {
        sigPadRef.current.fromDataURL(pageDrawings[pageNum], { width: canvasDimensions.width, height: canvasDimensions.height });
      }
    }
  };

  useEffect(() => {
    if (pdfDocument && mainCanvasRef.current) {
      let renderTask = null;

      const renderPage = async () => {
        try {
          const page = await pdfDocument.getPage(currentPage);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = mainCanvasRef.current;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          setCanvasDimensions({ width: viewport.width, height: viewport.height });

          const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport,
          };

          renderTask = page.render(renderContext);
          await renderTask.promise;

          setTimeout(() => loadCurrentPageDrawing(currentPage), 50);
        } catch(e) {
      trackError('Pdf Annotator', 'processing_error');
          if (e.name !== 'RenderingCancelledException') {
             console.error(e);
          }
        }
      };
      renderPage();
      return () => {
        if (renderTask) renderTask.cancel();
      }
    }
  }, [pdfDocument, currentPage]);

  const goToPage = (num) => {
    if (num >= 1 && num <= numPages) {
      saveCurrentPageDrawing();
      setCurrentPage(num);
    }
  };

  const handleClear = () => {
    if (sigPadRef.current) sigPadRef.current.clear();
    setTextAnnotations(prev => {
      const copy = { ...prev };
      delete copy[currentPage];
      return copy;
    });
    toast.success("Annotations cleared for this page");
  };

  const handleTextLayerClick = (e) => {
    if (activeMode !== 'text') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newId = Date.now().toString();
    setTextAnnotations(prev => {
      const pageTexts = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: [...pageTexts, { id: newId, text: '', x, y, color: penColor }]
      };
    });
  };

  const updateTextAnnotation = (idx, newText) => {
    setTextAnnotations(prev => {
      const pageTexts = [...(prev[currentPage] || [])];
      pageTexts[idx].text = newText;
      return { ...prev, [currentPage]: pageTexts };
    });
  };

  const hexToRgbLib = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  const handleExport = async () => {
    if (!file) return;
    setIsLoading(true);

    saveCurrentPageDrawing();

    setTimeout(async () => {
      try {
        const buffer = await file.arrayBuffer();
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const finalDrawings = { ...pageDrawings };
        if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
          finalDrawings[currentPage] = sigPadRef.current.toDataURL('image/png');
        }

        // Draw signatures/highlighter
        for (const [pageNumStr, dataUrl] of Object.entries(finalDrawings)) {
          const pageIdx = parseInt(pageNumStr) - 1;
          const page = pages[pageIdx];

          if (page) {
            const pngImage = await pdfDoc.embedPng(dataUrl);
            const { width, height } = page.getSize();

            page.drawImage(pngImage, {
              x: 0,
              y: 0,
              width: width,
              height: height,
            });
          }
        }

        // Draw Text Annotations
        for (const [pageNumStr, texts] of Object.entries(textAnnotations)) {
          const pageIdx = parseInt(pageNumStr) - 1;
          const page = pages[pageIdx];
          if (page && texts.length > 0) {
            const { width, height } = page.getSize();
            // Scale correctly based on our 1.5 zoom viewport
            const scaleX = width / canvasDimensions.width;
            const scaleY = height / canvasDimensions.height;

            for (const ann of texts) {
              if (ann.text.trim() === '') continue;
              page.drawText(ann.text, {
                x: ann.x * scaleX,
                y: height - (ann.y * scaleY) - (16 * scaleY),
                size: 16 * scaleY,
                font: helveticaFont,
                color: hexToRgbLib(ann.color),
              });
            }
          }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `annotated_${file.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Annotated PDF downloaded successfully!");
      } catch (err) {
      trackError('Pdf Annotator', 'processing_error');
        console.error(err);
        toast.error("Failed to export annotated PDF.");
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const resetReader = () => {
    setFile(null);
    setPdfDocument(null);
    setNumPages(0);
    setCurrentPage(1);
    setPageDrawings({});
    setTextAnnotations({});
  };

  if (!file || !pdfDocument) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center animate-in fade-in duration-500 min-h-0 h-full">
        <div className="text-center space-y-2 mb-6 flex-shrink-0">
          <div className="flex justify-center items-center gap-2">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
              <PenTool className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PDF Annotator</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Draw, highlight, and write notes directly on your PDF documents.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm w-full flex-1 min-h-[300px] flex items-center justify-center">
          {isLoading ? (
             <div className="h-48 w-full flex flex-col items-center justify-center text-gray-500 font-medium space-y-4">
               <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
               <p>Preparing Document...</p>
             </div>
          ) : (
             <div className="w-full h-full">
               <DragDropZone
                onFileSelect={handleFile}
                accept=".pdf,application/pdf"
                label="Drop your PDF here to annotate, or click to browse"
               />
             </div>
          )}
        </div>
      </div>
    );
  }

  // Derive pen properties based on mode
  const getCanvasPenColor = () => {
    if (activeMode === 'highlighter') {
       // Convert hex to rgba for highlighter
       const r = parseInt(penColor.slice(1, 3), 16);
       const g = parseInt(penColor.slice(3, 5), 16);
       const b = parseInt(penColor.slice(5, 7), 16);
       return `rgba(${r},${g},${b},0.3)`;
    }
    return penColor;
  };

  const getCanvasPenWidth = () => {
    return activeMode === 'highlighter' ? 15 : 3;
  };

  const currentPageTexts = textAnnotations[currentPage] || [];

  return (
    <div className="flex flex-col bg-gray-50 border border-gray-200 shadow-md overflow-hidden h-full min-h-0 w-full max-w-7xl mx-auto rounded-2xl">

      {/* Desktop Toolbar (>= md): Preserved exact layout */}
      <div className="hidden md:flex h-16 bg-white border-b border-gray-200 px-4 items-center justify-between flex-shrink-0 shadow-sm z-20 overflow-x-auto">
        <div className="flex items-center gap-4 min-w-max">
           <button onClick={resetReader} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Close Document">
             <X className="w-5 h-5" />
           </button>
           <div className="flex flex-col">
             <span className="font-bold text-gray-800 truncate max-w-[150px] text-sm">{file.name}</span>
             <span className="text-xs text-gray-400">Page {currentPage} of {numPages}</span>
           </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl min-w-max mx-2">
           <button
             onClick={() => setActiveMode('pen')}
             className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeMode === 'pen' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:bg-gray-200'}`}
             title="Pen Tool"
           ><PenTool className="w-5 h-5" /></button>
           <button
             onClick={() => setActiveMode('highlighter')}
             className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeMode === 'highlighter' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:bg-gray-200'}`}
             title="Highlighter"
           ><Highlighter className="w-5 h-5" /></button>
           <button
             onClick={() => setActiveMode('text')}
             className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeMode === 'text' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:bg-gray-200'}`}
             title="Text Note Tool"
           ><Type className="w-5 h-5" /></button>

           <div className="w-px h-6 bg-gray-300 mx-1" />

           {COLORS.map(color => (
             <button
               key={color}
               onClick={() => setPenColor(color)}
               className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${penColor === color ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110'}`}
               style={{ backgroundColor: color }}
               aria-label={`Color ${color}`}
             />
           ))}
           <div className="w-px h-6 bg-gray-300 mx-1" />
           <button onClick={handleClear} className="p-1.5 hover:bg-white rounded text-gray-600 transition-colors cursor-pointer" title="Erase Current Page">
             <Eraser className="w-5 h-5" />
           </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4 min-w-max">
           <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
             <button
               onClick={() => goToPage(currentPage - 1)}
               disabled={currentPage <= 1}
               className="p-1.5 bg-white shadow-sm text-gray-700 rounded-md disabled:opacity-50 transition-colors cursor-pointer"
               aria-label="Previous Page"
             >
               <ChevronLeft className="w-4 h-4" />
             </button>
             <span className="px-3 text-sm font-bold text-gray-600 w-16 text-center select-none">{currentPage} / {numPages}</span>
             <button
               onClick={() => goToPage(currentPage + 1)}
               disabled={currentPage >= numPages}
               className="p-1.5 bg-white shadow-sm text-gray-700 rounded-md disabled:opacity-50 transition-colors cursor-pointer"
               aria-label="Next Page"
             >
               <ChevronRight className="w-4 h-4" />
             </button>
           </div>

           <button onClick={handleExport} disabled={isLoading} className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
             {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4" />}
             Export
           </button>
        </div>
      </div>

      {/* Mobile Toolbar (< md): Section-based responsive toolbar with 44px touch targets and zero overflow at 320px */}
      <div className="md:hidden flex flex-col flex-shrink-0 z-20">
        {/* Mobile Header Row: Close, Pagination, Export */}
        <div className="h-14 bg-white border-b border-gray-200 px-2 sm:px-3 flex items-center justify-between shadow-xs">
          <button
            onClick={resetReader}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500 transition-colors active:bg-gray-200 cursor-pointer"
            title="Close Document"
            aria-label="Close Document"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Pagination */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-50 border border-gray-200 rounded-xl p-0.5">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 disabled:opacity-35 hover:bg-white rounded-lg active:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-1 text-xs font-bold text-gray-700 min-w-[50px] text-center select-none">{currentPage} / {numPages}</span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 disabled:opacity-35 hover:bg-white rounded-lg active:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="min-h-[44px] px-3.5 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4" />}
            <span>Export</span>
          </button>
        </div>

        {/* Mobile Annotation Controls Bar */}
        <div className="p-2 bg-gray-50 border-b border-gray-200 flex flex-col gap-2 shadow-xs">
          {/* Section Selector + Active State Indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center p-0.5 bg-gray-200/80 rounded-xl flex-1 select-none" role="tablist" aria-label="Annotation Sections">
              <button
                type="button"
                role="tab"
                aria-selected={mobileToolbarSection === 'tools'}
                onClick={() => setMobileToolbarSection('tools')}
                className={`flex-1 min-h-[40px] py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileToolbarSection === 'tools' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-pink-600" />
                <span>Tools</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileToolbarSection === 'colors'}
                onClick={() => setMobileToolbarSection('colors')}
                className={`flex-1 min-h-[40px] py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileToolbarSection === 'colors' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: penColor }} />
                <span>Colors</span>
              </button>
            </div>

            {/* Current Active Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl shadow-xs shrink-0 min-h-[40px]">
              <span className="text-[11px] font-bold text-gray-500 capitalize">{activeMode}</span>
              <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: penColor }} />
            </div>
          </div>

          {/* Section 1: Draw Tools */}
          {mobileToolbarSection === 'tools' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveMode('pen')}
                className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  activeMode === 'pen' ? 'bg-pink-50 border-pink-300 text-pink-700 ring-1 ring-pink-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                title="Pen Tool"
              >
                <PenTool className="w-4 h-4 text-pink-600" />
                <span>Pen</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('highlighter')}
                className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  activeMode === 'highlighter' ? 'bg-pink-50 border-pink-300 text-pink-700 ring-1 ring-pink-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                title="Highlighter"
              >
                <Highlighter className="w-4 h-4 text-pink-600" />
                <span>Highlight</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('text')}
                className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  activeMode === 'text' ? 'bg-pink-50 border-pink-300 text-pink-700 ring-1 ring-pink-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                title="Text Note Tool"
              >
                <Type className="w-4 h-4 text-pink-600" />
                <span>Text</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="min-h-[44px] py-2 px-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 active:bg-gray-200 text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                title="Erase Current Page"
                aria-label="Erase Current Page"
              >
                <Eraser className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          )}

          {/* Section 2: Colors & Style with 44px Touch Targets and Large Swatches */}
          {mobileToolbarSection === 'colors' && (
            <div className="flex items-center justify-between px-2 py-0.5 bg-white rounded-xl border border-gray-200 shadow-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mr-1 select-none">Palette:</span>
              <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-around">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPenColor(color)}
                    aria-label={`Select color ${color}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer"
                  >
                    <span
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full shadow-sm transition-all flex items-center justify-center ${
                        penColor === color ? 'ring-3 ring-pink-500 ring-offset-2 scale-110 shadow-md' : 'hover:scale-105 border border-black/10'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {penColor === color && (
                        <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Viewer Area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100/80 relative custom-scrollbar p-4 md:p-8 flex justify-center">
         <div
           className={`relative shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-sm ${activeMode === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
           style={{ width: canvasDimensions.width, height: canvasDimensions.height }}
         >
           <canvas
             ref={mainCanvasRef}
             className="absolute top-0 left-0 bg-white rounded-sm pointer-events-none"
           />

           <div
             className="absolute top-0 left-0 w-full h-full z-10"
             style={{ pointerEvents: activeMode === 'text' ? 'auto' : 'none' }}
             onClick={handleTextLayerClick}
           >
             {currentPageTexts.map((ann, idx) => (
               <input
                 key={ann.id}
                 type="text"
                 value={ann.text}
                 onChange={(e) => updateTextAnnotation(idx, e.target.value)}
                 autoFocus={ann.text === ''}
                 placeholder="Type note..."
                 className="absolute bg-transparent outline-none placeholder-gray-300"
                 style={{
                   left: ann.x,
                   top: ann.y - 10,
                   color: ann.color,
                   fontSize: '16px',
                   fontFamily: 'Helvetica, Arial, sans-serif',
                   minWidth: '200px',
                   border: ann.text === '' ? '1px dashed #ccc' : 'none'
                 }}
                 onClick={(e) => e.stopPropagation()}
               />
             ))}
           </div>

           <SignatureCanvas
             ref={sigPadRef}
             penColor={getCanvasPenColor()}
             minWidth={getCanvasPenWidth()}
             maxWidth={getCanvasPenWidth() + 1}
             canvasProps={{
               width: canvasDimensions.width,
               height: canvasDimensions.height,
               className: 'absolute top-0 left-0 z-0'
             }}
           />
         </div>
      </div>
    </div>
  );
}

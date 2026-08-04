import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { PenTool, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import ToolPreviewLayout from '../../components/ui/ToolPreviewLayout';

import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Canvas from './Canvas';
import GridView from './GridView';

const CompressPanel = lazy(() => import('./Panels/CompressPanel'));
const ConvertPanel = lazy(() => import('./Panels/ConvertPanel'));
const SignPanel = lazy(() => import('./Panels/SignPanel'));
const AiPanel = lazy(() => import('./Panels/AiPanel'));

import { generateId } from './utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfEditor({ 
  initialTool = 'select',
  title = "PDF Editor",
  description = "Add text, shapes, redactions, and freehand drawings to your PDF files instantly. All processing is done locally in your browser—your files are never uploaded to any server, ensuring complete data privacy and security.",
  allowedTools = null
}) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('document'); // without .pdf extension
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // PDF State
  const [pdfJsDoc, setPdfJsDoc] = useState(null); 
  const [pages, setPages] = useState([]); // { id, originalIndex, width, height, thumbUrl, rotation }
  const [activePageIndex, setActivePageIndex] = useState(0);

  // View & Tool State
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'grid' | 'thumbnail'
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState(initialTool); // select, text, pencil, rect, redact, image, signature, etc.
  const [toolConfig, setToolConfig] = useState({ color: '#ef4444', size: 24, strokeWidth: 4 });
  const [activeToolPanel, setActiveToolPanel] = useState(null); // null, 'compress', 'convert', 'sign', 'ai'
  
  // Overlays State
  const [overlays, setOverlays] = useState({}); 
  
  // History Stack
  const [history, setHistory] = useState([]); 
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type === 'application/pdf') {
        handleFileUpload(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  // Keyboard Shortcuts (Hotkeys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setActiveTool('hand');
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [history, historyIndex]);

  const pushHistory = (newState = null) => {
    const newHistory = history.slice(0, historyIndex + 1);
    const stateToSave = newState || { overlays, pages };
    newHistory.push(JSON.parse(JSON.stringify(stateToSave))); 
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setOverlays(history[newIndex].overlays);
      setPages(history[newIndex].pages);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setOverlays(history[newIndex].overlays);
      setPages(history[newIndex].pages);
    }
  };

  const handleFileUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    // Strip .pdf for the editable filename state
    setFileName(uploadedFile.name.replace(/\.pdf$/i, ''));
    setIsProcessing(true);
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      setPdfJsDoc(pdf);

      const numPages = pdf.numPages;
      const pagesData = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const thumbScale = 200 / viewport.width;
        const thumbViewport = page.getViewport({ scale: thumbScale });
        
        canvas.width = thumbViewport.width;
        canvas.height = thumbViewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: thumbViewport
        }).promise;

        pagesData.push({
          id: generateId(),
          originalIndex: i - 1,
          width: viewport.width,
          height: viewport.height,
          thumbUrl: canvas.toDataURL(),
          rotation: 0
        });
        setProgress((i / numPages) * 100);
      }

      setPages(pagesData);
      setActivePageIndex(0);
      setOverlays({});
      setHistory([{ overlays: {}, pages: pagesData }]);
      setHistoryIndex(0);
      toast.success('PDF loaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load PDF: ' + (err.message || 'Unknown error'));
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  };

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const pdfBytes = await file.arrayBuffer();
      const originalDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();
      const helveticaFont = await newDoc.embedFont(StandardFonts.Helvetica);

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const [copiedPage] = await newDoc.copyPages(originalDoc, [p.originalIndex]);
        
        if (p.rotation !== 0) {
           copiedPage.setRotation(degrees(p.rotation));
        }

        const { height } = copiedPage.getSize();
        const pageOverlays = overlays[p.id] || [];

        for (const overlay of pageOverlays) {
          const [r, g, b] = hexToRgb(overlay.color);

          if (overlay.type === 'text') {
            copiedPage.drawText(overlay.text || 'Text', {
              x: overlay.x,
              y: height - overlay.y - (overlay.fontSize || 24), 
              size: overlay.fontSize || 24,
              font: helveticaFont,
              color: rgb(r, g, b),
            });
          } else if (overlay.type === 'rect') {
            copiedPage.drawRectangle({
              x: overlay.x,
              y: height - overlay.y - overlay.h,
              width: overlay.w,
              height: overlay.h,
              borderColor: rgb(r, g, b),
              borderWidth: overlay.strokeWidth,
            });
          } else if (overlay.type === 'circle') {
            copiedPage.drawEllipse({
              x: overlay.x + overlay.w / 2,
              y: height - overlay.y - overlay.h / 2,
              xScale: overlay.w / 2,
              yScale: overlay.h / 2,
              borderColor: rgb(r, g, b),
              borderWidth: overlay.strokeWidth,
            });
          } else if (overlay.type === 'redact') {
             copiedPage.drawRectangle({
               x: overlay.x,
               y: height - overlay.y - overlay.h,
               width: overlay.w,
               height: overlay.h,
               color: rgb(0,0,0),
             });
          } else if (['path', 'highlight_path'].includes(overlay.type)) {
             copiedPage.drawSvgPath(overlay.svgPath, {
               x: overlay.x,
               y: height - overlay.y,
               borderColor: rgb(r, g, b),
               borderWidth: overlay.strokeWidth,
               opacity: overlay.opacity || 1
             });
          }
          // Note: Image and Signature export logic not implemented here for brevity
        }
        newDoc.addPage(copiedPage);
      }

      const finalPdfBytes = await newDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file || pages.length === 0) {
    return (
      <ToolPreviewLayout
        title={title}
        description={description}
        icon={PenTool}
        onFileSelect={handleFileUpload}
        isProcessing={isProcessing}
        progress={progress}
        accept=".pdf,application/pdf"
      />
    );
  }

  const togglePanel = (panelName) => {
    setActiveToolPanel(panelName);
    if (panelName) {
      setActiveTool('select');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-[#e5e7eb]">
      <Toolbar 
        file={file} 
        fileName={fileName}
        setFileName={setFileName}
        activeTool={activeTool} 
        setActiveTool={setActiveTool}
        toolConfig={toolConfig} 
        setToolConfig={setToolConfig}
        zoom={zoom} 
        setZoom={setZoom}
        viewMode={viewMode}
        setViewMode={setViewMode}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        isProcessing={isProcessing}
        pushHistory={pushHistory}
        activePageId={pages[activePageIndex]?.id}
        overlays={overlays}
        setOverlays={setOverlays}
        allowedTools={allowedTools}
        onTogglePanel={togglePanel}
        pages={pages}
        activePageIndex={activePageIndex}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          pages={pages} 
          setPages={setPages} 
          activePageIndex={activePageIndex} 
          setActivePageIndex={setActivePageIndex} 
          pushHistory={pushHistory}
          onTogglePanel={togglePanel}
          setViewMode={setViewMode}
          viewMode={viewMode}
        />
        {viewMode === 'edit' ? (
          <Canvas 
            pages={pages} 
              activePageIndex={activePageIndex}
              activePageId={pages[activePageIndex]?.id}
              setActivePageIndex={setActivePageIndex}
              pdfJsDoc={pdfJsDoc}
              zoom={zoom}
              setZoom={setZoom}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              toolConfig={toolConfig}
              overlays={overlays}
              setOverlays={setOverlays}
              pushHistory={pushHistory}
            />
        ) : (
          <GridView 
            pages={pages}
            setPages={setPages}
            activePageIndex={activePageIndex}
            setActivePageIndex={setActivePageIndex}
            setViewMode={setViewMode}
            pushHistory={pushHistory}
            viewMode={viewMode}
          />
        )}

        {activeToolPanel && (
          <Suspense fallback={<div className="absolute xl:relative right-0 top-0 bottom-0 w-80 h-full bg-white border-l border-gray-200 shadow-2xl xl:shadow-xl flex flex-col items-center justify-center z-30 flex-shrink-0 animate-in slide-in-from-right duration-300"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}>
            {activeToolPanel === 'compress' && <CompressPanel file={file} onClose={() => setActiveToolPanel(null)} />}
            {activeToolPanel === 'convert' && <ConvertPanel file={file} onClose={() => setActiveToolPanel(null)} />}
            {activeToolPanel === 'sign' && (
              <SignPanel 
                onClose={() => setActiveToolPanel(null)} 
                onAddSignature={(dataUrl) => {
                   const newOverlay = {
                     id: generateId(),
                     type: 'image',
                     src: dataUrl,
                     x: 100,
                     y: 100,
                     w: 150,
                     h: 75
                   };
                   const newOverlays = { ...overlays };
                   if (!newOverlays[pages[activePageIndex]?.id]) newOverlays[pages[activePageIndex]?.id] = [];
                   newOverlays[pages[activePageIndex]?.id].push(newOverlay);
                   setOverlays(newOverlays);
                   pushHistory();
                   setActiveToolPanel(null);
                }} 
              />
            )}
            {activeToolPanel === 'ai' && <AiPanel onClose={() => setActiveToolPanel(null)} />}
          </Suspense>
        )}
      </div>
    </div>
  );
}

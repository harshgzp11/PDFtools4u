import React, { useState, useEffect, useRef } from 'react';
import { PenTool } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import ToolPreviewLayout from '../../components/ui/ToolPreviewLayout';

import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Canvas from './Canvas';

import { generateId } from './utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfEditor() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // PDF State
  const [pdfJsDoc, setPdfJsDoc] = useState(null); 
  const [pages, setPages] = useState([]); // { id, originalIndex, width, height, thumbUrl, rotation }
  const [activePageIndex, setActivePageIndex] = useState(0);

  // View & Tool State
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState('select'); // select, text, pencil, rect, redact, etc.
  const [toolConfig, setToolConfig] = useState({ color: '#ef4444', size: 24, strokeWidth: 4 });
  
  // Overlays State
  // Map page.id -> array of overlays
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
  }, [history, historyIndex]); // Re-bind so handleUndo/Redo have fresh state

  const pushHistory = (newState = null) => {
    const newHistory = history.slice(0, historyIndex + 1);
    const stateToSave = newState || { overlays, pages };
    newHistory.push(JSON.parse(JSON.stringify(stateToSave))); // deep copy
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
              color: rgb(r, g, b)
            });
          } else if (overlay.type === 'rect' || overlay.type === 'redact') {
            const isRedact = overlay.type === 'redact';
            copiedPage.drawRectangle({
              x: overlay.x,
              y: height - overlay.y - overlay.h,
              width: overlay.w,
              height: overlay.h,
              color: isRedact ? rgb(0, 0, 0) : rgb(r, g, b),
              borderColor: isRedact ? undefined : rgb(r, g, b),
              borderWidth: isRedact ? 0 : (overlay.strokeWidth || 4),
              opacity: isRedact ? 1 : 0 // transparent fill for rect
            });
          } else if (overlay.type === 'path' && overlay.svgPath) {
             copiedPage.drawSvgPath(overlay.svgPath, {
               x: overlay.x,
               y: height - overlay.y, // SVG origin
               color: rgb(r, g, b),
               borderWidth: overlay.strokeWidth || 4,
               borderColor: rgb(r, g, b)
             });
          }
        }
        
        newDoc.addPage(copiedPage);
      }

      const modifiedPdfBytes = await newDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file || pages.length === 0) {
    return (
      <ToolPreviewLayout
        title="PDF Editor"
        description="Add text, shapes, redactions, and freehand drawings to your PDF files instantly. All processing is done locally in your browser—your files are never uploaded to any server, ensuring complete data privacy and security."
        icon={PenTool}
        onFileSelect={handleFileUpload}
        isProcessing={isProcessing}
        progress={progress}
        accept=".pdf,application/pdf"
      />
    );
  }

  const activePageId = pages[activePageIndex]?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] fixed top-[64px] left-0 right-0 overflow-hidden bg-[#f4f4f4] z-50">
      <Toolbar 
        file={file}
        activeTool={activeTool} 
        setActiveTool={setActiveTool}
        toolConfig={toolConfig}
        setToolConfig={setToolConfig}
        zoom={zoom}
        setZoom={setZoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        isProcessing={isProcessing}
      />
      <div className="flex flex-1 overflow-hidden h-full">
        <Sidebar 
          pages={pages}
          setPages={setPages}
          activePageIndex={activePageIndex}
          setActivePageIndex={setActivePageIndex}
          pushHistory={() => pushHistory({ overlays, pages })}
        />
        <Canvas 
          pages={pages}
          activePageIndex={activePageIndex}
          activePageId={activePageId}
          setActivePageIndex={setActivePageIndex}
          pdfJsDoc={pdfJsDoc}
          zoom={zoom}
          setZoom={setZoom}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          toolConfig={toolConfig}
          overlays={overlays}
          setOverlays={setOverlays}
          pushHistory={() => pushHistory({ overlays, pages })}
        />
      </div>
    </div>
  );
}

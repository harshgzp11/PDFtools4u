import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { PenTool, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';



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
import { trackError } from '../../lib/analytics';
import { trackEvent } from '../../lib/analytics';



export default function PdfEditor({
  initialTool = 'select',
  title = "PDF Editor",
  description = "Add text, shapes, redactions, and freehand drawings to your PDF files instantly. All processing is done locally in your browser—your files are never uploaded to any server, ensuring complete data privacy and security.",
  allowedTools = null,
  isRedactMode = false
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
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  // History Stack
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const exportingRef = useRef(false);
  const [showRedactConfirmModal, setShowRedactConfirmModal] = useState(false);

  // Redaction helper counts
  const totalRedactionsCount = Object.values(overlays).reduce((acc, list) => {
    return acc + (list ? list.filter(o => o.type === 'redact').length : 0);
  }, 0);

  const pagesWithRedactionsCount = pages.filter(p => {
    const list = overlays[p.id] || [];
    return list.some(o => o.type === 'redact');
  }).length;

  const handleRotatePage = (index) => {
    const pageToRotate = pages[index];
    if (!pageToRotate) return;
    const oldRotation = pageToRotate.rotation || 0;
    const newRotation = (oldRotation + 90) % 360;

    // Determine current display dimensions before rotation
    const isOldSwapped = oldRotation === 90 || oldRotation === 270;
    const curW = isOldSwapped ? pageToRotate.height : pageToRotate.width;
    const curH = isOldSwapped ? pageToRotate.width : pageToRotate.height;

    // Transform any existing overlays on this page so they remain aligned with visual content
    const pageId = pageToRotate.id;
    let newOverlays = overlays;
    if (overlays[pageId] && overlays[pageId].length > 0) {
      const transformed = overlays[pageId].map(overlay => {
        if (overlay.w !== undefined && overlay.h !== undefined && overlay.x !== undefined && overlay.y !== undefined) {
          return {
            ...overlay,
            x: Math.round((curH - (overlay.y + overlay.h)) * 100) / 100,
            y: Math.round(overlay.x * 100) / 100,
            w: overlay.h,
            h: overlay.w
          };
        }
        return overlay;
      });
      newOverlays = { ...overlays, [pageId]: transformed };
      setOverlays(newOverlays);
    }

    const newPages = [...pages];
    newPages[index] = { ...pageToRotate, rotation: newRotation };
    setPages(newPages);
    pushHistory({ overlays: newOverlays, pages: newPages });
  };

  const handleClearAllRedactions = () => {
    const newOverlays = {};
    for (const [pId, list] of Object.entries(overlays)) {
      const filtered = list.filter(o => o.type !== 'redact');
      if (filtered.length > 0) newOverlays[pId] = filtered;
    }
    setOverlays(newOverlays);
    pushHistory({ overlays: newOverlays, pages });
    toast.info('All redaction markings cleared.');
  };


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
    if (!uploadedFile) return;
    if (uploadedFile.size === 0) {
      toast.error('The selected file is empty (0 bytes).');
      return;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name.replace(/\.pdf$/i, ''));
    trackEvent('tool_executed', { tool_name: isRedactMode ? 'Redact PDF' : 'Pdf Editor' });
    setIsProcessing(true);
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

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
      trackError('index', 'processing_error');
      console.error(err);
      if (err?.name === 'PasswordException' || (err?.message && err.message.toLowerCase().includes('password'))) {
        toast.error('This PDF is password-protected. Please unlock it using Unlock PDF first.');
      } else if (err?.name === 'InvalidPDFException' || (err?.message && err.message.toLowerCase().includes('invalid pdf'))) {
        toast.error('The selected file is corrupted or not a valid PDF document.');
      } else {
        toast.error('Failed to load PDF: ' + (err.message || 'Unknown error'));
      }
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

  const handleExportClick = () => {
    if (isRedactMode && totalRedactionsCount > 0) {
      setShowRedactConfirmModal(true);
    } else {
      executeExport();
    }
  };

  const executeExport = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setIsProcessing(true);

    try {
      const pdfBytes = await file.arrayBuffer();
      const { PDFDocument, rgb, StandardFonts, degrees, PDFName } = await import('pdf-lib');

      const originalDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();
      const helveticaFont = await newDoc.embedFont(StandardFonts.Helvetica);

      // MANDATORY FAIL-CLOSED PRE-SANITIZATION OF SOURCE DOCUMENT:
      // Remove all /Annots and /AA from every page in originalDoc BEFORE copyPages is called.
      // This strictly prevents pdf-lib's copyPages from traversing, copying, or registering
      // any annotation dictionaries, appearance streams (/AP), file specifications (/FS),
      // embedded files (/EF), or action dictionaries (/A, /AA) into newDoc.context!
      try {
        const origPageCount = originalDoc.getPageCount();
        for (let pi = 0; pi < origPageCount; pi++) {
          const origPageNode = originalDoc.getPage(pi).node;
          if (origPageNode.has(PDFName.of('Annots'))) {
            origPageNode.delete(PDFName.of('Annots'));
          }
          if (origPageNode.has(PDFName.of('AA'))) {
            origPageNode.delete(PDFName.of('AA'));
          }
        }
        if (originalDoc.catalog.has(PDFName.of('AcroForm'))) {
          originalDoc.catalog.delete(PDFName.of('AcroForm'));
        }
        if (originalDoc.catalog.has(PDFName.of('AA'))) {
          originalDoc.catalog.delete(PDFName.of('AA'));
        }
      } catch (preSanitizeErr) {
        throw new Error('Pre-export document sanitization failed: ' + preSanitizeErr.message);
      }

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const pageOverlays = (overlaysRef.current || overlays)[p.id] || [];
        const redactions = pageOverlays.filter(overlay => overlay.type === 'redact');
        let outputPage;
        let pageHeight;

        const pdfPage = await pdfJsDoc.getPage(p.originalIndex + 1);
        const totalRotation = (pdfPage.rotate + (p.rotation || 0)) % 360;

        // Single canonical source of truth for page dimensions across all 16 rotation combinations
        const pageVp = pdfPage.getViewport({ scale: 1.0, rotation: totalRotation });
        const currentWidth = pageVp.width;
        const currentHeight = pageVp.height;

        if (redactions.length > 0) {
          // Adaptive renderScale: high-DPI crispness clamped to max 4096px / 16MP canvas
          const maxDim = Math.max(currentWidth, currentHeight);
          let renderScale = 2.0;
          if (maxDim * 2.0 > 4096) {
            renderScale = Math.max(1.0, 4096 / maxDim);
          } else if (maxDim <= 1000) {
            renderScale = 2.5;
          }

          const viewport = pdfPage.getViewport({ scale: renderScale, rotation: totalRotation });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');

          // Align PDF.js viewport rendering to exact integer canvas pixel dimensions
          const transform = (canvas.width !== viewport.width || canvas.height !== viewport.height)
            ? [canvas.width / viewport.width, 0, 0, canvas.height / viewport.height, 0, 0]
            : null;

          await pdfPage.render({ canvasContext: context, viewport, ...(transform ? { transform } : {}) }).promise;

          context.fillStyle = '#000000';

          // Actual effective pixel-to-point scale factors accounting for canvas dimension ceiling
          const scaleX = canvas.width / currentWidth;
          const scaleY = canvas.height / currentHeight;

          for (const redaction of redactions) {
            // Safe Redaction Boundary Expansion:
            // Add a 6 pt (~2 mm) outward expansion margin before pixel snapping and boundary clamping
            // to securely cover font ascenders, descenders (e.g. g, j, p, q, y), italic overhangs,
            // and subpixel edge bleed across both body text and large typography.
            const PADDING_PT = 6;
            const x1 = Math.max(0, redaction.x - PADDING_PT);
            const y1 = Math.max(0, redaction.y - PADDING_PT);
            const x2 = Math.min(currentWidth, redaction.x + redaction.w + PADDING_PT);
            const y2 = Math.min(currentHeight, redaction.y + redaction.h + PADDING_PT);

            // Integer snapping outward to whole raster canvas pixels using actual effective conversion scale
            const rx = Math.max(0, Math.floor(x1 * scaleX));
            const ry = Math.max(0, Math.floor(y1 * scaleY));
            const rx2 = Math.min(canvas.width, Math.ceil(x2 * scaleX));
            const ry2 = Math.min(canvas.height, Math.ceil(y2 * scaleY));
            const rw = rx2 - rx;
            const rh = ry2 - ry;

            context.fillRect(rx, ry, rw, rh);
          }

          // Use blob arrayBuffer to avoid huge base64 memory copies
          const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
          const buffer = await blob.arrayBuffer();
          const flattenedImage = await newDoc.embedPng(buffer);

          // Free canvas backing memory immediately
          canvas.width = 0;
          canvas.height = 0;

          outputPage = newDoc.addPage([currentWidth, currentHeight]);
          outputPage.drawImage(flattenedImage, {
            x: 0,
            y: 0,
            width: currentWidth,
            height: currentHeight,
          });
          pageHeight = currentHeight;
        } else {
          // Clean unredacted page: preserve original vector content
          const [copiedPage] = await newDoc.copyPages(originalDoc, [p.originalIndex]);
          if (p.rotation !== 0) {
            const currentRot = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees((currentRot + p.rotation) % 360));
          }

          // Defensive fail-closed verification: ensure /Annots and /AA are 100% purged on copied page
          try {
            if (copiedPage.node.has(PDFName.of('Annots'))) {
              copiedPage.node.delete(PDFName.of('Annots'));
            }
            if (copiedPage.node.has(PDFName.of('AA'))) {
              copiedPage.node.delete(PDFName.of('AA'));
            }
          } catch (annotErr) {
            throw new Error('Annotation sanitization failed on page ' + (i + 1) + ': ' + annotErr.message);
          }

          outputPage = copiedPage;
          newDoc.addPage(outputPage);
          pageHeight = copiedPage.getSize().height;
        }

        // Draw any non-redaction overlays (text, drawings, signatures)
        for (const overlay of pageOverlays) {
          if (overlay.type === 'redact') continue; // Redactions were securely burned into raster image
          const [r, g, b] = hexToRgb(overlay.color || '#000000');

          if (overlay.type === 'text') {
            outputPage.drawText(overlay.text || 'Text', {
              x: overlay.x,
              y: pageHeight - overlay.y - (overlay.fontSize || 24),
              size: overlay.fontSize || 24,
              font: helveticaFont,
              color: rgb(r, g, b),
            });
          } else if (overlay.type === 'rect') {
            outputPage.drawRectangle({
              x: overlay.x,
              y: pageHeight - overlay.y - overlay.h,
              width: overlay.w,
              height: overlay.h,
              borderColor: rgb(r, g, b),
              borderWidth: overlay.strokeWidth,
            });
          } else if (overlay.type === 'circle') {
            outputPage.drawEllipse({
              x: overlay.x + overlay.w / 2,
              y: pageHeight - overlay.y - overlay.h / 2,
              xScale: overlay.w / 2,
              yScale: overlay.h / 2,
              borderColor: rgb(r, g, b),
              borderWidth: overlay.strokeWidth,
            });
          } else if (['path', 'highlight_path'].includes(overlay.type)) {
            outputPage.drawSvgPath(overlay.svgPath, {
              x: overlay.x,
              y: pageHeight - overlay.y,
              borderColor: rgb(r, g, b),
              borderWidth: overlay.strokeWidth,
              opacity: overlay.opacity || 1
            });
          } else if ((overlay.type === 'image' || overlay.type === 'signature') && overlay.src) {
            const image = overlay.src.startsWith('data:image/jpeg')
              ? await newDoc.embedJpg(overlay.src)
              : await newDoc.embedPng(overlay.src);
            outputPage.drawImage(image, {
              x: overlay.x,
              y: pageHeight - overlay.y - overlay.h,
              width: overlay.w,
              height: overlay.h,
            });
          } else if (overlay.type === 'signature' && overlay.text) {
            outputPage.drawText(overlay.text, {
              x: overlay.x,
              y: pageHeight - overlay.y - (overlay.fontSize || 24),
              size: overlay.fontSize || 24,
              font: helveticaFont,
              color: rgb(r, g, b),
            });
          }
        }
      }

      // MANDATORY FAIL-CLOSED CONTEXT CLEANUP:
      // Physically purge any indirect objects that might be annotations, actions, or file specs
      try {
        const indirectEntries = Array.from(newDoc.context.enumerateIndirectObjects());
        for (const [ref, obj] of indirectEntries) {
          if (obj && typeof obj.get === 'function') {
            const typeVal = obj.get(PDFName.of('Type'));
            const typeStr = typeVal ? typeVal.toString() : '';
            if (typeStr === '/Annot' || typeStr === '/Action' || typeStr === '/Filespec') {
              newDoc.context.delete(ref);
            }
          }
        }
      } catch (contextSanitizeErr) {
        throw new Error('Context indirect object sanitization failed: ' + contextSanitizeErr.message);
      }

      // Metadata sanitization: strip sensitive Title, Author, Subject, Keywords; set clean producer info
      newDoc.setTitle('');
      newDoc.setAuthor('');
      newDoc.setSubject('');
      newDoc.setKeywords([]);
      newDoc.setProducer('PDFTools4U (In-Browser Privacy Engine)');
      newDoc.setCreator('PDFTools4U');
      newDoc.setCreationDate(new Date());
      newDoc.setModificationDate(new Date());

      const finalPdfBytes = await newDoc.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isRedactMode ? `${fileName}-redacted.pdf` : `${fileName}.pdf`;
      window.__lastExportedBlobUrl = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      toast.success('Document downloaded successfully!');
    } catch (err) {
      trackError('index', 'processing_error');
      console.error(err);
      toast.error('Failed to export PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
      exportingRef.current = false;
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
        onExport={handleExportClick}
        isProcessing={isProcessing}
        isRedactMode={isRedactMode}
        onClearRedactions={handleClearAllRedactions}
        totalRedactionsCount={totalRedactionsCount}
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
          isRedactMode={isRedactMode}
          onRotatePage={handleRotatePage}
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
            onRotatePage={handleRotatePage}
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
        {showRedactConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Permanent Redaction</h3>
                  <p className="text-xs text-gray-500">Irreversible document sanitization</p>
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex flex-col gap-2">
                <div className="font-semibold flex items-center justify-between">
                  <span>Total Redaction Areas:</span>
                  <span className="bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-bold">{totalRedactionsCount}</span>
                </div>
                <div className="font-semibold flex items-center justify-between">
                  <span>Pages Requiring Flattening:</span>
                  <span className="bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-bold">{pagesWithRedactionsCount} of {pages.length}</span>
                </div>
                <div className="text-[11px] text-amber-800 leading-relaxed mt-1 space-y-1.5">
                  <p>
                    <strong>Permanent Rasterization:</strong> Pages containing redactions are permanently converted into flattened pixel bitmaps. Underlying text glyphs, font definitions, and vector graphics are completely removed and cannot be recovered via text search, copy-paste, or PDF object inspection.
                  </p>
                  <p>
                    <strong>Safety Boundary Margin:</strong> A 6 pt (~2 mm) outward expansion margin is automatically applied around all redactions to prevent glyph edge and ascender/descender exposure. Users should always drag the selection to fully encompass sensitive text and headings.
                  </p>
                  <p>
                    <strong>Hybrid Vector Retention:</strong> Clean pages retain their original vector quality. Sensitive comments, annotations, and form fields on unredacted pages are sanitized to prevent data leakage. Document-level metadata is purged.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowRedactConfirmModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRedactConfirmModal(false);
                    executeExport();
                  }}
                  className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Confirm & Download</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { generateId } from './utils';
import { trackError } from '../../lib/analytics';

export default function Canvas({
  pages,
  activePageIndex,
  activePageId,
  setActivePageIndex,
  pdfJsDoc,
  zoom,
  setZoom,
  activeTool,
  setActiveTool,
  toolConfig,
  overlays,
  setOverlays,
  pushHistory
}) {
  const containerRef = useRef(null);
  const drawCanvasRef = useRef(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [currentShape, setCurrentShape] = useState(null);

  // Handles adding text on click (shapes are now drag-to-draw)
  const handleContainerClick = (e) => {
    if (['select', 'pencil', 'highlighter', 'eraser', 'hand', 'rect', 'circle', 'redact'].includes(activeTool)) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    if (activeTool === 'text') {
      const newOverlay = { 
        id: generateId(), 
        type: 'text', 
        x, 
        y, 
        color: toolConfig.color,
        text: 'New Text',
        fontSize: toolConfig.size || 24,
        w: 150,
        h: 40
      };

      const newOverlays = { ...overlays };
      if (!newOverlays[activePageId]) newOverlays[activePageId] = [];
      newOverlays[activePageId] = [...newOverlays[activePageId], newOverlay];
      
      setOverlays(newOverlays);
      pushHistory();
      setActiveTool('select'); 
    } else if (activeTool === 'signature') {
      const newOverlay = { 
        id: generateId(), 
        type: 'signature', 
        x, 
        y, 
        color: '#ef4444',
        text: 'APPROVED',
        w: 200,
        h: 60
      };

      const newOverlays = { ...overlays };
      if (!newOverlays[activePageId]) newOverlays[activePageId] = [];
      newOverlays[activePageId] = [...newOverlays[activePageId], newOverlay];
      
      setOverlays(newOverlays);
      pushHistory();
      setActiveTool('select'); 
    }
  };

  const getEventPos = (e) => {
    const rect = drawCanvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  const onMouseDown = (e) => {
    if (activeTool === 'hand') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (['pencil', 'highlighter'].includes(activeTool)) {
      e.preventDefault();
      const { x, y } = getEventPos(e);
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (['rect', 'circle', 'redact'].includes(activeTool)) {
      e.preventDefault();
      const { x, y } = getEventPos(e);
      setIsDrawing(true);
      setCurrentShape({ startX: x, startY: y, currentX: x, currentY: y });
    }
  };

  const onMouseMove = (e) => {
    if (isPanning && activeTool === 'hand' && containerRef.current?.parentElement) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.parentElement.scrollBy(-dx, -dy);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing) return;
    
    if (['pencil', 'highlighter'].includes(activeTool)) {
      e.preventDefault();
      const { x, y } = getEventPos(e);
      setCurrentPath(prev => [...prev, { x, y }]);
      
      // Live render path
      const ctx = drawCanvasRef.current.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (['rect', 'circle', 'redact'].includes(activeTool) && currentShape) {
      e.preventDefault();
      const { x, y } = getEventPos(e);
      setCurrentShape(prev => ({ ...prev, currentX: x, currentY: y }));
      
      // Live render shape on temporary canvas
      const ctx = drawCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
      
      const xOrigin = Math.min(currentShape.startX, x);
      const yOrigin = Math.min(currentShape.startY, y);
      const w = Math.abs(x - currentShape.startX);
      const h = Math.abs(y - currentShape.startY);
      
      ctx.strokeStyle = activeTool === 'redact' ? '#000000' : toolConfig.color;
      ctx.lineWidth = toolConfig.strokeWidth;
      
      if (activeTool === 'rect' || activeTool === 'redact') {
        ctx.strokeRect(xOrigin, yOrigin, w, h);
        if (activeTool === 'redact') {
          ctx.fillStyle = 'rgba(0,0,0,1)';
          ctx.fillRect(xOrigin, yOrigin, w, h);
        }
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(xOrigin + w/2, yOrigin + h/2, w/2, h/2, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const onMouseUp = () => {
    if (activeTool === 'hand') {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (['pencil', 'highlighter'].includes(activeTool) && currentPath?.length > 1) {
      const svgPath = currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      
      const newOverlay = {
        id: generateId(),
        type: activeTool === 'highlighter' ? 'highlight_path' : 'path',
        svgPath,
        color: toolConfig.color,
        strokeWidth: activeTool === 'highlighter' ? Math.max(16, toolConfig.strokeWidth) : toolConfig.strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.4 : 1,
        x: 0,
        y: 0
      };

      const newOverlays = { ...overlays };
      if (!newOverlays[activePageId]) newOverlays[activePageId] = [];
      newOverlays[activePageId] = [...newOverlays[activePageId], newOverlay];
      
      setOverlays(newOverlays);
      pushHistory();
    } else if (['rect', 'circle', 'redact'].includes(activeTool) && currentShape) {
      const w = Math.abs(currentShape.currentX - currentShape.startX);
      const h = Math.abs(currentShape.currentY - currentShape.startY);
      
      // Don't create if too small (accidental click)
      if (w > 5 && h > 5) {
        const newOverlay = {
          id: generateId(),
          type: activeTool,
          color: activeTool === 'redact' ? '#000000' : toolConfig.color,
          strokeWidth: toolConfig.strokeWidth,
          x: Math.min(currentShape.startX, currentShape.currentX),
          y: Math.min(currentShape.startY, currentShape.currentY),
          w,
          h
        };
        
        const newOverlays = { ...overlays };
        if (!newOverlays[activePageId]) newOverlays[activePageId] = [];
        newOverlays[activePageId] = [...newOverlays[activePageId], newOverlay];
        
        setOverlays(newOverlays);
        pushHistory();
      }
      setCurrentShape(null);
      setActiveTool('select');
    }
    
    setCurrentPath([]);
    const ctx = drawCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    ctx.beginPath();
  };

  useEffect(() => {
    if (drawCanvasRef.current && ['pencil', 'highlighter'].includes(activeTool)) {
      const ctx = drawCanvasRef.current.getContext('2d');
      ctx.strokeStyle = toolConfig.color;
      ctx.lineWidth = activeTool === 'highlighter' ? Math.max(16, toolConfig.strokeWidth) : toolConfig.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = activeTool === 'highlighter' ? 0.4 : 1;
      if (!isDrawing) ctx.beginPath();
    }
  }, [activeTool, toolConfig, isDrawing]);

  // Auto fit-to-width when pages load or document changes
  useEffect(() => {
    if (!pages || pages.length === 0) return;

    const performFit = () => {
      const activePage = pages[activePageIndex] || pages[0];
      if (!activePage || !activePage.width) return;

      const container = containerRef.current?.closest('.flex-1') || document.querySelector('.flex-1.bg-\\[\\#e5e7eb\\]') || document.querySelector('.flex-1');
      if (container && container.clientWidth > 0) {
        const availableWidth = container.clientWidth - 80; // Comfortable padding
        if (availableWidth > 0) {
          // Convert PDF points (72dpi) to CSS pixels (96dpi: 1pt = 1.333px)
          const cssPageWidth = activePage.width * (96 / 72);
          const fitZoom = availableWidth / cssPageWidth;
          // Cap at 1.05 max so pages render at comfortable paper size
          const clampedZoom = Math.min(1.05, Math.max(0.5, Number(fitZoom.toFixed(2))));
          setZoom(clampedZoom);
        }
      }
    };

    performFit();
    const t1 = setTimeout(performFit, 50);
    const t2 = setTimeout(performFit, 200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pages, activePageIndex, pdfJsDoc]);

  const activePage = pages[activePageIndex];
  if (!activePage) return null;

  const pageOverlays = overlays[activePageId] || [];

  return (
    <div className="flex-1 bg-[#e5e7eb] overflow-auto custom-scrollbar relative flex flex-col items-center justify-start p-6 pb-24">
      
      {/* Sizing Wrapper: Layout box matches scaled size so scrollbars only appear when zoomed in too much */}
      <div 
        style={{ 
          width: activePage.width * zoom, 
          height: activePage.height * zoom 
        }} 
        className="shrink-0 relative flex items-center justify-center my-auto transition-all duration-200"
      >
        <div 
          ref={containerRef}
          className={`relative bg-white shadow-2xl transition-transform duration-200 origin-top-left ${
            activeTool === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') 
            : activeTool === 'eraser' ? 'cursor-not-allowed'
            : ['pencil', 'highlighter'].includes(activeTool) ? 'cursor-crosshair'
            : 'cursor-default'
          }`}
          style={{ 
            width: activePage.width, 
            height: activePage.height,
            transform: `scale(${zoom})`
          }}
          onClick={handleContainerClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
        <PageCanvasRenderer 
          pdfJsDoc={pdfJsDoc} 
          pageIndex={activePage.originalIndex + 1} 
          width={activePage.width} 
          height={activePage.height}
          rotation={activePage.rotation}
        />

        {/* Temporary Canvas for Active Drawing */}
        <canvas 
          ref={drawCanvasRef}
          width={activePage.width}
          height={activePage.height}
          className={`absolute inset-0 z-10 ${['pencil', 'highlighter'].includes(activeTool) ? 'pointer-events-auto' : 'pointer-events-none'}`}
        />
        
        {/* Rendered Overlays Layer */}
        {pageOverlays.map((overlay, idx) => (
          <div
            key={overlay.id}
            className={`absolute group z-20 ${['select', 'eraser'].includes(activeTool) ? 'pointer-events-auto' : 'pointer-events-none'} ${activeTool === 'select' && overlay.type !== 'path' && overlay.type !== 'highlight_path' ? 'hover:outline hover:outline-2 hover:outline-blue-400 cursor-move' : ''}`}
            style={{ 
              left: ['path', 'highlight_path'].includes(overlay.type) ? 0 : overlay.x, 
              top: ['path', 'highlight_path'].includes(overlay.type) ? 0 : overlay.y, 
              width: overlay.w ? `${overlay.w}px` : ['path', 'highlight_path'].includes(overlay.type) ? '100%' : 'auto',
              height: overlay.h ? `${overlay.h}px` : ['path', 'highlight_path'].includes(overlay.type) ? '100%' : 'auto',
              color: overlay.color,
              opacity: overlay.opacity || 1
            }}
            onMouseDown={(e) => {
              if (activeTool === 'eraser') {
                e.stopPropagation();
                const newOverlays = { ...overlays };
                newOverlays[activePageId] = newOverlays[activePageId].filter(o => o.id !== overlay.id);
                setOverlays(newOverlays);
                pushHistory();
                return;
              }

              if (activeTool !== 'select' || ['path', 'highlight_path'].includes(overlay.type)) return;
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const originalX = overlay.x;
              const originalY = overlay.y;

              const handleDragMove = (moveEvent) => {
                const dx = (moveEvent.clientX - startX) / zoom;
                const dy = (moveEvent.clientY - startY) / zoom;
                const newOverlays = { ...overlays };
                newOverlays[activePageId][idx] = { ...overlay, x: originalX + dx, y: originalY + dy };
                setOverlays(newOverlays);
              };

              const handleDragUp = () => {
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragUp);
                pushHistory();
              };

              document.addEventListener('mousemove', handleDragMove);
              document.addEventListener('mouseup', handleDragUp);
            }}
          >
            {overlay.type === 'text' && (
              <input
                type="text"
                value={overlay.text}
                onChange={(e) => {
                  const newOverlays = { ...overlays };
                  newOverlays[activePageId][idx] = { ...overlay, text: e.target.value };
                  setOverlays(newOverlays);
                }}
                onBlur={() => pushHistory()}
                className="bg-transparent border-none outline-none p-0 m-0 w-full"
                style={{ fontSize: `${overlay.fontSize}px`, color: overlay.color, fontWeight: 'bold' }}
              />
            )}
            
            {overlay.type === 'rect' && (
              <div className="w-full h-full" style={{ border: `${overlay.strokeWidth}px solid ${overlay.color}` }}></div>
            )}
            
            {overlay.type === 'circle' && (
              <div className="w-full h-full rounded-full" style={{ border: `${overlay.strokeWidth}px solid ${overlay.color}` }}></div>
            )}

            {overlay.type === 'image' && (
              <img src={overlay.src} alt="overlay" className="w-full h-full object-cover rounded-md pointer-events-none" />
            )}
            
            {overlay.type === 'signature' && (
              <div className="w-full h-full flex items-center justify-center border-4 border-red-500 rounded-lg transform -rotate-12 pointer-events-none">
                <span className="text-red-500 font-bold text-3xl uppercase tracking-widest">{overlay.text}</span>
              </div>
            )}

            {overlay.type === 'redact' && (
              <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
                <div className="w-[150%] h-[150%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMjIyIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] opacity-20"></div>
              </div>
            )}

            {['path', 'highlight_path'].includes(overlay.type) && (
              <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
                <path d={overlay.svgPath} stroke={overlay.color} strokeWidth={overlay.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}

            {/* Delete button */}
            {activeTool === 'select' && (
              <button 
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  const newOverlays = { ...overlays };
                  newOverlays[activePageId] = newOverlays[activePageId].filter(o => o.id !== overlay.id);
                  setOverlays(newOverlays);
                  pushHistory();
                }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      </div>

      {/* Floating Pagination Footer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md rounded-full shadow-2xl px-6 py-2.5 flex items-center gap-6 z-50">
        <button 
          onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
          disabled={activePageIndex === 0}
          className="text-white disabled:opacity-30 hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="text-white font-medium text-sm tracking-widest">
          {activePageIndex + 1} / {pages.length}
        </div>
        
        <button 
          onClick={() => setActivePageIndex(Math.min(pages.length - 1, activePageIndex + 1))}
          disabled={activePageIndex === pages.length - 1}
          className="text-white disabled:opacity-30 hover:text-blue-400 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}

function PageCanvasRenderer({ pdfJsDoc, pageIndex, width, height, rotation }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let renderTask = null;
    let isActive = true;

    const renderPage = async () => {
      if (!pdfJsDoc || !canvasRef.current) return;
      
      try {
        const page = await pdfJsDoc.getPage(pageIndex);
        const viewport = page.getViewport({ scale: 1.5 }); 
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });
        
        await renderTask.promise;
      } catch (err) {
      trackError('Canvas', 'processing_error');
        if (err.name !== 'RenderingCancelledException') {
          console.error("Error rendering page", err);
        }
      }
    };

    renderPage();

    return () => {
      isActive = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfJsDoc, pageIndex]);

  return (
    <div 
      className="absolute inset-0 z-0 bg-white shadow-[0_0_1px_rgba(0,0,0,0.5)] pointer-events-none transition-transform duration-300"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
    </div>
  );
}

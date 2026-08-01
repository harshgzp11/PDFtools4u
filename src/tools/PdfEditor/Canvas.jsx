import React, { useRef, useEffect, useState } from 'react';
import { Trash2, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { generateId } from './utils';

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

  // Handles adding shapes and text on click
  const handleContainerClick = (e) => {
    if (['select', 'pencil', 'highlighter', 'eraser', 'hand'].includes(activeTool)) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    const newOverlay = { 
      id: generateId(), 
      type: activeTool, 
      x, 
      y, 
      color: activeTool === 'redact' ? '#000000' : toolConfig.color,
      strokeWidth: toolConfig.strokeWidth 
    };

    if (activeTool === 'text') {
      newOverlay.text = 'New Text';
      newOverlay.fontSize = toolConfig.size || 24;
      newOverlay.w = 150;
      newOverlay.h = 40;
    } else if (activeTool === 'rect' || activeTool === 'redact') {
      newOverlay.w = 150;
      newOverlay.h = 100;
      if (activeTool === 'redact') newOverlay.h = 30;
    } else if (activeTool === 'circle') {
      newOverlay.r = 50;
      newOverlay.w = 100;
      newOverlay.h = 100;
    } else if (activeTool === 'image') {
      newOverlay.w = 200;
      newOverlay.h = 200;
      newOverlay.src = 'https://images.unsplash.com/photo-1528297506728-9533d2ac3fa4?w=200&h=200&fit=crop';
    } else if (activeTool === 'signature') {
      newOverlay.w = 200;
      newOverlay.h = 60;
      newOverlay.text = 'APPROVED';
    }

    const newOverlays = { ...overlays };
    if (!newOverlays[activePageId]) newOverlays[activePageId] = [];
    newOverlays[activePageId] = [...newOverlays[activePageId], newOverlay];
    
    setOverlays(newOverlays);
    pushHistory();
    setActiveTool('select'); 
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
    
    if (!['pencil', 'highlighter'].includes(activeTool)) return;
    e.preventDefault();
    
    const { x, y } = getEventPos(e);
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const onMouseMove = (e) => {
    if (isPanning && activeTool === 'hand' && containerRef.current?.parentElement) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.parentElement.scrollBy(-dx, -dy);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing || !['pencil', 'highlighter'].includes(activeTool)) return;
    e.preventDefault();
    
    const { x, y } = getEventPos(e);
    setCurrentPath(prev => [...prev, { x, y }]);
    
    // Live render
    const ctx = drawCanvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onMouseUp = () => {
    if (activeTool === 'hand') {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !['pencil', 'highlighter'].includes(activeTool)) return;
    setIsDrawing(false);
    
    if (currentPath.length > 1) {
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

  const activePage = pages[activePageIndex];
  if (!activePage) return null;

  const pageOverlays = overlays[activePageId] || [];

  return (
    <div className="flex-1 bg-[#e5e7eb] overflow-auto relative flex flex-col items-center justify-start p-8 pb-32">
      
      <div 
        ref={containerRef}
        className={`relative bg-white shadow-2xl transition-transform duration-200 origin-top ${
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

      {/* Floating Zoom Dock (Bottom Right) */}
      <div className="fixed bottom-6 right-6 bg-gray-900/90 backdrop-blur-md rounded-full shadow-2xl px-2 py-1.5 flex items-center gap-1 z-50">
         <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="p-2 text-white hover:text-blue-400 transition-colors rounded-full"><ZoomOut className="w-4 h-4" /></button>
         <div className="text-white font-medium text-xs tracking-wide w-12 text-center select-none">
           {Math.round(zoom * 100)}%
         </div>
         <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-2 text-white hover:text-blue-400 transition-colors rounded-full"><ZoomIn className="w-4 h-4" /></button>
         <div className="w-px h-4 bg-white/20 mx-1"></div>
         <button 
           onClick={() => {
             if (containerRef.current?.parentElement) {
               const parent = containerRef.current.parentElement;
               // Calculate zoom to fit container width (minus padding)
               const newZoom = (parent.clientWidth - 64) / activePage.width;
               setZoom(Math.min(3, Math.max(0.25, newZoom)));
             } else {
               setZoom(1);
             }
           }} 
           className="p-2 text-white hover:text-blue-400 transition-colors rounded-full" 
           title="Fit to width"
         >
           <Maximize className="w-4 h-4" />
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

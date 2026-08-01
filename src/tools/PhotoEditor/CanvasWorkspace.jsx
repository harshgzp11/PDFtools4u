import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Maximize } from 'lucide-react';
import { fabric } from 'fabric';

export default function CanvasWorkspace({ 
  imageSrc, 
  setFabricCanvas, 
  fabricCanvas, 
  activeTool, 
  toolConfig,
  saveHistorySnapshot 
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Sync zoom level with Fabric.js canvas
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const updateZoom = () => {
      const currentZoom = fabricCanvas.getZoom();
      setZoomLevel(Math.round(currentZoom * 100));
    };

    fabricCanvas.on('mouse:wheel', updateZoom);
    updateZoom();

    return () => {
      fabricCanvas.off('mouse:wheel', updateZoom);
    };
  }, [fabricCanvas]);

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = fabricCanvas.getZoom() * 1.1;
    fabricCanvas.zoomToPoint({ x: fabricCanvas.width / 2, y: fabricCanvas.height / 2 }, newZoom);
    setZoomLevel(Math.round(newZoom * 100));
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = fabricCanvas.getZoom() / 1.1;
    fabricCanvas.zoomToPoint({ x: fabricCanvas.width / 2, y: fabricCanvas.height / 2 }, newZoom);
    setZoomLevel(Math.round(newZoom * 100));
  };

  const handleZoomFit = () => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(1);
    setZoomLevel(100);
  };

  useEffect(() => {
    if (!imageSrc || !canvasRef.current || !containerRef.current) return;

    let isDisposed = false;

    // Initialize Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      preserveObjectStacking: true,
      selection: activeTool === 'select'
    });

    setFabricCanvas(canvas);

    // Load Image with CORS enabled to avoid tainted canvas
    fabric.Image.fromURL(imageSrc, (img) => {
      if (isDisposed) return;
      
      // Set the internal resolution to match the image exactly (High DPI management)
      canvas.setWidth(img.width);
      canvas.setHeight(img.height);
      
      // Calculate a scale to fit the image into the workspace container visually
      const container = containerRef.current;
      const padding = 60;
      const scale = Math.min(
        (container.clientWidth - padding) / img.width, 
        (container.clientHeight - padding) / img.height
      );

      // Apply CSS-only scaling to visually shrink the canvas without losing internal resolution
      canvas.setDimensions({
        width: `${img.width * scale}px`,
        height: `${img.height * scale}px`
      }, { cssOnly: true });

      // Set image as background
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
      
      // Save initial state to history
      setTimeout(() => {
        if (!isDisposed) saveHistorySnapshot();
      }, 100);

    }, { crossOrigin: 'anonymous' });

    // Handle window resize to adjust visual CSS scaling
    const handleResize = () => {
      if (isDisposed) return;
      if (canvas.backgroundImage) {
        const img = canvas.backgroundImage;
        const container = containerRef.current;
        if (!container) return;
        
        const padding = 60;
        const scale = Math.min(
          (container.clientWidth - padding) / img.width, 
          (container.clientHeight - padding) / img.height
        );
        
        // Use current internal zoom level if user has zoomed manually
        const currentInternalZoom = canvas.getZoom();
        
        canvas.setDimensions({
          width: `${img.width * scale * currentInternalZoom}px`,
          height: `${img.height * scale * currentInternalZoom}px`
        }, { cssOnly: true });
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      setFabricCanvas(null);
    };
  }, [imageSrc, setFabricCanvas]); // Do NOT include saveHistorySnapshot directly or it will re-init

  // Tool handling
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === 'draw';
    fabricCanvas.selection = activeTool === 'select';

    // Disable interaction with objects if we're not in select mode (unless drawing)
    fabricCanvas.getObjects().forEach(obj => {
      obj.set('selectable', activeTool === 'select');
      obj.set('evented', activeTool === 'select');
    });

    if (activeTool === 'draw') {
      fabricCanvas.freeDrawingBrush.color = toolConfig.color || '#000000';
      fabricCanvas.freeDrawingBrush.width = toolConfig.strokeWidth || 5;
      if (toolConfig.strokeDashArray === 'dashed') {
        fabricCanvas.freeDrawingBrush.strokeDashArray = [toolConfig.strokeWidth * 3, toolConfig.strokeWidth * 3];
      } else if (toolConfig.strokeDashArray === 'dotted') {
        fabricCanvas.freeDrawingBrush.strokeDashArray = [toolConfig.strokeWidth, toolConfig.strokeWidth * 2];
      } else {
        fabricCanvas.freeDrawingBrush.strokeDashArray = null;
      }
    }

  }, [fabricCanvas, activeTool, toolConfig]);

  // Handle path created for history
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const onPathCreated = () => {
      saveHistorySnapshot();
    };
    
    const onObjectModified = () => {
      saveHistorySnapshot();
    };

    fabricCanvas.on('path:created', onPathCreated);
    fabricCanvas.on('object:modified', onObjectModified);

    return () => {
      fabricCanvas.off('path:created', onPathCreated);
      fabricCanvas.off('object:modified', onObjectModified);
    };
  }, [fabricCanvas, saveHistorySnapshot]);
  // Handle freestyle cropping
  useEffect(() => {
    if (!fabricCanvas || activeTool !== 'crop' || toolConfig.cropMode !== 'freestyle') return;

    let isDrawing = false;
    let rect, origX, origY;

    // Set cursor to crosshair for freestyle drawing
    fabricCanvas.defaultCursor = 'crosshair';
    fabricCanvas.requestRenderAll();

    const onMouseDown = (o) => {
      // Don't start drawing if clicking on an existing cropbox control handle
      if (o.target && o.target.id === 'cropbox') return;

      const existing = fabricCanvas.getObjects().find(obj => obj.id === 'cropbox');
      if (existing) {
        fabricCanvas.remove(existing);
      }

      isDrawing = true;
      const pointer = fabricCanvas.getPointer(o.e);
      origX = pointer.x;
      origY = pointer.y;

      rect = new fabric.Rect({
        id: 'cropbox',
        left: origX,
        top: origY,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeDashArray: [5, 5],
        strokeWidth: 3 / fabricCanvas.getZoom(),
        cornerColor: '#3b82f6',
        cornerSize: 12 / fabricCanvas.getZoom(),
        transparentCorners: false,
        hasRotatingPoint: false,
        selectable: false,
        evented: false
      });
      fabricCanvas.add(rect);
    };

    const onMouseMove = (o) => {
      if (!isDrawing || !rect) return;
      const pointer = fabricCanvas.getPointer(o.e);

      if (origX > pointer.x) {
        rect.set({ left: Math.abs(pointer.x) });
      }
      if (origY > pointer.y) {
        rect.set({ top: Math.abs(pointer.y) });
      }

      rect.set({ width: Math.abs(origX - pointer.x) });
      rect.set({ height: Math.abs(origY - pointer.y) });
      fabricCanvas.requestRenderAll();
    };

    const onMouseUp = () => {
      if (!isDrawing) return;
      isDrawing = false;
      if (rect) {
        rect.set({ selectable: true, evented: true });
        
        // Ensure cropbox stays on top
        fabricCanvas.bringToFront(rect);
        fabricCanvas.setActiveObject(rect);
        fabricCanvas.requestRenderAll();
      }
    };

    fabricCanvas.on('mouse:down', onMouseDown);
    fabricCanvas.on('mouse:move', onMouseMove);
    fabricCanvas.on('mouse:up', onMouseUp);

    // Disable general canvas selection box while in freestyle crop mode
    fabricCanvas.selection = false;

    return () => {
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.requestRenderAll();
      fabricCanvas.off('mouse:down', onMouseDown);
      fabricCanvas.off('mouse:move', onMouseMove);
      fabricCanvas.off('mouse:up', onMouseUp);
    };
  }, [fabricCanvas, activeTool, toolConfig.cropMode]);


  return (
    <div 
      ref={containerRef} 
      className="flex-1 overflow-auto flex items-center justify-center relative bg-gray-100"
      style={{
        backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }}
    >
      <div className="relative shadow-xl">
        <canvas ref={canvasRef} />
      </div>

      {/* Floating Bottom Bar (Zoom) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#1e293b] text-white px-4 py-2 rounded-full shadow-lg z-20">
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Zoom Out">
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-12 text-center select-none">{zoomLevel}%</span>
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Zoom In">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="w-px h-4 bg-white/20"></div>
        <button onClick={handleZoomFit} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Fit to Screen">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

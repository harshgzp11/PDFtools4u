import React, { useState } from 'react';
import { Trash2, Copy, Droplet } from 'lucide-react';

/**
 * A custom draggable and resizable overlay component for PDF annotations.
 * Built with native pointer events to ensure perfect compatibility with React 19.
 */
export default function DraggableOverlay({ 
  id, 
  dataUrl, 
  initialX = 50, 
  initialY = 50, 
  initialWidth = 150, 
  initialHeight = 75,
  initialOpacity = 1,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  onUpdate
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });
  const [opacity, setOpacity] = useState(initialOpacity);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  
  const handlePointerDown = (e) => {
    e.stopPropagation();
    onSelect(id);
    
    // Ignore if clicking a resize handle or toolbar
    if (e.target.closest('[data-resize]') || e.target.closest('.annotation-toolbar')) {
      return;
    }
    
    if (e.pointerType === 'mouse') {
      e.preventDefault();
    }
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...pos };
    
    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPos({ x: startPos.x + dx, y: startPos.y + dy });
    };
    
    const handlePointerUp = (upEvent) => {
      const finalX = startPos.x + (upEvent.clientX - startX);
      const finalY = startPos.y + (upEvent.clientY - startY);
      setPos({ x: finalX, y: finalY });
      onUpdate(id, { x: finalX, y: finalY, width: size.w, height: size.h, opacity });
      
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleResizeDown = (e, direction) => {
    e.stopPropagation();
    onSelect(id);
    
    if (e.pointerType === 'mouse') {
      e.preventDefault();
    }
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = { ...size };
    const startPos = { ...pos };
    
    const handlePointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      let newW = startSize.w;
      let newH = startSize.h;
      let newX = startPos.x;
      let newY = startPos.y;
      
      if (direction.includes('right')) newW = startSize.w + dx;
      if (direction.includes('left')) {
        newW = startSize.w - dx;
        newX = startPos.x + dx;
      }
      if (direction.includes('bottom')) newH = startSize.h + dy;
      if (direction.includes('top')) {
        newH = startSize.h - dy;
        newY = startPos.y + dy;
      }
      
      if (newW < 20) {
         newW = 20;
         if (direction.includes('left')) newX = startPos.x + startSize.w - 20;
      }
      if (newH < 20) {
         newH = 20;
         if (direction.includes('top')) newY = startPos.y + startSize.h - 20;
      }
      
      setSize({ w: newW, h: newH });
      setPos({ x: newX, y: newY });
    };
    
    const handlePointerUp = (upEvent) => {
      const dx = upEvent.clientX - startX;
      const dy = upEvent.clientY - startY;
      
      let newW = startSize.w;
      let newH = startSize.h;
      let newX = startPos.x;
      let newY = startPos.y;
      
      if (direction.includes('right')) newW = startSize.w + dx;
      if (direction.includes('left')) { newW = startSize.w - dx; newX = startPos.x + dx; }
      if (direction.includes('bottom')) newH = startSize.h + dy;
      if (direction.includes('top')) { newH = startSize.h - dy; newY = startPos.y + dy; }
      
      if (newW < 20) { newW = 20; if (direction.includes('left')) newX = startPos.x + startSize.w - 20; }
      if (newH < 20) { newH = 20; if (direction.includes('top')) newY = startPos.y + startSize.h - 20; }
      
      setSize({ w: newW, h: newH });
      setPos({ x: newX, y: newY });
      onUpdate(id, { x: newX, y: newY, width: newW, height: newH, opacity });
      
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
    
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleOpacityChange = (e) => {
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    onUpdate(id, { x: pos.x, y: pos.y, width: size.w, height: size.h, opacity: newOpacity });
  };

  return (
    <div 
      className={`absolute group touch-none select-none ${isActive ? 'z-50' : 'z-10 hover:z-20'}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.w}px`,
        height: `${size.h}px`,
      }}
    >
      <div 
        onPointerDown={handlePointerDown}
        className={`w-full h-full relative cursor-move rounded-md ${
          isActive ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : 'hover:ring-2 hover:ring-indigo-300 hover:bg-indigo-300/10'
        }`}
      >
        <img 
          src={dataUrl} 
          alt="Annotation" 
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
          style={{ opacity }}
        />

        {isActive && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-lg shadow-xl flex items-center p-1.5 gap-1 z-50 cursor-default annotation-toolbar" onPointerDown={(e) => e.stopPropagation()}>
            <div className="relative flex items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowOpacitySlider(!showOpacitySlider); }}
                className={`p-1.5 rounded-md transition-colors ${showOpacitySlider ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                title="Opacity"
              >
                <Droplet className="w-4 h-4" />
              </button>
              
              {showOpacitySlider && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 p-3 rounded-lg shadow-xl flex flex-col gap-2 min-w-[120px] z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Opacity</span>
                    <span className="text-xs font-mono">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.2" 
                    max="1" 
                    step="0.05"
                    value={opacity}
                    onChange={handleOpacityChange}
                    className="w-full accent-indigo-500"
                  />
                </div>
              )}
            </div>
            
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onDuplicate(id); }}
              className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(id); }}
              className="p-1.5 hover:bg-red-500 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {isActive && (
          <>
            <div 
              data-resize="top-left"
              onPointerDown={(e) => handleResizeDown(e, 'top-left')}
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-full cursor-nwse-resize" 
            />
            <div 
              data-resize="top-right"
              onPointerDown={(e) => handleResizeDown(e, 'top-right')}
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-full cursor-nesw-resize" 
            />
            <div 
              data-resize="bottom-left"
              onPointerDown={(e) => handleResizeDown(e, 'bottom-left')}
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-full cursor-nesw-resize" 
            />
            <div 
              data-resize="bottom-right"
              onPointerDown={(e) => handleResizeDown(e, 'bottom-right')}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-full cursor-nwse-resize" 
            />
          </>
        )}
      </div>
    </div>
  );
}


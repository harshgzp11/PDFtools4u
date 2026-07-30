import React from 'react';
import { MousePointer2, Type, Paintbrush, Square, Circle, Eraser, Undo, Redo, ZoomOut, ZoomIn, Download, Check, ArrowRight } from 'lucide-react';

export default function Toolbar({ 
  activeTool, setActiveTool, 
  toolConfig, setToolConfig, 
  zoom, setZoom, 
  canUndo, canRedo, onUndo, onRedo, 
  onExport, isProcessing 
}) {
  
  const updateConfig = (updates) => {
    setToolConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 shadow-sm z-20 relative">
      <div className="flex items-center gap-2">
        
        {/* Core Tools */}
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1 border border-gray-200/60">
          <button onClick={() => setActiveTool('select')} className={`p-2 rounded-md transition-all ${activeTool === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="Select/Move">
            <MousePointer2 className="w-4 h-4" />
          </button>
          
          <div className="w-px bg-gray-200 mx-1 my-1"></div>
          
          <button onClick={() => setActiveTool('text')} className={`p-2 rounded-md transition-all ${activeTool === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="Add Text">
            <Type className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('pencil')} className={`p-2 rounded-md transition-all ${activeTool === 'pencil' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="Freehand Draw">
            <Paintbrush className="w-4 h-4" />
          </button>
          
          <div className="w-px bg-gray-200 mx-1 my-1"></div>

          <button onClick={() => setActiveTool('rect')} className={`p-2 rounded-md transition-all ${activeTool === 'rect' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="Rectangle">
            <Square className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('circle')} className={`p-2 rounded-md transition-all ${activeTool === 'circle' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="Circle">
            <Circle className="w-4 h-4" />
          </button>
          
          <div className="w-px bg-gray-200 mx-1 my-1"></div>
          
          <button onClick={() => setActiveTool('redact')} className={`p-2 rounded-md transition-all ${activeTool === 'redact' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`} title="Redact Region (Solid Black)">
            <div className="w-4 h-4 bg-gray-900 border-2 border-dashed border-gray-400"></div>
          </button>
        </div>

        {/* Dynamic Context Settings (Color & Stroke) */}
        {activeTool !== 'select' && (
          <>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3">
              {activeTool !== 'redact' && (
                <input 
                  type="color" 
                  value={toolConfig.color}
                  onChange={(e) => updateConfig({ color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  title="Tool Color"
                />
              )}
              
              {['pencil', 'rect', 'circle', 'arrow'].includes(activeTool) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Thickness</span>
                  <input 
                    type="range" 
                    min="1" max="20" 
                    value={toolConfig.strokeWidth}
                    onChange={(e) => updateConfig({ strokeWidth: parseInt(e.target.value) })}
                    className="w-24 accent-blue-500"
                  />
                </div>
              )}
            </div>
          </>
        )}

        <div className="h-6 w-px bg-gray-200 mx-2"></div>

        {/* History */}
        <div className="flex items-center gap-1">
          <button onClick={onUndo} disabled={!canUndo} className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors" title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={onRedo} disabled={!canRedo} className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors" title="Redo">
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Zoom */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200/60 mr-4">
          <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="p-1.5 text-gray-600 hover:text-gray-900"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-sm font-medium w-12 text-center text-gray-700">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1.5 text-gray-600 hover:text-gray-900"><ZoomIn className="w-4 h-4" /></button>
        </div>

        <button 
          onClick={onExport}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
          Export PDF
        </button>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { 
  MousePointer2, Hand, Image as ImageIcon, Type, Paintbrush, 
  Highlighter, Eraser, Square, Circle, Stamp, 
  Undo, Redo, Download, Share2,
  Pencil, Cloud, LayoutGrid, Grid2X2, Search,
  ChevronDown, Check, EyeOff, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from './utils';

export default function Toolbar({ 
  file,
  fileName, setFileName,
  activeTool, setActiveTool, 
  toolConfig, setToolConfig, 
  zoom, setZoom, 
  viewMode, setViewMode,
  canUndo, canRedo, onUndo, onRedo, 
  onExport, isProcessing,
  pushHistory, activePageId, overlays, setOverlays,
  allowedTools,
  pages,
  activePageIndex
}) {
  const [showProperties, setShowProperties] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const fileInputRef = useRef(null);

  const updateConfig = (updates) => {
    setToolConfig(prev => ({ ...prev, ...updates }));
  };

  const handleImageUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        // Default max width 300, scale height proportionally
        const w = Math.min(300, img.width);
        const h = w / aspectRatio;

        const newOverlay = {
          id: generateId(),
          type: 'image',
          src: event.target.result,
          x: 100, 
          y: 100,
          w,
          h
        };

        const newOverlays = { ...overlays };
        if (!newOverlays[activePageId]) newOverlays[activePageId] = [];
        newOverlays[activePageId] = [...newOverlays[activePageId], newOverlay];
        
        setOverlays(newOverlays);
        pushHistory();
        setActiveTool('select');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(uploadedFile);
    e.target.value = ''; // reset input
  };

  const toggleTool = (toolName) => {
    if (toolName === 'crop') {
      toast.info('Cropping will be available in a future update!');
      return;
    }
    if (toolName === 'image') {
      fileInputRef.current?.click();
      return;
    }

    if (activeTool === toolName) {
      setShowProperties(!showProperties);
    } else {
      setActiveTool(toolName);
      setShowProperties(['pencil', 'highlighter', 'text', 'rect', 'circle', 'redact'].includes(toolName));
      
      if (['text', 'rect', 'circle', 'signature', 'redact'].includes(toolName)) {
        toast.info(`Drag or click anywhere on the document to place your ${toolName}`);
      }
    }
  };

  const hasProperties = ['pencil', 'highlighter', 'text', 'rect', 'circle', 'redact'].includes(activeTool);

  return (
    <div className="flex flex-col bg-white border-b border-gray-200 shrink-0 shadow-sm z-20 relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/png, image/jpeg, image/webp, image/svg+xml" 
        className="hidden" 
      />
      
      {/* Topmost Navigation Bar */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100">
        
        {/* Left: File Name */}
        <div className="flex items-center gap-3 min-w-[200px]">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                autoFocus
                className="border border-blue-400 rounded px-2 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 w-48"
              />
              <span className="text-gray-500 font-medium text-sm">.pdf</span>
              <button onMouseDown={() => setIsEditingName(false)} className="text-green-600 hover:text-green-700 transition-colors bg-green-50 p-1 rounded">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span 
                className="font-medium text-gray-700 truncate max-w-[200px] cursor-pointer hover:text-blue-600"
                onClick={() => setIsEditingName(true)}
              >
                {fileName}.pdf
              </span>
              <button 
                onClick={() => setIsEditingName(true)} 
                className="text-gray-400 hover:text-gray-600 transition-colors" 
                title="Rename"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200/80">
          <button 
            onClick={() => setZoom(prev => Math.max(0.25, Number((prev - 0.25).toFixed(2))))} 
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-all shadow-2xs"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-semibold text-gray-700 w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>

          <button 
            onClick={() => setZoom(prev => Math.min(3, Number((prev + 0.25).toFixed(2))))} 
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-all shadow-2xs"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-gray-300 mx-0.5"></div>

          <button 
            onClick={() => {
              const activePage = pages?.[activePageIndex] || pages?.[0];
              const container = document.querySelector('.flex-1.bg-\\[\\#e5e7eb\\]') || document.querySelector('.flex-1');
              if (container && activePage?.width) {
                const availableWidth = container.clientWidth - 80;
                if (availableWidth > 0) {
                  const cssPageWidth = activePage.width * (96 / 72);
                  const fitZoom = availableWidth / cssPageWidth;
                  setZoom(Math.min(1.05, Math.max(0.5, Number(fitZoom.toFixed(2)))));
                }
              }
            }} 
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-all shadow-2xs" 
            title="Fit to width"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Export Actions */}
        <div className="flex items-center gap-2 min-w-[200px] justify-end">
          <button 
            onClick={onExport}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Download processing occurs 100% locally"
          >
            {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download
          </button>
        </div>
      </div>

      {/* Secondary Tool Ribbon */}
      <div className={`h-12 px-4 flex items-center justify-center gap-6 relative bg-white transition-opacity duration-300 ${viewMode !== 'edit' ? 'opacity-30 pointer-events-none' : ''}`}>
        
        {(!allowedTools || allowedTools.some(t => ['select', 'hand'].includes(t))) && (
          <div className="flex items-center gap-1">
            {(!allowedTools || allowedTools.includes('select')) && (
              <button onClick={() => toggleTool('select')} className={`p-2 rounded-md transition-all ${activeTool === 'select' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Pointer">
                <MousePointer2 className="w-4 h-4" />
              </button>
            )}
            {(!allowedTools || allowedTools.includes('hand')) && (
              <button onClick={() => toggleTool('hand')} className={`p-2 rounded-md transition-all ${activeTool === 'hand' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Hand / Pan">
                <Hand className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {(!allowedTools || allowedTools.some(t => ['text', 'pencil', 'highlighter', 'eraser'].includes(t))) && (
          <>
            <div className="w-px h-6 bg-gray-200"></div>
            <div className="flex items-center gap-1">
              {(!allowedTools || allowedTools.includes('text')) && (
                 <button onClick={() => toggleTool('text')} className={`p-2 rounded-md transition-all flex items-center gap-1 ${activeTool === 'text' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Add Text">
                   <Type className="w-4 h-4" />
                   <ChevronDown className="w-3 h-3 opacity-50" />
                 </button>
              )}
              {(!allowedTools || allowedTools.includes('pencil')) && (
                 <button onClick={() => toggleTool('pencil')} className={`p-2 rounded-md transition-all flex items-center gap-1 ${activeTool === 'pencil' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Pen">
                   <Paintbrush className="w-4 h-4" />
                   <ChevronDown className="w-3 h-3 opacity-50" />
                 </button>
              )}
              {(!allowedTools || allowedTools.includes('highlighter')) && (
                 <button onClick={() => toggleTool('highlighter')} className={`p-2 rounded-md transition-all flex items-center gap-1 ${activeTool === 'highlighter' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Highlighter">
                   <Highlighter className="w-4 h-4" />
                   <ChevronDown className="w-3 h-3 opacity-50" />
                 </button>
              )}
              {(!allowedTools || allowedTools.includes('eraser')) && (
                 <button onClick={() => toggleTool('eraser')} className={`p-2 rounded-md transition-all ${activeTool === 'eraser' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Eraser">
                   <Eraser className="w-4 h-4" />
                 </button>
              )}
            </div>
          </>
        )}

        {(!allowedTools || allowedTools.some(t => ['rect', 'image', 'signature', 'crop', 'redact'].includes(t))) && (
          <>
            <div className="w-px h-6 bg-gray-200"></div>
            <div className="flex items-center gap-1">
               {(!allowedTools || allowedTools.includes('rect')) && (
                 <button onClick={() => toggleTool('rect')} className={`p-2 rounded-md transition-all flex items-center gap-1 ${['rect','circle'].includes(activeTool) ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Shapes">
                   <Square className="w-4 h-4" />
                   <ChevronDown className="w-3 h-3 opacity-50" />
                 </button>
               )}
               {(!allowedTools || allowedTools.includes('image')) && (
                 <button onClick={() => toggleTool('image')} className={`p-2 rounded-md transition-all ${activeTool === 'image' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Add Image">
                   <ImageIcon className="w-4 h-4" />
                 </button>
               )}
               {(!allowedTools || allowedTools.includes('signature')) && (
                 <button onClick={() => toggleTool('signature')} className={`p-2 rounded-md transition-all ${activeTool === 'signature' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Signature / Stamp">
                   <Stamp className="w-4 h-4" />
                 </button>
               )}
               {(!allowedTools || allowedTools.includes('crop')) && (
                 <button onClick={() => toggleTool('crop')} className={`p-2 rounded-md transition-all ${activeTool === 'crop' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Crop">
                   <div className="w-4 h-4 border-2 border-dashed border-gray-600 rounded-[2px]" />
                 </button>
               )}
               {(!allowedTools || allowedTools.includes('redact')) && (
                 <button onClick={() => toggleTool('redact')} className={`p-2 rounded-md transition-all ${activeTool === 'redact' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`} title="Redact">
                   <EyeOff className="w-4 h-4" />
                 </button>
               )}
            </div>
          </>
        )}

        <div className="w-px h-6 bg-gray-200"></div>

        <div className="flex items-center gap-1">
          <button onClick={onUndo} disabled={!canUndo} className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors" title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={onRedo} disabled={!canRedo} className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors" title="Redo">
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
           <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" title="Find in Document">
             <Search className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Contextual Properties Sub-Bar */}
      {showProperties && hasProperties && (
        <div className="h-10 border-t border-gray-100 bg-gray-50 px-4 flex items-center justify-center gap-6 animate-in slide-in-from-top-2">
           {activeTool !== 'redact' && (
             <div className="flex items-center gap-3">
               <span className="text-xs font-medium text-gray-500">Color</span>
               <div className="flex items-center gap-1.5">
                 {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#000000', '#ffffff'].map(c => (
                   <button 
                     key={c}
                     onClick={() => updateConfig({ color: c })}
                     className={`w-5 h-5 rounded-full border border-gray-200 ${toolConfig.color === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                     style={{ backgroundColor: c }}
                   />
                 ))}
                 <input 
                   type="color" 
                   value={toolConfig.color}
                   onChange={(e) => updateConfig({ color: e.target.value })}
                   className="w-6 h-6 rounded cursor-pointer border-0 p-0 ml-2"
                   title="Custom Color"
                 />
               </div>
             </div>
           )}

           {['pencil', 'highlighter', 'rect', 'circle', 'arrow'].includes(activeTool) && (
             <div className="flex items-center gap-3">
               <div className="w-px h-4 bg-gray-300"></div>
               <span className="text-xs font-medium text-gray-500">Thickness</span>
               <input 
                 type="range" 
                 min="1" max="40" 
                 value={toolConfig.strokeWidth}
                 onChange={(e) => updateConfig({ strokeWidth: parseInt(e.target.value) })}
                 className="w-24 accent-blue-500"
               />
             </div>
           )}

           {activeTool === 'text' && (
             <div className="flex items-center gap-3">
               <div className="w-px h-4 bg-gray-300"></div>
               <span className="text-xs font-medium text-gray-500">Size</span>
               <input 
                 type="range" 
                 min="12" max="72" 
                 value={toolConfig.size}
                 onChange={(e) => updateConfig({ size: parseInt(e.target.value) })}
                 className="w-24 accent-blue-500"
               />
               <span className="text-xs text-gray-600">{toolConfig.size}px</span>
             </div>
           )}
        </div>
      )}
    </div>
  );
}

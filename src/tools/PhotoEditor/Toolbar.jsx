import React, { useState } from 'react';
import { 
  Wand2, Maximize, Crop as CropIcon, Move3d, 
  Pencil, Type, Square, SmilePlus, 
  Frame, SquareUser, PaintBucket,
  X, Check, Download,
  MousePointer2
} from 'lucide-react';

export default function Toolbar({ 
  fileName,
  setFileName,
  activeTool, 
  setActiveTool, 
  toolConfig, 
  setToolConfig,
  fabricCanvas,
  saveHistorySnapshot,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onCloseImage
}) {
  const [inSubmenu, setInSubmenu] = useState(false);
  const [preToolState, setPreToolState] = useState(null);

  const handleToolClick = (toolId) => {
    // Capture snapshot for cancellation
    if (fabricCanvas) {
      setPreToolState(fabricCanvas.toJSON(['id', 'selectable', 'name']));
      
      if (toolId === 'text') {
        import('fabric').then(({ fabric }) => {
          const text = new fabric.IText('Double click to edit', {
            left: fabricCanvas.width / 2,
            top: fabricCanvas.height / 2,
            fontFamily: toolConfig.fontFamily || 'Arial',
            fill: toolConfig.color || '#000000',
            fontSize: Math.max(40, fabricCanvas.width / 20),
            originX: 'center',
            originY: 'center'
          });
          fabricCanvas.add(text);
          fabricCanvas.setActiveObject(text);
          fabricCanvas.requestRenderAll();
        });
      } else if (toolId === 'resize') {
        setToolConfig({
          ...toolConfig,
          width: fabricCanvas.width,
          height: fabricCanvas.height,
          maintainAspectRatio: true,
          originalWidth: fabricCanvas.width,
          originalHeight: fabricCanvas.height
        });
      } else if (toolId === 'crop') {
        import('fabric').then(({ fabric }) => {
          const cropBox = new fabric.Rect({
            id: 'cropbox',
            left: fabricCanvas.width * 0.1,
            top: fabricCanvas.height * 0.1,
            width: fabricCanvas.width * 0.8,
            height: fabricCanvas.height * 0.8,
            fill: 'transparent',
            stroke: '#3b82f6',
            strokeDashArray: [5, 5],
            strokeWidth: 3,
            cornerColor: '#3b82f6',
            cornerSize: 12,
            transparentCorners: false,
            hasRotatingPoint: false
          });
          
          fabricCanvas.add(cropBox);
          fabricCanvas.setActiveObject(cropBox);
          fabricCanvas.requestRenderAll();
        });
      }
    }
    setActiveTool(toolId);
    setInSubmenu(true);
  };

  const handleApply = () => {
    if (fabricCanvas) {
      if (activeTool === 'resize' && toolConfig.width && toolConfig.height) {
        const scaleX = toolConfig.width / fabricCanvas.width;
        const scaleY = toolConfig.height / fabricCanvas.height;
        
        fabricCanvas.setWidth(toolConfig.width);
        fabricCanvas.setHeight(toolConfig.height);
        
        const objects = fabricCanvas.getObjects();
        for (let i in objects) {
          const scaleXObj = objects[i].scaleX;
          const scaleYObj = objects[i].scaleY;
          const left = objects[i].left;
          const top = objects[i].top;

          objects[i].set({
            scaleX: scaleXObj * scaleX,
            scaleY: scaleYObj * scaleY,
            left: left * scaleX,
            top: top * scaleY
          });
          objects[i].setCoords();
        }
        
        if (fabricCanvas.backgroundImage) {
          fabricCanvas.backgroundImage.scaleToWidth(toolConfig.width);
          fabricCanvas.backgroundImage.scaleToHeight(toolConfig.height);
        }
        
        fabricCanvas.requestRenderAll();
        window.dispatchEvent(new Event('resize'));
      } else if (activeTool === 'crop') {
        const cropBox = fabricCanvas.getObjects().find(o => o.id === 'cropbox');
        if (cropBox) {
          const left = cropBox.left;
          const top = cropBox.top;
          const width = cropBox.getScaledWidth();
          const height = cropBox.getScaledHeight();
          
          fabricCanvas.remove(cropBox);
          
          fabricCanvas.setWidth(width);
          fabricCanvas.setHeight(height);
          
          const objects = fabricCanvas.getObjects();
          for (let i in objects) {
            objects[i].set({
              left: objects[i].left - left,
              top: objects[i].top - top
            });
            objects[i].setCoords();
          }
          
          if (fabricCanvas.backgroundImage) {
            const bg = fabricCanvas.backgroundImage;
            bg.cropX = (bg.cropX || 0) + left / (bg.scaleX || 1);
            bg.cropY = (bg.cropY || 0) + top / (bg.scaleY || 1);
            bg.width = width / (bg.scaleX || 1);
            bg.height = height / (bg.scaleY || 1);
          }
          
          fabricCanvas.requestRenderAll();
          window.dispatchEvent(new Event('resize'));
        }
      }
      
      saveHistorySnapshot();
    }
    setInSubmenu(false);
    setActiveTool('select');
    setPreToolState(null);
  };

  const handleCancel = () => {
    if (fabricCanvas && preToolState) {
      // Revert to snapshot
      fabricCanvas.loadFromJSON(preToolState, () => {
        fabricCanvas.renderAll();
        setInSubmenu(false);
        setActiveTool('select');
        setPreToolState(null);
      });
    } else {
      setInSubmenu(false);
      setActiveTool('select');
    }
  };
  const PRIMARY_TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'filter', icon: Wand2, label: 'Filter' },
    { id: 'resize', icon: Maximize, label: 'Resize' },
    { id: 'crop', icon: CropIcon, label: 'Crop' },
    { id: 'transform', icon: Move3d, label: 'Transform' },
    { id: 'draw', icon: Pencil, label: 'Draw' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'shapes', icon: Square, label: 'Shapes' },
    { id: 'stickers', icon: SmilePlus, label: 'Stickers' },
    { id: 'frame', icon: Frame, label: 'Frame' },
    { id: 'corners', icon: SquareUser, label: 'Corners' },
    { id: 'bg', icon: PaintBucket, label: 'Background' },
  ];

  return (
    <div className="flex flex-col border-b border-gray-200 bg-white z-20 shrink-0 shadow-sm relative">
      
      {/* Topmost Navbar */}
      <div className="h-14 px-4 flex items-center justify-between bg-white border-b border-gray-100 relative">
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="flex items-center gap-2 group">
            <input 
              type="text" 
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="font-semibold text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors w-48"
              placeholder="document"
            />
            <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-gray-400 text-sm font-medium">.png</span>
          </div>
        </div>

        {/* Right: Export Actions */}
        <div className="flex items-center gap-2 min-w-[200px] justify-end">
          <button 
            onClick={() => onExport('png')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Secondary Tool Ribbon */}
      <div className="h-12 px-4 flex items-center justify-center gap-6 relative bg-white overflow-x-auto no-scrollbar">
        {PRIMARY_TOOLS.map((tool, idx) => (
          <React.Fragment key={tool.id}>
            <button
              onClick={() => {
                if (tool.id === 'select') {
                  setActiveTool('select');
                  setInSubmenu(false);
                } else {
                  handleToolClick(tool.id);
                }
              }}
              className={`p-2 rounded-md transition-all flex items-center gap-1 ${activeTool === tool.id ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </button>
            {idx === 0 && <div className="w-px h-6 bg-gray-200 mx-2"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Submenu Config Popover */}
      {inSubmenu && (
        <div className="absolute top-[104px] left-0 w-full bg-white border-b border-gray-200 shadow-lg p-2 flex items-center justify-center z-30 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center max-w-5xl mx-auto w-full justify-between overflow-x-auto no-scrollbar">
            
            <button 
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md font-medium shrink-0"
            >
              <X className="w-4 h-4" /> Cancel
            </button>

            <div className="flex-1 overflow-x-auto no-scrollbar px-4 flex items-center justify-center min-w-max">
              {activeTool === 'filter' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Filters</span>
                  {[
                    { id: 'grayscale', label: 'Grayscale', filter: () => new fabric.Image.filters.Grayscale() },
                    { id: 'blackwhite', label: 'Black & White', filter: () => new fabric.Image.filters.BlackWhite() },
                { id: 'sharpen', label: 'Sharpen', filter: () => new fabric.Image.filters.Convolute({ matrix: [ 0, -1, 0, -1, 5, -1, 0, -1, 0 ] }) },
                { id: 'invert', label: 'Invert', filter: () => new fabric.Image.filters.Invert() },
                { id: 'vintage', label: 'Vintage', filter: () => new fabric.Image.filters.Vintage() },
                { id: 'polaroid', label: 'Polaroid', filter: () => new fabric.Image.filters.Polaroid() },
                { id: 'kodachrome', label: 'Kodachrome', filter: () => new fabric.Image.filters.Kodachrome() },
                { id: 'technicolor', label: 'Technicolor', filter: () => new fabric.Image.filters.Technicolor() },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    import('fabric').then(({ fabric }) => {
                      if (fabricCanvas && fabricCanvas.backgroundImage) {
                        const img = fabricCanvas.backgroundImage;
                        // Remove existing filters and apply new one
                        img.filters = [f.filter()];
                        img.applyFilters();
                        fabricCanvas.requestRenderAll();
                        setToolConfig({ ...toolConfig, filter: f.id });
                      }
                    });
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${toolConfig.filter === f.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  {f.label}
                </button>
              ))}
              <button 
                onClick={() => {
                  if (fabricCanvas && fabricCanvas.backgroundImage) {
                    const img = fabricCanvas.backgroundImage;
                    img.filters = [];
                    img.applyFilters();
                    fabricCanvas.requestRenderAll();
                    setToolConfig({ ...toolConfig, filter: null });
                  }
                }}
                className="ml-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md"
              >
                Clear
              </button>
            </div>
          )}
          {activeTool === 'resize' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Width</label>
                <input 
                  type="number" 
                  value={Math.round(toolConfig.width || 0)}
                  onChange={(e) => {
                    const newW = parseInt(e.target.value) || 0;
                    if (toolConfig.maintainAspectRatio && toolConfig.originalWidth) {
                      const ratio = toolConfig.originalHeight / toolConfig.originalWidth;
                      setToolConfig({ ...toolConfig, width: newW, height: newW * ratio });
                    } else {
                      setToolConfig({ ...toolConfig, width: newW });
                    }
                  }}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Height</label>
                <input 
                  type="number" 
                  value={Math.round(toolConfig.height || 0)}
                  onChange={(e) => {
                    const newH = parseInt(e.target.value) || 0;
                    if (toolConfig.maintainAspectRatio && toolConfig.originalHeight) {
                      const ratio = toolConfig.originalWidth / toolConfig.originalHeight;
                      setToolConfig({ ...toolConfig, height: newH, width: newH * ratio });
                    } else {
                      setToolConfig({ ...toolConfig, height: newH });
                    }
                  }}
                  className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                />
              </div>
              <div className="w-px h-6 bg-gray-200 mx-2"></div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={toolConfig.maintainAspectRatio || false}
                  onChange={(e) => setToolConfig({ ...toolConfig, maintainAspectRatio: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Maintain Aspect Ratio
              </label>
            </div>
          )}
          {activeTool === 'crop' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Mode</span>
                <button
                  onClick={() => {
                    setToolConfig({ ...toolConfig, cropMode: 'standard' });
                    if (fabricCanvas && !fabricCanvas.getObjects().find(o => o.id === 'cropbox')) {
                      // Add default standard box if missing
                      import('fabric').then(({ fabric }) => {
                        const cropBox = new fabric.Rect({
                          id: 'cropbox',
                          left: fabricCanvas.width * 0.1,
                          top: fabricCanvas.height * 0.1,
                          width: fabricCanvas.width * 0.8,
                          height: fabricCanvas.height * 0.8,
                          fill: 'transparent',
                          stroke: '#3b82f6',
                          strokeDashArray: [5, 5],
                          strokeWidth: 3,
                          cornerColor: '#3b82f6',
                          cornerSize: 12,
                          transparentCorners: false,
                          hasRotatingPoint: false
                        });
                        fabricCanvas.add(cropBox);
                        fabricCanvas.setActiveObject(cropBox);
                        fabricCanvas.requestRenderAll();
                      });
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${toolConfig.cropMode !== 'freestyle' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Standard
                </button>
                <button
                  onClick={() => {
                    setToolConfig({ ...toolConfig, cropMode: 'freestyle' });
                    if (fabricCanvas) {
                      const cropBox = fabricCanvas.getObjects().find(o => o.id === 'cropbox');
                      if (cropBox) {
                        fabricCanvas.remove(cropBox);
                        fabricCanvas.requestRenderAll();
                      }
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${toolConfig.cropMode === 'freestyle' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Freestyle
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Aspect Ratio</span>
                {[
                  { label: 'Free', ratio: null },
                  { label: '1:1', ratio: 1 },
                  { label: '3:2', ratio: 3/2 },
                  { label: '4:3', ratio: 4/3 },
                  { label: '16:9', ratio: 16/9 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (fabricCanvas) {
                        const cropBox = fabricCanvas.getObjects().find(o => o.id === 'cropbox');
                        if (cropBox) {
                          if (preset.ratio) {
                            const w = cropBox.getScaledWidth();
                            const newH = w / preset.ratio;
                            cropBox.set({ width: w, height: newH, scaleX: 1, scaleY: 1 });
                            cropBox.setControlsVisibility({
                              mt: false, mb: false, ml: false, mr: false,
                              tl: true, tr: true, bl: true, br: true
                            });
                          } else {
                            cropBox.setControlsVisibility({
                              mt: true, mb: true, ml: true, mr: true,
                              tl: true, tr: true, bl: true, br: true
                            });
                          }
                          fabricCanvas.requestRenderAll();
                        }
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md ${toolConfig.cropMode === 'freestyle' ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-gray-100 hover:bg-gray-200'}`}
                    disabled={toolConfig.cropMode === 'freestyle'}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeTool === 'transform' && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Rotate</span>
                <button 
                  onClick={() => {
                    if (fabricCanvas && fabricCanvas.backgroundImage) {
                      const img = fabricCanvas.backgroundImage;
                      img.rotate((img.angle || 0) - 90);
                      fabricCanvas.requestRenderAll();
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Left 90°
                </button>
                <button 
                  onClick={() => {
                    if (fabricCanvas && fabricCanvas.backgroundImage) {
                      const img = fabricCanvas.backgroundImage;
                      img.rotate((img.angle || 0) + 90);
                      fabricCanvas.requestRenderAll();
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Right 90°
                </button>
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Flip</span>
                <button 
                  onClick={() => {
                    if (fabricCanvas && fabricCanvas.backgroundImage) {
                      const img = fabricCanvas.backgroundImage;
                      img.set('flipX', !img.flipX);
                      fabricCanvas.requestRenderAll();
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Horizontal
                </button>
                <button 
                  onClick={() => {
                    if (fabricCanvas && fabricCanvas.backgroundImage) {
                      const img = fabricCanvas.backgroundImage;
                      img.set('flipY', !img.flipY);
                      fabricCanvas.requestRenderAll();
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Vertical
                </button>
              </div>
            </div>
          )}
          {activeTool === 'draw' && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Color</span>
                <div className="flex gap-1">
                  {['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ffffff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setToolConfig({...toolConfig, color: c})}
                      className={`w-6 h-6 rounded-full border-2 ${toolConfig.color === c ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none' }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={toolConfig.color || '#000000'}
                    onChange={(e) => setToolConfig({...toolConfig, color: e.target.value})}
                    className="w-6 h-6 rounded-full overflow-hidden cursor-pointer p-0 border-0"
                  />
                </div>
              </div>
              
              <div className="w-px h-6 bg-gray-200"></div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase">Size</span>
                <div className="flex items-center gap-2">
                  {[2, 5, 10, 15, 25].map(size => (
                    <button 
                      key={size}
                      onClick={() => setToolConfig({...toolConfig, strokeWidth: size})}
                      className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 ${toolConfig.strokeWidth === size ? 'bg-gray-200' : ''}`}
                    >
                      <div className="bg-gray-800 rounded-full" style={{ width: Math.max(4, size/1.5), height: Math.max(4, size/1.5) }}></div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase">Style</span>
                <select 
                  value={toolConfig.strokeDashArray || 'solid'}
                  onChange={(e) => setToolConfig({...toolConfig, strokeDashArray: e.target.value})}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          )}
          {activeTool === 'text' && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Color</span>
                <input 
                  type="color" 
                  value={toolConfig.color || '#000000'}
                  onChange={(e) => {
                    setToolConfig({...toolConfig, color: e.target.value});
                    if (fabricCanvas) {
                      const activeObj = fabricCanvas.getActiveObject();
                      if (activeObj && activeObj.type === 'i-text') {
                        activeObj.set('fill', e.target.value);
                        fabricCanvas.requestRenderAll();
                      }
                    }
                  }}
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer p-0 border-0"
                />
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Font</span>
                <select 
                  value={toolConfig.fontFamily || 'Arial'}
                  onChange={(e) => {
                    setToolConfig({...toolConfig, fontFamily: e.target.value});
                    if (fabricCanvas) {
                      const activeObj = fabricCanvas.getActiveObject();
                      if (activeObj && activeObj.type === 'i-text') {
                        activeObj.set('fontFamily', e.target.value);
                        fabricCanvas.requestRenderAll();
                      }
                    }
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </div>
            </div>
          )}
          {activeTool === 'shapes' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Insert Shape</span>
              {[
                { type: 'rect', label: 'Rectangle' },
                { type: 'circle', label: 'Circle' },
                { type: 'triangle', label: 'Triangle' },
                { type: 'line', label: 'Line' },
                { type: 'arrow', label: 'Arrow' },
                { type: 'star', label: 'Star' },
                { type: 'polygon', label: 'Polygon' }
              ].map(shape => (
                <button
                  key={shape.type}
                  onClick={() => {
                    import('fabric').then(({ fabric }) => {
                      let obj;
                      const size = Math.max(100, fabricCanvas.width / 5);
                      const center = { left: fabricCanvas.width / 2, top: fabricCanvas.height / 2 };
                      const color = toolConfig.color || '#3b82f6';
                      
                      if (shape.type === 'rect') {
                        obj = new fabric.Rect({ ...center, width: size, height: size, fill: color, originX: 'center', originY: 'center' });
                      } else if (shape.type === 'circle') {
                        obj = new fabric.Circle({ ...center, radius: size / 2, fill: color, originX: 'center', originY: 'center' });
                      } else if (shape.type === 'triangle') {
                        obj = new fabric.Triangle({ ...center, width: size, height: size, fill: color, originX: 'center', originY: 'center' });
                      } else if (shape.type === 'line') {
                        obj = new fabric.Line([0, 0, size, 0], { ...center, stroke: color, strokeWidth: size / 10, originX: 'center', originY: 'center' });
                      } else if (shape.type === 'star') {
                        const pts = [{x: 50, y: 0}, {x: 61, y: 35}, {x: 98, y: 35}, {x: 68, y: 57}, {x: 79, y: 91}, {x: 50, y: 70}, {x: 21, y: 91}, {x: 32, y: 57}, {x: 2, y: 35}, {x: 39, y: 35}];
                        obj = new fabric.Polygon(pts, { ...center, fill: color, originX: 'center', originY: 'center', scaleX: size/100, scaleY: size/100 });
                      } else if (shape.type === 'polygon') {
                        const hex = [{x:50,y:0},{x:100,y:25},{x:100,y:75},{x:50,y:100},{x:0,y:75},{x:0,y:25}];
                        obj = new fabric.Polygon(hex, { ...center, fill: color, originX: 'center', originY: 'center', scaleX: size/100, scaleY: size/100 });
                      } else if (shape.type === 'arrow') {
                        obj = new fabric.Path('M 0 50 L 70 50 L 70 30 L 100 60 L 70 90 L 70 70 L 0 70 z', { ...center, fill: color, originX: 'center', originY: 'center', scaleX: size/100, scaleY: size/100 });
                      }
                      
                      if (obj) {
                        fabricCanvas.add(obj);
                        fabricCanvas.setActiveObject(obj);
                        fabricCanvas.requestRenderAll();
                      }
                    });
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  {shape.label}
                </button>
              ))}
            </div>
          )}
          {activeTool === 'stickers' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase mr-2">Stickers</span>
              {['😀', '😂', '😎', '👍', '❤️', '🌟', '💥', '🎈', '🎉', '🏖️', '🗽', '🗼', '🚗', '✈️', '🐶', '🐱'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    import('fabric').then(({ fabric }) => {
                      const text = new fabric.IText(emoji, {
                        left: fabricCanvas.width / 2,
                        top: fabricCanvas.height / 2,
                        fontSize: Math.max(80, fabricCanvas.width / 10),
                        originX: 'center',
                        originY: 'center'
                      });
                      fabricCanvas.add(text);
                      fabricCanvas.setActiveObject(text);
                      fabricCanvas.requestRenderAll();
                    });
                  }}
                  className="px-2 py-1 text-2xl hover:bg-gray-100 rounded-md transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {activeTool === 'frame' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Width</span>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={toolConfig.frameWidth || 0}
                  onChange={(e) => {
                    const width = parseInt(e.target.value);
                    setToolConfig({...toolConfig, frameWidth: width});
                    
                    if (fabricCanvas) {
                      let frame = fabricCanvas.getObjects().find(o => o.id === 'frame-overlay');
                      if (width === 0 && frame) {
                        fabricCanvas.remove(frame);
                      } else {
                        if (!frame) {
                          import('fabric').then(({ fabric }) => {
                            frame = new fabric.Rect({
                              id: 'frame-overlay',
                              left: 0, top: 0,
                              width: fabricCanvas.width,
                              height: fabricCanvas.height,
                              fill: 'transparent',
                              stroke: toolConfig.color || '#000000',
                              strokeWidth: width,
                              selectable: false,
                              evented: false
                            });
                            fabricCanvas.add(frame);
                            frame.moveTo(999);
                            fabricCanvas.requestRenderAll();
                          });
                        } else {
                          frame.set({ strokeWidth: width, stroke: toolConfig.color || '#000000' });
                          fabricCanvas.requestRenderAll();
                        }
                      }
                    }
                  }}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Color</span>
                <input 
                  type="color" 
                  value={toolConfig.color || '#000000'}
                  onChange={(e) => {
                    setToolConfig({...toolConfig, color: e.target.value});
                    if (fabricCanvas) {
                      const frame = fabricCanvas.getObjects().find(o => o.id === 'frame-overlay');
                      if (frame) {
                        frame.set({ stroke: e.target.value });
                        fabricCanvas.requestRenderAll();
                      }
                    }
                  }}
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer p-0 border-0"
                />
              </div>
            </div>
          )}
          {activeTool === 'corners' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Radius</span>
                <input 
                  type="range" 
                  min="0" max="200" 
                  value={toolConfig.radius || 0}
                  onChange={(e) => {
                    const r = parseInt(e.target.value);
                    setToolConfig({...toolConfig, radius: r});
                    
                    if (fabricCanvas) {
                      import('fabric').then(({ fabric }) => {
                        if (r === 0) {
                          fabricCanvas.clipPath = null;
                        } else {
                          fabricCanvas.clipPath = new fabric.Rect({
                            left: fabricCanvas.width / 2,
                            top: fabricCanvas.height / 2,
                            originX: 'center',
                            originY: 'center',
                            width: fabricCanvas.width,
                            height: fabricCanvas.height,
                            rx: r,
                            ry: r,
                            absolutePositioned: true
                          });
                        }
                        fabricCanvas.requestRenderAll();
                      });
                    }
                  }}
                  className="w-48"
                />
              </div>
            </div>
          )}
          {activeTool === 'bg' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Background Color</span>
                <input 
                  type="color" 
                  value={toolConfig.bgColor || '#ffffff'}
                  onChange={(e) => {
                    setToolConfig({...toolConfig, bgColor: e.target.value});
                    if (fabricCanvas) {
                      fabricCanvas.backgroundColor = e.target.value;
                      fabricCanvas.requestRenderAll();
                    }
                  }}
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer p-0 border-0"
                />
              </div>
            </div>
          )}
            </div>

            <button 
              onClick={handleApply}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md font-bold shrink-0"
            >
              <Check className="w-4 h-4" /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

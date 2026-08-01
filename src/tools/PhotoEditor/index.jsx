import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import DragDropZone from '../../components/ui/DragDropZone';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import CanvasWorkspace from './CanvasWorkspace';

export default function PhotoEditor() {
  const [imageSrc, setImageSrc] = useState(null);
  const [fileName, setFileName] = useState('');
  
  // State for the active tool and its configuration
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'filter', 'resize', 'crop', 'transform', 'draw', 'text', 'shapes', 'stickers', 'frame', 'corners', 'bg'
  const [toolConfig, setToolConfig] = useState({});
  
  // Fabric canvas instance reference (kept in parent to allow Toolbar/Sidebar to call methods)
  const [fabricCanvas, setFabricCanvas] = useState(null);

  // History stack for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHistoryAction, setIsHistoryAction] = useState(false);

  const handleImageUpload = (file) => {
    if (!file.type.startsWith('image/')) return;
    setFileName(file.name.split('.')[0]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      // Reset history when a new image is loaded
      setHistory([]);
      setHistoryIndex(-1);
    };
    reader.readAsDataURL(file);
  };

  const saveHistorySnapshot = useCallback(() => {
    if (!fabricCanvas) return;
    if (isHistoryAction) {
      setIsHistoryAction(false);
      return;
    }
    const json = fabricCanvas.toJSON(['id', 'selectable', 'name']);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(json);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [fabricCanvas, history, historyIndex, isHistoryAction]);

  const undo = () => {
    if (historyIndex > 0 && fabricCanvas) {
      setIsHistoryAction(true);
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      fabricCanvas.loadFromJSON(history[newIndex], () => {
        fabricCanvas.renderAll();
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvas) {
      setIsHistoryAction(true);
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      fabricCanvas.loadFromJSON(history[newIndex], () => {
        fabricCanvas.renderAll();
      });
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Global actions passed to Sidebar
  const handleExport = (format) => {
    if (!fabricCanvas) return;
    
    // Deselect active objects before export
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
    
    // Ensure we export at 1x multiplier of the internal canvas size
    const dataUrl = fabricCanvas.toDataURL({
      format: format === 'jpg' ? 'jpeg' : 'png',
      quality: 0.9,
      multiplier: 1 
    });
    
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${fileName || 'photo'}_edited.${format}`;
    link.click();
  };

  const handleCloseImage = () => {
    setImageSrc(null);
    setFabricCanvas(null);
    setHistory([]);
    setHistoryIndex(-1);
  };

  if (!imageSrc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Photo editor</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Add text, stickers, effects and filters to your photos. Edit your photos online.
          </p>
        </div>
        
        <div className="w-full max-w-3xl mx-auto">
          <DragDropZone 
            accept="image/*"
            multiple={false}
            onFileSelect={handleImageUpload}
            label="Select image"
            icon={ImageIcon}
            className="p-20 py-32 bg-blue-50/50 hover:bg-blue-100 border-blue-300 hover:border-blue-400 mb-8"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-[#e5e7eb]">
      <Toolbar 
        fileName={fileName}
        setFileName={setFileName}
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        toolConfig={toolConfig} 
        setToolConfig={setToolConfig}
        fabricCanvas={fabricCanvas}
        saveHistorySnapshot={saveHistorySnapshot}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onCloseImage={handleCloseImage}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          onCloseImage={handleCloseImage}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        
        <CanvasWorkspace 
          imageSrc={imageSrc} 
          setFabricCanvas={setFabricCanvas}
          fabricCanvas={fabricCanvas}
          activeTool={activeTool}
          toolConfig={toolConfig}
          saveHistorySnapshot={saveHistorySnapshot}
        />
      </div>
    </div>
  );
}

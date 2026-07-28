import React, { useState } from 'react';
import { Maximize, CheckCircle, Download, RefreshCw, Image as ImageIcon, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function ResizeImage() {
  const [file, setFile] = useState(null);
  
  // Settings State
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [maintainRatio, setMaintainRatio] = useState(true);
  const [originalAspect, setOriginalAspect] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Success State
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);

  const handleFile = (newFile) => {
    if (newFile && newFile.type.startsWith('image/')) {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      
      // Load image to get initial dimensions
      const url = URL.createObjectURL(newFile);
      const img = new Image();
      img.onload = () => {
        setWidth(img.width);
        setHeight(img.height);
        setOriginalAspect(img.width / img.height);
      };
      img.src = url;
    }
  };

  const handleWidthChange = (e) => {
    const w = e.target.value;
    setWidth(w);
    if (maintainRatio && w !== '') {
      setHeight(Math.round(parseInt(w) / originalAspect) || '');
    }
  };

  const handleHeightChange = (e) => {
    const h = e.target.value;
    setHeight(h);
    if (maintainRatio && h !== '') {
      setWidth(Math.round(parseInt(h) * originalAspect) || '');
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setIsProcessing(false);
  };

  const resizeImage = async () => {
    if (!file || !width || !height) return;
    setIsProcessing(true);
    
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      
      await new Promise(resolve => img.onload = resolve);
      
      const canvas = document.createElement('canvas');
      canvas.width = parseInt(width);
      canvas.height = parseInt(height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const format = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(format, 0.9);
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      setOutputUrl(URL.createObjectURL(blob));
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to resize image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // State 1: Upload
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Resize Image</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Change the dimensions of your images to exact pixel sizes.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="image/*"
            multiple={false}
            onFileSelect={handleFile}
            label="Select Image"
            icon={ImageIcon}
            className="p-20 py-32 bg-blue-50/50 hover:bg-blue-100 border-blue-300 hover:border-blue-400"
          />
        </div>
      </div>
    );
  }

  // State 4: Success
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-blue-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Image Resized Successfully!</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center mt-8">
          <a 
            href={outputUrl} 
            download={`resized_${file.name}`}
            className="px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download Image
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Resize another
          </button>
        </div>
      </div>
    );
  }

  // State 3: Processing
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-blue-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Resizing Image...</h2>
      </div>
    );
  }

  // State 2: Settings
  return (
    <div className="max-w-4xl mx-auto py-12 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <Maximize className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resize Settings</h2>
            <p className="text-gray-500">{file.name}</p>
          </div>
        </div>
        
        <div className="p-8">
          
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">Width (px)</label>
              <input 
                type="number" 
                value={width} 
                onChange={handleWidthChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
            <div className="flex items-center justify-center pt-8 text-gray-400">
              <span className="text-xl font-bold">X</span>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">Height (px)</label>
              <input 
                type="number" 
                value={height} 
                onChange={handleHeightChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-10">
            <input 
              type="checkbox" 
              id="maintainRatio" 
              checked={maintainRatio}
              onChange={(e) => setMaintainRatio(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="maintainRatio" className="text-gray-700 font-medium">
              Maintain aspect ratio
            </label>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={resizeImage}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl transition-all disabled:opacity-50"
              disabled={!width || !height}
            >
              Resize Image
            </button>
            <button 
              onClick={resetTool}
              className="px-6 py-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-lg rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}

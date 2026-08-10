import React, { useState } from 'react';
import { Maximize, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function ResizeImage() {
  const [file, setFile] = useState(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [maintainRatio, setMaintainRatio] = useState(true);
  const [originalAspect, setOriginalAspect] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleFileSelect = (newFile) => {
    if (newFile && newFile.type.startsWith('image/')) {
      setFile(newFile);
      setSuccessData(null);
      
      // Load image to get initial dimensions
      const url = URL.createObjectURL(newFile);
      const img = new Image();
      img.onload = () => {
        setWidth(img.width);
        setHeight(img.height);
        setOriginalAspect(img.width / img.height);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } else {
      toast.error("Please upload a valid image file.");
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

  const processImage = async () => {
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
      
      setSuccessData({
        url: URL.createObjectURL(blob),
        filename: `resized_${file.name}`,
        originalSize: file.size,
        outputSize: blob.size,
        title: 'Image Resized Successfully!',
        subtitle: `New dimensions: ${width}x${height}px`,
        quickActions: [
          <button 
            key="editor"
            onClick={() => {
               window.__sharedFile = new File([blob], `resized_${file.name}`, { type: blob.type });
               toast.success("Ready! You can now navigate to another tool.");
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group w-full"
          >
            <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-2" />
            <span className="text-xs font-medium text-gray-600 group-hover:text-blue-700">Open in Editor</span>
          </button>
        ]
      });
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      trackError('Resize Image', err?.message || 'unknown_error');
      toast.error("Failed to resize image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setWidth('');
    setHeight('');
  };

  return (
    <ToolPreviewLayout
      title="Resize Image"
      description="Change the dimensions of your images to exact pixel sizes."
      icon={Maximize}
      accept="image/*"
      file={file}
      onFileSelect={handleFileSelect}
      isProcessing={isProcessing}
      processButton={
        <button 
          onClick={processImage} 
          disabled={isProcessing || !file || !width || !height}
          className="w-full px-4 py-3 bg-blue-600 border border-transparent rounded-xl shadow-md text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden"
        >
          {isProcessing ? 'Resizing...' : <><Maximize className="w-5 h-5"/> Resize Image</>}
        </button>
      }
      successData={successData}
      onReset={handleReset}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Resize Settings</h3>
          
          <div className="flex flex-col xl:flex-row gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Width (px)</label>
              <input 
                type="number" 
                value={width} 
                onChange={handleWidthChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
                min="1"
              />
            </div>
            
            <div className="flex items-center justify-center pt-5 xl:pt-6 text-gray-400 font-bold">
              <span className="text-sm">X</span>
            </div>
            
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Height (px)</label>
              <input 
                type="number" 
                value={height} 
                onChange={handleHeightChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
                min="1"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="maintainRatio" 
              checked={maintainRatio}
              onChange={(e) => setMaintainRatio(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="maintainRatio" className="text-gray-700 text-sm font-medium cursor-pointer">
              Maintain aspect ratio
            </label>
          </div>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

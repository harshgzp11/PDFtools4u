import React, { useState, useRef, useEffect } from 'react';
import DragDropZone from '../components/ui/DragDropZone';
import { Download, SlidersHorizontal } from 'lucide-react';

export default function PhotoEditor() {
  const [imageSrc, setImageSrc] = useState(null);
  const canvasRef = useRef(null);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    grayscale: 0,
    blur: 0,
  });

  const handleImageUpload = (file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Apply CSS-like filters directly to Canvas context
      ctx.filter = `
        brightness(${filters.brightness}%) 
        contrast(${filters.contrast}%) 
        saturate(${filters.saturation}%) 
        sepia(${filters.sepia}%) 
        grayscale(${filters.grayscale}%)
        blur(${filters.blur}px)
      `;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageSrc;
  }, [imageSrc, filters]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'edited_photo.jpg';
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Photo Editor</h2>
        <p className="text-gray-500">Apply filters and adjust photo settings instantly in your browser.</p>
      </div>

      {!imageSrc ? (
        <div className="max-w-xl mx-auto">
          <DragDropZone 
            accept="image/*"
            onFileSelect={handleImageUpload}
            label="Drag & drop a photo to edit"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
               <span className="text-sm font-medium text-gray-700">Preview</span>
               <button onClick={() => setImageSrc(null)} className="text-xs text-red-500 hover:text-red-700">Choose Different Image</button>
             </div>
             <div className="w-full border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden min-h-[400px]">
               {/* Use the canvas for live preview as well as download */}
               <canvas ref={canvasRef} className="max-w-full max-h-[600px] object-contain drop-shadow-md" />
             </div>
          </div>
          
          <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4"/> Adjustments</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Brightness</label>
                  <span className="text-xs text-gray-400">{filters.brightness}%</span>
                </div>
                <input type="range" min="0" max="200" value={filters.brightness} onChange={(e) => setFilters({...filters, brightness: e.target.value})} className="w-full accent-blue-500" />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Contrast</label>
                  <span className="text-xs text-gray-400">{filters.contrast}%</span>
                </div>
                <input type="range" min="0" max="200" value={filters.contrast} onChange={(e) => setFilters({...filters, contrast: e.target.value})} className="w-full accent-blue-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Saturation</label>
                  <span className="text-xs text-gray-400">{filters.saturation}%</span>
                </div>
                <input type="range" min="0" max="200" value={filters.saturation} onChange={(e) => setFilters({...filters, saturation: e.target.value})} className="w-full accent-blue-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Sepia</label>
                  <span className="text-xs text-gray-400">{filters.sepia}%</span>
                </div>
                <input type="range" min="0" max="100" value={filters.sepia} onChange={(e) => setFilters({...filters, sepia: e.target.value})} className="w-full accent-yellow-600" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Grayscale</label>
                  <span className="text-xs text-gray-400">{filters.grayscale}%</span>
                </div>
                <input type="range" min="0" max="100" value={filters.grayscale} onChange={(e) => setFilters({...filters, grayscale: e.target.value})} className="w-full accent-gray-500" />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Blur</label>
                  <span className="text-xs text-gray-400">{filters.blur}px</span>
                </div>
                <input type="range" min="0" max="20" step="0.5" value={filters.blur} onChange={(e) => setFilters({...filters, blur: e.target.value})} className="w-full accent-indigo-400" />
              </div>
            </div>
            
            <button 
              onClick={() => setFilters({brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, blur: 0})}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              Reset Filters
            </button>
            
            <button 
              onClick={handleDownload}
              className="w-full px-4 py-3 bg-blue-600 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2 mt-4"
            >
              <Download className="w-5 h-5"/> Download Edited Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

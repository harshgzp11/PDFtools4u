import React, { useState, useRef } from 'react';
import DragDropZone from '../components/ui/DragDropZone';
import { Download } from 'lucide-react';

export default function ImageConverter() {
  const [imageSrc, setImageSrc] = useState(null);
  const [fileName, setFileName] = useState('');
  const [settings, setSettings] = useState({ format: 'image/png', quality: 0.9, scale: 100 });
  const canvasRef = useRef(null);

  const handleImageUpload = (file) => {
    if (!file.type.startsWith('image/')) return;
    setFileName(file.name.split('.')[0]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!imageSrc || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate scaled dimensions
      const scaleFactor = settings.scale / 100;
      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;
      
      // Draw scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Export image
      const dataUrl = canvas.toDataURL(settings.format, parseFloat(settings.quality));
      
      // Download
      const link = document.createElement('a');
      link.href = dataUrl;
      const ext = settings.format.split('/')[1];
      link.download = `${fileName}_converted.${ext}`;
      link.click();
    };
    img.src = imageSrc;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Image Converter & Resizer</h2>
        <p className="text-gray-500">Convert WebP to PNG/JPG, resize, and compress images privately using your browser.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Upload Image</label>
          <DragDropZone 
            accept="image/*"
            onFileSelect={handleImageUpload}
            label="Drag & drop an image here (WebP, JPG, PNG)"
          />

          {imageSrc && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4 mt-6">
              <h3 className="font-semibold text-gray-800">Conversion Settings</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Output Format</label>
                  <select 
                    value={settings.format}
                    onChange={(e) => setSettings({...settings, format: e.target.value})}
                    className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="image/png">PNG</option>
                    <option value="image/jpeg">JPG / JPEG</option>
                    <option value="image/webp">WebP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Scale Dimension ({settings.scale}%)</label>
                  <input 
                    type="range" 
                    min="10" max="200" step="10"
                    value={settings.scale}
                    onChange={(e) => setSettings({...settings, scale: parseInt(e.target.value)})}
                    className="w-full accent-pink-500"
                  />
                </div>

                {(settings.format === 'image/jpeg' || settings.format === 'image/webp') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Compression Quality ({Math.round(settings.quality * 100)}%)</label>
                    <input 
                      type="range" 
                      min="0.1" max="1" step="0.1"
                      value={settings.quality}
                      onChange={(e) => setSettings({...settings, quality: parseFloat(e.target.value)})}
                      className="w-full accent-pink-500"
                    />
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleDownload} 
                className="w-full px-4 py-2 bg-pink-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-pink-700 flex items-center justify-center gap-2 mt-4"
              >
                <Download className="w-4 h-4"/> Download Converted Image
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Preview</label>
          <div className="w-full h-96 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden p-2">
            {imageSrc ? (
              <img src={imageSrc} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-md" />
            ) : (
              <span className="text-gray-400 text-sm">No image selected</span>
            )}
          </div>
          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Minimize, CheckCircle, Download, RefreshCw, Image as ImageIcon, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function CompressImage() {
  const [file, setFile] = useState(null);
  
  // Settings State
  const [quality, setQuality] = useState(60); // 1-100
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Success State
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [stats, setStats] = useState({ original: 0, compressed: 0 });

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const handleFile = (newFile) => {
    if (newFile && newFile.type.startsWith('image/')) {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setIsProcessing(false);
  };

  const compressImage = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      
      await new Promise(resolve => img.onload = resolve);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Determine format: Use JPEG for JPEG/PNG (to compress well), keep WebP for WebP
      const format = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(format, quality / 100);
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      setStats({
        original: file.size,
        compressed: blob.size
      });
      
      setOutputUrl(URL.createObjectURL(blob));
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to compress image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // State 1: Upload
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Compress Image</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Reduce image file size instantly with high-quality compression.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="image/*"
            multiple={false}
            onFileSelect={handleFile}
            label="Select Image"
            icon={ImageIcon}
            className="p-20 py-32 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-400"
          />
        </div>
      </div>
    );
  }

  // State 4: Success
  if (success) {
    const savedBytes = stats.original - stats.compressed;
    const savedPct = stats.original > 0 ? ((savedBytes / stats.original) * 100).toFixed(0) : 0;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-emerald-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Image Compressed Successfully!</h2>
        
        <div className="flex gap-8 mb-10 text-center">
          <div className="bg-gray-50 px-6 py-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Original</p>
            <p className="text-2xl font-bold text-gray-800">{formatBytes(stats.original)}</p>
          </div>
          <div className="bg-emerald-50 px-6 py-4 rounded-xl border border-emerald-200 shadow-sm">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Compressed</p>
            <p className="text-2xl font-bold text-emerald-800">{formatBytes(stats.compressed)}</p>
          </div>
          <div className="bg-indigo-50 px-6 py-4 rounded-xl border border-indigo-200 shadow-sm">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wide">Saved</p>
            <p className="text-2xl font-bold text-indigo-800">{savedPct}%</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`compressed_${file.name}`}
            className="px-10 py-5 bg-emerald-600 text-white rounded-xl font-bold text-xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download Image
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Compress another
          </button>
        </div>
      </div>
    );
  }

  // State 3: Processing
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-emerald-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Compressing Image...</h2>
      </div>
    );
  }

  // State 2: Settings
  return (
    <div className="max-w-4xl mx-auto py-12 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <Minimize className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compression Settings</h2>
            <p className="text-gray-500">{file.name} ({formatBytes(file.size)})</p>
          </div>
        </div>
        
        <div className="p-8">
          <p className="font-bold text-gray-800 mb-2 text-lg">Select Quality Level</p>
          <div className="mb-10 p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-inner">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Quality</p>
                <p className="text-5xl font-extrabold text-emerald-600">{quality}%</p>
              </div>
            </div>
            
            <div className="relative">
              <input 
                type="range"
                min="1"
                max="100"
                step="1"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
            
            <div className="flex justify-between mt-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
              <span>Lowest Quality (Smallest Size)</span>
              <span>Highest Quality (Largest Size)</span>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={compressImage}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl transition-all"
            >
              Compress Image
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

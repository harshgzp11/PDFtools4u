import React, { useState } from 'react';
import { Minimize, CheckCircle, Download, RefreshCw, Image as ImageIcon, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function CompressImage() {
  const [file, setFile] = useState(null);
  
  // Settings State - Target file size in bytes
  const [targetSizeBytes, setTargetSizeBytes] = useState(0);
  const [customKbInput, setCustomKbInput] = useState('');
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

      // Default target size: 50% of original file size
      const defaultTarget = Math.max(1024, Math.round(newFile.size * 0.5));
      setTargetSizeBytes(defaultTarget);
      setCustomKbInput((defaultTarget / 1024).toFixed(1));
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setIsProcessing(false);
    setTargetSizeBytes(0);
    setCustomKbInput('');
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
      
      // Determine format: JPEG for JPEG/PNG (to compress effectively), WebP for WebP
      const format = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      
      let bestBlob = null;

      // If target size is greater than or equal to original size, output high quality
      if (targetSizeBytes >= file.size) {
        const dataUrl = canvas.toDataURL(format, 0.95);
        const res = await fetch(dataUrl);
        bestBlob = await res.blob();
      } else {
        // Binary search quality (min 0.02, max 0.98) to hit targetSizeBytes
        let minQ = 0.02;
        let maxQ = 0.98;

        for (let iter = 0; iter < 8; iter++) {
          const midQ = (minQ + maxQ) / 2;
          const dataUrl = canvas.toDataURL(format, midQ);
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          bestBlob = blob;

          if (blob.size > targetSizeBytes) {
            maxQ = midQ;
          } else {
            minQ = midQ;
          }
        }
      }

      setStats({
        original: file.size,
        compressed: bestBlob.size
      });
      
      setOutputUrl(URL.createObjectURL(bestBlob));
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
            Reduce image file size to your exact target KB or MB with smart compression.
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
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Original Size</p>
            <p className="text-2xl font-bold text-gray-800">{formatBytes(stats.original)}</p>
          </div>
          <div className="bg-emerald-50 px-6 py-4 rounded-xl border border-emerald-200 shadow-sm">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Compressed Size</p>
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
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Compressing Image to Target Size...</h2>
      </div>
    );
  }

  const minSizeBytes = Math.max(1024, Math.round(file.size * 0.05));
  const maxSizeBytes = file.size;

  // State 2: Settings
  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        
        <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-5">
          <div className="p-3.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
            <Minimize className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Compression Settings</h2>
            <p className="text-gray-500 font-medium text-sm sm:text-base">{file.name} ({formatBytes(file.size)})</p>
          </div>
        </div>
        
        <div className="p-6 sm:p-10">
          <p className="font-bold text-gray-800 mb-4 text-lg sm:text-xl">Target File Size</p>
          
          <div className="mb-10 p-6 sm:p-8 bg-gray-50/80 border border-gray-200/80 rounded-3xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 mb-8">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Desired Size</p>
                <div className="inline-flex items-center gap-3 bg-white px-6 py-3.5 rounded-2xl border-2 border-emerald-200/80 shadow-md focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 transition-all">
                  <input 
                    type="number" 
                    min="1"
                    max={Math.ceil(file.size / 1024)}
                    step="0.1"
                    value={customKbInput}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      setCustomKbInput(valStr);
                      const num = parseFloat(valStr);
                      if (!isNaN(num) && num > 0) {
                        const b = Math.min(file.size, Math.round(num * 1024));
                        setTargetSizeBytes(b);
                      }
                    }}
                    className="w-36 sm:w-44 text-3xl sm:text-4xl font-black text-emerald-600 bg-transparent focus:outline-none text-right font-mono"
                  />
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 pr-1">KB</span>
                </div>
              </div>

              <div className="bg-white px-6 py-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-start sm:items-end">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Original Size</p>
                <p className="text-xl sm:text-2xl font-black text-gray-800">{formatBytes(file.size)}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <input 
                  type="range"
                  min={minSizeBytes}
                  max={maxSizeBytes}
                  step="512"
                  value={targetSizeBytes}
                  onChange={(e) => {
                    const b = parseInt(e.target.value);
                    setTargetSizeBytes(b);
                    setCustomKbInput((b / 1024).toFixed(1));
                  }}
                  className="w-full h-3.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
              </div>
              
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                <span>Smallest (~{formatBytes(minSizeBytes)})</span>
                <span>Original ({formatBytes(maxSizeBytes)})</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={compressImage}
              className="flex-1 py-4 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
            >
              <Minimize className="w-6 h-6" /> Compress Image to {formatBytes(targetSizeBytes)}
            </button>
            <button 
              onClick={resetTool}
              className="px-8 py-4 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-lg rounded-2xl transition-all"
            >
              Cancel
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}

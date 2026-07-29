import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle, Download, RefreshCw, Image as ImageIcon, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function ConvertImage() {
  const [file, setFile] = useState(null);
  
  // Settings State
  const [targetFormat, setTargetFormat] = useState('image/png');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Success State
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputExtension, setOutputExtension] = useState('');

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type.startsWith('image/')) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const FORMATS = [
    { value: 'image/png', label: 'PNG', ext: 'png' },
    { value: 'image/jpeg', label: 'JPG / JPEG', ext: 'jpg' },
    { value: 'image/webp', label: 'WebP', ext: 'webp' },
  ];

  const handleFile = (newFile) => {
    if (newFile && newFile.type.startsWith('image/')) {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      // Auto select a different format than original
      const otherFormat = FORMATS.find(f => f.value !== newFile.type);
      if (otherFormat) setTargetFormat(otherFormat.value);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setIsProcessing(false);
  };

  const convertImage = async () => {
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
      
      const dataUrl = canvas.toDataURL(targetFormat, 0.92);
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const formatInfo = FORMATS.find(f => f.value === targetFormat);
      setOutputExtension(formatInfo.ext);
      
      setOutputUrl(URL.createObjectURL(blob));
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to convert image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // State 1: Upload
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Convert Image</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Convert your images to PNG, JPG, or WebP instantly.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="image/*"
            multiple={false}
            onFileSelect={handleFile}
            label="Select Image"
            icon={ImageIcon}
            className="p-20 py-32 bg-orange-50/50 hover:bg-orange-100 border-orange-300 hover:border-orange-400"
          />
        </div>
      </div>
    );
  }

  // State 4: Success
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-orange-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Image Converted Successfully!</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center mt-8">
          <a 
            href={outputUrl} 
            download={`converted_${file.name.split('.')[0]}.${outputExtension}`}
            className="px-10 py-5 bg-orange-500 text-white rounded-xl font-bold text-xl hover:bg-orange-600 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download {outputExtension.toUpperCase()}
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Convert another
          </button>
        </div>
      </div>
    );
  }

  // State 3: Processing
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-orange-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Converting Image...</h2>
      </div>
    );
  }

  // State 2: Settings
  return (
    <div className="max-w-4xl mx-auto py-12 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
            <ArrowLeftRight className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Conversion Settings</h2>
            <p className="text-gray-500">{file.name}</p>
          </div>
        </div>
        
        <div className="p-8">
          <p className="font-bold text-gray-800 mb-4 text-lg">Select Target Format</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => setTargetFormat(f.value)}
                className={`py-4 px-6 rounded-xl font-bold text-lg border-2 transition-all ${
                  targetFormat === f.value 
                    ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md ring-2 ring-orange-500/20' 
                    : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={convertImage}
              className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl transition-all"
            >
              Convert Image
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

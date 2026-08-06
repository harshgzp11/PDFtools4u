import React, { useState, useRef } from 'react';
import { UploadCloud, Sparkles } from 'lucide-react';

export default function DragDropZone({ 
  onFileSelect, 
  accept, 
  label = "Drag & drop your files here, or browse", 
  multiple = false,
  className = "",
  icon: Icon = UploadCloud,
  showSample = true
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple) {
        onFileSelect(Array.from(e.dataTransfer.files));
      } else {
        onFileSelect(e.dataTransfer.files[0]);
      }
      e.dataTransfer.clearData();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple) {
        onFileSelect(Array.from(e.target.files));
      } else {
        onFileSelect(e.target.files[0]);
      }
    }
  };

  const handleLoadSample = async (e) => {
    e.stopPropagation();
    try {
      setLoadingSample(true);
      const res = await fetch('/images/aadhaar-sample.png');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'aadhaar-sample.png', { type: 'image/png' });
      if (multiple) {
        onFileSelect([sampleFile]);
      } else {
        onFileSelect(sampleFile);
      }
    } catch (err) {
      console.error("Failed to load sample image:", err);
    } finally {
      setLoadingSample(false);
    }
  };

  const isImageAccept = !accept || accept.includes('image') || accept.includes('.png') || accept.includes('.jpg') || accept.includes('.jpeg') || accept.includes('*');

  return (
    <div 
      className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-full max-w-4xl mx-auto p-12 py-20 ${
        isDragging ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-inner' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-lg bg-blue-50/30'
      } ${(className || '').replace(/p-\\d+|py-\\d+|px-\\d+|max-w-\\[\\w\\]+|w-full|mx-auto/g, '')}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept={accept}
        multiple={multiple}
      />
      
      <div className="bg-blue-600 text-white p-4 rounded-full mb-5 shadow-md hover:scale-110 transition-transform duration-300 pointer-events-none">
        <Icon className="w-10 h-10" />
      </div>
      
      <p className="text-2xl font-bold text-gray-800 mb-2 pointer-events-none">{label}</p>
      <p className="text-sm font-medium text-gray-500 pointer-events-none mb-5">Maximum privacy. Processed entirely in your browser.</p>

      {showSample && isImageAccept && (
        <button
          type="button"
          onClick={handleLoadSample}
          disabled={loadingSample}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200 rounded-full transition-all shadow-sm cursor-pointer hover:scale-105"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          {loadingSample ? 'Loading sample...' : 'Try with Sample Image (Aadhaar Card)'}
        </button>
      )}
    </div>
  );
}

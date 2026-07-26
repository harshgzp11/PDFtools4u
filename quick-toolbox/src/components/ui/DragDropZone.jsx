import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

export default function DragDropZone({ onFileSelect, accept, label = "Drag & drop your files here, or browse", multiple = false }) {
  const [isDragging, setIsDragging] = useState(false);
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

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 hover:border-gray-400 text-gray-500 hover:bg-gray-50'
      }`}
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
      <UploadCloud className="w-12 h-12 mb-4 opacity-75" />
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm opacity-70 mt-2">Maximum privacy. Processed entirely in your browser.</p>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

function getFormatBadge(accept) {
  if (!accept) return null;
  const str = String(accept).toLowerCase();
  if (str.includes('pdf')) return 'PDF (.pdf)';
  if (str.includes('docx')) return 'Word (.docx)';
  if (str.includes('xlsx') || str.includes('xls') || str.includes('csv')) return 'Excel (.xlsx, .xls, .csv)';
  if (str.includes('pptx') || str.includes('ppt')) return 'PowerPoint (.pptx, .ppt)';
  if (str.includes('rtf')) return 'Rich Text (.rtf)';
  if (str.includes('image') || str.includes('jpg') || str.includes('png') || str.includes('webp')) return 'Images (.jpg, .png, .webp)';
  if (str.includes('txt') || str.includes('text')) return 'Text (.txt)';
  if (str.includes('json')) return 'JSON (.json)';
  return null;
}

export default function DragDropZone({ 
  onFileSelect, 
  accept, 
  label = "Drag & drop your files here, or browse", 
  multiple = false,
  className = "",
  icon: Icon = UploadCloud
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const formatBadge = getFormatBadge(accept);

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
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 w-full max-w-4xl mx-auto p-12 py-20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 ${
        isDragging ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-inner' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-lg bg-blue-50/30'
      } ${(className || '').replace(/p-\\d+|py-\\d+|px-\\d+|max-w-\\[\\w\\]+|w-full|mx-auto/g, '')}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
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
      {formatBadge && (
        <span className="inline-flex items-center gap-1 px-3 py-0.5 bg-blue-100/90 border border-blue-200 text-blue-800 rounded-full text-xs font-semibold mb-3 pointer-events-none shadow-sm">
          Supports: {formatBadge}
        </span>
      )}
      <p className="text-sm font-medium text-gray-500 pointer-events-none mb-5">Maximum privacy. Processed entirely in your browser.</p>
    </div>
  );
}

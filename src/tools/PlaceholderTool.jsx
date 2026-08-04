import React, { useState, useEffect } from 'react';
import { Code, Hammer, FileText } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function PlaceholderTool({ toolName }) {
  const [clicked, setClicked] = useState(false);
  const [sharedFile, setSharedFile] = useState(null);

  useEffect(() => {
    if (window.__sharedFile) {
      setSharedFile(window.__sharedFile);
      setClicked(true);
      window.__sharedFile = null; // Clear it so it doesn't leak
    }
  }, []);

  // State 1: Upload Focus
  if (!clicked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wide rounded-full border border-blue-200 shadow-sm mb-2">
            Coming Soon
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">{toolName || "Tool"}</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            This tool is currently under construction. You can test the new interface below!
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="*"
            multiple={true}
            onFileSelect={() => setClicked(true)}
            label={`Select files for ${toolName || "Tool"}`}
            icon={Code}
            className="p-20 py-32 bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-gray-400 shadow-sm"
          />
        </div>
      </div>
    );
  }

  // State 3: Coming Soon Screen
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
      <Hammer className="w-24 h-24 text-gray-400 mb-8 animate-bounce" style={{animationDuration: '2s'}} />
      <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Feature Coming Soon!</h2>
      
      {sharedFile ? (
        <div className="mb-10 text-center p-6 bg-blue-50 border border-blue-100 rounded-xl shadow-sm">
          <p className="text-lg text-gray-700 font-medium mb-2">We received your file:</p>
          <div className="flex items-center justify-center gap-2 text-blue-600 font-bold">
            <FileText className="w-5 h-5" />
            {sharedFile.name}
          </div>
          <p className="text-sm text-gray-500 mt-4">We are actively building the processing logic for this tool.</p>
        </div>
      ) : (
        <p className="text-lg text-gray-500 mb-10">We are actively building the processing logic for this tool.</p>
      )}
      
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button 
          onClick={() => { setClicked(false); setSharedFile(null); }}
          className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 shadow-sm"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

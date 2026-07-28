import React, { useState } from 'react';
import { Code, Hammer } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function PlaceholderTool({ toolName }) {
  const [clicked, setClicked] = useState(false);

  // State 1: Upload Focus
  if (!clicked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">{toolName || "Tool"}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
            className="p-20 py-32 bg-gray-50/50 hover:bg-gray-100 border-gray-300 hover:border-gray-400"
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
      <p className="text-lg text-gray-600 mb-10">We are actively building the processing logic for this tool.</p>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button 
          onClick={() => setClicked(false)}
          className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

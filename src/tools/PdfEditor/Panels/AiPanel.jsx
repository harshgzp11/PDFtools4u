import React from 'react';
import { Sparkles, X, ScanText } from 'lucide-react';
import { toast } from 'sonner';

export default function AiPanel({ onClose }) {
  const handleOcr = () => {
    toast.info("Extracting text via OCR... (this is a placeholder)");
  };

  return (
    <div className="absolute xl:relative right-0 top-0 bottom-0 w-80 h-full bg-white border-l border-gray-200 shadow-2xl xl:shadow-xl flex flex-col z-30 flex-shrink-0 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Tools
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div className="space-y-4">
          <button 
            onClick={handleOcr}
            className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-200 transition-colors">
                <ScanText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-800">Smart OCR</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Extract text from scanned pages automatically using AI text recognition.
            </p>
          </button>
          
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed">
            <h3 className="font-semibold text-gray-800 mb-1">Summarize PDF</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>
          
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed">
            <h3 className="font-semibold text-gray-800 mb-1">Chat with Document</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

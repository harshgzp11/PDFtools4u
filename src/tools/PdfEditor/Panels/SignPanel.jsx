import React, { useState, useRef, useEffect } from 'react';
import { PenTool, X, Type, Upload, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SignPanel({ onClose, onAddSignature }) {
  const [activeTab, setActiveTab] = useState('draw'); // 'draw', 'type', 'upload'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
    }
  }, [activeTab]);

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleCreateSignature = () => {
    if (activeTab === 'draw' && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onAddSignature(dataUrl);
      onClose();
    } else {
      toast.info('Typing and Uploading signatures will be available soon.');
    }
  };

  return (
    <div className="absolute xl:relative right-0 top-0 bottom-0 w-80 h-full bg-white border-l border-gray-200 shadow-2xl xl:shadow-xl flex flex-col z-30 flex-shrink-0 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <PenTool className="w-5 h-5 text-gray-600" />
          Create Signature
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('draw')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'draw' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Pencil className="w-4 h-4" /> Draw
          </button>
          <button 
            onClick={() => setActiveTab('type')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'type' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Type className="w-4 h-4" /> Type
          </button>
          <button 
            onClick={() => setActiveTab('upload')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'upload' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>

        <div className="flex-1 min-h-[200px]">
          {activeTab === 'draw' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden relative">
                <canvas 
                  ref={canvasRef}
                  width={280}
                  height={250}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="cursor-crosshair touch-none w-full h-full"
                />
              </div>
              <div className="flex justify-end mt-2">
                <button onClick={clearCanvas} className="text-sm text-gray-500 hover:text-gray-800">Clear</button>
              </div>
            </div>
          )}
          {activeTab === 'type' && (
            <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 border border-gray-200 rounded-lg">
              Type signature UI coming soon
            </div>
          )}
          {activeTab === 'upload' && (
            <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 border border-gray-200 border-dashed rounded-lg">
              Upload signature UI coming soon
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={handleCreateSignature}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <Check className="w-5 h-5" />
            Use Signature
          </button>
        </div>
      </div>
    </div>
  );
}

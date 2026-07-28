import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Eraser, Image as ImageIcon, Type as TypeIcon, PenTool } from 'lucide-react';
import DragDropZone from './DragDropZone';

// Dynamically inject a cursive font for the Type tab
const loadFont = () => {
  if (!document.getElementById('signature-font')) {
    const link = document.createElement('link');
    link.id = 'signature-font';
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
};

export default function SignatureModal({ isOpen, onClose, onSave }) {
  const [tab, setTab] = useState('draw'); // 'draw', 'type', 'upload'
  const [penColor, setPenColor] = useState('black');
  
  // Draw State
  const sigCanvas = useRef(null);
  
  // Upload State
  const [sigImage, setSigImage] = useState(null);
  
  // Type State
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (isOpen) loadFont();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    if (tab === 'draw' && sigCanvas.current) {
      sigCanvas.current.clear();
    } else if (tab === 'upload') {
      setSigImage(null);
    } else if (tab === 'type') {
      setTypedName('');
    }
  };

  const removeBackground = (dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Light pixels become transparent
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
          if (luminance > 160) {
            data[i + 3] = 0; // alpha to 0
          } else {
            // Darken ink to pure black
            data[i] = 0; data[i+1] = 0; data[i+2] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  };

  const handleUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const processedUrl = await removeBackground(e.target.result);
        setSigImage(processedUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateTypedSignature = () => {
    if (!typedName.trim()) return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Initial large canvas to measure
    canvas.width = 1000;
    canvas.height = 300;
    ctx.font = '80px "Dancing Script", cursive';
    const metrics = ctx.measureText(typedName);
    const textWidth = metrics.width;
    
    // Resize perfectly to text
    canvas.width = textWidth + 40;
    canvas.height = 150;
    
    // Context is cleared on resize, set again
    ctx.font = '80px "Dancing Script", cursive';
    ctx.fillStyle = penColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 20, canvas.height / 2);
    
    return canvas.toDataURL('image/png');
  };

  const handleCreate = () => {
    let dataUrl = null;
    
    if (tab === 'draw') {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      }
    } else if (tab === 'upload') {
      dataUrl = sigImage;
    } else if (tab === 'type') {
      dataUrl = generateTypedSignature();
    }

    if (dataUrl) {
      onSave(dataUrl);
      onClose();
    } else {
      alert("Please provide a signature before saving.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Add Signature</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'draw', label: 'Draw', icon: PenTool },
            { id: 'type', label: 'Type', icon: TypeIcon },
            { id: 'upload', label: 'Upload', icon: ImageIcon }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                tab === t.id ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 bg-gray-50/30">
          
          {/* Draw Tab */}
          {tab === 'draw' && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden cursor-crosshair">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor={penColor}
                canvasProps={{
                  className: 'w-full h-56 signature-canvas'
                }}
              />
            </div>
          )}

          {/* Type Tab */}
          {tab === 'type' && (
            <div className="space-y-4">
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-lg"
              />
              <div className="h-40 border border-gray-200 rounded-xl bg-white flex items-center justify-center overflow-hidden p-6">
                {typedName ? (
                  <span 
                    style={{ fontFamily: '"Dancing Script", cursive', color: penColor }}
                    className="text-6xl text-center leading-tight break-all"
                  >
                    {typedName}
                  </span>
                ) : (
                  <span className="text-gray-300 font-medium">Preview</span>
                )}
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {tab === 'upload' && (
            <div className="h-56 border-2 border-dashed border-gray-300 rounded-xl bg-white flex items-center justify-center overflow-hidden">
              {sigImage ? (
                <img src={sigImage} alt="Preview" className="max-h-full max-w-full object-contain p-4" />
              ) : (
                <div className="w-full h-full">
                  <DragDropZone
                    accept="image/*"
                    multiple={false}
                    onFileSelect={handleUpload}
                    label="Drop signature image"
                    icon={ImageIcon}
                    className="h-full border-none bg-transparent hover:bg-gray-50"
                  />
                </div>
              )}
            </div>
          )}

          {/* Footer Controls (Colors & Clear) */}
          <div className="mt-6 flex items-center justify-between">
            {tab !== 'upload' ? (
              <div className="flex gap-2">
                {['black', '#2563eb', '#dc2626'].map(color => (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      penColor === color ? 'border-gray-900 scale-110 shadow-md' : 'border-gray-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            ) : <div />}

            <button 
              onClick={handleClear}
              className="text-sm flex items-center gap-1.5 text-gray-500 hover:text-red-500 font-bold px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
            >
              <Eraser className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 pt-0 bg-gray-50/30">
          <button 
            onClick={handleCreate} 
            className="w-full px-6 py-4 bg-indigo-600 rounded-xl shadow-lg text-lg font-bold text-white hover:bg-indigo-700 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            Create Signature
          </button>
        </div>

      </div>
    </div>
  );
}

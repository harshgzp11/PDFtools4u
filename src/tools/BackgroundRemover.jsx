import React, { useState } from 'react';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import { Download, Loader2, Sparkles } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function BackgroundRemover() {
  const [imageSrc, setImageSrc] = useState(null);
  const [resultSrc, setResultSrc] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImageUpload = (file) => {
    if (!file.type.startsWith('image/')) return;
    setFileName(file.name.split('.')[0]);
    setResultSrc(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = async () => {
    if (!imageSrc) return;
    setLoading(true);
    setProgress(0);
    
    try {
      // Configuration for model loading progress and publicPath for WASM/ONNX models
      const config = {
        publicPath: "https://static.imgly.com/@imgly/background-removal-data/1.7.0/dist/",
        progress: (key, current, total) => {
          if (total) setProgress(Math.round((current / total) * 100));
        }
      };

      const imageBlob = await imglyRemoveBackground(imageSrc, config);
      const url = URL.createObjectURL(imageBlob);
      setResultSrc(url);
    } catch (err) {
      console.error(err);
      alert("Failed to remove background. Please try a different image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Background Remover</h2>
        <p className="text-gray-500">Automatically remove image backgrounds with AI, running 100% locally in your browser.</p>
        <p className="text-xs text-orange-600 font-medium mt-1">Note: A one-time ~40MB AI model download is required on the first use.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Upload Image</label>
          <DragDropZone 
            accept="image/*"
            onFileSelect={handleImageUpload}
            label="Drag & drop an image here"
          />

          {imageSrc && (
            <div className="space-y-4 mt-6">
              <button 
                onClick={removeBackground} 
                disabled={loading || resultSrc}
                className="w-full px-4 py-3 bg-indigo-600 border border-transparent rounded-lg shadow-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin"/> Processing... {progress > 0 && `(${progress}%)`}</>
                ) : resultSrc ? (
                  'Background Removed!'
                ) : (
                  <><Sparkles className="w-5 h-5"/> Remove Background</>
                )}
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Result Preview</label>
          <div className="w-full h-96 border border-gray-300 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden p-4 relative bg-grid-pattern">
             {/* Simple CSS checkerboard pattern for transparent background visibility */}
             <style dangerouslySetInnerHTML={{__html: `
                .bg-grid-pattern {
                  background-image: 
                    linear-gradient(45deg, #ccc 25%, transparent 25%), 
                    linear-gradient(135deg, #ccc 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #ccc 75%),
                    linear-gradient(135deg, transparent 75%, #ccc 75%);
                  background-size: 20px 20px;
                  background-position: 0 0, 10px 0, 10px -10px, 0px 10px;
                }
             `}} />

            {resultSrc ? (
              <img src={resultSrc} alt="Result" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
            ) : imageSrc ? (
              <img src={imageSrc} alt="Original" className="max-w-full max-h-full object-contain opacity-70" />
            ) : (
              <span className="text-gray-500 bg-white/80 p-2 rounded text-sm backdrop-blur">No image selected</span>
            )}
          </div>
          
          {resultSrc && (
            <div className="flex justify-end pt-2">
              <a 
                href={resultSrc}
                download={`${fileName}_nobg.png`}
                className="px-6 py-2.5 bg-green-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-5 h-5"/> Download Transparent PNG
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

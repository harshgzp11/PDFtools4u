import React, { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { Download, Stamp, FileText, CheckCircle, ArrowLeft, RefreshCw, Type, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';

export default function PdfWatermark() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  
  const [thumbnails, setThumbnails] = useState([]);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(72);
  const [rotation, setRotation] = useState(45);
  const [colorMode, setColorMode] = useState('black');

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      setThumbnails([]);
      setExtractingThumbs(true);
      
      try {
        const thumbs = await getPdfThumbnails(newFile, 0.5); 
        setThumbnails(thumbs);
      } catch (e) {
        console.error(e);
        alert(`Failed to load PDF: ${e.message}`);
        setFile(null);
      } finally {
        setExtractingThumbs(false);
      }
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setThumbnails([]);
  };

  const addWatermark = async () => {
    if (!file || !watermarkText) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      
      const textColor = colorMode === 'red' ? rgb(0.8, 0.2, 0.2) : rgb(0.2, 0.2, 0.2);

      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        // Very basic centering math
        const textWidth = watermarkText.length * fontSize * 0.5;
        const textHeight = fontSize;
        
        const x = width / 2 - (textWidth / 2) * Math.cos((rotation * Math.PI) / 180);
        const y = height / 2 - (textHeight / 2);

        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          color: textColor,
          opacity: opacity,
          rotate: degrees(rotation),
        });
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermarked_${file.name}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to add watermark. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  // State 1: Upload Focus
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Watermark PDF</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Stamp an image or text over your PDF in seconds.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={Stamp}
            className="p-20 py-32 bg-rose-50/50 hover:bg-rose-100 border-rose-300 hover:border-rose-400"
          />
        </div>
      </div>
    );
  }

  // State 3: Success Screen
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Watermark Applied!</h2>
        <p className="text-lg text-gray-600 mb-10">Your stamped document is ready.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`watermarked_${file.name}`}
            className="px-10 py-5 bg-rose-600 text-white rounded-xl font-bold text-xl hover:bg-rose-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Start Over
          </button>
        </div>
      </div>
    );
  }

  // State 2: Workspace View
  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[70vh] gap-6 animate-in slide-in-from-right-8 duration-500 -mx-6 sm:-mx-8 lg:-mx-8">
      {/* Main Workspace Area (Left) */}
      <div className="flex-1 bg-gray-100 rounded-xl lg:rounded-l-none lg:rounded-r-2xl border-y border-r border-gray-200 p-8 relative shadow-inner overflow-y-auto">
        <button 
          onClick={resetTool} 
          className="absolute top-6 left-6 p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 border border-gray-200 z-10"
          title="Back to upload"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="mt-12">
          {extractingThumbs ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-rose-500 gap-4">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Rendering preview...</p>
            </div>
          ) : (
            <div className={getDynamicGridClass(thumbnails.length)}>
              {thumbnails.map((thumb) => {
                const idx = thumb.originalIndex;
                
                // Scale font size based on how many pages are showing in the grid roughly
                // The more pages (smaller thumbs), the smaller the font should appear.
                const visualScale = thumbnails.length <= 4 ? 0.35 : thumbnails.length <= 9 ? 0.25 : 0.15;

                return (
                  <div 
                    key={thumb.id} 
                    className="relative aspect-[1/1.4] bg-white rounded-xl shadow-md border-4 border-transparent overflow-hidden flex items-center justify-center p-2"
                  >
                    <img 
                      src={thumb.dataUrl} 
                      alt={`Page ${idx + 1}`} 
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    
                    {/* Visual representation of the watermark */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                      style={{ 
                        opacity: opacity,
                        transform: `rotate(${rotation}deg)`
                      }}
                    >
                      <span 
                        className="font-bold whitespace-nowrap drop-shadow-sm"
                        style={{
                          fontSize: `${fontSize * visualScale}px`,
                          color: colorMode === 'red' ? '#dc2626' : '#1f2937'
                        }}
                      >
                        {watermarkText || 'TEXT'}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center bg-white/90 border-gray-300 text-gray-700 shadow-sm z-10">
                      {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel (Right Sidebar) */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col bg-white border-l border-gray-200 pb-8 px-6 lg:px-0">
        <div className="p-6 lg:p-8 space-y-8 flex-1 overflow-y-auto">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Watermark settings</h3>
            <p className="text-gray-500 text-sm">Configure your text stamp below.</p>
          </div>
          
          <div className="space-y-6">
             <div className="space-y-2">
               <label className="block text-sm font-bold text-gray-700 tracking-wider">Text</label>
               <div className="relative">
                 <input 
                   type="text" 
                   value={watermarkText}
                   onChange={(e) => setWatermarkText(e.target.value)}
                   className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all pl-10"
                   placeholder="e.g. CONFIDENTIAL"
                 />
                 <Type className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
               </div>
             </div>

             <div className="space-y-2">
               <label className="block text-sm font-bold text-gray-700 tracking-wider">Transparency</label>
               <input 
                 type="range" 
                 min="0.1" 
                 max="1" 
                 step="0.1"
                 value={opacity}
                 onChange={(e) => setOpacity(parseFloat(e.target.value))}
                 className="w-full accent-rose-600"
               />
               <div className="flex justify-between text-xs text-gray-500 font-medium">
                 <span>Light</span>
                 <span>Solid</span>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="block text-sm font-bold text-gray-700 tracking-wider">Size</label>
                 <select 
                   value={fontSize}
                   onChange={(e) => setFontSize(parseInt(e.target.value))}
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                 >
                   <option value={36}>Small</option>
                   <option value={72}>Medium</option>
                   <option value={100}>Large</option>
                   <option value={144}>Huge</option>
                 </select>
               </div>
               
               <div className="space-y-2">
                 <label className="block text-sm font-bold text-gray-700 tracking-wider">Color</label>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setColorMode('black')}
                     className={`flex-1 py-2 rounded-lg border-2 ${colorMode === 'black' ? 'border-gray-900 bg-gray-100' : 'border-gray-200 bg-white'}`}
                   >
                     <div className="w-5 h-5 bg-gray-900 rounded-full mx-auto"></div>
                   </button>
                   <button 
                     onClick={() => setColorMode('red')}
                     className={`flex-1 py-2 rounded-lg border-2 ${colorMode === 'red' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}
                   >
                     <div className="w-5 h-5 bg-red-500 rounded-full mx-auto"></div>
                   </button>
                 </div>
               </div>
             </div>
             
             <div className="space-y-2">
               <label className="block text-sm font-bold text-gray-700 tracking-wider">Rotation</label>
               <input 
                 type="range" 
                 min="0" 
                 max="360" 
                 step="15"
                 value={rotation}
                 onChange={(e) => setRotation(parseInt(e.target.value))}
                 className="w-full accent-rose-600"
               />
               <div className="text-center text-xs text-gray-500 font-medium">
                 {rotation}°
               </div>
             </div>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={addWatermark} 
            disabled={loading || !watermarkText}
            className="w-full px-6 py-5 bg-rose-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Processing...' : (
              <><Stamp className="w-6 h-6"/> Add Watermark</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

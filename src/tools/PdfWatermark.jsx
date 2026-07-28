import React, { useState } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { Stamp, Type } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';

export default function PdfWatermark() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(72);
  const [rotation, setRotation] = useState(45);
  const [colorMode, setColorMode] = useState('black');

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
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
      
      setSuccessData({
        url,
        filename: `watermarked_${file.name}`,
        title: 'Watermark Applied!',
        subtitle: 'Your stamped document is ready to download.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to add watermark. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const renderGridItem = (thumb, idx, thumbnails) => {
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
  };

  const processButton = (
    <button 
      onClick={addWatermark} 
      disabled={loading || !watermarkText}
      className="w-full px-6 py-4 bg-rose-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? 'Processing...' : (
        <><Stamp className="w-6 h-6"/> Add Watermark</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Watermark PDF"
      description="Stamp an image or text over your PDF in seconds."
      icon={Stamp}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      gridMode={true}
      renderGridItem={renderGridItem}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Watermark settings</h3>
        
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

        <div className="space-y-2 pt-2">
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

        <div className="grid grid-cols-2 gap-4 pt-2">
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
        
        <div className="space-y-2 pt-2">
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
    </ToolPreviewLayout>
  );
}

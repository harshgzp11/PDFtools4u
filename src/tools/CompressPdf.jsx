import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileArchive, CheckCircle, Download, RefreshCw, Zap, ThumbsUp, Image as ImageIcon, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfCanvases } from '../lib/pdfRenderer';

export default function CompressPdf() {
  const [file, setFile] = useState(null);
  
  // Settings State
  const [targetSizeMB, setTargetSizeMB] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Success State
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [stats, setStats] = useState({ original: 0, compressed: 0 });

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const handleFile = (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      setProgress(0);
      const sizeMB = newFile.size / (1024 * 1024);
      setTargetSizeMB(Math.max(0.1, parseFloat((sizeMB * 0.5).toFixed(2)))); // default 50%
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setOutputUrl(null);
    setProgress(0);
    setIsProcessing(false);
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const targetBytes = Math.floor(targetSizeMB * 1024 * 1024);
      
      // 1. Render all pages to canvases (resolution scale 2.0)
      const canvases = await getPdfCanvases(file, 2.0, (pct) => {
        // Map 0-100% of rendering to 0-40% of total progress
        setProgress(Math.floor(pct * 0.4));
      });
      
      let minQ = 0.01;
      let maxQ = 1.0;
      let bestBytes = null;
      let closestSizeDiff = Infinity;
      
      const steps = 5; // Binary search iterations
      
      // 2. Iteratively find best JPEG quality
      for (let step = 0; step < steps; step++) {
        let midQ = (minQ + maxQ) / 2;
        
        const pdfDoc = await PDFDocument.create();
        
        for (let i = 0; i < canvases.length; i++) {
          const dataUrl = canvases[i].canvas.toDataURL('image/jpeg', midQ);
          const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
          const jpgImage = await pdfDoc.embedJpg(imageBytes);
          
          const page = pdfDoc.addPage([canvases[i].width, canvases[i].height]);
          page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: canvases[i].width,
            height: canvases[i].height,
          });
        }
        
        const pdfBytes = await pdfDoc.save();
        const diff = Math.abs(pdfBytes.length - targetBytes);
        
        if (diff < closestSizeDiff) {
          closestSizeDiff = diff;
          bestBytes = pdfBytes;
        }
        
        if (pdfBytes.length === targetBytes) {
          break;
        } else if (pdfBytes.length < targetBytes) {
          minQ = midQ;
        } else {
          maxQ = midQ;
        }
        
        // Map remaining progress 40-90%
        setProgress(40 + Math.floor(((step + 1) / steps) * 50));
      }
      
      setProgress(95);
      
      // 3. Exact matching via padding if best bytes are smaller than target
      let finalBytes = bestBytes;
      if (finalBytes.length < targetBytes) {
         const padded = new Uint8Array(targetBytes);
         padded.set(finalBytes); // the rest will be 0 (ignored by PDF readers after %%EOF)
         finalBytes = padded;
      }
      
      setProgress(100);
      
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setStats({
        original: file.size,
        compressed: blob.size
      });
      
      setOutputUrl(url);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to compress document. It might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  // State 1: Upload
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Compress PDF</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Reduce file size while optimizing for maximal PDF quality.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={FileArchive}
            className="p-20 py-32 bg-green-50/50 hover:bg-green-100 border-green-300 hover:border-green-400"
          />
        </div>
      </div>
    );
  }

  // State 4: Success
  if (success) {
    const savedBytes = stats.original - stats.compressed;
    const savedPct = stats.original > 0 ? ((savedBytes / stats.original) * 100).toFixed(0) : 0;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">PDF Compressed Successfully!</h2>
        
        <div className="flex gap-8 mb-10 text-center">
          <div className="bg-gray-50 px-6 py-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Original</p>
            <p className="text-2xl font-bold text-gray-800">{formatBytes(stats.original)}</p>
          </div>
          <div className="bg-green-50 px-6 py-4 rounded-xl border border-green-200 shadow-sm">
            <p className="text-sm font-bold text-green-600 uppercase tracking-wide">Compressed</p>
            <p className="text-2xl font-bold text-green-800">{formatBytes(stats.compressed)}</p>
          </div>
          <div className="bg-indigo-50 px-6 py-4 rounded-xl border border-indigo-200 shadow-sm">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wide">Saved</p>
            <p className="text-2xl font-bold text-indigo-800">{savedPct}%</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`compressed_${file.name}`}
            className="px-10 py-5 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download Compressed PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Compress another
          </button>
        </div>
      </div>
    );
  }

  // State 3: Processing
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-green-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Compressing Document...</h2>
        <p className="text-lg text-gray-500 mb-8 max-w-md text-center">
          This process may take a minute depending on the size of your document.
        </p>
        
        <div className="w-full max-w-md bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-green-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-4 font-bold text-gray-700">{progress}% Complete</p>
      </div>
    );
  }

  // State 2: Settings
  return (
    <div className="max-w-4xl mx-auto py-12 animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <FileArchive className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compression Settings</h2>
            <p className="text-gray-500">{file.name} ({formatBytes(file.size)})</p>
          </div>
        </div>
        
        <div className="p-8">
          <p className="font-bold text-gray-800 mb-2 text-lg">Select Target File Size</p>
          <div className="mb-10 p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-inner">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Target Size</p>
                <p className="text-5xl font-extrabold text-green-600">{targetSizeMB.toFixed(2)} <span className="text-xl">MB</span></p>
              </div>
              <div className="text-right pb-1">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Original Size</p>
                <p className="text-xl font-bold text-gray-800">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            
            <div className="relative">
              <input 
                type="range"
                min="0.10"
                max={(file.size / (1024 * 1024)).toFixed(2)}
                step="0.01"
                value={targetSizeMB}
                onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
                className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
            </div>
            
            <div className="flex justify-between mt-3 text-xs font-bold text-gray-400 uppercase tracking-wide">
              <span>Max Compression</span>
              <span>Less Compression</span>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex gap-3 mb-8">
            <span className="font-bold text-amber-900">Note:</span>
            <p>Compressing PDFs uses a flattening process. This will turn selectable text into images, making the document unsearchable. Ideal for scanned documents or flattening forms.</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={compressPdf}
              className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl transition-all"
            >
              Compress PDF
            </button>
            <button 
              onClick={resetTool}
              className="px-6 py-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-lg rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}

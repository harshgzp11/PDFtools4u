import React, { useState } from 'react';
import { FileArchive, Minimize, Scissors, ListOrdered, RefreshCw, Loader2 } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { compressPdfToTarget } from '../utils/pdfCompression';
import { trackError } from '../lib/analytics';
export default function CompressPdf() {
  const [file, setFile] = useState(null);
  
  // Settings State
  const [targetSizeMB, setTargetSizeMB] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Success State
  const [successData, setSuccessData] = useState(null);

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
      setSuccessData(null);
      setProgress(0);
      const sizeMB = newFile.size / (1024 * 1024);
      setTargetSizeMB(Math.max(0.1, parseFloat((sizeMB * 0.5).toFixed(2)))); // default 50%
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setProgress(0);
    setIsProcessing(false);
  };

  const compressPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const finalBytes = await compressPdfToTarget(file, targetSizeMB, setProgress);
      
      setProgress(100);
      
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const savedBytes = file.size - blob.size;
      const savedPct = file.size > 0 ? ((savedBytes / file.size) * 100).toFixed(0) : 0;
      
      setSuccessData({
        url,
        filename: `compressed_${file.name}`,
        originalSize: file.size,
        outputSize: blob.size,
        title: 'PDF Compressed Successfully!',
        subtitle: 'We significantly reduced your file size.',
        statsComponent: (
          <div className="flex gap-4 sm:gap-8 text-center">
            <div className="bg-gray-50 px-6 py-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Original</p>
              <p className="text-2xl font-bold text-gray-800">{formatBytes(file.size)}</p>
            </div>
            <div className="bg-green-50 px-6 py-4 rounded-xl border border-green-200 shadow-sm">
              <p className="text-sm font-bold text-green-600 uppercase tracking-wide">Compressed</p>
              <p className="text-2xl font-bold text-green-800">{formatBytes(blob.size)}</p>
            </div>
            <div className="bg-indigo-50 px-6 py-4 rounded-xl border border-indigo-200 shadow-sm">
              <p className="text-sm font-bold text-indigo-600 uppercase tracking-wide">Saved</p>
              <p className="text-2xl font-bold text-indigo-800">{savedPct}%</p>
            </div>
          </div>
        ),
        quickActions: (
          <>
            <a 
              href="/pdf-split" 
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/pdf-split");
                window.dispatchEvent(new Event('popstate'));
              }} 
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <Scissors className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-medium text-gray-700">Split PDF</span>
            </a>
            <a 
              href="/number-pages" 
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/number-pages");
                window.dispatchEvent(new Event('popstate'));
              }} 
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <ListOrdered className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-medium text-gray-700">Add Numbers</span>
            </a>
            <a 
              href="/rotate-pdf" 
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/rotate-pdf");
                window.dispatchEvent(new Event('popstate'));
              }} 
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <RefreshCw className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm font-medium text-gray-700">Rotate</span>
            </a>
          </>
        )
      });
    } catch (err) {
      console.error(err);
      let errorType = 'compression_failed';
      if (err.message?.toLowerCase().includes('encrypt')) errorType = 'encrypted_file';
      trackError('Compress PDF', errorType);
      alert("Failed to compress document. It might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processButton = isProcessing ? (
    <div className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="text-sm font-bold text-gray-700">{progress}% Complete</p>
    </div>
  ) : (
    <button
      onClick={compressPdf}
      className="w-full py-4 bg-green-600 text-white rounded-xl font-extrabold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-green-200"
    >
      <FileArchive className="w-5 h-5" /> Compress PDF Now
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Compress PDF"
      description="Reduce file size while optimizing for maximal PDF quality visually."
      icon={FileArchive}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <p className="font-bold text-gray-800 mb-2 text-lg">Select Target File Size</p>
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-inner">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Target Size</p>
            <p className="text-4xl font-extrabold text-green-600">{targetSizeMB.toFixed(2)} <span className="text-lg">MB</span></p>
          </div>
          <div className="text-right pb-1">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Original Size</p>
            <p className="text-lg font-bold text-gray-800">{(file?.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        </div>
        
        <div className="relative">
          <input 
            type="range"
            min="0.10"
            max={file ? (file.size / (1024 * 1024)).toFixed(2) : 10}
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
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex gap-3">
        <span className="font-bold text-amber-900">Note:</span>
        <p>This process flattens the PDF. Selectable text will turn into images, making the document unsearchable. Ideal for scans.</p>
      </div>
    </ToolPreviewLayout>
  );
}

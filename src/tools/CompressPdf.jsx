import { trackEvent } from '../lib/analytics';
import React, { useState } from 'react';
import { FileArchive, Scissors, ListOrdered, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { compressPdfToTarget } from '../utils/pdfCompression';
import { trackError } from '../lib/analytics';

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function CompressPdf() {
  const [file, setFile] = useState(null);
  
  // Settings State
  const [targetSizeMB, setTargetSizeMB] = useState(1);
  const [inputVal, setInputVal] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Success State
  const [successData, setSuccessData] = useState(null);

  const handleFile = (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
      const sizeMB = newFile.size / (1024 * 1024);
      // Default to 50% of original file size, minimum 0.05 MB
      const initialTarget = Math.max(0.05, parseFloat((sizeMB * 0.5).toFixed(2)));
      setTargetSizeMB(initialTarget);
      setInputVal(initialTarget.toString());
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setProgress(0);
    setIsProcessing(false);
    setTargetSizeMB(1);
    setInputVal('1');
  };

  const handleTargetChange = (valMB) => {
    const originalMB = file ? file.size / (1024 * 1024) : 10;
    const clamped = Math.max(0.01, Math.min(originalMB, valMB));
    const rounded = parseFloat(clamped.toFixed(2));
    setTargetSizeMB(rounded);
    setInputVal(rounded.toString());
  };

  const handlePresetSelect = (percentage) => {
    if (!file) return;
    const originalMB = file.size / (1024 * 1024);
    const target = Math.max(0.02, parseFloat((originalMB * percentage).toFixed(2)));
    setTargetSizeMB(target);
    setInputVal(target.toString());
  };

  const compressPdf = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'Compress PDF' });
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const finalBytes = await compressPdfToTarget(file, targetSizeMB, setProgress);
      
      setProgress(100);
      
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const savedBytes = Math.max(0, file.size - blob.size);
      const savedPct = file.size > 0 ? ((savedBytes / file.size) * 100).toFixed(0) : 0;
      
      setSuccessData({
        url,
        filename: `compressed_${file.name}`,
        originalSize: file.size,
        outputSize: blob.size,
        title: 'PDF Compressed Successfully!',
        subtitle: `Compressed to ${formatBytes(blob.size)} (target was ${targetSizeMB.toFixed(2)} MB).`,
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
      <FileArchive className="w-5 h-5" /> Compress PDF to {targetSizeMB.toFixed(2)} MB
    </button>
  );

  const originalMB = file ? file.size / (1024 * 1024) : 10;
  const targetBytesEst = Math.round(targetSizeMB * 1024 * 1024);

  return (
    <ToolPreviewLayout
      title="Compress PDF"
      description="Reduce PDF file size accurately to your desired target."
      icon={FileArchive}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-gray-800 text-lg">Target File Size</p>
        <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded-md border border-green-200">
          Smart Target
        </span>
      </div>

      <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl shadow-inner space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Target Size</p>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-300 shadow-sm focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
              <input
                type="number"
                min="0.01"
                max={parseFloat(originalMB.toFixed(2))}
                step="0.05"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) {
                    setTargetSizeMB(Math.min(originalMB, parsed));
                  }
                }}
                onBlur={() => {
                  const parsed = parseFloat(inputVal);
                  if (isNaN(parsed) || parsed <= 0) {
                    handleTargetChange(0.1);
                  } else {
                    handleTargetChange(parsed);
                  }
                }}
                className="w-20 font-black text-2xl text-green-600 bg-transparent focus:outline-none"
              />
              <span className="text-sm font-bold text-gray-600">MB</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">≈ {formatBytes(targetBytesEst)}</p>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Original Size</p>
            <p className="text-xl font-bold text-gray-800">{file ? formatBytes(file.size) : '0 MB'}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : ''}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <input 
              type="range"
              min="0.02"
              max={file ? Math.max(0.05, parseFloat((file.size / (1024 * 1024)).toFixed(2))) : 10}
              step="0.01"
              value={targetSizeMB}
              onChange={(e) => handleTargetChange(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>
          
          <div className="flex justify-between text-xs font-semibold text-gray-500 px-1">
            <span>High Compression (Smallest)</span>
            <span>Low Compression (Best Quality)</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Presets</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Extreme (25%)', ratio: 0.25 },
              { label: 'Recommended (50%)', ratio: 0.50 },
              { label: 'High Quality (75%)', ratio: 0.75 }
            ].map(preset => {
              const est = file ? (originalMB * preset.ratio).toFixed(2) : '1.0';
              const isSelected = Math.abs(targetSizeMB - parseFloat(est)) < 0.05;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetSelect(preset.ratio)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                    isSelected
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div>{preset.label.split(' ')[0]}</div>
                  <div className={`text-[10px] ${isSelected ? 'text-green-100' : 'text-gray-400'}`}>~{est} MB</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-xs sm:text-sm flex gap-2.5">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p>This optimizes page rendering for maximum clarity while shrinking file size. Searchable text is preserved where possible or flattened at visual fidelity.</p>
      </div>
    </ToolPreviewLayout>
  );
}

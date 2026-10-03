import { trackEvent } from '../lib/analytics';
import React, { useState } from 'react';
import { FileArchive, Loader2, Sparkles } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { compressPdfToTarget } from '../utils/pdfCompression';
import { trackError } from '../lib/analytics';

const BYTES_PER_MB = 1024 * 1024;
const formatMB = bytes => (bytes / BYTES_PER_MB).toFixed(2);

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
      const sizeMB = newFile.size / BYTES_PER_MB;
      const initialTarget = Math.min(sizeMB, Math.max(Math.min(0.01, sizeMB), parseFloat((sizeMB * 0.5).toFixed(2))));
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
    setInputVal('1.00');
  };

  const handleTargetChange = (valMB) => {
    const originalMB = file ? file.size / BYTES_PER_MB : 10;
    const minimumMB = Math.min(0.01, originalMB);
    const clamped = Math.max(minimumMB, Math.min(originalMB, valMB));
    const rounded = parseFloat(clamped.toFixed(2));
    setTargetSizeMB(rounded);
    setInputVal(rounded.toString());
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
      const actualSizeMB = formatMB(blob.size);
      const targetMet = blob.size <= targetSizeMB * BYTES_PER_MB;
      
      setSuccessData({
        url,
        filename: `compressed_${file.name}`,
        originalSize: file.size,
        outputSize: blob.size,
        title: 'PDF Compressed Successfully!',
        subtitle: targetMet
          ? `Actual size: ${actualSizeMB} MB. Requested maximum: ${targetSizeMB.toFixed(2)} MB.`
          : `Actual size: ${actualSizeMB} MB. The requested maximum was ${targetSizeMB.toFixed(2)} MB, but could not be reached.`,
        statsComponent: (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 text-center">
            <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Original</p>
              <p className="text-xl font-bold text-gray-800">{formatMB(file.size)} MB</p>
            </div>
            <div className="bg-green-50 px-5 py-3 rounded-xl border border-green-200 shadow-sm">
              <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Compressed</p>
              <p className="text-xl font-bold text-green-800">{actualSizeMB} MB</p>
            </div>
            <div className="bg-indigo-50 px-5 py-3 rounded-xl border border-indigo-200 shadow-sm">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Saved</p>
              <p className="text-xl font-bold text-indigo-800">{savedPct}%</p>
            </div>
          </div>
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
      <FileArchive className="w-5 h-5" /> Compress PDF (max {targetSizeMB.toFixed(2)} MB)
    </button>
  );

  const originalMB = file ? file.size / BYTES_PER_MB : 10;
  const minimumMB = Math.min(0.01, originalMB);

  return (
    <ToolPreviewLayout
      title="Compress PDF"
      description="Compress a PDF to an output size limit you choose."
      icon={FileArchive}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="mb-3">
        <p className="font-bold text-gray-800 text-lg">Maximum output size</p>
        <p className="mt-1 text-xs text-gray-500">The result will be at or below this size when possible. It may be smaller; exact output size cannot be guaranteed.</p>
      </div>

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <label htmlFor="compress-pdf-target" className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Target size (MB)</label>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-300 shadow-sm focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
              <input
                id="compress-pdf-target"
                type="number"
                min={minimumMB}
                max={originalMB}
                step="0.01"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (Number.isFinite(parsed) && parsed >= minimumMB && parsed <= originalMB) {
                    setTargetSizeMB(parsed);
                  }
                }}
                onBlur={() => {
                  const parsed = parseFloat(inputVal);
                  if (!Number.isFinite(parsed) || parsed <= 0) {
                    handleTargetChange(minimumMB);
                  } else {
                    handleTargetChange(parsed);
                  }
                }}
                className="w-24 font-black text-2xl text-green-600 bg-transparent focus:outline-none"
              />
              <span className="text-sm font-bold text-gray-600">MB</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Original Size</p>
            <p className="text-xl font-bold text-gray-800">{file ? `${formatMB(file.size)} MB` : '0.00 MB'}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <input 
              type="range"
              min={minimumMB}
              max={originalMB}
              step="0.01"
              value={targetSizeMB}
              onChange={(e) => handleTargetChange(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>
          
          <div className="flex justify-between text-xs font-semibold text-gray-500 px-1">
            <span>High</span>
            <span>Low</span>
          </div>
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-xs sm:text-sm flex gap-2.5">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p>Pages are rasterized to reduce file size. Selectable and searchable text is not preserved, and image clarity may change. Review the compressed file before sharing.</p>
      </div>
    </ToolPreviewLayout>
  );
}

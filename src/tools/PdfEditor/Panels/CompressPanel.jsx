import React, { useState } from 'react';
import { FileArchive, Download, Loader2, X, AlertCircle } from 'lucide-react';
import { compressPdfToTarget } from '../../../utils/pdfCompression';
import { trackError } from "../../../lib/analytics";
import { trackEvent } from '../../../lib/analytics';

export default function CompressPanel({ file, onClose }) {
  const [targetSizeMB, setTargetSizeMB] = useState(
    Math.max(0.1, parseFloat((file.size / (1024 * 1024) * 0.5).toFixed(2)))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successUrl, setSuccessUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [error, setError] = useState(null);

  const handleCompress = async () => {
    trackEvent('tool_executed', { tool_name: 'Compress Panel' });
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccessUrl(null);

    try {
      const finalBytes = await compressPdfToTarget(file, targetSizeMB, setProgress);
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSuccessUrl(url);
      setCompressedSize(blob.size);
    } catch (err) {
      trackError('Compress Panel', 'processing_error');
      console.error(err);
      setError("Failed to compress PDF. Please try a different file.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const formatBytes = (bytes) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="absolute xl:relative right-0 top-0 bottom-0 w-80 h-full bg-white border-l border-gray-200 shadow-2xl xl:shadow-xl flex flex-col z-30 flex-shrink-0 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <FileArchive className="w-5 h-5 text-blue-500" />
          Compress PDF
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {successUrl ? (
          <div className="flex flex-col items-center justify-center text-center gap-4 mt-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <FileArchive className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Compression Complete</h3>
              <p className="text-sm text-gray-500 mt-1">
                Reduced from {formatBytes(file.size)} to {formatBytes(compressedSize)}.
              </p>
            </div>
            <a
              href={successUrl}
              download={`compressed_${file.name}`}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Compressed PDF
            </a>
            <button
              onClick={() => setSuccessUrl(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              Compress Again
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Target File Size (MB)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.1"
                    max={Math.max(0.2, (file.size / (1024 * 1024)).toFixed(2))}
                    step="0.1"
                    value={targetSizeMB}
                    onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
                    className="flex-1 accent-blue-600"
                    disabled={isProcessing}
                  />
                  <div className="w-16 flex items-center justify-end font-medium text-gray-700">
                    {targetSizeMB.toFixed(1)} MB
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Extreme</span>
                  <span>Original: {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100">
              <button
                onClick={handleCompress}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Compressing... {progress}%
                  </>
                ) : (
                  <>
                    <FileArchive className="w-5 h-5" />
                    Compress File
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

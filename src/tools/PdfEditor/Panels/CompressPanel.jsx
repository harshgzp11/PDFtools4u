import React, { useState, useEffect, useRef } from 'react';
import {
  FileArchive,
  Download,
  Loader2,
  X,
  AlertCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Layers
} from 'lucide-react';
import {
  compressPdfDocument,
  preflightInspectPdf,
  COMPRESSION_PRESETS
} from '../../../utils/pdfCompression';
import { trackError, trackEvent } from '../../../lib/analytics';
import { toast } from 'sonner';

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} Bytes`;
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export default function CompressPanel({ file, onClose }) {
  const [selectedPresetId, setSelectedPresetId] = useState('balanced');
  const [preflight, setPreflight] = useState(null);
  const [isInspecting, setIsInspecting] = useState(true);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const preflightAbortControllerRef = useRef(null);
  const activeUrlRef = useRef(null);

  const cleanupUrl = () => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Cancel any previous preflight inspection
    if (preflightAbortControllerRef.current) {
      preflightAbortControllerRef.current.abort();
    }
    const preflightCtrl = new AbortController();
    preflightAbortControllerRef.current = preflightCtrl;

    const inspect = async () => {
      if (!file) return;
      setIsInspecting(true);
      try {
        const info = await preflightInspectPdf(file, { signal: preflightCtrl.signal });
        if (isMounted && !preflightCtrl.signal.aborted) {
          setPreflight(info);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Preflight inspection error in CompressPanel:', err);
      } finally {
        if (isMounted && !preflightCtrl.signal.aborted) {
          setIsInspecting(false);
        }
      }
    };

    inspect();

    return () => {
      isMounted = false;
      cleanupUrl();
      if (preflightAbortControllerRef.current) {
        preflightAbortControllerRef.current.abort();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [file]);

  const isFinalizing = isProcessing && (statusMessage.startsWith('Finalizing') || progress >= 95);

  const handleCancel = () => {
    if (isProcessing && (statusMessage.startsWith('Finalizing') || progress >= 95)) {
      return; // Cannot cancel synchronous serialization stage
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
    toast.info('Compression cancelled.');
  };

  const handleCompress = async () => {
    if (!file) return;

    if (preflight?.isEncrypted) {
      setError('Cannot compress encrypted document. Please unlock first.');
      return;
    }

    if (preflight?.isSigned && !signatureConfirmed) {
      setError('Please acknowledge that digital signatures will be invalidated.');
      return;
    }

    trackEvent('tool_executed', { tool_name: 'Compress Panel', preset: selectedPresetId });
    cleanupUrl();
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Starting optimization...');
    setError(null);
    setResultData(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const presetObj = Object.values(COMPRESSION_PRESETS).find(p => p.id === selectedPresetId) || COMPRESSION_PRESETS.BALANCED;

      const res = await compressPdfDocument(
        file,
        {
          preset: presetObj,
          signal: controller.signal,
          allowSignedPdf: signatureConfirmed,
          onStatus: (msg) => setStatusMessage(msg)
        },
        (pct) => setProgress(pct)
      );

      // Race-condition guard: if cancelled before serialization started, do not render success state
      if (controller.signal.aborted || abortControllerRef.current !== controller) {
        return;
      }

      setProgress(100);

      if (res.isAlreadyOptimized || res.savedBytes <= 0) {
        setResultData({
          isNoop: true,
          isSigned: res.isSigned,
          isOriginalBytesRetained: Boolean(res.isOriginalBytesRetained),
          originalSize: res.originalSize,
          outputSize: res.outputSize,
          savedBytes: 0,
          savedPct: '0.00',
          totalImagesFound: res.totalImagesFound,
          optimizedImagesCount: 0,
          skippedImagesCount: res.totalImagesFound
        });
      } else {
        const blob = new Blob([res.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        activeUrlRef.current = url;

        setResultData({
          isNoop: false,
          isSigned: res.isSigned,
          isOriginalBytesRetained: Boolean(res.isOriginalBytesRetained),
          url,
          filename: `compressed_${file.name}`,
          originalSize: res.originalSize,
          outputSize: res.outputSize,
          savedBytes: res.savedBytes,
          savedPct: res.savedPct,
          totalImagesFound: res.totalImagesFound,
          optimizedImagesCount: res.optimizedImagesCount,
          skippedImagesCount: res.skippedImagesCount
        });
      }
    } catch (err) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        toast.info('Compression cancelled.');
      } else {
        trackError('Compress Panel', 'processing_error');
        console.error('Compression panel failure:', err);
        setError(err.message || 'Failed to compress PDF. Please try a different preset.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsProcessing(false);
    }
  };

  const currentPreset = Object.values(COMPRESSION_PRESETS).find(p => p.id === selectedPresetId) || COMPRESSION_PRESETS.BALANCED;
  const isBlocked = isInspecting || preflight?.isEncrypted || (preflight?.isSigned && !signatureConfirmed);

  return (
    <div className="absolute xl:relative right-0 top-0 bottom-0 w-80 h-full bg-white border-l border-gray-200 shadow-2xl xl:shadow-xl flex flex-col z-30 flex-shrink-0 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <FileArchive className="w-5 h-5 text-blue-600" />
          Compress PDF
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
          title="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {resultData ? (
          resultData.isNoop ? (
            /* No-Op Result (Honest notification) */
            <div className="flex flex-col items-center justify-center text-center gap-4 mt-4">
              <div className={`w-14 h-14 ${resultData.isSigned && resultData.isOriginalBytesRetained ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600'} rounded-full flex items-center justify-center`}>
                {resultData.isSigned && resultData.isOriginalBytesRetained ? <ShieldCheck className="w-7 h-7" /> : <Info className="w-7 h-7" />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{resultData.isSigned && resultData.isOriginalBytesRetained ? 'Document Retained Unchanged' : 'Already Optimized'}</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed px-2">
                  {resultData.isSigned && resultData.isOriginalBytesRetained
                    ? 'No eligible images needed compression, so your original PDF was retained unchanged. Its existing digital signature remains intact.'
                    : 'This PDF is already optimized, or it does not contain images that can be safely compressed. Your original file has been retained.'}
                </p>
              </div>

              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 flex justify-between">
                <span>File Size:</span>
                <span className="font-bold">{formatBytes(resultData.originalSize)}</span>
              </div>

              <button
                onClick={() => setResultData(null)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Try Another Preset
              </button>
            </div>
          ) : (
            /* Successful Compression Result */
            <div className="flex flex-col items-center justify-center text-center gap-4 mt-4">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Compression Complete</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Reduced from {formatBytes(resultData.originalSize)} to {formatBytes(resultData.outputSize)} ({resultData.savedPct}% saved).
                </p>
              </div>

              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[11px] text-gray-600 space-y-1 text-left">
                <div className="flex justify-between">
                  <span>Images detected:</span>
                  <span className="font-bold text-gray-800">{resultData.totalImagesFound}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Images optimized:</span>
                  <span className="font-bold">{resultData.optimizedImagesCount}</span>
                </div>
                {resultData.skippedImagesCount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Skipped (masks/vectors):</span>
                    <span className="font-medium">{resultData.skippedImagesCount}</span>
                  </div>
                )}
              </div>

              <a
                href={resultData.url}
                download={resultData.filename}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Compressed PDF
              </a>

              <button
                onClick={() => setResultData(null)}
                className="text-xs text-blue-600 hover:underline"
              >
                Compress Again
              </button>
            </div>
          )
        ) : (
          /* Preset Selector & Preflight Form */
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Select Preset</span>
                <span>Original: {formatBytes(file.size)}</span>
              </div>

              <div className="space-y-2">
                {Object.values(COMPRESSION_PRESETS).map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isProcessing && setSelectedPresetId(p.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">{p.label}</span>
                        {p.isRecommended && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Best
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{p.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Preflight Document Status */}
              {preflight && !preflight.isEncrypted && (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span>
                    {preflight.totalImages === 0
                      ? 'No raster images. Vector text preserved.'
                      : `${preflight.eligibleCount} image(s) eligible (${preflight.skippedCount} skipped).`}
                  </span>
                </div>
              )}

              {/* Encryption Alert */}
              {preflight?.isEncrypted && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Encrypted PDF
                  </p>
                  <p className="text-[11px] text-red-800 leading-relaxed">
                    {preflight.isAes128
                      ? 'Unsupported AES-128 encryption. Please unlock first using Unlock PDF.'
                      : 'This file is password-protected and must be unlocked before compression.'}
                  </p>
                </div>
              )}

              {/* Signature Alert */}
              {preflight?.isSigned && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Digital Signature Present
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Modifying document streams invalidates existing cryptographic signatures.
                  </p>
                  <label className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-950 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={signatureConfirmed}
                      onChange={(e) => setSignatureConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Acknowledge signature invalidation</span>
                  </label>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 p-2.5 rounded-lg text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 border-t border-gray-100">
              {isProcessing ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      {statusMessage || 'Compressing...'}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {isFinalizing ? (
                    <p className="w-full text-center text-xs text-gray-500 font-medium italic pt-1">
                      Finalizing PDF (cannot be cancelled)…
                    </p>
                  ) : (
                    <button
                      onClick={handleCancel}
                      className="w-full text-center text-xs text-red-600 hover:text-red-700 font-semibold pt-1"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleCompress}
                  disabled={isBlocked}
                  className={`w-full flex items-center justify-center gap-2 text-white font-medium py-2.5 px-4 rounded-lg transition-colors ${
                    isBlocked
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  <FileArchive className="w-4 h-4" />
                  Compress ({currentPreset.shortLabel || currentPreset.label})
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

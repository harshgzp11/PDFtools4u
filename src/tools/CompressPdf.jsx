import React, { useState, useEffect, useRef } from 'react';
import {
  FileArchive,
  Loader2,
  Sparkles,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  X,
  Info,
  Layers
} from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import {
  compressPdfDocument,
  preflightInspectPdf,
  COMPRESSION_PRESETS
} from '../utils/pdfCompression';
import { trackEvent, trackError } from '../lib/analytics';
import { toast } from 'sonner';

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.00 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} Bytes`;
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export default function CompressPdf() {
  const [file, setFile] = useState(null);

  // Settings & Preflight State
  const [selectedPresetId, setSelectedPresetId] = useState('balanced');
  const [preflight, setPreflight] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);

  // Processing & Concurrency State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const abortControllerRef = useRef(null);
  const preflightAbortControllerRef = useRef(null);
  const activeObjectUrlRef = useRef(null);

  // Result State
  const [successData, setSuccessData] = useState(null);

  // Cleanup object URLs on unmount or reset
  const revokeActiveUrl = () => {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeActiveUrl();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (preflightAbortControllerRef.current) {
        preflightAbortControllerRef.current.abort();
      }
    };
  }, []);

  const resetTool = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (preflightAbortControllerRef.current) {
      preflightAbortControllerRef.current.abort();
      preflightAbortControllerRef.current = null;
    }
    revokeActiveUrl();
    setFile(null);
    setPreflight(null);
    setIsInspecting(false);
    setSignatureConfirmed(false);
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
    setSuccessData(null);
    setSelectedPresetId('balanced');
  };

  const handleFile = async (newFile) => {
    if (!newFile) return;

    if (newFile.type !== 'application/pdf' && !newFile.name?.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a valid PDF file.');
      return;
    }

    resetTool();
    setFile(newFile);
    setIsInspecting(true);

    const preflightCtrl = new AbortController();
    preflightAbortControllerRef.current = preflightCtrl;

    try {
      const inspect = await preflightInspectPdf(newFile, { signal: preflightCtrl.signal });
      if (preflightCtrl.signal.aborted || preflightAbortControllerRef.current !== preflightCtrl) {
        return;
      }
      setPreflight(inspect);

      if (!inspect.isValid) {
        toast.error(inspect.error || 'Failed to parse PDF document.');
      } else if (inspect.isEncrypted) {
        toast.error(inspect.error);
      } else if (inspect.isSigned) {
        toast.warning('Cryptographic digital signature detected. Modifying will invalidate the signature.');
      } else if (inspect.totalImages === 0) {
        toast.info('Document contains only vector text & graphics. Non-inflation engine will preserve it untouched.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Silent abort on superseded preflight
      }
      console.error('Inspection error:', err);
      toast.error('Could not inspect document properties.');
    } finally {
      if (preflightAbortControllerRef.current === preflightCtrl) {
        setIsInspecting(false);
        preflightAbortControllerRef.current = null;
      }
    }
  };

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
    toast.info('Compression cancelled by user.');
  };

  const startCompression = async () => {
    if (!file) return;

    if (preflight?.isEncrypted) {
      toast.error('Cannot compress encrypted PDF. Please unlock the file first.');
      return;
    }

    if (preflight?.isSigned && !signatureConfirmed) {
      toast.error('Please confirm that you acknowledge the digital signature will be invalidated.');
      return;
    }

    trackEvent('tool_executed', {
      tool_name: 'Compress PDF',
      preset: selectedPresetId,
      file_size_kb: Math.round(file.size / 1024)
    });

    revokeActiveUrl();
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Initializing compression worker...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const presetObj = Object.values(COMPRESSION_PRESETS).find(p => p.id === selectedPresetId) || COMPRESSION_PRESETS.BALANCED;

      const result = await compressPdfDocument(
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

      // Handle No-Op / Already Optimized honest case
      if (result.isAlreadyOptimized || result.savedBytes <= 0) {
        // Explicit byte-identity confirmation: only display signature intact if original bytes were retained unchanged
        const isSignedNoop = Boolean(result.isSigned && result.isOriginalBytesRetained);
        setSuccessData({
          url: null, // Do not provide a misleading second download
          filename: file.name,
          originalSize: file.size,
          outputSize: file.size,
          icon: isSignedNoop ? ShieldCheck : Info,
          iconBgClass: isSignedNoop ? 'bg-green-100' : 'bg-blue-100',
          iconColorClass: isSignedNoop ? 'text-green-700' : 'text-blue-600',
          title: isSignedNoop ? 'Document Retained Unchanged' : 'Document Already Optimized',
          subtitle: isSignedNoop
            ? 'No eligible images needed compression, so your original PDF was retained unchanged. Its existing digital signature remains intact.'
            : 'This PDF is already optimized, or it does not contain images that can be safely compressed. Your original file has been retained.',
          statsComponent: (
            <div className="flex flex-col gap-4 w-full max-w-xl mx-auto text-left">
              <div className={`p-4 ${isSignedNoop ? 'bg-green-50/80 border-green-200 text-green-950' : 'bg-blue-50/80 border-blue-200 text-blue-900'} border rounded-xl text-sm`}>
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className={`w-4 h-4 ${isSignedNoop ? 'text-green-600' : 'text-blue-600'}`} />
                  {isSignedNoop ? 'Cryptographic Signature & Document Preserved' : 'Original File Retained (Zero Quality Loss)'}
                </p>
                <p className={`text-xs ${isSignedNoop ? 'text-green-900' : 'text-blue-800'} leading-relaxed`}>
                  {isSignedNoop
                    ? 'No eligible images needed compression, so your original PDF was retained unchanged. Its existing digital signature remains intact and cryptographically valid.'
                    : 'The document was inspected by our non-inflation engine. No compressible photographic raster images were found, or existing images are already compressed. Selectable text, vectors, and layouts have been preserved without modification.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">File Size</p>
                  <p className="text-xl font-bold text-gray-800">{formatBytes(file.size)}</p>
                </div>
                <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Reduction</p>
                  <p className="text-xl font-bold text-gray-600">0.00 KB (0.00%)</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs text-gray-600 flex justify-around">
                <span><strong>{result.totalImagesFound}</strong> image(s) detected</span>
                <span>•</span>
                <span><strong>0</strong> eligible for further reduction</span>
              </div>
            </div>
          )
        });
      } else {
        // Genuine compression occurred
        const blob = new Blob([result.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        activeObjectUrlRef.current = url;

        setSuccessData({
          url,
          filename: `compressed_${file.name}`,
          originalSize: file.size,
          outputSize: blob.size,
          icon: CheckCircle,
          iconBgClass: 'bg-green-100',
          iconColorClass: 'text-green-600',
          title: 'PDF Compressed Successfully!',
          subtitle: `Reduced file size by ${formatBytes(result.savedBytes)} (${result.savedPct}%) while preserving text, vectors, and document layout.`,
          downloadText: 'Download Compressed PDF',
          statsComponent: (
            <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Original</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-800">{formatBytes(file.size)}</p>
                </div>
                <div className="bg-green-50 px-4 py-3 rounded-xl border border-green-200 shadow-sm">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide">Compressed</p>
                  <p className="text-lg sm:text-xl font-bold text-green-800">{formatBytes(blob.size)}</p>
                </div>
                <div className="bg-indigo-50 px-4 py-3 rounded-xl border border-indigo-200 shadow-sm">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Saved</p>
                  <p className="text-lg sm:text-xl font-bold text-indigo-800">
                    {result.savedPct}%
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs text-gray-600 flex justify-around">
                <span><strong>{result.totalImagesFound}</strong> image(s) detected</span>
                <span>•</span>
                <span className="text-green-700 font-semibold"><strong>{result.optimizedImagesCount}</strong> optimized</span>
                {result.skippedImagesCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 font-medium"><strong>{result.skippedImagesCount}</strong> skipped (masks/vector)</span>
                  </>
                )}
              </div>
            </div>
          )
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.info('Compression operation cancelled.');
      } else {
        console.error('Compression failed:', err);
        let errorType = 'compression_failed';
        if (err.message?.toLowerCase().includes('encrypt')) errorType = 'encrypted_file';
        trackError('Compress PDF', errorType);
        toast.error(err.message || 'Failed to compress document. Please try a different preset.');
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const currentPreset = Object.values(COMPRESSION_PRESETS).find(p => p.id === selectedPresetId) || COMPRESSION_PRESETS.BALANCED;
  const isBlockedByEncryption = preflight?.isEncrypted;
  const isBlockedBySignature = preflight?.isSigned && !signatureConfirmed;
  const isFinalizing = isProcessing && (statusMessage.startsWith('Finalizing') || progress >= 95);

  const processButton = isProcessing ? (
    <div className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
        <span>{statusMessage || 'Compressing document...'}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="w-full flex items-center justify-between text-xs text-gray-500 pt-1">
        <span>{progress}% complete</span>
        {isFinalizing ? (
          <span className="text-[11px] text-gray-500 font-medium italic">
            Finalizing PDF (cannot be cancelled)…
          </span>
        ) : (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium hover:underline"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        )}
      </div>
    </div>
  ) : (
    <button
      onClick={startCompression}
      disabled={isInspecting || isBlockedByEncryption || isBlockedBySignature}
      className={`w-full py-4 text-white rounded-xl font-extrabold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
        isBlockedByEncryption || isBlockedBySignature
          ? 'bg-gray-400 cursor-not-allowed shadow-none'
          : 'bg-green-600 hover:bg-green-700 hover:shadow-green-200'
      }`}
    >
      <FileArchive className="w-5 h-5" />
      {isBlockedByEncryption
        ? 'Encrypted PDF (Unlock First)'
        : isBlockedBySignature
        ? 'Confirm Signature to Proceed'
        : `Compress PDF (${currentPreset.shortLabel || currentPreset.label})`}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Compress PDF"
      description="Selectively optimize embedded images while preserving 100% of selectable text, vectors, and document structure."
      icon={FileArchive}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-4">
        {/* Preset Selector */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
            Compression Level
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {Object.values(COMPRESSION_PRESETS).map((p) => {
              const isSelected = selectedPresetId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => !isProcessing && setSelectedPresetId(p.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'border-green-600 bg-green-50/50 shadow-sm ring-1 ring-green-600'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-green-600 bg-green-600' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-sm text-gray-900">{p.label}</span>
                    </div>
                    {p.isRecommended && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700 tracking-wide">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 pl-6 leading-relaxed">{p.description}</p>
                  <div className="pl-6 pt-0.5 text-[11px] font-mono text-gray-400">
                    Max {p.maxDimension}px • {Math.round(p.quality * 100)}% JPEG
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Encrypted PDF Warning */}
        {preflight?.isEncrypted && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-red-950">
              <Lock className="w-4 h-4 text-red-600 shrink-0" />
              <span>{preflight.isAes128 ? 'Unsupported Encryption: AES-128' : 'Encrypted Document'}</span>
            </div>
            <p className="text-red-800 leading-relaxed">
              {preflight.isAes128
                ? 'This document uses AES-128 (V=4, R=4) encryption. Please decrypt it first using the Unlock PDF tool.'
                : 'This document requires a password to open. Please unlock it before compressing.'}
            </p>
          </div>
        )}

        {/* Digital Signature Warning */}
        {preflight?.isSigned && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cryptographic Signature Detected</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              This document contains a digital signature ({preflight.signatureNames?.join(', ') || 'PKCS#7'}). Modifying document streams will invalidate this signature.
            </p>
            <label className="flex items-start gap-2 pt-1 cursor-pointer select-none font-semibold text-amber-950">
              <input
                type="checkbox"
                checked={signatureConfirmed}
                onChange={(e) => setSignatureConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span>I acknowledge that modifying this PDF will invalidate its digital signature.</span>
            </label>
          </div>
        )}

        {/* Image Scan Telemetry Notice */}
        {preflight && !preflight.isEncrypted && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between text-gray-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-gray-500" />
                Document Content
              </span>
              <span>{preflight.pageCount} page{preflight.pageCount === 1 ? '' : 's'}</span>
            </div>
            <p className="text-gray-500 text-[11px] leading-relaxed">
              {preflight.totalImages === 0
                ? 'No raster images found. Vector text and shapes will be preserved untouched.'
                : `${preflight.eligibleCount} compressible photographic image(s) detected (${preflight.skippedCount} masked/vector images preserved).`}
            </p>
          </div>
        )}

        {/* Honest Technical Disclaimers */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-700 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Lossless Document Integrity</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-slate-600 text-[11px] leading-relaxed">
            <li><strong>Selectable Text & Vectors:</strong> Text, fonts, tables, vector paths, and bookmarks are 100% preserved without rasterization.</li>
            <li><strong>Selective Image Optimization:</strong> Only eligible photographic rasters are downsampled. Alpha masks and CMYK colors are bypassed.</li>
            <li><strong>Non-Inflation Guard:</strong> If compression yields zero or negative savings, your original file is retained untouched.</li>
          </ul>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

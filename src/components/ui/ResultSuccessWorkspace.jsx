import React, { useState } from 'react';
import { 
  CheckCircle, Download, ArrowLeft, Share2, Copy, Check,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import DownloadPageExtras from './DownloadPageExtras';
import { trackEvent } from '../../lib/analytics';

const formatBytes = (bytes, decimals = 2) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * ResultSuccessWorkspace: Unified, accessible success workspace for completed document and image operations.
 * 
 * Safeguards:
 *  - Supports PDF, ZIP, DOCX, XLSX, images, and text.
 *  - Handles Blob URL lifecycle safely without premature revocation.
 *  - Honest sharing: Never shares ephemeral local Blob URLs as public links.
 *  - Provides direct file sharing when Web Share API file-sharing is supported, with tool-link fallback.
 */
export default function ResultSuccessWorkspace({
  title = 'Processing Complete!',
  subtitle = 'Your file is ready for download.',
  filename = 'download',
  outputUrl,
  _outputType, // 'pdf' | 'zip' | 'docx' | 'xlsx' | 'image' | 'text' | 'generic'
  originalSize,
  outputSize,
  statsComponent,
  previewNode,
  textContent,
  downloadText,
  icon: CustomIcon,
  iconBgClass,
  iconColorClass,
  toolTitle,
  toolDescription,
  onReset,
  className = ''
}) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleDownload = () => {
    if (!outputUrl) return;
    const toolDisplayName = toolTitle || 'unknown_tool';
    const toolSlug = (toolTitle || 'unknown_tool').toLowerCase().replace(/\s+/g, '-');
    trackEvent('file_downloaded', {
      tool_id: toolSlug,
      tool_name: toolDisplayName,
      file_name: filename,
      file_size_kb: outputSize ? Math.round(outputSize / 1024) : undefined,
    });

    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      toast.success('Extracted text copied to clipboard!');
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      toast.error('Failed to copy text to clipboard.');
    }
  };

  const handleShare = async () => {
    // If output is a valid Blob URL and browser supports file sharing:
    if (outputUrl && typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const response = await fetch(outputUrl);
        const blob = await response.blob();
        const fileToShare = new File([blob], filename, { type: blob.type });

        if (navigator.canShare({ files: [fileToShare] })) {
          await navigator.share({
            title: title || toolTitle || 'PDFTools4U Document',
            files: [fileToShare],
          });
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Honest Fallback: Share the tool's public website URL (never an ephemeral local blob: URL)
    const publicUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: toolTitle || 'PDFTools4U Online Tools',
          text: toolDescription || 'Fast, private document and image tools right in your browser.',
          url: publicUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          await copyToolLink(publicUrl);
        }
      }
    } else {
      await copyToolLink(publicUrl);
    }
  };

  const copyToolLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success('Tool link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Could not copy link to clipboard.');
    }
  };

  const hasSizeDiff = Number.isFinite(originalSize) && Number.isFinite(outputSize) && originalSize > 0;
  const savedBytes = hasSizeDiff ? originalSize - outputSize : 0;
  const savedPct = hasSizeDiff ? Math.round((savedBytes / originalSize) * 100) : 0;

  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-sm text-center animate-in zoom-in-95 duration-300 w-full max-w-4xl mx-auto ${className}`}>
      {/* Top Success Badge */}
      <div className={`mx-auto w-16 h-16 ${iconBgClass || 'bg-green-100'} rounded-2xl flex items-center justify-center mb-4 shadow-xs`}>
        {CustomIcon ? (
          <CustomIcon className={`w-8 h-8 ${iconColorClass || 'text-green-600'}`} />
        ) : (
          <CheckCircle className={`w-8 h-8 ${iconColorClass || 'text-green-600'}`} />
        )}
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1.5 tracking-tight">{title}</h2>
      <p className="text-gray-500 mb-6 text-sm max-w-lg mx-auto">{subtitle}</p>

      {/* Optional Preview Node (e.g. before/after image or text snippet) */}
      {previewNode && (
        <div className="w-full mb-6">
          {previewNode}
        </div>
      )}

      {/* Extracted Text Sandbox Preview */}
      {textContent && (
        <div className="w-full max-w-2xl mx-auto mb-6 text-left">
          <div className="flex justify-between items-center bg-gray-100 px-4 py-2 rounded-t-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Extracted Content</span>
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-2xs hover:bg-blue-50 transition-colors"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
          <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-xl p-4 max-h-48 overflow-y-auto text-xs font-mono text-gray-800 whitespace-pre-wrap select-all">
            {textContent}
          </div>
        </div>
      )}

      {/* File Size & Reduction Telemetry */}
      {hasSizeDiff && (
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6">
          <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Original</p>
            <p className="text-sm sm:text-base font-extrabold text-gray-800">{formatBytes(originalSize)}</p>
          </div>
          <div className="bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 shadow-2xs">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-tight">Output</p>
            <p className="text-sm sm:text-base font-extrabold text-emerald-800">{formatBytes(outputSize)}</p>
          </div>
          {savedBytes > 0 && (
            <div className="bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-center">
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-tight flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" /> Reduced
              </p>
              <p className="text-sm sm:text-base font-extrabold text-blue-800">{savedPct}% ({formatBytes(savedBytes)})</p>
            </div>
          )}
        </div>
      )}

      {/* Custom Stats Component */}
      {statsComponent && (
        <div className="mb-6 flex justify-center w-full">
          {statsComponent}
        </div>
      )}

      {/* Primary Download Button */}
      {outputUrl && (
        <div className="mb-8">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-base sm:text-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
          >
            <Download className="w-6 h-6 shrink-0" />
            <div className="text-left">
              <span>{downloadText || 'Download File'}</span>
              <span className="block text-xs font-normal opacity-90 truncate max-w-xs sm:max-w-md">
                {filename} {outputSize ? `(${formatBytes(outputSize)})` : ''}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Action / Secondary Toolbar */}
      <div className="pt-6 border-t border-gray-100 w-full flex flex-wrap items-center justify-center gap-4">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Start over
          </button>
        )}
        <div className="w-1 h-1 bg-gray-300 rounded-full" />
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
        >
          {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
          <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
        </button>
      </div>

      {/* Cross-Tool Discovery Carousel */}
      <div className="w-full mt-6">
        <DownloadPageExtras />
      </div>
    </div>
  );
}


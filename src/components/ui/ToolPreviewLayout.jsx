import React, { useState, useEffect } from 'react';
import { RefreshCw, FileText, CheckCircle, Download, ArrowLeft, Share2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import DragDropZone from './DragDropZone';
import AdSlot from './AdSlot';
import { getPdfThumbnails } from '../../lib/pdfRenderer';
import { getDynamicGridClass } from '../../lib/utils';

export default function ToolPreviewLayout({
  title,
  description,
  icon: Icon,
  accept = 'application/pdf',
  file,
  onFileSelect,
  isProcessing,
  processButton,
  successData, // { url, filename, title, subtitle, statsComponent, quickActions }
  onReset,
  children, // Configuration panel content
  previewOverlay, // Optional: function that takes (previewImage) and returns a React Node
  customPreviewNode, // Optional: bypasses default image preview and uses this node entirely
  gridMode = false, // Automatically handle extracting all thumbnails and displaying them in a grid
  renderGridItem, // function(thumbnail, index) to render individual items in gridMode
  gridQuality = 0.5, // Resolution multiplier for grid thumbnails
}) {
  const [previewImage, setPreviewImage] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewImage(null);
      setThumbnails([]);
      return;
    }

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        if (file.type === 'application/pdf') {
          if (gridMode) {
            const thumbs = await getPdfThumbnails(file, gridQuality);
            setThumbnails(thumbs);
            if (thumbs.length > 0) setPreviewImage(thumbs[0].dataUrl); // Still set previewImage just in case
          } else {
            const thumbs = await getPdfThumbnails(file, 1.5);
            setThumbnails(thumbs);
            if (thumbs.length > 0) {
              setPreviewImage(thumbs[0].dataUrl);
            }
          }
        } else if (file.type.startsWith('image/')) {
          setPreviewImage(URL.createObjectURL(file));
          setThumbnails([]);
        }
      } catch (error) {
        console.error("Error loading preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();

    return () => {
      if (file && file.type.startsWith('image/') && previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [file, gridMode, gridQuality]);

  useEffect(() => {
    if (window.__sharedFile && onFileSelect) {
      // Small timeout to ensure the component is fully mounted and ready to process
      setTimeout(() => {
        if (window.__sharedFile) {
          onFileSelect(window.__sharedFile);
          window.__sharedFile = null;
        }
      }, 50);
    }
  }, []);

  const handleShare = async () => {
    if (successData && successData.url && navigator.canShare) {
      try {
        const response = await fetch(successData.url);
        const blob = await response.blob();
        const fileToShare = new File([blob], successData.filename || 'document', { type: blob.type });
        
        if (navigator.canShare({ files: [fileToShare] })) {
          await navigator.share({
            title: successData.title || title,
            files: [fileToShare]
          });
          return;
        }
      } catch (err) {
        console.error("Error sharing file:", err);
      }
    }

    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDownload = () => {
    if (!successData || !successData.url) return;
    const link = document.createElement('a');
    link.href = successData.url;
    link.download = successData.filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreviewContent = () => {
    if (customPreviewNode) {
      return typeof customPreviewNode === 'function' ? customPreviewNode({ thumbnails, previewImage }) : customPreviewNode;
    }

    if (gridMode && renderGridItem) {
      return (
        <div className="w-full flex flex-col p-4 pb-8">
          <div className={getDynamicGridClass(thumbnails.length) + " w-full"}>
            {thumbnails.map((thumb, idx, arr) => renderGridItem(thumb, idx, arr))}
          </div>
        </div>
      );
    }

    if (thumbnails && thumbnails.length > 0) {
      return (
        <div className="w-full flex flex-col gap-6 items-center p-4 pb-8">
          {thumbnails.map((thumb, idx) => (
            <div key={idx} className="relative shadow-sm bg-white p-2 rounded-xl border border-gray-200 shrink-0 w-full">
              {previewOverlay && thumbnails.length === 1 ? previewOverlay(thumb.dataUrl) : (
                <img 
                  src={thumb.dataUrl} 
                  alt={`Page ${idx + 1}`} 
                  className="w-full object-contain block"
                />
              )}
              {thumbnails.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-gray-900/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-bold shadow-sm">
                  {idx + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="relative shadow-sm bg-white w-full flex justify-center items-start p-4">
        {previewOverlay ? previewOverlay(previewImage) : (
          <img 
            src={previewImage} 
            alt="Preview" 
            className="w-full object-contain block"
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full mx-auto animate-in fade-in flex flex-col h-full min-h-0">
      <div className="text-center space-y-1.5 flex-shrink-0 mb-4">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">{description}</p>
      </div>

      {!file && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <DragDropZone 
            accept={accept}
            onFileSelect={onFileSelect}
            label={`Select file`}
            icon={Icon}
            className="p-10 py-16 w-full max-w-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 transition-colors"
          />
        </div>
      )}

      {file && isLoadingPreview && !successData && (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-gray-50 rounded-2xl border border-gray-100 min-h-0">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-gray-600 font-medium text-sm">
            {gridMode ? "Rendering PDF pages..." : "Loading visual preview..."}
          </p>
        </div>
      )}

      {file && (previewImage || gridMode || customPreviewNode) && !successData && !isLoadingPreview && (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden w-full h-full">
          {/* Interactive Preview Canvas - scrollable container */}
          <div className="w-full lg:w-2/3 bg-slate-100/70 rounded-2xl border border-gray-200 h-full min-h-0 overflow-y-auto custom-scrollbar">
            {renderPreviewContent()}
          </div>

          {/* Configuration Panel */}
          <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-gray-900 truncate" title={file.name}>{file.name}</h3>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {children}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 flex-shrink-0">
              {processButton}
              
              <button
                onClick={onReset}
                disabled={isProcessing}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
              >
                Choose a different file
              </button>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2 text-[12px] leading-tight text-green-800 bg-green-50 p-3 rounded-xl border border-green-200 flex-shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-green-600 mt-0.5" />
              <span><strong>Data Privacy:</strong> Your files are processed locally/safely and deleted automatically after 1 hour. We never store your sensitive documents on our servers.</span>
            </div>
          </div>
        </div>
      )}

      {/* Success State Overlay */}
      {successData && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-2">{successData.title || 'Success!'}</h3>
          <p className="text-gray-500 mb-8 text-sm">{successData.subtitle || 'Your file is ready.'}</p>
          
          {successData.statsComponent && (
            <div className="mb-8 flex justify-center">
              {successData.statsComponent}
            </div>
          )}

          <button
            onClick={handleDownload}
            className="mx-auto flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg mb-8"
          >
            <Download className="w-5 h-5" />
            {successData.downloadText || 'Download File'}
          </button>

          {successData.quickActions && (
            <div className="border-t border-gray-100 pt-6 w-full max-w-2xl">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Continue working</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {successData.quickActions}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 w-full flex items-center justify-center gap-4">
            <button onClick={onReset} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium py-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Start over
            </button>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded-md hover:bg-blue-50 transition-colors">
              <Share2 className="w-3.5 h-3.5" /> {successData ? 'Share File' : 'Share Tool'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

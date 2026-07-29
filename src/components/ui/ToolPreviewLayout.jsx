import React, { useState, useEffect } from 'react';
import { RefreshCw, FileText, CheckCircle, Download, ArrowLeft, Share2 } from 'lucide-react';
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
            if (thumbs.length > 0) {
              setPreviewImage(thumbs[0].dataUrl);
            }
          }
        } else if (file.type.startsWith('image/')) {
          setPreviewImage(URL.createObjectURL(file));
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
        <div className="w-full h-full flex flex-col">
          <div className={getDynamicGridClass(thumbnails.length) + " w-full pb-8"}>
            {thumbnails.map((thumb, idx, arr) => renderGridItem(thumb, idx, arr))}
          </div>
        </div>
      );
    }

    return (
      <div className="relative shadow-md bg-white w-full max-w-full flex justify-center overflow-hidden rounded-xl">
        {previewOverlay ? previewOverlay(previewImage) : (
          <img 
            src={previewImage} 
            alt="Preview" 
            className="max-h-[65vh] w-auto object-contain"
          />
        )}
      </div>
    );
  };

  return (
    <div className="w-full xl:max-w-[1600px] mx-auto space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">{description}</p>
      </div>

      {!file && (
        <DragDropZone 
          accept={accept}
          onFileSelect={onFileSelect}
          label={`Select file`}
          icon={Icon}
          className="p-16 py-24 border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 transition-colors"
        />
      )}

      {file && isLoadingPreview && !successData && (
        <div className="flex flex-col items-center justify-center p-24 bg-white rounded-2xl shadow-sm border border-gray-100">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600 font-medium text-lg">
            {gridMode ? "Rendering PDF pages..." : "Loading visual preview..."}
          </p>
        </div>
      )}

      {file && (previewImage || gridMode || customPreviewNode) && !successData && !isLoadingPreview && (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Interactive Preview Canvas */}
          <div className="w-full lg:w-2/3 bg-gray-100 rounded-3xl p-6 shadow-inner flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto border border-gray-200 min-h-[400px]">
            {renderPreviewContent()}
          </div>

          {/* Configuration Panel */}
          <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col h-full sticky top-8">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-lg font-bold text-gray-900 truncate" title={file.name}>{file.name}</h3>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              {children}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
              {processButton}
              
              <button
                onClick={onReset}
                disabled={isProcessing}
                className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium transition-colors"
              >
                Choose a different file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success State Overlay */}
      {successData && (
        <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl max-w-4xl mx-auto text-center animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 mb-4">{successData.title || 'Success!'}</h3>
          <p className="text-gray-500 mb-10 text-lg">{successData.subtitle || 'Your file is ready.'}</p>
          
          {successData.statsComponent && (
            <div className="mb-10 flex justify-center">
              {successData.statsComponent}
            </div>
          )}

          <button
            onClick={handleDownload}
            className="mx-auto flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-200 hover:-translate-y-1 mb-12"
          >
            <Download className="w-6 h-6" />
            {successData.downloadText || 'Download File'}
          </button>

          {successData.quickActions && (
            <div className="border-t border-gray-100 pt-10">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Continue working</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {successData.quickActions}
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center justify-center gap-4">
            <button onClick={onReset} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Start over with a new file
            </button>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <button onClick={handleShare} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors">
              <Share2 className="w-4 h-4" /> {successData ? 'Share File' : 'Share Tool'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-12">
        <AdSlot />
      </div>
    </div>
  );
}

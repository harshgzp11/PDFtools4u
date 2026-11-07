import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, ShieldCheck,
  ZoomIn, ZoomOut, RotateCcw,
  PanelLeft, PanelLeftClose, ChevronUp, ChevronDown, Layers,
  Lock, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import DragDropZone from './DragDropZone';
import ResultSuccessWorkspace from './ResultSuccessWorkspace';
import { getPdfThumbnails } from '../../lib/pdfRenderer';
import { getDynamicGridClass } from '../../lib/utils';
import { trackEvent } from '../../lib/analytics';

export default function ToolPreviewLayout({
  title,
  description,
  icon: Icon,
  accept = 'application/pdf',
  file,
  onFileSelect,
  isProcessing,
  processButton,
  successData, // { url, filename, title, subtitle, statsComponent }
  onReset,
  children, // Configuration panel content
  previewOverlay, // Optional: function that takes (previewImage) and returns a React Node
  customPreviewNode, // Optional: bypasses default image preview and uses this node entirely
  gridMode = false, // Automatically handle extracting all thumbnails and displaying them in a grid
  renderGridItem, // function(thumbnail, index) to render individual items in gridMode
  gridQuality = 0.5, // Resolution multiplier for grid thumbnails
  customSuccessNode = null, // Optional: function({ successData, onReset, handleDownload, handleShare }) to customize result workspace
}) {
  const [previewImage, setPreviewImage] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [processingStartTime, setProcessingStartTime] = useState(null);

  // Viewer controls & sidebar state
  const [activePage, setActivePage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [showSidebar, setShowSidebar] = useState(true);
  const pageRefs = useRef([]);
  const canvasContainerRef = useRef(null);
  const pdfConverterDownloadRef = useRef(false);

  // Dedicated ref to track the currently owned image preview Object URL (avoids stale closures)
  const previewObjectUrlRef = useRef(null);

  const revokePreviewObjectUrl = () => {
    if (previewObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      } catch {
        // Safe fallback if URL is invalid or already revoked
      }
      previewObjectUrlRef.current = null;
    }
  };

  // Guaranteed unmount teardown for preview Object URL
  useEffect(() => {
    return () => {
      revokePreviewObjectUrl();
    };
  }, []);

  // Track tool_start
  useEffect(() => {
    if (file) {
      const fileArray = Array.isArray(file) ? file : [file];
      if (fileArray.length > 0) {
        const totalSize = fileArray.reduce((acc, f) => acc + (f.size || 0), 0);
        trackEvent('tool_start', {
          tool_name: title || 'unknown_tool',
          file_type: fileArray[0].type || fileArray[0].name?.split('.').pop() || 'unknown',
          file_size_kb: Math.round(totalSize / 1024),
          file_count: fileArray.length,
        });
      }
    }
  }, [file, title]);

  // Track processing start time
  useEffect(() => {
    if (isProcessing) {
      setProcessingStartTime(Date.now());
    } else if (!successData) {
      setProcessingStartTime(null);
    }
  }, [isProcessing]);

  // Track tool_success
  useEffect(() => {
    if (successData) {
      const processingTime = processingStartTime ? Date.now() - processingStartTime : 0;
      
      const eventParams = {
        tool_name: title || 'unknown_tool',
        processing_time_ms: processingTime,
      };

      if (successData.outputSize) {
        eventParams.output_size_kb = Math.round(successData.outputSize / 1024);
      }
      if (successData.originalSize) {
        eventParams.original_size_kb = Math.round(successData.originalSize / 1024);
      }

      trackEvent('tool_success', eventParams);
      const sourceFile = Array.isArray(file) ? file[0] : file;
      pdfConverterDownloadRef.current = window.__conversionSource === 'pdf-converter';
      delete window.__conversionSource;
      if (!pdfConverterDownloadRef.current) {
        trackEvent('file_conversion_success', {
          tool_name: (title || 'unknown_tool').toLowerCase().replace(/\s+/g, '-'),
          file_type: sourceFile?.name?.split('.').pop()?.toLowerCase() || 'unknown',
        });
      }
      
      setProcessingStartTime(null);
    } else {
      pdfConverterDownloadRef.current = false;
    }
  }, [successData, title, file]); // Removed processingStartTime from deps to avoid re-triggering if it clears

  useEffect(() => {
    let isCancelled = false;

    if (!file) {
      revokePreviewObjectUrl();
      setPreviewImage(null);
      setThumbnails([]);
      return;
    }

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      setPreviewError(null);
      setActivePage(1);
      setZoom(1.0);
      pageRefs.current = [];
      try {
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
          revokePreviewObjectUrl();
          if (gridMode) {
            const thumbs = await getPdfThumbnails(file, gridQuality);
            if (isCancelled) return;
            setThumbnails(thumbs);
            if (thumbs.length > 0) setPreviewImage(thumbs[0].dataUrl); // Still set previewImage just in case
          } else {
            const thumbs = await getPdfThumbnails(file, 1.5);
            if (isCancelled) return;
            setThumbnails(thumbs);
            if (thumbs.length > 0) {
              setPreviewImage(thumbs[0].dataUrl);
            }
          }
        } else if ((file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(file.name || '')) {
          // Revoke any previously owned preview URL before allocating a new one
          revokePreviewObjectUrl();

          if (isCancelled) return;

          const objectUrl = URL.createObjectURL(file);
          if (isCancelled) {
            try { URL.revokeObjectURL(objectUrl); } catch {}
            return;
          }

          previewObjectUrlRef.current = objectUrl;
          setPreviewImage(objectUrl);
          setThumbnails([]);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading preview:", error);
          setPreviewError(error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPreview(false);
        }
      }
    };

    loadPreview();

    return () => {
      isCancelled = true;
      revokePreviewObjectUrl();
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

  const thumbnailRefs = useRef([]);

  const scrollToPage = (pageNum) => {
    setActivePage(pageNum);
    const container = canvasContainerRef.current;
    const target = pageRefs.current[pageNum - 1];
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const scrollOffset = targetRect.top - containerRect.top + container.scrollTop - 24;
      container.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'smooth' });
    }
  };

  // Scroll spy: highlight active page based on scroll position in canvas container
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container || (!thumbnails.length && !previewImage)) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      let closestPage = 1;
      let minDistance = Infinity;

      pageRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - (containerRect.top + 60));
        if (distance < minDistance) {
          minDistance = distance;
          closestPage = index + 1;
        }
      });

      setActivePage(closestPage);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [thumbnails, previewImage]);

  // Keep active thumbnail in view in the sidebar
  useEffect(() => {
    const thumbEl = thumbnailRefs.current[activePage - 1];
    if (thumbEl && showSidebar) {
      thumbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activePage, showSidebar]);

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
    
    trackEvent('file_downloaded', {
      tool_name: title || 'unknown_tool',
      file_size_kb: successData.outputSize ? Math.round(successData.outputSize / 1024) : undefined,
    });
    if (pdfConverterDownloadRef.current) {
      trackEvent('file_conversion_success', { tool_name: 'pdf-converter' });
      pdfConverterDownloadRef.current = false;
    }

    const link = document.createElement('a');
    link.href = successData.url;
    link.download = successData.filename || 'download';
    link.click();
  };

  const totalPages = thumbnails.length > 0 ? thumbnails.length : (previewImage ? 1 : 0);

  const renderPreviewContent = () => {
    if (customPreviewNode) {
      return typeof customPreviewNode === 'function' ? customPreviewNode({ thumbnails, previewImage }) : customPreviewNode;
    }

    if (gridMode && renderGridItem) {
      return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col p-4 pb-8">
          <div className={getDynamicGridClass(thumbnails.length) + " w-full"}>
            {thumbnails.map((thumb, idx, arr) => renderGridItem(thumb, idx, arr))}
          </div>
        </div>
      );
    }

    // Standard document / image viewer with sidebar and toolbar
    const pageItems = thumbnails.length > 0 
      ? thumbnails 
      : (previewImage ? [{ id: 'page-0', dataUrl: previewImage }] : []);

    if (pageItems.length === 0) {
      const isEncrypted = previewError && (previewError.name === 'PasswordException' || String(previewError.message || '').includes('password') || String(previewError.message || '').includes('Password'));
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 select-none">
          <div className={`p-5 rounded-2xl mb-4 shadow-sm ${isEncrypted ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {isEncrypted ? <Lock className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-1" data-clarity-mask="true">
            {isEncrypted ? 'Password-Protected PDF' : (file?.name || 'Document')}
          </h4>
          <p className="text-sm text-gray-500 max-w-sm">
            {isEncrypted 
              ? 'This document is encrypted. Enter its password in the configuration panel to decrypt and convert.' 
              : 'Visual preview is not available for this file. You can configure options and proceed with conversion.'}
          </p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col min-h-0 bg-white select-none">
        {/* Document Viewer Top Toolbar */}
        <div className="h-12 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
          {/* Left: Sidebar toggle & Page count */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSidebar(s => !s)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                showSidebar 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              title={showSidebar ? "Hide thumbnails sidebar" : "Show thumbnails sidebar"}
            >
              {showSidebar ? <PanelLeftClose className="w-4 h-4 text-blue-600" /> : <PanelLeft className="w-4 h-4 text-gray-600" />}
              <span className="hidden sm:inline">{showSidebar ? "Hide Sidebar" : "Sidebar"}</span>
            </button>

            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

            <span className="text-xs font-bold text-gray-700 bg-gray-100/90 border border-gray-200/80 px-2.5 py-1 rounded-md">
              Page {activePage} of {totalPages || 1}
            </span>
          </div>

          {/* Right: Page Navigation & Zoom controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Prev / Next Page buttons */}
            {totalPages > 1 && (
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => scrollToPage(Math.max(1, activePage - 1))}
                  disabled={activePage <= 1}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-600 rounded transition-colors"
                  title="Previous page"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToPage(Math.min(totalPages, activePage + 1))}
                  disabled={activePage >= totalPages}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-600 rounded transition-colors"
                  title="Next page"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200/60">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.2).toFixed(1)))}
                disabled={zoom <= 0.5}
                className="p-1 hover:bg-white text-gray-600 hover:text-gray-900 rounded disabled:opacity-30 transition-all shadow-none hover:shadow-sm"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-1.5 text-xs font-bold text-gray-700 min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(2.5, +(z + 0.2).toFixed(1)))}
                disabled={zoom >= 2.5}
                className="p-1 hover:bg-white text-gray-600 hover:text-gray-900 rounded disabled:opacity-30 transition-all shadow-none hover:shadow-sm"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1.0)}
                className="p-1 hover:bg-white text-gray-500 hover:text-gray-900 rounded transition-all ml-0.5"
                title="Reset zoom to 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Viewer Body: Left Sidebar + Main Canvas */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {/* Left Thumbnail Sidebar */}
          {showSidebar && (
            <div className="w-40 sm:w-48 bg-gray-50 border-r border-gray-200 flex flex-col h-full shrink-0 animate-in slide-in-from-left duration-200 shadow-[inset_-2px_0_8px_rgba(0,0,0,0.02)] z-10">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-gray-700 tracking-wider uppercase">Pages</span>
                </div>
                <span className="text-[11px] font-extrabold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {totalPages || 1}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {pageItems.map((item, idx) => {
                  const isCurrent = activePage === idx + 1;
                  return (
                    <button
                      key={item.id || idx}
                      ref={el => (thumbnailRefs.current[idx] = el)}
                      type="button"
                      onClick={() => scrollToPage(idx + 1)}
                      className={`w-full group text-left rounded-xl transition-all p-1.5 flex flex-col items-center gap-1.5 cursor-pointer ${
                        isCurrent 
                          ? 'bg-blue-50/90 border-2 border-blue-500 shadow-md ring-2 ring-blue-400/20' 
                          : 'bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 shadow-sm'
                      }`}
                    >
                      <div className="w-full aspect-[1/1.35] bg-white rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center p-1 relative shadow-inner">
                        <img 
                          src={item.dataUrl} 
                          alt={`Thumbnail ${idx + 1}`} 
                          className="w-full h-full object-contain pointer-events-none"
                          loading="lazy"
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                        Page {idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Visual Canvas Area */}
          <div 
            ref={canvasContainerRef}
            className="flex-1 h-full min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-slate-100/75 flex flex-col items-center gap-6"
          >
            <div 
              className="flex flex-col items-center gap-6 transition-transform duration-200 origin-top w-full"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
              }}
            >
              {pageItems.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  ref={el => (pageRefs.current[idx] = el)}
                  data-page={idx + 1}
                  className="relative bg-white p-2 sm:p-3 rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow shrink-0 w-full max-w-2xl mx-auto"
                >
                  {previewOverlay && pageItems.length === 1 ? previewOverlay(item.dataUrl) : (
                    <img 
                      src={item.dataUrl} 
                      alt={`Page ${idx + 1}`} 
                      className="w-full object-contain block rounded-lg pointer-events-none"
                    />
                  )}
                  {pageItems.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-gray-900/75 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg font-bold shadow-md">
                      {idx + 1} / {pageItems.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full mx-auto animate-in fade-in flex flex-col">
      <div className="text-center space-y-1.5 flex-shrink-0 mb-4">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">{description}</p>
      </div>

      {!file && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
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
        <div className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-2xl border border-gray-100 min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-gray-600 font-medium text-sm">
            {gridMode ? "Rendering PDF pages..." : "Loading visual preview..."}
          </p>
        </div>
      )}

      {file && !successData && !isLoadingPreview && (
        <div className="flex flex-col lg:flex-row gap-4 w-full lg:h-[calc(100vh-140px)] lg:min-h-[600px] lg:max-h-[920px]">
          {/* Interactive Preview Canvas with Sidebar */}
          <div className="w-full lg:w-2/3 bg-white rounded-2xl border border-gray-200 min-h-[360px] h-[52vh] sm:h-[58vh] lg:h-full lg:min-h-0 overflow-hidden flex flex-col shadow-sm">
            {renderPreviewContent()}
          </div>

          {/* Configuration Panel */}
          <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col h-auto lg:h-full lg:min-h-0 overflow-visible lg:overflow-hidden shrink-0">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="overflow-hidden" data-clarity-mask="true">
                <h3 className="text-sm font-bold text-gray-900 truncate">{file.name}</h3>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="space-y-4 flex-1 lg:overflow-y-auto custom-scrollbar pr-0 lg:pr-2">
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
              <span><strong>Data Privacy:</strong> Your files are processed 100% locally in your browser memory. Documents are never uploaded to or stored on our servers.</span>
            </div>
          </div>
        </div>
      )}

      {/* Success State Overlay */}
      {successData && (
        customSuccessNode ? (
          typeof customSuccessNode === 'function'
            ? customSuccessNode({ successData, onReset, handleDownload, handleShare })
            : customSuccessNode
        ) : (
          <ResultSuccessWorkspace
            title={successData.title || 'Success!'}
            subtitle={successData.subtitle || 'Your file is ready.'}
            filename={successData.filename || (file?.name ? `converted_${file.name}` : 'download')}
            outputUrl={successData.url}
            originalSize={successData.originalSize || file?.size}
            outputSize={successData.outputSize}
            statsComponent={successData.statsComponent}
            textContent={successData.textContent}
            downloadText={successData.downloadText}
            icon={successData.icon}
            iconBgClass={successData.iconBgClass}
            iconColorClass={successData.iconColorClass}
            toolTitle={title}
            toolDescription={description}
            onReset={onReset}
          />
        )
      )}
    </div>
  );
}

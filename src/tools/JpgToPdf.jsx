import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { Download, PlusCircle, Trash2, Image as ImageIcon, CheckCircle, ArrowLeft, ImagePlus, FileUp, GripVertical, RotateCw, LayoutTemplate } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import DownloadPageExtras from '../components/ui/DownloadPageExtras';
import { trackEvent, trackError } from '../lib/analytics';
import { normalizeImage } from '../utils/imageNormalization';

export default function JpgToPdf() {
  const isPngRoute = typeof window !== 'undefined' && window.location.pathname.includes('png-to-pdf');

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputFilename, setOutputFilename] = useState('converted_images.pdf');
  const [pageSize, setPageSize] = useState('fit'); // 'fit' (Original Aspect Ratio), 'a4', 'letter'
  const [orientation, setOrientation] = useState('auto'); // 'auto', 'portrait', 'landscape'
  const [margin, setMargin] = useState(10);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const outputUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
    };
  }, []);

  const isImageFile = (f) => {
    if (!f) return false;
    if (f.type && f.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|bmp|gif|tiff?|svg)$/i.test(f.name || '');
  };

  useEffect(() => {
    if (window.__sharedFile) {
      if (isImageFile(window.__sharedFile)) {
        handleImages(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleImages = (newFiles) => {
    const imgFiles = Array.isArray(newFiles) ? newFiles : [newFiles];
    const valid = imgFiles.filter(isImageFile);
    if (valid.length === 0) {
      alert('Please upload valid image files (JPG, PNG, WebP, GIF, BMP).');
      return;
    }

    // Read all images as Data URLs for preview display
    Promise.all(valid.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ file, dataUrl: e.target.result, rotation: 0 });
        reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
        reader.readAsDataURL(file);
      });
    })).then(results => {
      setImages(prev => [...prev, ...results]);
      setSuccess(false);
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      setOutputUrl(null);
    }).catch(err => {
      trackError('Jpg To Pdf', 'file_read_error');
      console.error(err);
      alert('Could not read one or more selected images.');
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const reorderImage = (fromIndex, toIndex) => {
    setImages(prev => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
          fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const reordered = [...prev];
      const [image] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, image);
      return reordered;
    });
  };

  const handleDragStart = (event, index) => {
    setDraggedIdx(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (event, index) => {
    event.preventDefault();
    const fromIndex = draggedIdx;
    if (fromIndex !== null) reorderImage(fromIndex, index);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const rotateImage = (index) => {
    setImages(prev => prev.map((image, i) => (
      i === index ? { ...image, rotation: (image.rotation + 90) % 360 } : image
    )));
  };

  const resetTool = () => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
    setImages([]);
    setSuccess(false);
    setOutputUrl(null);
    setPageSize('fit');
    setOrientation('auto');
    setMargin(10);
    setProgress(0);
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    const toolName = isPngRoute ? 'PNG to PDF' : 'JPG to PDF';
    trackEvent('tool_executed', { tool_name: toolName });
    setLoading(true);
    setProgress(0);

    try {
      let doc = null;
      const total = images.length;

      for (let i = 0; i < total; i++) {
        const imgObj = images[i];
        
        // Normalize image: Corrects EXIF orientation, applies manual rotation, normalizes WebP/PNG
        const norm = await normalizeImage(imgObj.file, imgObj.rotation);

        const imgFormat = norm.mimeType === 'image/png' ? 'PNG' : 'JPEG';

        if (pageSize === 'fit') {
          // Fit to Image / Original Dimensions (at standard 96 DPI, 1 px = 25.4/96 mm)
          const pxToMm = 25.4 / 96;
          const imgWMm = norm.width * pxToMm;
          const imgHMm = norm.height * pxToMm;
          const pageWMm = imgWMm + margin * 2;
          const pageHMm = imgHMm + margin * 2;
          const pageOrient = pageWMm >= pageHMm ? 'landscape' : 'portrait';

          if (i === 0) {
            doc = new jsPDF({ orientation: pageOrient, unit: 'mm', format: [pageWMm, pageHMm] });
          } else {
            doc.addPage([pageWMm, pageHMm], pageOrient);
          }

          doc.addImage(norm.dataUrl, imgFormat, margin, margin, imgWMm, imgHMm);
        } else {
          // Standard document dimensions: A4 or US Letter
          const standardW = pageSize === 'letter' ? 215.9 : 210.0;
          const standardH = pageSize === 'letter' ? 279.4 : 297.0;

          // Determine per-page orientation
          let pageOrient = orientation;
          if (orientation === 'auto') {
            pageOrient = norm.width > norm.height ? 'landscape' : 'portrait';
          }

          const pageW = pageOrient === 'landscape' ? Math.max(standardW, standardH) : Math.min(standardW, standardH);
          const pageH = pageOrient === 'landscape' ? Math.min(standardW, standardH) : Math.max(standardW, standardH);

          if (i === 0) {
            doc = new jsPDF({ orientation: pageOrient, unit: 'mm', format: [pageW, pageH] });
          } else {
            doc.addPage([pageW, pageH], pageOrient);
          }

          const availW = pageW - margin * 2;
          const availH = pageH - margin * 2;
          const scale = Math.min(availW / norm.width, availH / norm.height);
          const placedW = norm.width * scale;
          const placedH = norm.height * scale;
          const x = (pageW - placedW) / 2;
          const y = (pageH - placedH) / 2;

          doc.addImage(norm.dataUrl, imgFormat, x, y, placedW, placedH);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      const pdfBytes = doc.output('blob');
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
      const url = URL.createObjectURL(pdfBytes);
      outputUrlRef.current = url;

      // Compute descriptive filename
      const firstBase = images[0]?.file?.name?.replace(/\.[^/.]+$/, "") || 'document';
      const computedFilename = images.length > 1 ? `${firstBase}_combined.pdf` : `${firstBase}.pdf`;

      setOutputUrl(url);
      setOutputFilename(computedFilename);
      setSuccess(true);
      // NOTE: Removed automatic link.click() to ensure exactly one download per user action
    } catch (err) {
      trackError('Jpg To Pdf', 'processing_error');
      console.error("PDF generation error:", err);
      alert("Failed to create PDF. Please ensure all uploaded files are valid images.");
    } finally {
      setLoading(false);
    }
  };

  const toolTitle = isPngRoute ? 'PNG to PDF' : 'JPG to PDF';
  const toolSubtitle = isPngRoute 
    ? 'Combine your PNG images into a clean, professional PDF document.'
    : 'Combine images into a PDF, then customize page sizing, orientation, and margins.';
  const uploadLabel = isPngRoute ? 'Select PNG images' : 'Select JPG images';

  // State 1: Upload Focus
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">{toolTitle}</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            {toolSubtitle}
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="image/*"
            multiple={true}
            onFileSelect={handleImages}
            label={uploadLabel}
            icon={ImageIcon}
            className="p-20 py-32 bg-yellow-50/50 hover:bg-yellow-50 border-yellow-300 hover:border-yellow-400"
          />
        </div>
      </div>
    );
  }

  // State 3: Success Screen
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Images converted!</h2>
        <p className="text-lg text-gray-600 mb-10">Your PDF document is ready for download.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={outputFilename}
            className="px-10 py-5 bg-yellow-500 text-white rounded-xl font-bold text-xl hover:bg-yellow-600 shadow-lg hover:shadow-xl transition-all flex items-center gap-3 cursor-pointer"
          >
            <Download className="w-8 h-8" /> Download PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ImagePlus className="w-6 h-6" /> Start Over
          </button>
        </div>
        <DownloadPageExtras toolId={isPngRoute ? "png-to-pdf" : "jpg-to-pdf"} />
      </div>
    );
  }

  // State 2: Workspace View
  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-[70vh] gap-6 animate-in slide-in-from-right-8 duration-500 -mx-6 sm:-mx-8 lg:-mx-8">
      {/* Main Workspace Area (Left) */}
      <div className="flex-1 bg-gray-100 rounded-xl lg:rounded-l-none lg:rounded-r-2xl border-y border-r border-gray-200 p-8 relative shadow-inner overflow-y-auto">
        <button 
          onClick={resetTool} 
          className="absolute top-6 left-6 p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 border border-gray-200"
          title="Back to upload"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
          {images.map((img, i) => (
            <div
              key={`${img.file.name}-${i}`}
              onDragOver={event => {
                event.preventDefault();
                if (draggedIdx !== null && draggedIdx !== i) setDragOverIdx(i);
              }}
              onDrop={event => handleDrop(event, i)}
              className={`group relative aspect-[3/4] bg-white rounded-xl shadow-md border overflow-hidden flex flex-col transition-all ${
                draggedIdx === i ? 'opacity-40 border-dashed border-gray-400' :
                dragOverIdx === i ? 'border-blue-500 ring-2 ring-blue-200' :
                'border-gray-200 hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              <img
                src={img.dataUrl}
                alt={`Preview of ${img.file.name}`}
                className={img.rotation % 180
                  ? 'absolute left-1/2 top-1/2 w-[133.333%] h-3/4 max-w-none object-contain'
                  : 'w-full h-full object-contain p-2'}
                style={img.rotation % 180
                  ? { transform: `translate(-50%, -50%) rotate(${img.rotation}deg)` }
                  : undefined}
              />
              <button 
                onClick={() => removeImage(i)} 
                aria-label={`Remove ${img.file.name}`}
                className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4"/>
              </button>
              <div className="absolute top-2 left-2 flex gap-1">
                <button
                  type="button"
                  draggable
                  onDragStart={event => handleDragStart(event, i)}
                  onDragEnd={handleDragEnd}
                  onKeyDown={event => {
                    if (event.key === 'ArrowUp' && i > 0) {
                      event.preventDefault();
                      reorderImage(i, i - 1);
                    } else if (event.key === 'ArrowDown' && i < images.length - 1) {
                      event.preventDefault();
                      reorderImage(i, i + 1);
                    }
                  }}
                  aria-label={`Drag to reorder ${img.file.name}; use up and down arrow keys to move`}
                  title="Drag to reorder (or use up/down arrow keys)"
                  className="p-1.5 bg-white/90 text-gray-700 rounded-md shadow-sm hover:bg-white cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => rotateImage(i)}
                  aria-label={`Rotate ${img.file.name} 90 degrees clockwise`}
                  className="p-1.5 bg-white/90 text-gray-700 rounded-md shadow-sm hover:bg-white cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                <span className="text-xs font-medium text-white truncate block w-full">{img.file.name}</span>
              </div>
            </div>
          ))}
          
          <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 transition-all">
            <PlusCircle className="w-10 h-10 mb-2" />
            <span className="text-sm font-medium">Add More</span>
            <input type="file" multiple accept="image/*" onChange={(e) => handleImages(Array.from(e.target.files))} className="hidden" />
          </label>
        </div>
      </div>

      {/* Settings Panel (Right Sidebar) */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white border-l border-gray-200 pb-8 px-6 lg:px-0">
        <div className="p-6 lg:p-8 space-y-6 flex-1">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-1">{isPngRoute ? 'PNG to PDF' : 'Image to PDF'}</h3>
            <p className="text-gray-500 text-sm">Convert your images to a single, high-fidelity PDF document.</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-center justify-between">
             <span className="text-sm text-yellow-800 font-bold">Total Images:</span>
             <span className="text-xl font-extrabold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-lg">{images.length}</span>
          </div>

          <div className="space-y-4">
            {/* Page Size Option */}
            <div>
              <label htmlFor="jpg-pdf-pagesize" className="block text-sm text-gray-700 font-semibold mb-1 flex items-center gap-1.5">
                <LayoutTemplate className="w-4 h-4 text-gray-500" /> Page Size
              </label>
              <select
                id="jpg-pdf-pagesize"
                value={pageSize}
                onChange={e => setPageSize(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              >
                <option value="fit">Fit Image (Original Size, No Bars)</option>
                <option value="a4">A4 (Standard Document)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
              </select>
            </div>

            {/* Page Orientation */}
            {pageSize !== 'fit' && (
              <div>
                <label htmlFor="jpg-pdf-orientation" className="block text-sm text-gray-700 font-semibold mb-1">Page Orientation</label>
                <select
                  id="jpg-pdf-orientation"
                  value={orientation}
                  onChange={e => setOrientation(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                >
                  <option value="auto">Auto (Match each image)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            )}

            {/* Margin Spacing */}
            <div>
              <label htmlFor="jpg-pdf-margin" className="block text-sm text-gray-700 font-semibold mb-1">Page Margins</label>
              <select
                id="jpg-pdf-margin"
                value={margin}
                onChange={e => setMargin(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              >
                <option value={0}>None (0 mm)</option>
                <option value={10}>Small (10 mm)</option>
                <option value={20}>Large (20 mm)</option>
              </select>
            </div>

            <p className="text-xs text-gray-500">
              Drag the grip on each preview to change page order, or rotate an image. Camera EXIF orientation is automatically corrected.
            </p>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={generatePdf} 
            disabled={loading}
            className="w-full px-6 py-5 bg-yellow-500 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
          >
            {loading ? (
              <span>Converting... {progress}%</span>
            ) : (
              <><FileUp className="w-6 h-6"/> Convert to PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

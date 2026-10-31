import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  PlusCircle, 
  Trash2, 
  FileText, 
  CheckCircle, 
  ArrowLeft, 
  RefreshCw, 
  Loader2, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown, 
  AlertCircle, 
  X,
  FileCheck
} from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import DownloadPageExtras from '../components/ui/DownloadPageExtras';
import { getPdfCoverThumbnail } from '../lib/pdfRenderer';
import { trackEvent, trackError } from '../lib/analytics';

export default function PdfMerger() {
  const [files, setFiles] = useState([]); // Array of { id, file, thumbDataUrl }
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [extractingThumbs, setExtractingThumbs] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const [customFilename, setCustomFilename] = useState('merged_document.pdf');

  // Drag and drop state for reordering
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Ref to track generated blob URL for proper memory revocation
  const activeBlobUrlRef = useRef(null);

  // Revoke blob URL on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, []);

  const generateId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11);
  };

  const sanitizeFilename = (name) => {
    let clean = (name || '').trim().replace(/[/\\?%*:|"<>]/g, '_');
    if (!clean) clean = 'merged_document';
    if (!clean.toLowerCase().endsWith('.pdf')) clean += '.pdf';
    return clean;
  };

  const handleFiles = async (selectedFiles) => {
    const newFilesArray = Array.isArray(selectedFiles) ? selectedFiles : Array.from(selectedFiles || []);
    if (newFilesArray.length === 0) return;

    setErrorNotice(null);

    // Preliminary validation:
    // 1. Accept files with type === 'application/pdf' OR filename ending in .pdf
    // 2. Reject zero-byte files
    // 3. Verify %PDF- magic bytes to reject fake renamed files
    const validCandidates = [];
    const rejectedErrors = [];

    for (const f of newFilesArray) {
      const isPdfExtension = f.name?.toLowerCase().endsWith('.pdf');
      const isPdfMime = f.type === 'application/pdf';

      if (!isPdfExtension && !isPdfMime) {
        rejectedErrors.push(`"${f.name}" is not a PDF file and was skipped.`);
        continue;
      }

      if (f.size === 0) {
        rejectedErrors.push(`"${f.name}" is an empty file (0 bytes) and was skipped.`);
        continue;
      }

      // Check header magic bytes for actual PDF signature (%PDF-)
      try {
        const headerBlob = f.slice(0, 5);
        const headerText = await headerBlob.text();
        if (!headerText.startsWith('%PDF-')) {
          rejectedErrors.push(`"${f.name}" is not a valid PDF document (missing PDF signature).`);
          continue;
        }
      } catch {
        rejectedErrors.push(`Could not read "${f.name}".`);
        continue;
      }

      validCandidates.push(f);
    }

    if (rejectedErrors.length > 0) {
      setErrorNotice({
        message: rejectedErrors.join(' ')
      });
    }

    if (validCandidates.length === 0) return;

    setExtractingThumbs(true);
    const newFileObjects = [];

    for (const file of validCandidates) {
      try {
        // Optimized: Renders only the first page cover thumbnail
        const thumbDataUrl = await getPdfCoverThumbnail(file, 0.3);
        newFileObjects.push({
          id: generateId(),
          file,
          thumbDataUrl
        });
      } catch (err) {
        console.warn("Could not generate cover thumbnail for", file.name, err);
        trackError('Pdf Merger', 'thumbnail_warning');
        newFileObjects.push({
          id: generateId(),
          file,
          thumbDataUrl: null
        });
      }
    }

    setFiles(prev => [...prev, ...newFileObjects]);
    setExtractingThumbs(false);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setErrorNotice(null);
  };

  const resetTool = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    setFiles([]);
    setSuccessData(null);
    setErrorNotice(null);
    setCustomFilename('merged_document.pdf');
  };

  // Reordering helpers (Single authoritative state updater)
  const moveFile = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= files.length) return;
    setFiles(prev => {
      const updated = [...prev];
      const [item] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, item);
      return updated;
    });
  };

  const moveUp = (index) => moveFile(index, index - 1);
  const moveDown = (index) => moveFile(index, index + 1);

  const sortAlphabetically = () => {
    setFiles(prev => [...prev].sort((a, b) => 
      a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' })
    ));
  };

  // Drag-and-drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', index.toString());
    } catch {}
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIndex) {
      moveFile(draggedIdx, targetIndex);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) return;
    trackEvent('tool_executed', { tool_name: 'Merge PDF' });
    setLoading(true);
    setErrorNotice(null);
    
    try {
      const { PDFDocument } = await import('pdf-lib');
      const mergedPdf = await PDFDocument.create();
      
      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        let pdf;
        try {
          pdf = await PDFDocument.load(arrayBuffer);
        } catch (loadErr) {
          throw new Error(`Failed to read "${item.file.name}". ${loadErr.message || 'File may be corrupted or password-protected.'}`);
        }

        // AcroForm Handling: Flatten existing interactive fields to preserve filled values
        // in appearance streams and prevent cross-document form field collisions.
        try {
          const form = pdf.getForm();
          const fields = form.getFields();
          if (fields.length > 0) {
            form.flatten();
          }
        } catch {
          // If no AcroForm exists or flattening is not required, continue cleanly
        }

        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Memory cleanup: revoke any previous blob URL before creating a new one
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      activeBlobUrlRef.current = url;
      
      // Calculate true total original size from all input source files
      const totalOriginalSize = files.reduce((sum, item) => sum + (item.file?.size || 0), 0);
      const finalFilename = sanitizeFilename(customFilename);

      setSuccessData({
        originalSize: totalOriginalSize,
        outputSize: blob.size || pdfBytes.length || 0,
        url,
        filename: finalFilename,
        title: 'PDFs Merged Successfully!',
        subtitle: `You combined ${files.length} documents into one.`,
      });
    } catch (err) {
      console.error(err);
      let errorType = 'merge_failed';
      let userMsg = err.message || "Failed to merge PDFs. One of the files might be encrypted or corrupted.";
      if (err.message?.toLowerCase().includes('encrypt')) {
        errorType = 'encrypted_file';
        userMsg = "One or more PDF files are encrypted or password-protected. Please unlock them using the Unlock PDF tool before merging.";
      }
      trackError('Merge PDF', errorType);
      setErrorNotice({ message: userMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    trackEvent('file_downloaded', { tool_name: 'Merge PDF' });
    if (!successData || !successData.url) return;
    const link = document.createElement('a');
    link.href = successData.url;
    link.download = successData.filename || 'merged_document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // State 1: Upload Focus (Initial Empty State)
  if (files.length === 0 && !extractingThumbs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Merge PDF</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Combine multiple PDF files into one document securely in your browser.
          </p>
        </div>

        {errorNotice && (
          <div className="w-full max-w-4xl mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between text-red-700 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorNotice.message}</span>
            </div>
            <button 
              onClick={() => setErrorNotice(null)} 
              className="text-red-400 hover:text-red-700 p-1"
              aria-label="Dismiss error notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf,.pdf"
            multiple={true}
            onFileSelect={handleFiles}
            label="Select PDF files to merge"
            icon={PlusCircle}
            className="p-20 py-32 bg-blue-50/50 hover:bg-blue-50 border-blue-300 hover:border-blue-400"
          />
        </div>
      </div>
    );
  }

  // State 3: Success Screen
  if (successData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">{successData.title}</h2>
        <p className="text-lg text-gray-600 mb-8">{successData.subtitle}</p>
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 flex items-center gap-3 text-sm text-gray-700">
          <FileCheck className="w-5 h-5 text-blue-600" />
          <span className="font-medium">Output: {successData.filename}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button 
            onClick={handleDownload}
            className="px-10 py-5 bg-blue-600 text-white rounded-xl font-bold text-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download PDF
          </button>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Start Over
          </button>
        </div>
        <DownloadPageExtras toolId="pdf-merge" />
      </div>
    );
  }

  // State 2: Workspace View (Active Reordering & Merging Canvas)
  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-[70vh] gap-6 animate-in slide-in-from-right-8 duration-500 -mx-6 sm:-mx-8 lg:-mx-8">
      {/* Main Workspace Area (Left) */}
      <div className="flex-1 bg-gray-100 rounded-xl lg:rounded-l-none lg:rounded-r-2xl border-y border-r border-gray-200 p-8 relative shadow-inner overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={resetTool} 
            className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 border border-gray-200 z-10 flex items-center gap-2 text-sm font-medium"
            title="Back to upload"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Upload New</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={sortAlphabetically}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-all"
              title="Sort files alphabetically by filename"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Sort A–Z</span>
            </button>
            <button
              onClick={clearAllFiles}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5 shadow-sm transition-all"
              title="Clear all files"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {errorNotice && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between text-red-700 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorNotice.message}</span>
            </div>
            <button 
              onClick={() => setErrorNotice(null)} 
              className="text-red-400 hover:text-red-700 p-1"
              aria-label="Dismiss error message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Workspace Grid Cards with Full Drag-and-Drop and Up/Down Controls */}
        <div className="flex flex-wrap gap-6 justify-center">
          {files.map((item, index) => {
            const isDragging = draggedIdx === index;
            const isDragOver = dragOverIdx === index;

            return (
              <div 
                key={item.id} 
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group w-48 h-64 bg-white rounded-xl shadow-md border flex flex-col items-center justify-center overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                  isDragging 
                    ? 'opacity-40 scale-95 ring-2 ring-blue-500 border-blue-500' 
                    : isDragOver 
                      ? 'border-blue-600 ring-2 ring-blue-400 scale-105 shadow-xl' 
                      : 'border-gray-200 hover:shadow-lg'
                }`}
                title={`Drag to reorder: ${item.file.name}`}
              >
                {item.thumbDataUrl ? (
                  <img src={item.thumbDataUrl} alt={`Page 1 of ${item.file.name}`} className="w-full h-full object-cover p-2 pointer-events-none" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400 p-4">
                    <FileText className="w-16 h-16 mb-2" />
                    <span className="text-xs px-2 text-center break-all">{item.file.name}</span>
                  </div>
                )}
                
                {/* Sequence Badge */}
                <div className="absolute top-2 left-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm pointer-events-none">
                  {index + 1}
                </div>

                {/* Card Action Controls */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-100">
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveUp(index); }}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent rounded"
                    title="Move earlier in sequence"
                    aria-label={`Move ${item.file.name} earlier`}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                    disabled={index === files.length - 1}
                    className="p-1 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent rounded"
                    title="Move later in sequence"
                    aria-label={`Move ${item.file.name} later`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                    className="p-1 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded"
                    title="Remove file"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 p-2 text-xs font-medium text-gray-700 truncate text-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pointer-events-none">
                  {item.file.name}
                </div>
              </div>
            );
          })}

          {extractingThumbs && (
            <div className="w-48 h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm font-medium">Generating preview...</span>
            </div>
          )}
          
          {/* Add More PDFs Card */}
          <div className="w-48 h-64 bg-blue-50/50 hover:bg-blue-50 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-500 hover:text-blue-600 transition-colors cursor-pointer relative">
            <DragDropZone 
              accept="application/pdf,.pdf"
              multiple={true}
              onFileSelect={handleFiles}
              label="Add more"
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <PlusCircle className="w-10 h-10 mb-2" />
            <span className="text-sm font-bold">Add more PDFs</span>
          </div>
        </div>
      </div>

      {/* Settings Panel (Right Sidebar) */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white border-l border-gray-200 pb-8 px-6 lg:px-0">
        <div className="p-6 lg:p-8 space-y-6 flex-1">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Merge PDF</h3>
            <p className="text-gray-500 text-xs">Drag files or use buttons to adjust the merge sequence.</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-2">
            <div className="flex justify-between text-sm text-blue-800 font-bold">
              <span>Total files:</span>
              <span className="bg-blue-200 px-2 py-0.5 rounded-md">{files.length}</span>
            </div>
            <div className="flex justify-between text-xs text-blue-700">
              <span>Combined size:</span>
              <span>{(files.reduce((acc, curr) => acc + (curr.file?.size || 0), 0) / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          </div>

          {/* Custom Output Filename Option */}
          <div className="space-y-1.5">
            <label htmlFor="merged-filename-input" className="block text-xs font-semibold text-gray-700">
              Output Filename
            </label>
            <input 
              id="merged-filename-input"
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="merged_document.pdf"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Interactive Reorderable Sidebar List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">File Sequence</span>
              <button
                onClick={sortAlphabetically}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                title="Sort sequence alphabetically"
              >
                Sort A–Z
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {files.map((f, idx) => {
                const isDragging = draggedIdx === idx;
                const isDragOver = dragOverIdx === idx;

                return (
                  <div 
                    key={f.id} 
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all cursor-grab active:cursor-grabbing ${
                      isDragging 
                        ? 'bg-blue-50 border-blue-300 opacity-50' 
                        : isDragOver 
                          ? 'bg-blue-100 border-blue-500' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-xs font-bold text-gray-400 w-4 text-center shrink-0">{idx + 1}</span>
                    <span className="text-xs font-medium text-gray-700 truncate flex-1 pointer-events-none" title={f.file.name}>
                      {f.file.name}
                    </span>

                    {/* Move Up/Down Controls in Sidebar */}
                    <div className="flex items-center gap-0.5">
                      <button 
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded"
                        title="Move Up"
                        aria-label={`Move ${f.file.name} up`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => moveDown(idx)}
                        disabled={idx === files.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded"
                        title="Move Down"
                        aria-label={`Move ${f.file.name} down`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => removeFile(f.id)} 
                        className="p-1 text-gray-400 hover:text-red-500 rounded ml-1"
                        title="Remove"
                        aria-label={`Remove ${f.file.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={mergePdfs} 
            disabled={loading || files.length < 2}
            className="w-full px-6 py-5 bg-blue-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Merging...</>
            ) : (
              <><PlusCircle className="w-6 h-6" /> Merge {files.length} PDFs</>
            )}
          </button>
          {files.length < 2 && (
            <p className="text-xs text-center text-gray-500 mt-3 font-medium">Add at least 2 files to merge.</p>
          )}
        </div>
      </div>
    </div>
  );
}

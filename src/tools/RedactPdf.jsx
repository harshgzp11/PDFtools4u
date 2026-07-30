import React, { useState, useEffect, useRef } from 'react';
import { Eraser, FileText, RefreshCw, CheckCircle, Download, Shield, ShieldAlert, ArrowLeft, Plus, X, ListOrdered, Share2 } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import DragDropZone from '../components/ui/DragDropZone';
import AdSlot from '../components/ui/AdSlot';
import { getPdfThumbnails, getPdfCanvases } from '../lib/pdfRenderer';

export default function RedactPdf() {
  const [file, setFile] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [thumbnails, setThumbnails] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  
  // Store redactions per page as percentages
  // { [pageIndex]: [ { id, x, y, w, h } ] }
  const [redactions, setRedactions] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState(null);
  
  const [isSecureMode, setIsSecureMode] = useState(true);
  const [successData, setSuccessData] = useState(null); // { pdfBytes, fileName }

  const containerRef = useRef(null);

  useEffect(() => {
    if (window.__sharedFile) {
      handleFileSelect(window.__sharedFile);
      window.__sharedFile = null;
    }
  }, []);

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setIsLoadingPreview(true);
    setSuccessData(null);
    setRedactions({});
    setActivePageIndex(0);

    try {
      const thumbs = await getPdfThumbnails(selectedFile, 1.5);
      setThumbnails(thumbs);
    } catch (error) {
      console.error("Error loading PDF preview:", error);
      alert("Could not render PDF preview. It might be corrupted or encrypted.");
      setFile(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Canvas drawing handlers
  const handlePointerDown = (e) => {
    if (!containerRef.current || e.button !== 0) return; // Only left click
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsDrawing(true);
    setCurrentBox({ id: Date.now().toString(), startX: x, startY: y, x, y, w: 0, h: 0 });
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !currentBox || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Constrain to container
    let curX = ((e.clientX - rect.left) / rect.width) * 100;
    let curY = ((e.clientY - rect.top) / rect.height) * 100;
    
    curX = Math.max(0, Math.min(100, curX));
    curY = Math.max(0, Math.min(100, curY));

    const newX = Math.min(currentBox.startX, curX);
    const newY = Math.min(currentBox.startY, curY);
    const newW = Math.abs(curX - currentBox.startX);
    const newH = Math.abs(curY - currentBox.startY);

    setCurrentBox({ ...currentBox, x: newX, y: newY, w: newW, h: newH });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentBox) return;
    
    // Only add if it has some dimension
    if (currentBox.w > 1 && currentBox.h > 1) {
      const newBox = { id: currentBox.id, x: currentBox.x, y: currentBox.y, w: currentBox.w, h: currentBox.h };
      setRedactions(prev => ({
        ...prev,
        [activePageIndex]: [...(prev[activePageIndex] || []), newBox]
      }));
    }
    
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const removeRedaction = (pageIdx, boxId) => {
    setRedactions(prev => ({
      ...prev,
      [pageIdx]: prev[pageIdx].filter(b => b.id !== boxId)
    }));
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      if (!isSecureMode) {
        // Fast Visual Redaction: Draw black boxes on original PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();

        pages.forEach((page, index) => {
          const pageBoxes = redactions[index];
          if (pageBoxes && pageBoxes.length > 0) {
            const { width, height } = page.getSize();
            pageBoxes.forEach(box => {
              // Convert percentages to PDF points (origin is bottom-left)
              const x = (box.x / 100) * width;
              const boxW = (box.w / 100) * width;
              const boxH = (box.h / 100) * height;
              const y = height - ((box.y / 100) * height) - boxH;
              
              page.drawRectangle({
                x,
                y,
                width: boxW,
                height: boxH,
                color: rgb(0, 0, 0),
              });
            });
          }
        });

        const newPdfBytes = await pdfDoc.save();
        setSuccessData({
          pdfBytes: newPdfBytes,
          fileName: `redacted_${file.name}`
        });
      } else {
        // Secure Rasterized Redaction: Flatten to images with drawn boxes
        const pagesData = await getPdfCanvases(file, 2.0); // High res render
        const newPdfDoc = await PDFDocument.create();

        for (let i = 0; i < pagesData.length; i++) {
          const { canvas, width: origWidth, height: origHeight } = pagesData[i];
          const ctx = canvas.getContext('2d');
          
          // Draw redactions on the canvas
          const pageBoxes = redactions[i];
          if (pageBoxes && pageBoxes.length > 0) {
            ctx.fillStyle = '#000000';
            pageBoxes.forEach(box => {
              const rectX = (box.x / 100) * canvas.width;
              const rectY = (box.y / 100) * canvas.height;
              const rectW = (box.w / 100) * canvas.width;
              const rectH = (box.h / 100) * canvas.height;
              ctx.fillRect(rectX, rectY, rectW, rectH);
            });
          }

          // Convert canvas to image and add to PDF
          const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const jpgImageBytes = await fetch(jpgDataUrl).then(res => res.arrayBuffer());
          const jpgImage = await newPdfDoc.embedJpg(jpgImageBytes);
          
          const page = newPdfDoc.addPage([origWidth, origHeight]);
          page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: origWidth,
            height: origHeight,
          });
        }

        const newPdfBytes = await newPdfDoc.save();
        setSuccessData({
          pdfBytes: newPdfBytes,
          fileName: `secure_redacted_${file.name}`
        });
      }
    } catch (error) {
      console.error('Error redacting PDF:', error);
      alert('Failed to redact the PDF. It might be encrypted or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!successData) return;
    const blob = new Blob([successData.pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = successData.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNewFile = () => {
    setFile(null);
    setThumbnails([]);
    setSuccessData(null);
    setRedactions({});
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Redact PDF</h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Permanently blackout sensitive text, images, and data from your PDF documents.
        </p>
      </div>

      {!file && (
        <DragDropZone 
          accept="application/pdf"
          onFileSelect={handleFileSelect}
          label="Select a PDF to redact"
          icon={Eraser}
          className="p-16 py-24 border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
        />
      )}

      {file && isLoadingPreview && (
        <div className="flex flex-col items-center justify-center p-24 bg-white rounded-2xl shadow-sm border border-gray-100">
          <RefreshCw className="w-10 h-10 text-gray-400 animate-spin mb-4" />
          <p className="text-gray-600 font-medium text-lg">Loading visual preview...</p>
        </div>
      )}

      {file && thumbnails.length > 0 && !successData && (
        <div className="flex flex-col lg:flex-row gap-8 items-start h-[80vh]">
          {/* Left: Thumbnails List */}
          <div className="w-full lg:w-48 bg-white border border-gray-200 rounded-3xl p-4 shadow-sm h-full overflow-y-auto flex flex-row lg:flex-col gap-4">
            {thumbnails.map((thumb, idx) => (
              <button
                key={thumb.id}
                onClick={() => setActivePageIndex(idx)}
                className={`relative flex-shrink-0 group overflow-hidden rounded-xl border-2 transition-all ${
                  activePageIndex === idx ? 'border-gray-900 shadow-md ring-4 ring-gray-100' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img src={thumb.dataUrl} alt={`Page ${idx + 1}`} className="w-full h-auto" draggable={false} />
                <div className={`absolute bottom-2 right-2 px-2 py-1 rounded-md text-xs font-bold ${
                  activePageIndex === idx ? 'bg-gray-900 text-white' : 'bg-gray-800/60 text-white'
                }`}>
                  {idx + 1}
                </div>
                {(redactions[idx]?.length > 0) && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black text-white text-xs font-bold rounded-md flex items-center gap-1">
                    <Eraser className="w-3 h-3" /> {redactions[idx].length}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Center: Main Preview Canvas */}
          <div className="flex-1 bg-gray-100 rounded-3xl p-4 shadow-inner flex flex-col items-center justify-center h-full border border-gray-200 overflow-hidden select-none">
            <p className="text-sm text-gray-500 mb-4 font-medium flex items-center gap-2 flex-shrink-0">
              <Plus className="w-4 h-4" /> Click and drag on the document to draw blackout redactions
            </p>
            
            <div className="relative shadow-xl max-h-full overflow-y-auto" style={{ maxWidth: '100%' }}>
              <div 
                ref={containerRef}
                className="relative cursor-crosshair inline-block"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ touchAction: 'none' }}
              >
                <img 
                  src={thumbnails[activePageIndex].dataUrl} 
                  alt="Current Page" 
                  className="max-h-[65vh] w-auto pointer-events-none object-contain"
                  draggable={false}
                />
                
                {/* Render confirmed redactions for this page */}
                {(redactions[activePageIndex] || []).map(box => (
                  <div 
                    key={box.id}
                    className="absolute bg-black group"
                    style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeRedaction(activePageIndex, box.id); }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 hover:bg-red-600 hover:scale-110"
                      title="Remove Redaction"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {/* Render currently drawing box */}
                {isDrawing && currentBox && (
                  <div 
                    className="absolute bg-black/80 border border-black"
                    style={{ left: `${currentBox.x}%`, top: `${currentBox.y}%`, width: `${currentBox.w}%`, height: `${currentBox.h}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right: Configuration Panel */}
          <div className="w-full lg:w-72 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col h-full sticky top-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="p-3 bg-gray-100 text-gray-700 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-base font-bold text-gray-900 truncate" title={file.name}>{file.name}</h3>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" /> Security Mode
                </h4>
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${isSecureMode ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input 
                      type="radio" 
                      checked={isSecureMode} 
                      onChange={() => setIsSecureMode(true)}
                      className="w-4 h-4 mt-0.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                    />
                    <div>
                      <span className="font-bold text-gray-900 block text-sm">Secure Flattening</span>
                      <span className="text-xs text-gray-500 mt-1 block">Best security. Rasterizes PDF into images to permanently destroy hidden text. (Slower)</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${!isSecureMode ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input 
                      type="radio" 
                      checked={!isSecureMode} 
                      onChange={() => setIsSecureMode(false)}
                      className="w-4 h-4 mt-0.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                    />
                    <div>
                      <span className="font-bold text-gray-900 block text-sm flex items-center gap-1">
                        Visual Only <ShieldAlert className="w-3 h-3 text-amber-500" />
                      </span>
                      <span className="text-xs text-gray-500 mt-1 block">Fastest. Draws black boxes over text, but text may still be copyable underneath.</span>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-xs leading-relaxed border border-amber-100">
                <strong>Tip:</strong> You can draw multiple blackouts on any page. Use the thumbnails on the left to switch pages.
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-extrabold text-base hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 hover:shadow-gray-300"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Eraser className="w-5 h-5" />}
                {isProcessing ? 'Redacting PDF...' : 'Redact PDF'}
              </button>
              
              <button
                onClick={handleNewFile}
                disabled={isProcessing}
                className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium transition-colors text-sm"
              >
                Choose a different file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success State Overlay/Modal inline */}
      {successData && (
        <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-xl max-w-4xl mx-auto text-center animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 mb-4">Redaction Complete</h3>
          <p className="text-gray-500 mb-10 text-lg">
            {isSecureMode 
              ? 'Your PDF has been securely flattened and text permanently destroyed.' 
              : 'Black boxes have been applied to your PDF visually.'}
          </p>
          
          <button
            onClick={handleDownload}
            className="mx-auto flex items-center gap-3 px-10 py-5 bg-gray-900 text-white rounded-2xl font-bold text-xl hover:bg-gray-800 transition-all shadow-xl hover:shadow-gray-300 hover:-translate-y-1 mb-12"
          >
            <Download className="w-6 h-6" />
            Download Redacted PDF
          </button>

          <div className="border-t border-gray-100 pt-10">
            <div className="mt-8 flex items-center justify-center gap-4">
              <button onClick={handleNewFile} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Start over with a new file
              </button>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <button className="flex items-center gap-2 text-gray-900 hover:text-black font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
                <Share2 className="w-4 h-4" /> Share Tool
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12">
        <AdSlot />
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Crop, FileText, RefreshCw, CheckCircle, Download, Maximize2, Minimize, ListOrdered, Share2, ArrowLeft, Scissors, Layers } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import DragDropZone from '../components/ui/DragDropZone';
import AdSlot from '../components/ui/AdSlot';
import { getPdfThumbnails } from '../lib/pdfRenderer';

export default function CropPdf() {
  const [file, setFile] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [previewImage, setPreviewImage] = useState(null);
  
  // Crop state in percentages to be responsive to image scaling
  const [crop, setCrop] = useState({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80
  });

  const [pageScope, setPageScope] = useState('all'); // 'all' or 'first'
  const [successData, setSuccessData] = useState(null); // { pdfBytes, fileName }

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setIsLoadingPreview(true);
    setSuccessData(null);
    setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });

    try {
      // Get a high quality thumbnail for the first page to use in cropper
      const thumbnails = await getPdfThumbnails(selectedFile, 1.5);
      if (thumbnails.length > 0) {
        setPreviewImage(thumbnails[0].dataUrl);
      }
    } catch (error) {
      console.error("Error loading PDF preview:", error);
      alert("Could not render PDF preview. It might be corrupted or encrypted.");
      setFile(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleProcess = async () => {
    if (!file || !crop.width || !crop.height) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Convert crop percentage to actual PDF points
      // Note: ReactCrop origin is Top-Left, PDF origin is Bottom-Left
      const cx_pct = crop.x / 100;
      const cy_pct = crop.y / 100;
      const cw_pct = crop.width / 100;
      const ch_pct = crop.height / 100;

      pages.forEach((page, index) => {
        if (pageScope === 'first' && index !== 0) return; // Only crop first page if selected

        const { width, height } = page.getSize();
        
        const cropX_pdf = cx_pct * width;
        const cropWidth_pdf = cw_pct * width;
        const cropHeight_pdf = ch_pct * height;
        const cropY_pdf = height - ((cy_pct + ch_pct) * height);

        if (cropWidth_pdf > 0 && cropHeight_pdf > 0) {
          page.setCropBox(cropX_pdf, cropY_pdf, cropWidth_pdf, cropHeight_pdf);
        }
      });

      const newPdfBytes = await pdfDoc.save();
      setSuccessData({
        pdfBytes: newPdfBytes,
        fileName: `cropped_${file.name}`
      });
    } catch (error) {
      console.error('Error cropping PDF:', error);
      alert('Failed to crop the PDF. It might be encrypted or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAll = () => {
    setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
  };

  const handleNewFile = () => {
    setFile(null);
    setPreviewImage(null);
    setSuccessData(null);
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Crop PDF</h2>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Visually select an area to trim margins and remove white space from your PDF document.
        </p>
      </div>

      {!file && (
        <DragDropZone 
          accept="application/pdf"
          onFileSelect={handleFileSelect}
          label="Select a PDF to crop"
          icon={Crop}
          className="p-16 py-24 border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 transition-colors"
        />
      )}

      {file && isLoadingPreview && (
        <div className="flex flex-col items-center justify-center p-24 bg-white rounded-2xl shadow-sm border border-gray-100">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600 font-medium text-lg">Loading visual preview...</p>
        </div>
      )}

      {file && previewImage && !successData && (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Interactive Preview Canvas */}
          <div className="w-full lg:w-2/3 bg-gray-100 rounded-3xl p-6 shadow-inner flex flex-col items-center justify-center overflow-hidden border border-gray-200">
            <p className="text-sm text-gray-500 mb-4 font-medium self-start flex items-center gap-2">
              <Maximize2 className="w-4 h-4" /> Click and drag to adjust the crop area
            </p>
            <div className="relative shadow-md bg-white">
              <ReactCrop 
                crop={crop} 
                onChange={(c, percentCrop) => setCrop(percentCrop)}
                className="max-h-[65vh] w-auto max-w-full"
                ruleOfThirds
              >
                <img 
                  src={previewImage} 
                  alt="PDF Preview" 
                  className="max-h-[65vh] w-auto object-contain pointer-events-none"
                />
              </ReactCrop>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col h-full sticky top-8">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-lg font-bold text-gray-900 truncate" title={file.name}>{file.name}</h3>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" /> Apply Crop To
                </h4>
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition-all ${pageScope === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                    <input 
                      type="radio" 
                      name="pageScope" 
                      value="all" 
                      checked={pageScope === 'all'} 
                      onChange={() => setPageScope('all')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900">All pages (Recommended)</span>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition-all ${pageScope === 'first' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                    <input 
                      type="radio" 
                      name="pageScope" 
                      value="first" 
                      checked={pageScope === 'first'} 
                      onChange={() => setPageScope('first')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900">First page only</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleResetAll}
                className="w-full py-3 px-4 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Reset Selection
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
              <button
                onClick={handleProcess}
                disabled={isProcessing || crop.width === 0 || crop.height === 0}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-extrabold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 hover:shadow-blue-200"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Crop className="w-5 h-5" />}
                {isProcessing ? 'Processing...' : 'Crop PDF Now'}
              </button>
              
              <button
                onClick={handleNewFile}
                disabled={isProcessing}
                className="w-full py-3 text-gray-500 hover:text-gray-900 font-medium transition-colors"
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
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 mb-4">Your PDF has been cropped successfully!</h3>
          <p className="text-gray-500 mb-10 text-lg">The margins have been permanently removed.</p>
          
          <button
            onClick={handleDownload}
            className="mx-auto flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-200 hover:-translate-y-1 mb-12"
          >
            <Download className="w-6 h-6" />
            Download Cropped PDF
          </button>

          <div className="border-t border-gray-100 pt-10">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Continue working on this PDF</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a href="#compress-pdf" onClick={() => window.scrollTo(0,0)} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group">
                <Minimize className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-medium text-gray-700">Compress</span>
              </a>
              <a href="#pdf-split" onClick={() => window.scrollTo(0,0)} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group">
                <Scissors className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-medium text-gray-700">Split PDF</span>
              </a>
              <a href="#number-pages" onClick={() => window.scrollTo(0,0)} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group">
                <ListOrdered className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-medium text-gray-700">Add Numbers</span>
              </a>
              <a href="#rotate-pdf" onClick={() => window.scrollTo(0,0)} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 flex flex-col items-center gap-2 group">
                <RefreshCw className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-sm font-medium text-gray-700">Rotate</span>
              </a>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-center gap-4">
            <button onClick={handleNewFile} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Start over with a new file
            </button>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors">
              <Share2 className="w-4 h-4" /> Share Tool
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

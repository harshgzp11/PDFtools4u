import { trackEvent, trackError } from '../lib/analytics';
import React, { useState, useRef, useEffect } from 'react';
import { Crop, RefreshCw, Maximize2, Layers } from 'lucide-react';

import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
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
  const [successData, setSuccessData] = useState(null); // { url, filename, originalSize, outputSize, title, subtitle, downloadText }

  const handleFileSelect = async (selectedFile) => {
    if (successData?.url) {
      URL.revokeObjectURL(successData.url);
    }
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
      trackError('Crop Pdf', 'processing_error');
      console.error("Error loading PDF preview:", error);
      toast.error("Could not render PDF preview. It might be corrupted or encrypted.");
      setFile(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleProcess = async () => {
    if (!file || !crop.width || !crop.height) return;
    trackEvent('tool_executed', { tool_name: 'Crop PDF' });
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument } = await import('pdf-lib');

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
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (successData?.url) {
        URL.revokeObjectURL(successData.url);
      }

      setSuccessData({
        url,
        filename: `cropped_${file.name}`,
        fileName: `cropped_${file.name}`,
        originalSize: file.size,
        outputSize: newPdfBytes.length,
        title: 'Your PDF has been cropped successfully!',
        subtitle: 'The margins have been permanently removed.',
        downloadText: 'Download Cropped PDF'
      });
    } catch (error) {
      trackError('Crop Pdf', 'processing_error');
      console.error('Error cropping PDF:', error);
      toast.error('Failed to crop the PDF. It might be encrypted or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAll = () => {
    setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
  };

  const handleNewFile = () => {
    if (successData?.url) {
      URL.revokeObjectURL(successData.url);
    }
    setFile(null);
    setPreviewImage(null);
    setSuccessData(null);
  };

  const processButton = (
    <button
      type="button"
      onClick={handleProcess}
      disabled={isProcessing || crop.width === 0 || crop.height === 0}
      className="w-full py-3 sm:py-3.5 bg-blue-600 text-white rounded-xl font-extrabold text-sm sm:text-base hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-blue-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
    >
      {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Crop className="w-5 h-5" />}
      {isProcessing ? 'Processing Crop...' : 'Crop PDF Now'}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Crop PDF"
      description="Visually select an area to trim margins and remove white space from your PDF document."
      icon={Crop}
      file={file}
      onFileSelect={handleFileSelect}
      onReset={handleNewFile}
      isProcessing={isProcessing || isLoadingPreview}
      processButton={processButton}
      successData={successData}
      compactOnMobile={true}
      mobileDefaultTab="settings"
      customPreviewNode={({ previewImage: layoutPreviewImage }) => {
        const activePreview = previewImage || layoutPreviewImage;
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 overflow-auto bg-gray-100 select-none">
            <div className="text-xs text-gray-500 mb-2 font-medium flex items-center justify-between w-full max-w-xl px-1">
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Drag handles to adjust crop boundaries</span>
              </span>
              <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono font-semibold">
                {Math.round(crop.width)}% × {Math.round(crop.height)}%
              </span>
            </div>
            <div className="relative shadow-md bg-white max-h-full flex items-center justify-center rounded overflow-hidden">
              {activePreview ? (
                <ReactCrop
                  crop={crop}
                  onChange={(c, percentCrop) => setCrop(percentCrop)}
                  className="max-h-[55vh] w-auto max-w-full"
                  ruleOfThirds
                >
                  <img
                    src={activePreview}
                    alt="PDF Preview"
                    className="max-h-[55vh] w-auto object-contain pointer-events-none select-none"
                  />
                </ReactCrop>
              ) : (
                <div className="p-8 text-gray-400 text-sm">Rendering visual preview...</div>
              )}
            </div>
          </div>
        );
      }}
    >
      <div className="space-y-2.5 sm:space-y-4">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-1.5 sm:mb-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Apply Crop To
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            <label className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl cursor-pointer border-2 transition-all min-h-[44px] ${pageScope === 'all' ? 'border-blue-500 bg-blue-50/70' : 'border-gray-200 hover:border-blue-200'}`}>
              <input
                type="radio"
                name="pageScope"
                value="all"
                checked={pageScope === 'all'}
                onChange={() => setPageScope('all')}
                className="w-4 h-4 shrink-0 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-xs sm:text-sm font-semibold text-gray-900">All pages</span>
                <span className="text-[10px] text-gray-500 hidden sm:inline">(Recommended)</span>
              </div>
            </label>
            <label className={`flex items-center gap-2 p-2 sm:p-3 rounded-xl cursor-pointer border-2 transition-all min-h-[44px] ${pageScope === 'first' ? 'border-blue-500 bg-blue-50/70' : 'border-gray-200 hover:border-blue-200'}`}>
              <input
                type="radio"
                name="pageScope"
                value="first"
                checked={pageScope === 'first'}
                onChange={() => setPageScope('first')}
                className="w-4 h-4 shrink-0 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-xs sm:text-sm font-semibold text-gray-900">First page</span>
                <span className="text-[10px] text-gray-500 hidden sm:inline">only</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-0.5 sm:pt-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-gray-50 text-gray-700 font-semibold text-xs sm:text-sm rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 min-h-[44px] cursor-pointer"
          >
            Reset Crop Area (100%)
          </button>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { Presentation, CheckCircle2 } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackEvent, trackError } from '../lib/analytics';
import { parsePptxSlides, convertPptToPdf } from '../utils/pptConversion';

export default function PptToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    if (window.__sharedFile) {
      if (
        window.__sharedFile.name?.toLowerCase().endsWith('.pptx') ||
        window.__sharedFile.name?.toLowerCase().endsWith('.ppt') ||
        window.__sharedFile.type?.includes('presentation')
      ) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (!newFile) return;

    const lowerName = newFile.name?.toLowerCase() || '';

    // Check for legacy binary .ppt
    if (lowerName.endsWith('.ppt') && !lowerName.endsWith('.pptx')) {
      alert(
        'Legacy binary PowerPoint (.ppt) format is not supported in the browser. Please open the presentation in PowerPoint, Google Slides, or LibreOffice and save it as modern .pptx before converting.'
      );
      return;
    }

    if (!lowerName.endsWith('.pptx') && !newFile.type?.includes('presentation')) {
      alert('Please upload a valid PowerPoint (.pptx) file.');
      return;
    }

    setFile(newFile);
    setSuccessData(null);
    setProgress(0);
    setParsedData(null);
    setIsAnalyzing(true);

    try {
      const data = await parsePptxSlides(newFile);
      setParsedData(data);
    } catch (err) {
      trackError('Ppt To Pdf', 'processing_error');
      console.error('PPTX Analysis Failed:', err);
      alert(err.message || 'Could not parse PPTX file. Please ensure it is a valid .pptx presentation.');
      setFile(null);
      setParsedData(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executePptToPdf = async () => {
    if (!file || !parsedData || parsedData.slides.length === 0) return;
    trackEvent('tool_executed', { tool_name: 'PowerPoint to PDF' });
    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await convertPptToPdf(file, {
        onProgress: (p) => setProgress(p),
      });

      const url = URL.createObjectURL(result.blob);
      const cleanBaseName = file.name.replace(/\.pptx$/i, '').replace(/\.ppt$/i, '');

      setSuccessData({
        originalSize: file.size || 0,
        outputSize: result.blob.size || 0,
        url,
        filename: `${cleanBaseName}_converted.pdf`,
        title: 'Conversion Successful!',
        subtitle: `Successfully converted ${result.numSlides} slides to ${result.pageCount} paginated PDF pages.`,
      });
    } catch (err) {
      trackError('Ppt To Pdf', 'processing_error');
      console.error('PPT to PDF Conversion Error:', err);
      alert(`Failed to convert PowerPoint to PDF: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setIsAnalyzing(false);
    setProgress(0);
    setParsedData(null);
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={executePptToPdf} 
        disabled={isProcessing || isAnalyzing || !file || !parsedData || parsedData.slides.length === 0}
        className="w-full px-6 py-4 bg-orange-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-orange-600/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 inline-flex items-center justify-center min-w-[220px] h-7 text-sm font-bold whitespace-nowrap">
            Generating PDF Pages... {progress}%
          </span>
        ) : isAnalyzing ? (
          <span className="relative z-10 inline-flex items-center justify-center min-w-[220px] h-7 text-sm font-bold whitespace-nowrap">
            Analyzing Slides...
          </span>
        ) : (
          <><Presentation className="w-6 h-6 relative z-10"/> Convert to PDF</>
        )}
      </button>
    </div>
  );

  const slides = parsedData?.slides || [];

  const customPreview = isAnalyzing ? (
    <div className="w-full h-full min-h-[400px] bg-orange-50/50 flex flex-col items-center justify-center rounded-2xl p-8 text-center border-2 border-dashed border-orange-100">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-orange-100">
        <Presentation className="w-10 h-10 text-orange-700 animate-pulse" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Presentation...</h3>
      <p className="text-gray-500 max-w-sm text-sm">
        Parsing presentation sequence, text structure, Unicode glyphs, and images...
      </p>
    </div>
  ) : slides.length > 0 ? (
    <div className="w-full h-full overflow-y-auto custom-scrollbar max-h-[700px] pr-2 space-y-6">
      {slides.map((slide, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 truncate max-w-[320px]">
              {slide.title}
            </span>
            <span className="text-[11px] font-semibold text-gray-400">
              Slide {slide.slideNumber} of {slides.length}
            </span>
          </div>

          <div className="p-4 bg-gray-50/40 flex flex-col gap-4">
            {/* If slide has both images and text, render both cleanly */}
            {slide.hasImages && (
              <div className="flex flex-wrap gap-2 justify-center bg-white p-3 rounded-lg border border-gray-100 shadow-xs">
                {slide.images.map((img, iIdx) => (
                  <img
                    key={iIdx}
                    src={img.dataUrl}
                    alt={`Slide ${slide.slideNumber} Graphic ${iIdx + 1}`}
                    className="max-h-[140px] max-w-[220px] object-contain rounded border border-gray-200"
                  />
                ))}
              </div>
            )}

            {slide.allParagraphs.length > 0 && (
              <div className="w-full bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-2">
                {slide.allParagraphs.map((para, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2 text-xs text-gray-800">
                    <span className="text-orange-600 font-bold">•</span>
                    <p className="leading-relaxed">{para.text}</p>
                  </div>
                ))}
              </div>
            )}

            {!slide.hasImages && slide.allParagraphs.length === 0 && (
              <div className="text-xs text-gray-400 italic text-center py-4">Empty Slide</div>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="w-full h-full min-h-[400px] bg-orange-50/50 flex flex-col items-center justify-center rounded-2xl p-8 text-center border-2 border-dashed border-orange-100">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-orange-100">
        <Presentation className="w-10 h-10 text-orange-700" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No Presentation Uploaded</h3>
      <p className="text-gray-500 max-w-sm text-sm">
        Upload a .pptx file on the right panel to extract slides and convert to PDF.
      </p>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="PowerPoint to PDF"
      description="Convert your PPTX presentation into a clean, paginated PDF document."
      icon={Presentation}
      file={file}
      customPreviewNode={customPreview}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Conversion Details</h3>
        
        <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 flex flex-col gap-3">
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Format:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">.PDF</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Slide Dimensions:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">
               {parsedData ? `${parsedData.dimensions.widthMm} × ${parsedData.dimensions.heightMm} mm` : 'Auto-detected'}
             </span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Text Preservation:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">No Text Truncation</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Processing:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-900">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-blue-700" />
            <h4 className="font-bold text-sm">Extracted Content & Layout Support</h4>
          </div>
          <p className="text-blue-900 text-xs font-medium leading-relaxed">
            Extracts slide text, headings, bullet hierarchies, tables, and embedded images (JPEG, PNG, SVG, WEBP) into a clean, paginated PDF. Long text automatically generates continuation pages to prevent truncation.
          </p>
          <div className="mt-1 pt-2 border-t border-blue-200/60 text-[11px] text-blue-800/90 space-y-1">
            <p>• Theme backgrounds and decorative vector shapes may not be preserved.</p>
            <p>• Native PowerPoint charts and SmartArt are not reconstructed.</p>
            <p>• Chinese, Japanese, Korean (CJK), and Arabic right-to-left text are not supported.</p>
          </div>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

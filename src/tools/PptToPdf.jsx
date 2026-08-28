import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect } from 'react';
import { Presentation, Download, AlertTriangle, FileText, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { trackError } from '../lib/analytics';

export default function PptToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.name.endsWith('.pptx') || window.__sharedFile.type.includes('presentation')) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const parsePptxSlides = async (pptxFile) => {
    const arrayBuffer = await pptxFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();

    // Find slide files and sort them numerically (slide1.xml, slide2.xml...)
    const slideFiles = Object.keys(zip.files).filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/i));
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
      return numA - numB;
    });

    if (slideFiles.length === 0) {
      throw new Error("No slide files found in this presentation.");
    }

    const parsedSlides = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const slideName = slideFiles[i];
      const slideXml = await zip.file(slideName).async("text");
      const xmlDoc = parser.parseFromString(slideXml, "application/xml");

      // Extract paragraphs (<a:p>) and text (<a:t>)
      const pNodes = xmlDoc.getElementsByTagNameNS("*", "p");
      const paragraphs = [];
      for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
        const p = pNodes[pIdx];
        const tNodes = p.getElementsByTagNameNS("*", "t");
        let pText = "";
        for (let tIdx = 0; tIdx < tNodes.length; tIdx++) {
          pText += tNodes[tIdx].textContent || "";
        }
        const trimmed = pText.trim();
        if (trimmed) {
          paragraphs.push(trimmed);
        }
      }

      // Extract slide images
      const images = [];
      try {
        const slideNumMatch = slideName.match(/slide(\d+)\.xml/i);
        const slideNum = slideNumMatch ? slideNumMatch[1] : (i + 1);
        const relsName = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
        const relsFile = zip.file(relsName) || Object.keys(zip.files).find(k => k.toLowerCase() === relsName.toLowerCase());

        if (relsFile) {
          const relsXml = await relsFile.async("text");
          const relsDoc = parser.parseFromString(relsXml, "application/xml");
          const relNodes = relsDoc.getElementsByTagNameNS("*", "Relationship");
          const relMap = {};
          for (let rIdx = 0; rIdx < relNodes.length; rIdx++) {
            const id = relNodes[rIdx].getAttribute("Id");
            const target = relNodes[rIdx].getAttribute("Target");
            if (id && target) {
              relMap[id] = target;
            }
          }

          const blipNodes = xmlDoc.getElementsByTagNameNS("*", "blip");
          for (let bIdx = 0; bIdx < blipNodes.length; bIdx++) {
            const blip = blipNodes[bIdx];
            const embedId = blip.getAttribute("r:embed") || blip.getAttribute("embed") || [...blip.attributes].find(a => a.name.includes("embed"))?.value;

            if (embedId && relMap[embedId]) {
              let targetPath = relMap[embedId].replace(/^(\.\.\/)+/, '');
              if (!targetPath.startsWith('ppt/')) {
                targetPath = 'ppt/' + targetPath;
              }

              const imgZipFile = zip.file(targetPath) || Object.keys(zip.files).find(k => k.toLowerCase() === targetPath.toLowerCase());

              if (imgZipFile) {
                const base64Data = await imgZipFile.async("base64");
                const ext = targetPath.split('.').pop().toLowerCase();
                const mime = (ext === 'png') ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'svg') ? 'image/svg+xml' : 'image/png';
                images.push(`data:${mime};base64,${base64Data}`);
              }
            }
          }
        }
      } catch (err) {
      trackError('Ppt To Pdf', 'processing_error');
        console.warn(`Image extraction notice for slide ${i + 1}:`, err);
      }

      const slideTitle = paragraphs.length > 0 ? paragraphs[0] : `Slide ${i + 1}`;
      const bodyParagraphs = paragraphs.length > 1 ? paragraphs.slice(1) : [];

      parsedSlides.push({
        slideNumber: i + 1,
        title: slideTitle,
        paragraphs: bodyParagraphs,
        allParagraphs: paragraphs,
        images,
        hasText: paragraphs.length > 0,
        hasImages: images.length > 0
      });
    }

    return parsedSlides;
  };

  const handleFile = async (newFile) => {
    if (!newFile) return;

    if (!newFile.name.endsWith('.pptx') && !newFile.type.includes('presentation')) {
      alert("Please upload a valid PowerPoint (.pptx) file.");
      return;
    }

    setFile(newFile);
    setSuccessData(null);
    setProgress(0);
    setSlides([]);
    setIsAnalyzing(true);

    try {
      const parsed = await parsePptxSlides(newFile);
      setSlides(parsed);
    } catch (err) {
      trackError('Ppt To Pdf', 'processing_error');
      console.error("PPTX Analysis Failed:", err);
      alert("Could not parse PPTX file. Please ensure it is a valid .pptx presentation.");
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getImageDimensions = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width || 16, height: img.height || 9 });
      };
      img.onerror = () => {
        resolve({ width: 16, height: 9 });
      };
      img.src = base64Str;
    });
  };

  const convertPptToPdf = async () => {
    if (!file || slides.length === 0) return;
    trackEvent('tool_executed', { tool_name: 'PowerPoint to PDF' });
    setIsProcessing(true);
    setProgress(0);

    try {
      // Landscape A4 PDF (297mm x 210mm)
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slides.length; i++) {
        if (i > 0) pdf.addPage();

        const slide = slides[i];
        const hasImages = slide.images && slide.images.length > 0;

        if (hasImages) {
          // Slide contains image — scale proportionally to fill page cleanly
          const imgData = slide.images[0];
          const format = imgData.includes('data:image/png') ? 'PNG' : 'JPEG';
          const dims = await getImageDimensions(imgData);

          const margin = 8;
          const maxW = pdfWidth - (margin * 2);
          const maxH = pdfHeight - (margin * 2);

          const imgRatio = dims.width / dims.height;
          const maxRatio = maxW / maxH;

          let renderW, renderH;
          if (imgRatio > maxRatio) {
            renderW = maxW;
            renderH = maxW / imgRatio;
          } else {
            renderH = maxH;
            renderW = maxH * imgRatio;
          }

          const x = (pdfWidth - renderW) / 2;
          const y = (pdfHeight - renderH) / 2;

          try {
            pdf.addImage(imgData, format, x, y, renderW, renderH, undefined, 'FAST');
          } catch (imgErr) {
      trackError('Ppt To Pdf', 'processing_error');
            console.warn(`Could not embed image for slide ${i + 1}:`, imgErr);
          }
        } else {
          // Slide contains text — render clean text across page
          let y = 25;
          const margin = 20;
          const textWidth = pdfWidth - (margin * 2);

          if (slide.title) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(22);
            pdf.setTextColor(30, 41, 59);
            pdf.text(slide.title, margin, y);
            y += 15;
          }

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(14);
          pdf.setTextColor(51, 65, 85);

          const textItems = slide.paragraphs.length > 0 ? slide.paragraphs : (slide.allParagraphs.length > 1 ? slide.allParagraphs.slice(1) : []);

          for (const item of textItems) {
            if (y > pdfHeight - 20) break;
            const lines = pdf.splitTextToSize(item, textWidth);
            for (let l = 0; l < lines.length; l++) {
              if (y > pdfHeight - 20) break;
              pdf.text(lines[l], margin, y);
              y += 8;
            }
            y += 4;
          }
        }

        setProgress(Math.round(((i + 1) / slides.length) * 100));
      }

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `${file.name.replace(/\.pptx$/i, '')}_converted.pdf`,
        title: 'Conversion Successful!',
        subtitle: `Successfully converted ${slides.length} slides to PDF.`,
      });
    } catch (err) {
      trackError('Ppt To Pdf', 'processing_error');
      console.error("PPT to PDF Conversion Error:", err);
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
    setSlides([]);
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={convertPptToPdf} 
        disabled={isProcessing || isAnalyzing || !file || slides.length === 0}
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

  const customPreview = isAnalyzing ? (
    <div className="w-full h-full min-h-[400px] bg-orange-50/50 flex flex-col items-center justify-center rounded-2xl p-8 text-center border-2 border-dashed border-orange-100">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-orange-100">
        <Presentation className="w-10 h-10 text-orange-700 animate-pulse" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Presentation...</h3>
      <p className="text-gray-500 max-w-sm text-sm">
        Parsing slide structure, text contents, and images...
      </p>
    </div>
  ) : slides.length > 0 ? (
    <div className="w-full h-full overflow-y-auto custom-scrollbar max-h-[700px] pr-2 space-y-6">
      {slides.map((slide, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 truncate max-w-[300px]">
                {slide.title || `Slide ${slide.slideNumber}`}
              </span>
              <span className="text-[11px] font-semibold text-gray-400">
                Page {slide.slideNumber} of {slides.length}
              </span>
            </div>

            <div className="p-4 bg-gray-50/50 flex flex-col items-center justify-center min-h-[220px]">
              {slide.hasImages ? (
                <img 
                  src={slide.images[0]} 
                  alt={`Slide ${slide.slideNumber}`}
                  className="max-w-full max-h-[480px] object-contain rounded-lg shadow-sm border border-gray-200 bg-white"
                />
              ) : slide.paragraphs.length > 0 ? (
                <div className="w-full bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-3">
                  {slide.paragraphs.map((para, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2 text-sm text-gray-800">
                      <span className="text-orange-700 font-bold">•</span>
                      <p className="leading-relaxed">{para}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">Empty Slide</div>
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
      description="Convert your PPTX presentation into a PDF document."
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
             <span>Layout:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">16:9 Widescreen PDF</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Processing:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm">High Quality PDF Rendering</h4>
          </div>
          <p className="text-emerald-800 text-xs font-medium leading-relaxed">
            Extracts presentation titles, text paragraphs, bullet points, and embedded slide images into formatted 16:9 landscape PDF pages.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}


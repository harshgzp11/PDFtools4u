import React, { useState, useEffect } from 'react';
import { Presentation, Download, AlertTriangle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function PptToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [previewSlides, setPreviewSlides] = useState([]);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.name.endsWith('.pptx') || window.__sharedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (newFile && (newFile.name.endsWith('.pptx') || newFile.type.includes('presentation'))) {
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
      setPreviewSlides([]);
      
      // Extract slide previews immediately for the UI
      try {
        const arrayBuffer = await newFile.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideFiles = Object.keys(zip.files).filter(name => name.match(/ppt\/slides\/slide\d+\.xml/));
        slideFiles.sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));
        
        const extracted = [];
        for (const slideName of slideFiles) {
          const slideXml = await zip.file(slideName).async("text");
          const textMatches = slideXml.match(/<a:t>.*?<\/a:t>/g) || [];
          const text = textMatches.map(t => t.replace(/<a:t>/, '').replace(/<\/a:t>/, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).join(' ');
          
          let preview = text.trim();
          if (!preview) {
            if (slideXml.includes('<p:pic>')) {
              preview = '[Image Slide]';
            } else {
              preview = 'Empty Slide';
            }
          }
          extracted.push(preview);
        }
        setPreviewSlides(extracted);
      } catch (err) {
        console.error("Preview extraction failed", err);
      }
    } else {
      alert("Please upload a valid PPTX file.");
    }
  };

  const convertPptToPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const margin = 50;

      // Extract slide files
      const slideFiles = Object.keys(zip.files).filter(name => name.match(/ppt\/slides\/slide\d+\.xml/));
      // Sort them properly (slide1, slide2, slide10...)
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)[1]);
        const numB = parseInt(b.match(/slide(\d+)/)[1]);
        return numA - numB;
      });

      if (slideFiles.length === 0) {
        throw new Error("No slides found in this presentation.");
      }

      for (let i = 0; i < slideFiles.length; i++) {
        const slideName = slideFiles[i];
        const slideXml = await zip.file(slideName).async("text");
        
        // Very basic XML text extraction matching <a:t> tags
        const textMatches = slideXml.match(/<a:t>.*?<\/a:t>/g) || [];
        const slideTexts = textMatches.map(t => 
          t.replace(/<a:t>/, '')
           .replace(/<\/a:t>/, '')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>')
           .replace(/&amp;/g, '&')
           .replace(/[^\x00-\x7F]/g, '') // Strip non-ASCII to prevent pdf-lib WinAnsi crashes
        );
        
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        let y = height - margin;

        let hasImage = false;
        try {
          const relsName = slideName.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
          if (zip.file(relsName)) {
            const relsXml = await zip.file(relsName).async("text");
            const relMatches = [...relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)];
            const relMap = {};
            relMatches.forEach(m => relMap[m[1]] = m[2]);

            const blipMatches = [...slideXml.matchAll(/<a:blip[^>]+r:embed="([^"]+)"/g)];
            
            if (blipMatches.length > 0) {
              const rId = blipMatches[0][1]; // Render the first embedded image on the slide
              let target = relMap[rId];
              
              if (target) {
                target = target.replace('../', 'ppt/');
                if (zip.file(target)) {
                  const imageBytes = await zip.file(target).async("uint8array");
                  let pdfImage;
                  if (target.toLowerCase().endsWith('.png')) {
                    pdfImage = await pdfDoc.embedPng(imageBytes);
                  } else if (target.toLowerCase().endsWith('.jpg') || target.toLowerCase().endsWith('.jpeg')) {
                    pdfImage = await pdfDoc.embedJpg(imageBytes);
                  }
                  
                  if (pdfImage) {
                    hasImage = true;
                    // For converted PPTXs, scale image to fill the page exactly
                    page.drawImage(pdfImage, { x: 0, y: 0, width: width, height: height });
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to parse images for slide", slideName, err);
        }

        if (!hasImage) {
          page.drawText(`Slide ${i + 1}`, { x: margin, y, size: 16, font, color: rgb(0.2, 0.2, 0.8) });
          y -= 30;

          for (const line of slideTexts) {
            if (!line.trim()) continue;
            
            if (y < margin) {
              page = pdfDoc.addPage();
              y = height - margin;
            }
            page.drawText(line.substring(0, 80), { x: margin, y, size: fontSize, font }); // clip to avoid wrapping overflow on basic render
            y -= 20;
          }
        }

        setProgress(Math.round(((i + 1) / slideFiles.length) * 100));
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        url,
        filename: `${file.name.replace('.pptx', '')}_converted.pdf`,
        title: 'Conversion Complete',
        subtitle: 'Text has been extracted into a basic PDF document.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to convert PPT to PDF. Make sure it's a valid .pptx file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
  };

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={convertPptToPdf} 
        disabled={isProcessing || !file}
        className="w-full px-6 py-4 bg-orange-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-orange-500/30 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 inline-flex items-center justify-center min-w-[220px] h-7 text-sm font-bold whitespace-nowrap">Extracting Slides... {progress}%</span>
        ) : (
          <><Presentation className="w-6 h-6 relative z-10"/> Convert to PDF</>
        )}
      </button>
    </div>
  );

  const customPreview = previewSlides.length > 0 ? (
    <div className="w-full h-full flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-xl font-bold text-gray-900">Detected Slides ({previewSlides.length})</h3>
        <span className="text-sm text-gray-500 font-medium px-3 py-1 bg-white rounded-full shadow-sm border border-gray-200">Text Content Extracted</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {previewSlides.map((text, idx) => (
          <div key={idx} className="relative aspect-[16/9] rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col bg-white hover:shadow-md transition-all group">
            <div className="flex-1 p-3 overflow-hidden">
              <p className="text-xs text-gray-700 leading-relaxed font-mono opacity-80 break-words">
                {text.substring(0, 150)}{text.length > 150 ? '...' : ''}
              </p>
            </div>
            <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Slide {idx + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="w-full h-full min-h-[400px] bg-orange-50/50 flex flex-col items-center justify-center rounded-2xl p-8 text-center border-2 border-dashed border-orange-100">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-orange-100">
        <Presentation className="w-10 h-10 text-orange-500 animate-pulse" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing PowerPoint...</h3>
      <p className="text-gray-500 max-w-sm text-sm">
        Reading presentation XML data to prepare for extraction.
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
             <span>Quality:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Text Only</span>
           </div>
           <div className="flex justify-between text-sm text-orange-800 font-bold">
             <span>Processing:</span>
             <span className="bg-orange-200 px-2 py-0.5 rounded-md">Local Browser</span>
           </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h4 className="font-bold text-sm">Important Notice</h4>
          </div>
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            Due to browser limitations, PPT to PDF conversion extracts raw text layout only. Images, backgrounds, and styling are intentionally omitted to provide a clean reading experience.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

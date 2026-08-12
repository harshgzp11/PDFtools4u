import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftRight, FileText, Image as ImageIcon, FileCode2, ChevronDown, ChevronUp, ChevronRight, ScanText, FileSpreadsheet, Presentation, Code } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';


import { trackError } from '../lib/analytics';



export default function PdfConverterHub() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(''); // 'pdf', 'image', 'docx', 'other'
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(true); // Open by default when file is uploaded
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const handleFile = async (newFile) => {
    if (!newFile) return;
    setFile(newFile);
    setThumbnailUrl(null);
    setIsMenuOpen(true);
    
    const ext = (newFile.name || '').split('.').pop().toLowerCase();
    const type = newFile.type || '';

    // Determine type
    if (type === 'application/pdf' || ext === 'pdf') {
      setFileType('pdf');
      generatePdfThumbnail(newFile);
    } else if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
      setFileType('image');
      setThumbnailUrl(URL.createObjectURL(newFile));
    } else if (['docx', 'doc'].includes(ext) || type.includes('word')) {
      setFileType('word');
    } else if (['xlsx', 'xls', 'csv'].includes(ext) || type.includes('sheet') || type.includes('excel')) {
      setFileType('excel');
    } else if (['pptx', 'ppt'].includes(ext) || type.includes('presentation') || type.includes('powerpoint')) {
      setFileType('ppt');
    } else if (['txt', 'text', 'log', 'md'].includes(ext) || type.startsWith('text/')) {
      setFileType('txt');
    } else {
      setFileType('other');
    }
  };

  const generatePdfThumbnail = async (pdfFile) => {
    setIsGeneratingThumbnail(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
    
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.8));
    } catch (err) {
      trackError('Pdf Converter Hub', 'processing_error');
      console.error("Failed to generate PDF thumbnail", err);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleConversionSelect = (targetToolId) => {
    // Pass the file via global object for a seamless handoff to the next tool if supported
    window.__sharedFile = file;
    window.history.pushState({}, "", "/" + targetToolId);
    window.dispatchEvent(new Event('popstate'));
  };

  // State 1: Upload
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Upload any document or image. We'll give you all the conversion options.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="*/*"
            multiple={false}
            onFileSelect={handleFile}
            label="Select Document or Image"
            icon={ArrowLeftRight}
            className="p-20 py-32 bg-blue-50/50 hover:bg-blue-100 border-blue-300 hover:border-blue-400 mb-8"
          />
          
          <div className="flex flex-wrap items-center justify-center gap-2.5 bg-blue-50/40 p-4 rounded-2xl border border-blue-100 max-w-3xl mx-auto shadow-xs">
            <span className="text-gray-700 font-semibold text-base mr-1">Supported formats:</span>
            <span className="px-3.5 py-1 bg-red-100 text-red-700 font-bold rounded-full text-xs sm:text-sm">PDF</span>
            <span className="px-3.5 py-1 bg-blue-100 text-blue-700 font-bold rounded-full text-xs sm:text-sm">DOCX</span>
            <span className="px-3.5 py-1 bg-sky-100 text-sky-700 font-bold rounded-full text-xs sm:text-sm">DOC</span>
            <span className="px-3.5 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-full text-xs sm:text-sm">XLSX</span>
            <span className="px-3.5 py-1 bg-green-100 text-green-700 font-bold rounded-full text-xs sm:text-sm">XLS</span>
            <span className="px-3.5 py-1 bg-orange-100 text-orange-700 font-bold rounded-full text-xs sm:text-sm">PPTX</span>
            <span className="px-3.5 py-1 bg-amber-100 text-amber-700 font-bold rounded-full text-xs sm:text-sm">PPT</span>
            <span className="px-3.5 py-1 bg-yellow-100 text-yellow-800 font-bold rounded-full text-xs sm:text-sm">JPG</span>
            <span className="px-3.5 py-1 bg-lime-100 text-lime-800 font-bold rounded-full text-xs sm:text-sm">PNG</span>
            <span className="px-3.5 py-1 bg-purple-100 text-purple-700 font-bold rounded-full text-xs sm:text-sm">WEBP</span>
            <span className="px-3.5 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-xs sm:text-sm">TXT</span>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Preview and Convert Menu
  return (
    <div className="flex flex-col min-h-[80vh] max-w-4xl mx-auto animate-in fade-in duration-500 pb-32">
      
      {/* File Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 mb-12">
        <div className="relative shadow-2xl rounded-xl border border-gray-200 overflow-hidden bg-white group">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Document Preview" className="max-w-[400px] max-h-[500px] object-contain" />
          ) : isGeneratingThumbnail ? (
            <div className="w-[300px] h-[400px] flex items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="w-[300px] h-[400px] flex items-center justify-center bg-gray-50 text-gray-400">
              {['word', 'docx'].includes(fileType) ? <FileText className="w-32 h-32 text-blue-500" /> :
               ['excel'].includes(fileType) ? <FileSpreadsheet className="w-32 h-32 text-emerald-500" /> :
               ['ppt'].includes(fileType) ? <Presentation className="w-32 h-32 text-orange-500" /> :
               <FileText className="w-32 h-32" />}
            </div>
          )}
          
          {/* Overlay to remove/change file */}
          <div 
            onClick={() => { setFile(null); setThumbnailUrl(null); }}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm"
          >
            <span className="text-white font-bold text-lg px-6 py-3 border-2 border-white rounded-xl hover:bg-white hover:text-black transition-colors">
              Change File
            </span>
          </div>
        </div>
        
        <p className="mt-6 text-gray-500 font-medium text-lg">
          {file.name} ({formatBytes(file.size)})
        </p>
      </div>

      {/* Bottom Sheet Menu (Desktop/Mobile unified styling) */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-500 ease-in-out flex justify-center ${isMenuOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}`}>
        <div className="w-full max-w-3xl bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden">
          
          {/* Header / Toggle Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full p-6 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                <ArrowLeftRight className="w-8 h-8" />
              </div>
              <h3 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Convert to:</h3>
            </div>
            {isMenuOpen ? <ChevronDown className="w-8 h-8 text-gray-400" /> : <ChevronUp className="w-8 h-8 text-gray-400" />}
          </button>

          {/* Dynamic Options List */}
          <div className="px-8 pb-8 space-y-3 max-h-[50vh] overflow-y-auto">
            
            {/* Options for PDF */}
            {fileType === 'pdf' && (
              <>
                <ConversionOption 
                  icon={FileCode2} color="text-blue-500" bg="bg-blue-50"
                  title="Word" subtitle="(.docx)" 
                  onClick={() => handleConversionSelect('pdf-to-word')}
                />
                <ConversionOption 
                  icon={FileSpreadsheet} color="text-green-500" bg="bg-green-50"
                  title="Excel" subtitle="(.xlsx)" 
                  onClick={() => handleConversionSelect('pdf-to-excel')}
                />
                <ConversionOption 
                  icon={Presentation} color="text-orange-500" bg="bg-orange-50"
                  title="PowerPoint" subtitle="(.pptx)" 
                  onClick={() => handleConversionSelect('pdf-to-ppt')}
                />
                <ConversionOption 
                  icon={ImageIcon} color="text-yellow-500" bg="bg-yellow-50"
                  title="Image" subtitle="(.jpg / .png / .webp)" 
                  onClick={() => handleConversionSelect('pdf-to-jpg')}
                />
                <ConversionOption 
                  icon={FileText} color="text-indigo-500" bg="bg-indigo-50"
                  title="Raw Text" subtitle="(.txt)" 
                  onClick={() => handleConversionSelect('pdf-to-text')}
                />
                <ConversionOption 
                  icon={ScanText} color="text-red-500" bg="bg-red-50"
                  title="PDF OCR" subtitle="" 
                  onClick={() => handleConversionSelect('pdf-ocr')}
                />
              </>
            )}

            {/* Options for Image */}
            {fileType === 'image' && (
              <>
                <ConversionOption 
                  icon={FileText} color="text-red-500" bg="bg-red-50"
                  title="PDF Document" subtitle="(.pdf)" 
                  onClick={() => handleConversionSelect('jpg-to-pdf')}
                />
                <ConversionOption 
                  icon={ArrowLeftRight} color="text-orange-500" bg="bg-orange-50"
                  title="Other Image Formats" subtitle="(.png, .webp, .jpg)" 
                  onClick={() => handleConversionSelect('convert-image')}
                />
              </>
            )}

            {/* Options for Word (DOCX / DOC) */}
            {fileType === 'word' && (
              <>
                <ConversionOption 
                  icon={FileText} color="text-red-500" bg="bg-red-50"
                  title="PDF Document" subtitle="(.pdf)" 
                  onClick={() => handleConversionSelect('word-to-pdf')}
                />
                <ConversionOption 
                  icon={FileCode2} color="text-blue-500" bg="bg-blue-50"
                  title="Raw Text" subtitle="(.txt)" 
                  onClick={() => handleConversionSelect('docx-to-text')}
                />
                <ConversionOption 
                  icon={Code} color="text-green-500" bg="bg-green-50"
                  title="HTML Code" subtitle="(.html)" 
                  onClick={() => handleConversionSelect('docx-to-html')}
                />
              </>
            )}

            {/* Options for Excel (XLSX / XLS) */}
            {fileType === 'excel' && (
              <>
                <ConversionOption 
                  icon={FileText} color="text-red-500" bg="bg-red-50"
                  title="PDF Document" subtitle="(.pdf)" 
                  onClick={() => handleConversionSelect('excel-to-pdf')}
                />
                <ConversionOption 
                  icon={FileSpreadsheet} color="text-emerald-500" bg="bg-emerald-50"
                  title="CSV / JSON Data" subtitle="(.csv / .json)" 
                  onClick={() => handleConversionSelect('data-converter')}
                />
              </>
            )}

            {/* Options for PowerPoint (PPTX / PPT) */}
            {fileType === 'ppt' && (
              <>
                <ConversionOption 
                  icon={FileText} color="text-red-500" bg="bg-red-50"
                  title="PDF Document" subtitle="(.pdf)" 
                  onClick={() => handleConversionSelect('ppt-to-pdf')}
                />
              </>
            )}

            {/* Options for Text (TXT) */}
            {fileType === 'txt' && (
              <>
                <ConversionOption 
                  icon={FileText} color="text-red-500" bg="bg-red-50"
                  title="PDF Document" subtitle="(.pdf)" 
                  onClick={() => handleConversionSelect('txt-to-pdf')}
                />
                <ConversionOption 
                  icon={FileCode2} color="text-blue-500" bg="bg-blue-50"
                  title="Word Document" subtitle="(.docx)" 
                  onClick={() => handleConversionSelect('text-to-docx')}
                />
              </>
            )}
            
            {/* Options for Other */}
            {fileType === 'other' && (
              <div className="p-8 text-center text-gray-500">
                Sorry, we don't have conversion options for this file format yet.
              </div>
            )}

          </div>
        </div>
      </div>
      
      {/* Background Overlay when Menu is Open (Mobile focus effect) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/10 z-40 block lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}

function ConversionOption({ icon: Icon, color, bg, title, subtitle, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="group flex items-center justify-between p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bg} ${color}`}>
          <Icon className="w-6 h-6 stroke-[2]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</span>
          {subtitle && <span className="text-gray-500">{subtitle}</span>}
        </div>
      </div>
      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, PlusCircle, Trash2, FileText, CheckCircle, ArrowLeft, RefreshCw, Loader2, GripVertical } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfThumbnails } from '../lib/pdfRenderer';

export default function PdfMerger() {
  const [files, setFiles] = useState([]); // Array of { file, thumbDataUrl, id }
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  const handleFiles = async (selectedFiles) => {
    const newFilesArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    const validPdfs = newFilesArray.filter(f => f.type === 'application/pdf');
    
    if (validPdfs.length === 0) return;

    setExtractingThumbs(true);
    const newFileObjects = [];

    for (const file of validPdfs) {
      try {
        const thumbs = await getPdfThumbnails(file, 0.3); // low res for quick preview
        newFileObjects.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          thumbDataUrl: thumbs.length > 0 ? thumbs[0].dataUrl : null
        });
      } catch (err) {
        console.error("Could not generate thumbnail for", file.name, err);
        newFileObjects.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          thumbDataUrl: null
        });
      }
    }

    setFiles(prev => [...prev, ...newFileObjects]);
    setExtractingThumbs(false);
  };

  const removeFile = (id) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const resetTool = () => {
    setFiles([]);
    setSuccessData(null);
  };

  const mergePdfs = async () => {
    if (files.length < 2) return;
    setLoading(true);
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        url,
        filename: 'merged_document.pdf',
        title: 'PDFs Merged Successfully!',
        subtitle: `You combined ${files.length} documents into one.`,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to merge PDFs. One of the files might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!successData || !successData.url) return;
    const link = document.createElement('a');
    link.href = successData.url;
    link.download = successData.filename || 'download';
    document.body.appendChild(link);
    link.click();
  };

  // State 1: Upload Focus
  if (files.length === 0 && !extractingThumbs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Merge PDF</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Combine multiple PDF files into one document securely in your browser.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
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
        <p className="text-lg text-gray-600 mb-10">{successData.subtitle}</p>
        
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
      </div>
    );
  }

  // State 2: Workspace View
  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[70vh] gap-6 animate-in slide-in-from-right-8 duration-500 -mx-6 sm:-mx-8 lg:-mx-8">
      {/* Main Workspace Area (Left) */}
      <div className="flex-1 bg-gray-100 rounded-xl lg:rounded-l-none lg:rounded-r-2xl border-y border-r border-gray-200 p-8 relative shadow-inner overflow-y-auto">
        <button 
          onClick={resetTool} 
          className="absolute top-6 left-6 p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 border border-gray-200 z-10"
          title="Back to upload"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="mt-16 flex flex-wrap gap-6 justify-center">
          {files.map((item, index) => (
            <div key={item.id} className="relative group w-48 h-64 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:shadow-lg transition-shadow">
              {item.thumbDataUrl ? (
                <img src={item.thumbDataUrl} alt="Preview" className="w-full h-full object-cover p-2" />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <FileText className="w-16 h-16 mb-2" />
                  <span className="text-xs px-2 text-center break-all">{item.file.name}</span>
                </div>
              )}
              
              <div className="absolute top-2 left-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                {index + 1}
              </div>

              <button 
                onClick={() => removeFile(item.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 p-2 text-xs font-medium text-gray-700 truncate text-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {item.file.name}
              </div>
            </div>
          ))}

          {extractingThumbs && (
            <div className="w-48 h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-medium">Loading...</span>
            </div>
          )}
          
          <div className="w-48 h-64 bg-blue-50/50 hover:bg-blue-50 rounded-xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-500 hover:text-blue-600 transition-colors cursor-pointer relative">
             <DragDropZone 
              accept="application/pdf"
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
        <div className="p-6 lg:p-8 space-y-8 flex-1">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Merge PDF</h3>
            <p className="text-gray-500 text-sm">Combine your PDFs in the order they appear.</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-2">
             <div className="flex justify-between text-sm text-blue-800 font-bold">
               <span>Total files:</span>
               <span className="bg-blue-200 px-2 py-0.5 rounded-md">{files.length}</span>
             </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {files.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 truncate flex-1">{f.file.name}</span>
                <button onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={mergePdfs} 
            disabled={loading || files.length < 2}
            className="w-full px-6 py-5 bg-blue-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Merging...' : (
              <><PlusCircle className="w-6 h-6"/> Merge {files.length} PDFs</>
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

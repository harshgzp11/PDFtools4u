import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { Code, CheckCircle, Download, RefreshCw, Loader2, Copy, FileCode2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { trackError } from '../lib/analytics';

export default function DocxToHtml() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [extractedHtml, setExtractedHtml] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.name.endsWith('.docx') || window.__sharedFile.type.includes('wordprocessingml')) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (newFile && (newFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || newFile.name.endsWith('.docx'))) {
      setFile(newFile);
      setIsProcessing(true);
      
      try {
        const arrayBuffer = await newFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setExtractedHtml(result.value);
        setSuccess(true);
      } catch (err) {
      trackError('Docx To Html', 'processing_error');
        console.error(err);
        alert("Failed to extract HTML from DOCX.");
        setFile(null);
      } finally {
        setIsProcessing(false);
      }
    } else {
      alert("Please upload a valid .docx file.");
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccess(false);
    setExtractedHtml('');
    setIsProcessing(false);
    setPreviewMode(false);
  };

  const downloadHtml = () => {
    const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${file.name}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #333; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
  table, th, td { border: 1px solid #ccc; padding: 0.5rem; }
</style>
</head>
<body>
${extractedHtml}
</body>
</html>`;
    
    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace('.docx', '')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedHtml);
    alert("Copied to clipboard!");
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">DOCX to HTML</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Convert Microsoft Word documents into clean HTML code instantly.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={false}
            onFileSelect={handleFile}
            label="Select DOCX File"
            icon={Code}
            className="p-20 py-32 bg-green-50/50 hover:bg-green-100 border-green-300 hover:border-green-400"
          />
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-green-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Converting to HTML...</h2>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-6xl mx-auto py-12 animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[70vh]">
          
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Conversion Successful</h2>
                <p className="text-sm text-gray-500">{file.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-200 p-1 rounded-lg">
                <button 
                  onClick={() => setPreviewMode(false)}
                  className={`px-4 py-1.5 rounded-md font-bold text-sm transition-all ${!previewMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Raw HTML
                </button>
                <button 
                  onClick={() => setPreviewMode(true)}
                  className={`px-4 py-1.5 rounded-md font-bold text-sm transition-all ${previewMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Visual Preview
                </button>
              </div>
              
              <div className="w-px h-6 bg-gray-300"></div>
              
              <button 
                onClick={copyToClipboard}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-all flex items-center gap-2 border border-gray-200"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button 
                onClick={downloadHtml}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <FileCode2 className="w-4 h-4" /> Download .HTML
              </button>
              <button 
                onClick={resetTool}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Start Over
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-hidden flex bg-gray-50">
            {!previewMode ? (
              <textarea
                readOnly
                value={extractedHtml}
                className="w-full h-full p-6 bg-gray-900 text-green-400 border border-gray-800 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono text-sm shadow-inner"
              />
            ) : (
              <div 
                className="w-full h-full p-8 bg-white border border-gray-200 rounded-xl overflow-auto prose max-w-none"
                dangerouslySetInnerHTML={{ __html: extractedHtml }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

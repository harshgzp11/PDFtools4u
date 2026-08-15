import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { FileText, CheckCircle, Download, RefreshCw, Loader2, Copy } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { trackError } from '../lib/analytics';

export default function DocxToText() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [extractedText, setExtractedText] = useState('');

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
      trackEvent('tool_executed', { tool_name: 'DOCX to Text' });
    setIsProcessing(true);
      
      try {
        const arrayBuffer = await newFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setExtractedText(result.value);
        setSuccess(true);
      } catch (err) {
      trackError('Docx To Text', 'processing_error');
        console.error(err);
        alert("Failed to extract text from DOCX.");
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
    setExtractedText('');
    setIsProcessing(false);
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace('.docx', '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    alert("Copied to clipboard!");
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">DOCX to Text</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Extract raw text instantly from Microsoft Word (.docx) documents.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={false}
            onFileSelect={handleFile}
            label="Select DOCX File"
            icon={FileText}
            className="p-20 py-32 bg-blue-50/50 hover:bg-blue-100 border-blue-300 hover:border-blue-400"
          />
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-blue-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Extracting Text...</h2>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-6xl mx-auto py-12 animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[70vh]">
          
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Extracted Text</h2>
                <p className="text-sm text-gray-500">{file.name} • {extractedText.length} characters</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={copyToClipboard}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-all flex items-center gap-2 border border-gray-200"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button 
                onClick={downloadText}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download .TXT
              </button>
              <button 
                onClick={resetTool}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Start Over
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-hidden flex">
            <textarea
              readOnly
              value={extractedText}
              className="w-full h-full p-6 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm text-gray-700"
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

import React, { useState } from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { FileCode2, Download, RefreshCw, Loader2, FileText, CheckCircle } from 'lucide-react';

export default function TextToDocx() {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [filename, setFilename] = useState('document');

  const generateDocx = async () => {
    if (!text.trim()) {
      alert("Please enter some text first.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Split text by newlines and create a paragraph for each
      const paragraphs = text.split('\n').map(line => {
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt (measured in half-points)
            })
          ],
          spacing: {
            after: 200 // Add some space after paragraphs
          }
        });
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to generate DOCX document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setText('');
    setSuccess(false);
    setOutputUrl(null);
    setFilename('document');
  };

  const startOver = () => {
    setSuccess(false);
    setOutputUrl(null);
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-20 h-20 text-indigo-500 animate-spin mb-8" />
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">Generating Word Document...</h2>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-indigo-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Document Ready!</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-xl text-center">
          Your text has been successfully converted into a Microsoft Word (.docx) file.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`${filename}.docx`}
            className="px-10 py-5 bg-indigo-600 text-white rounded-xl font-bold text-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download DOCX
          </a>
          <button 
            onClick={startOver}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Edit Text
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 animate-in fade-in duration-500">
      
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-3">
          <FileCode2 className="w-10 h-10 text-indigo-500" />
          Text to DOCX
        </h2>
        <p className="text-lg text-gray-600">Type or paste text to generate a Microsoft Word document instantly.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[65vh]">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-4 flex-1">
            <label className="text-sm font-bold text-gray-700">Filename:</label>
            <div className="relative flex items-center max-w-xs w-full">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-2 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                placeholder="document"
              />
              <span className="absolute right-3 text-gray-400 font-medium text-sm">.docx</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={resetTool}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all font-bold text-sm"
            >
              Clear All
            </button>
            <button 
              onClick={generateDocx}
              disabled={!text.trim()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Generate DOCX
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-0 overflow-hidden flex">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            className="w-full h-full p-8 bg-white border-0 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-indigo-500/20 text-gray-800 leading-relaxed text-lg"
          />
        </div>
      </div>
    </div>
  );
}

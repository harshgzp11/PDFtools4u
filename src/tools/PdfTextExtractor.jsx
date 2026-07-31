import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import DragDropZone from '../components/ui/DragDropZone';
import { copyToClipboard, downloadTextAsFile } from '../lib/utils';
import { Copy, Download, Loader2 } from 'lucide-react';

// Initialize PDF.js worker using Vite's URL handling for static assets
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfTextExtractor() {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const processPdf = async (file) => {
    setLoading(true);
    setError('');
    setOutput('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }

      setOutput(fullText.trim());
    } catch (err) {
      console.error(err);
      setError("Failed to extract text from this PDF. It might be encrypted, image-based, or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">PDF Text Extractor</h2>
        <p className="text-gray-500">Safely extract readable text strings from any PDF document entirely in your browser.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Select PDF File</label>
          <DragDropZone 
            accept="application/pdf"
            onFileSelect={processPdf}
            label="Drag & drop your PDF here, or browse"
          />
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
          
          {loading && (
            <div className="flex items-center justify-center p-8 text-blue-600 flex-col gap-4">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Extracting text safely in browser...</p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Extracted Text</label>
          <textarea 
            value={output}
            readOnly
            className="w-full h-80 p-4 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm resize-none"
            placeholder="Extracted text will appear here..."
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => copyToClipboard(output)} disabled={!output || loading} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"><Copy className="w-4 h-4"/> Copy</button>
            <button onClick={() => downloadTextAsFile(output, 'extracted_text.txt')} disabled={!output || loading} className="px-3 py-1.5 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"><Download className="w-4 h-4"/> Download .txt</button>
          </div>
        </div>
      </div>
    </div>
  );
}

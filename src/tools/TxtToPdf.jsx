import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Settings } from 'lucide-react';

import DragDropZone from '../components/ui/DragDropZone';
import AdSlot from '../components/ui/AdSlot';
import ExportActions from '../components/ui/ExportActions';
import { trackError } from '../lib/analytics';

export default function TxtToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBytes, setPdfBytes] = useState(null);

  // Settings
  const [fontSize, setFontSize] = useState(12);

  useEffect(() => {
    if (window.__sharedFile) {
      const ext = (window.__sharedFile.name || '').split('.').pop().toLowerCase();
      if (['txt', 'text', 'log', 'md'].includes(ext) || window.__sharedFile.type.startsWith('text/')) {
        setFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const text = await file.text();
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const margin = 50;
      const pageWidth = 595.28; // A4 size
      const pageHeight = 841.89; // A4 size
      const maxTextWidth = pageWidth - margin * 2;
      const lineHeight = fontSize * 1.2;
      const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

      // Simple word wrapping algorithm
      const wrapText = (textToWrap, maxWidth) => {
        const paragraphs = textToWrap.split('\n');
        const lines = [];

        paragraphs.forEach(paragraph => {
          if (paragraph.trim() === '') {
            lines.push('');
            return;
          }

          const words = paragraph.split(' ');
          let currentLine = '';

          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (textWidth > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });
          if (currentLine) {
            lines.push(currentLine);
          }
        });
        return lines;
      };

      const lines = wrapText(text, maxTextWidth);
      
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentLineCount = 0;

      lines.forEach(line => {
        if (currentLineCount >= maxLinesPerPage) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          currentLineCount = 0;
        }

        page.drawText(line, {
          x: margin,
          y: pageHeight - margin - (currentLineCount * lineHeight),
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });

        currentLineCount++;
      });

      const bytes = await pdfDoc.save();
      setPdfBytes(bytes);
    } catch (error) {
      trackError('Txt To Pdf', 'processing_error');
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Make sure it is a valid text file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPdfBytes(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">TXT to PDF</h2>
        <p className="text-xl text-gray-500">
          Convert plain text files into clean, readable PDF documents entirely in your browser.
        </p>
      </div>

      {!file && (
        <DragDropZone 
          accept="text/plain,.txt"
          onFileSelect={setFile}
          label="Select a TXT file"
          icon={FileText}
          className="p-16 py-24"
        />
      )}

      {file && !pdfBytes && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{file.name}</h3>
              <p className="text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" /> Formatting Options
            </h4>
            
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">Font Size (pt)</label>
              <input 
                type="number" 
                min="8"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              {isProcessing ? 'Converting...' : 'Convert to PDF'}
            </button>
          </div>
        </div>
      )}

      {pdfBytes && (
        <ExportActions 
          pdfBytes={pdfBytes}
          fileName={file?.name ? file.name.replace('.txt', '.pdf') : 'document.pdf'}
          onReset={handleReset}
        />
      )}

      <div className="mt-12">
        <AdSlot />
      </div>
    </div>
  );
}

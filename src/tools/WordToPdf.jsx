import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, CheckCircle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.name.endsWith('.doc') || window.__sharedFile.name.endsWith('.docx') || window.__sharedFile.type.includes('word')) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (newFile && (newFile.name.endsWith('.doc') || newFile.name.endsWith('.docx') || newFile.type.includes('word'))) {
      setFile(newFile);
      setSuccessData(null);
      setHtmlContent('');
      
      // Extract HTML preview immediately
      try {
        const arrayBuffer = await newFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtmlContent(result.value);
      } catch (err) {
        console.error("Preview extraction failed", err);
      }
    } else {
      alert("Please upload a valid Word document (.doc or .docx).");
    }
  };

  const convertWordToPdf = async () => {
    if (!file || !contentRef.current) return;
    setIsProcessing(true);
    
    try {
      // 1. Capture the HTML content as a canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        windowWidth: 800, // Standardize width for consistent rendering
      });

      // 2. Setup jsPDF for A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pageHeightInPixels = (canvasWidth / pdfWidth) * pdfHeight;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      let heightLeft = canvasHeight;
      let position = 0;
      let page = 1;

      // 3. Slice the tall canvas into A4 pages
      while (heightLeft > 0) {
        if (page > 1) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, (canvasHeight * pdfWidth) / canvasWidth);
        
        heightLeft -= pageHeightInPixels;
        position -= pdfHeight;
        page++;
      }

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      setSuccessData({
        url,
        filename: `${file.name.replace(/\.docx?$/, '')}_converted.pdf`,
        title: 'Conversion Complete',
        subtitle: 'Your Word document has been successfully converted to PDF.',
      });
    } catch (err) {
      console.error(err);
      alert("Failed to convert Word to PDF. Make sure it's a valid document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setHtmlContent('');
  };

  const processButton = (
    <button 
      onClick={convertWordToPdf} 
      disabled={isProcessing || !file}
      className="w-full px-4 py-3 bg-blue-600 border border-transparent rounded-xl shadow-md text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden"
    >
      {isProcessing ? 'Converting...' : <><FileText className="w-5 h-5"/> Convert to PDF</>}
    </button>
  );

  const previewNode = (
    <div className="w-full h-full flex flex-col items-center py-2 overflow-y-auto custom-scrollbar">
      <h3 className="text-xl font-extrabold text-gray-900 mb-4 self-start">Document Preview</h3>
      
      {/* Hidden rendering container for html2canvas */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div 
              ref={contentRef} 
              className="prose prose-sm max-w-none bg-white p-12 text-black" 
              style={{ width: '800px', minHeight: '1131px' }}
              dangerouslySetInnerHTML={{ __html: htmlContent || '<p>Loading document...</p>' }} 
          />
      </div>

      {/* Visible Preview for UI */}
      <div className="bg-white shadow-xl border border-gray-200 rounded-sm p-8 w-full max-w-[850px] min-h-[1100px] prose prose-sm md:prose-base text-gray-800 break-words flex-shrink-0"
         dangerouslySetInnerHTML={{ __html: htmlContent || '<div class="text-center text-gray-400 mt-32 font-medium text-lg">No content available</div>' }} 
      />
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Word to PDF"
      description="Convert your Microsoft Word documents (.docx) into standard PDF format instantly."
      icon={FileText}
      accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      customPreviewNode={previewNode}
    />
  );
}

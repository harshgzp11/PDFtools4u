import React, { useState } from 'react';
import { FileText, FileDown, ShieldCheck } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { toast } from 'sonner';
import { RTFJS } from 'rtf.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// A simple string to ArrayBuffer helper for rtf.js if needed
function stringToArrayBuffer(string) {
    const buffer = new ArrayBuffer(string.length);
    const bufferView = new Uint8Array(buffer);
    for (let i = 0; i < string.length; i++) {
        bufferView[i] = string.charCodeAt(i);
    }
    return buffer;
}

export default function RtfToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [htmlContent, setHtmlContent] = useState([]);
  
  // Shared file interception
  React.useEffect(() => {
    if (window.__sharedFile) {
      handleFileSelect(window.__sharedFile);
      window.__sharedFile = null;
    }
  }, []);

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setSuccessData(null);
    setIsProcessing(true);
    
    try {
      // Read the RTF file
      const text = await selectedFile.text();
      
      // Parse with rtf.js
      RTFJS.loggingEnabled(false);
      const doc = new RTFJS.Document(stringToArrayBuffer(text));
      
      const elements = await doc.render();
      setHtmlContent(elements);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse RTF file. It may be corrupted or unsupported.");
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSuccessData(null);
    setHtmlContent([]);
  };

  const processFile = async () => {
    if (!file || htmlContent.length === 0) return;
    setIsProcessing(true);

    try {
      const rtfContainer = document.getElementById('rtf-render-container');
      
      // We use html2canvas to render the parsed HTML, then drop it in jsPDF
      const canvas = await html2canvas(rtfContainer, {
        scale: 2, // High quality
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Basic pagination if the content exceeds one page
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setSuccessData({
        url: pdfUrl,
        filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
        title: "Conversion Complete!",
        subtitle: "Your RTF has been converted to PDF.",
        quickActions: [
          {
            icon: FileText,
            label: 'Open in Reader',
            onClick: () => {
              window.__sharedFile = new File([pdfBlob], file.name.replace(/\.[^/.]+$/, "") + ".pdf", { type: 'application/pdf' });
              // Navigate handled by router but for now just inform user
              toast.success("Ready! Navigate to PDF Reader.");
            }
          }
        ]
      });

    } catch (err) {
      console.error(err);
      toast.error("An error occurred during PDF generation.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPreviewLayout
      title="RTF to PDF"
      description="Convert Rich Text Format (.rtf) documents to PDF files easily."
      icon={FileDown}
      accept=".rtf,application/rtf,text/rtf"
      file={file}
      onFileSelect={handleFileSelect}
      isProcessing={isProcessing}
      processButton={{
        text: "Convert to PDF",
        onClick: processFile,
        icon: FileDown
      }}
      successData={successData}
      onReset={handleReset}
      customPreviewNode={
        <div className="w-full h-full overflow-y-auto bg-white border border-gray-200 rounded-xl p-6 shadow-inner custom-scrollbar relative">
           {htmlContent.length > 0 ? (
             <div 
               id="rtf-render-container" 
               className="text-gray-800 leading-relaxed text-sm w-[794px] max-w-full mx-auto"
               style={{ fontFamily: '"Times New Roman", Times, Arial, sans-serif' }}
               ref={node => {
                 if (node && node.childNodes.length === 0) {
                    htmlContent.forEach(el => node.appendChild(el));
                 }
               }}
             />
           ) : (
             <div className="flex items-center justify-center h-full text-gray-400 font-medium">
               Parsed document will appear here...
             </div>
           )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">Conversion Options</h3>
          <p className="text-sm text-gray-500 mb-4">
            RTF conversion preserves text formatting, fonts, and basic layouts using client-side rendering.
          </p>
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
            <ShieldCheck className="w-4 h-4" />
            Processed securely in your browser. No data leaves your device.
          </div>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

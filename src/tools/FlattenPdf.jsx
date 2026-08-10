import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Layers3 } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function FlattenPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
  };

  const flattenPdf = async () => {
    if (!file) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const form = pdfDoc.getForm();
      if (form) {
        form.flatten();
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `flattened_${file.name}`,
        title: 'PDF is now flattened!',
        subtitle: 'Your uneditable document is ready to download.',
      });
    } catch (err) {
      trackError('Flatten Pdf', 'processing_error');
      console.error(err);
      alert("Failed to flatten PDF. The file might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const renderGridItem = (thumb, idx) => {
    return (
      <div 
        key={thumb.id} 
        className="relative aspect-[1/1.4] bg-white rounded-xl shadow-md border-4 border-transparent overflow-hidden flex items-center justify-center p-2"
      >
        <img 
          src={thumb.dataUrl} 
          alt={`Page ${idx + 1}`} 
          className="w-full h-full object-contain pointer-events-none"
        />
        
        <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-blue-600 text-white p-3 md:p-4 rounded-full shadow-2xl backdrop-blur-sm bg-blue-600/90 border-2 border-white/20">
            <Layers3 className="w-6 h-6 md:w-8 md:h-8" />
          </div>
        </div>
        
        <div className="absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center bg-white/90 border-gray-300 text-gray-700 shadow-sm z-10">
          {idx + 1}
        </div>
      </div>
    );
  };

  const processButton = (
    <button 
      onClick={flattenPdf} 
      disabled={loading}
      className="w-full px-6 py-4 bg-blue-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? 'Processing...' : (
        <><Layers3 className="w-6 h-6"/> Flatten PDF</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Flatten PDF Forms"
      description="Make forms and annotations uneditable by flattening them directly into the document."
      icon={Layers3}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      gridMode={true}
      renderGridItem={renderGridItem}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Flatten Details</h3>
          <p className="text-gray-500 text-sm">Lock all forms and interactive elements.</p>
        </div>
        
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4">
          <h4 className="font-bold text-blue-900 mb-2">What does flattening do?</h4>
          <ul className="list-disc pl-5 text-sm text-blue-800 space-y-2">
            <li>Makes fillable form fields permanently uneditable.</li>
            <li>Merges annotations and signatures directly into the visual page data.</li>
            <li>Ensures the document looks identical across all PDF viewers and printers.</li>
          </ul>
        </div>
        
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl mt-4">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> This process is irreversible. The output file will be a new, flattened copy, leaving your original file untouched.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

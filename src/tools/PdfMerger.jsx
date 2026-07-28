import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, PlusCircle, Trash2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import ExportActions from '../components/ui/ExportActions';

export default function PdfMerger() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mergedBytes, setMergedBytes] = useState(null);

  const handleFiles = (newFiles) => {
    const pdfFiles = Array.isArray(newFiles) ? newFiles : [newFiles];
    const valid = pdfFiles.filter(f => f.type === 'application/pdf');
    setFiles([...files, ...valid]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const mergePdfs = async () => {
    if (files.length < 2) return;
    setLoading(true);
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      setMergedBytes(pdfBytes);
    } catch (err) {
      console.error(err);
      alert("Failed to merge PDFs. One of the files might be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Merge PDF</h2>
        <p className="text-gray-500">Combine multiple PDF files into one document privately in your browser.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {!mergedBytes ? (
          <>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Add PDF Files</label>
              <DragDropZone 
                accept="application/pdf"
                multiple={true}
                onFileSelect={handleFiles}
                label="Drag & drop PDFs here to merge"
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Files to Merge ({files.length})</label>
              <div className="h-64 border border-gray-300 rounded-lg bg-gray-50 p-4 overflow-y-auto space-y-2">
                {files.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-10">No files added yet.</p>
                ) : (
                  files.map((file, i) => (
                    <div key={i} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between shadow-sm">
                      <span className="text-sm text-gray-700 truncate mr-4">{i + 1}. {file.name}</span>
                      <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <button 
                onClick={mergePdfs} 
                disabled={files.length < 2 || loading}
                className="w-full px-6 py-3 bg-blue-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Merging...' : (
                  <><PlusCircle className="w-5 h-5"/> Merge {files.length} PDFs</>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="col-span-1 lg:col-span-2">
            <ExportActions 
              pdfBytes={mergedBytes}
              fileName="merged_document.pdf"
              onReset={() => {
                setMergedBytes(null);
                setFiles([]);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

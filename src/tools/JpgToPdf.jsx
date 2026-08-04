import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Download, PlusCircle, Trash2, Image as ImageIcon, CheckCircle, ArrowLeft, ImagePlus, FileUp } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function JpgToPdf() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);

  useEffect(() => {
    if (window.__sharedFile) {
      if (window.__sharedFile.type.startsWith('image/')) {
        handleImages(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const handleImages = (newFiles) => {
    const imgFiles = Array.isArray(newFiles) ? newFiles : [newFiles];
    const valid = imgFiles.filter(f => f.type.startsWith('image/'));
    
    // Read all images as Data URLs
    Promise.all(valid.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ file, dataUrl: e.target.result });
        reader.readAsDataURL(file);
      });
    })).then(results => {
      setImages(prev => [...prev, ...results]);
      setSuccess(false);
      setOutputUrl(null);
    });
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const resetTool = () => {
    setImages([]);
    setSuccess(false);
    setOutputUrl(null);
  };

  const generatePdf = () => {
    if (images.length === 0) return;
    setLoading(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      images.forEach((imgObj, index) => {
        if (index > 0) doc.addPage();
        
        const imgProps = doc.getImageProperties(imgObj.dataUrl);
        let imgWidth = imgProps.width;
        let imgHeight = imgProps.height;
        
        // Scale to fit page
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        imgWidth *= ratio;
        imgHeight *= ratio;
        
        // Center image
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        doc.addImage(imgObj.dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
      });

      const pdfBytes = doc.output('blob');
      const url = URL.createObjectURL(pdfBytes);
      
      setOutputUrl(url);
      setSuccess(true);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted_images.pdf';
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to create PDF.");
    } finally {
      setLoading(false);
    }
  };

  // State 1: Upload Focus
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">JPG to PDF</h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Convert JPG images to PDF in seconds. Easily adjust orientation and margins.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="image/*"
            multiple={true}
            onFileSelect={handleImages}
            label="Select JPG images"
            icon={ImageIcon}
            className="p-20 py-32 bg-yellow-50/50 hover:bg-yellow-50 border-yellow-300 hover:border-yellow-400"
          />
        </div>
      </div>
    );
  }

  // State 3: Success Screen
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Images converted!</h2>
        <p className="text-lg text-gray-600 mb-10">Your PDF document is ready.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download="converted_images.pdf"
            className="px-10 py-5 bg-yellow-500 text-white rounded-xl font-bold text-xl hover:bg-yellow-600 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <ImagePlus className="w-6 h-6" /> Start Over
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
          className="absolute top-6 left-6 p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 border border-gray-200"
          title="Back to upload"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
          {images.map((img, i) => (
            <div key={i} className="group relative aspect-[3/4] bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-all hover:-translate-y-1">
              <img src={img.dataUrl} alt="preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => removeImage(i)} 
                className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4"/>
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                <span className="text-xs font-medium text-white truncate block w-full">{img.file.name}</span>
              </div>
            </div>
          ))}
          
          <label className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 transition-all">
            <PlusCircle className="w-10 h-10 mb-2" />
            <span className="text-sm font-medium">Add More</span>
            <input type="file" multiple accept="image/*" onChange={(e) => handleImages(Array.from(e.target.files))} className="hidden" />
          </label>
        </div>
      </div>

      {/* Settings Panel (Right Sidebar) */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-white border-l border-gray-200 pb-8 px-6 lg:px-0">
        <div className="p-6 lg:p-8 space-y-8 flex-1">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Image to PDF</h3>
            <p className="text-gray-500 text-sm">Convert your JPG images to PDF format instantly.</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-center justify-between">
             <span className="text-sm text-yellow-800 font-bold">Total Images:</span>
             <span className="text-xl font-extrabold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-lg">{images.length}</span>
          </div>

          <div className="space-y-3">
             <p className="text-sm text-gray-600 font-medium">Looking to reorder them?</p>
             <p className="text-xs text-gray-500">Currently, images are converted in the order they were selected. Remove and re-add them to change order.</p>
          </div>
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={generatePdf} 
            disabled={loading}
            className="w-full px-6 py-5 bg-yellow-500 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Converting...' : (
              <><FileUp className="w-6 h-6"/> Convert to PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

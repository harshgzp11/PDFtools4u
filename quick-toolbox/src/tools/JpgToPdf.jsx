import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Download, PlusCircle, Trash2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function JpgToPdf() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

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
    });
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
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

      doc.save('converted_images.pdf');
    } catch (err) {
      console.error(err);
      alert("Failed to create PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">JPG to PDF</h2>
        <p className="text-gray-500">Convert JPG/PNG images to a PDF document.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Add Images</label>
          <DragDropZone 
            accept="image/*"
            multiple={true}
            onFileSelect={handleImages}
            label="Drag & drop images here"
          />
        </div>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Images in PDF ({images.length})</label>
          <div className="h-64 border border-gray-300 rounded-lg bg-gray-50 p-4 overflow-y-auto space-y-2">
            {images.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">No images added yet.</p>
            ) : (
              images.map((img, i) => (
                <div key={i} className="bg-white p-2 rounded border border-gray-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <img src={img.dataUrl} alt="preview" className="w-10 h-10 object-cover rounded" />
                    <span className="text-sm text-gray-700 truncate w-32">{img.file.name}</span>
                  </div>
                  <button onClick={() => removeImage(i)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              ))
            )}
          </div>
          
          <button 
            onClick={generatePdf} 
            disabled={images.length === 0 || loading}
            className="w-full px-6 py-3 bg-yellow-500 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Converting...' : (
              <><Download className="w-5 h-5"/> Download PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

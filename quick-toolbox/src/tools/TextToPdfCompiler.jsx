import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Download, PlusCircle } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function TextToPdfCompiler() {
  const [contentElements, setContentElements] = useState([]);
  const [textInput, setTextInput] = useState('');
  
  const addTextElement = () => {
    if (!textInput.trim()) return;
    setContentElements([...contentElements, { type: 'text', value: textInput }]);
    setTextInput('');
  };

  const handleImageUpload = (file) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setContentElements([...contentElements, { type: 'image', value: e.target.result, fileName: file.name }]);
    };
    reader.readAsDataURL(file);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    contentElements.forEach((el, index) => {
      if (el.type === 'text') {
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(el.value, pageWidth - margin * 2);
        doc.text(splitText, margin, yPos);
        yPos += splitText.length * 7 + 10;
      } else if (el.type === 'image') {
        const imgProps = doc.getImageProperties(el.value);
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        
        if (yPos + imgHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.addImage(el.value, 'JPEG', margin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }
      
      if (yPos > doc.internal.pageSize.getHeight() - margin && index < contentElements.length - 1) {
         doc.addPage();
         yPos = margin;
      }
    });

    doc.save('compiled_document.pdf');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Text & Image to PDF Compiler</h2>
        <p className="text-gray-500">Compile raw text and images into a single PDF document. Everything is processed locally.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Add Text Paragraph</label>
            <textarea 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
              placeholder="Type paragraph here..."
            />
            <button onClick={addTextElement} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-orange-600">
              <PlusCircle className="w-4 h-4"/> Add Text to Document
            </button>
          </div>
          
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700">Add Image to Document</label>
            <DragDropZone 
              accept="image/*"
              onFileSelect={handleImageUpload}
              label="Drag & drop an image here"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Document Structure ({contentElements.length} items)</label>
          <div className="h-96 border border-gray-300 rounded-lg bg-gray-50 p-4 overflow-y-auto space-y-3">
            {contentElements.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">Document is empty.</p>
            ) : (
              contentElements.map((el, i) => (
                <div key={i} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex items-start justify-between group">
                  {el.type === 'text' ? (
                    <p className="text-sm text-gray-700 line-clamp-3">{el.value}</p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src={el.value} alt="preview" className="w-12 h-12 object-cover rounded" />
                      <span className="text-sm font-medium text-gray-600">{el.fileName}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => setContentElements(contentElements.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700 text-xs font-medium ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end">
             <button 
                onClick={generatePDF} 
                disabled={contentElements.length === 0}
                className="px-6 py-2.5 bg-orange-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 w-full justify-center"
              >
                <Download className="w-5 h-5"/> Download Compiled PDF
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}

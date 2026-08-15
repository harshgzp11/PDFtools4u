import React, { useState, useEffect } from 'react';
import { PDFDocument, PDFTextField, PDFDropdown, PDFCheckBox, PDFRadioGroup, PDFOptionList } from '@cantoo/pdf-lib';
import { FileSignature, FileText, Eraser, Loader2, AlertCircle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function PdfFormFiller() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [flatten, setFlatten] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setErrorMsg('');
      setFormFields([]);
      setFormData({});
      
      scanForm(newFile);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const scanForm = async (pdfFile) => {
    setIsScanning(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      const extractedFields = [];
      const initialData = {};

      fields.forEach(field => {
        const name = field.getName();
        let type = 'unknown';
        let options = [];
        let value = null;

        if (field instanceof PDFTextField) {
          type = 'text';
          value = field.getText() || '';
        } else if (field instanceof PDFDropdown) {
          type = 'dropdown';
          options = field.getOptions();
          value = field.getSelected()[0] || '';
        } else if (field instanceof PDFCheckBox) {
          type = 'checkbox';
          value = field.isChecked();
        } else if (field instanceof PDFRadioGroup) {
          type = 'radio';
          options = field.getOptions();
          value = field.getSelected() || '';
        } else if (field instanceof PDFOptionList) {
          type = 'dropdown';
          options = field.getOptions();
          value = field.getSelected()[0] || '';
        }

        if (type !== 'unknown') {
          extractedFields.push({ name, type, options });
          initialData[name] = value;
        }
      });

      setFormFields(extractedFields);
      setFormData(initialData);
    } catch (err) {
      trackError('Pdf Form Filler', 'processing_error');
      console.error(err);
      setErrorMsg("Failed to read PDF form. The file might be encrypted or corrupted.");
    } finally {
      setIsScanning(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setFormFields([]);
    setFormData({});
    setErrorMsg('');
  };

  const clearForm = () => {
    const cleared = {};
    formFields.forEach(f => {
      cleared[f.name] = f.type === 'checkbox' ? false : '';
    });
    setFormData(cleared);
  };

  const updateField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fillForm = async () => {
    if (!file) return;
    trackEvent('tool_executed', { tool_name: 'PDF Form Filler' });
    setLoading(true);
    setErrorMsg('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();
      
      for (const [name, value] of Object.entries(formData)) {
        try {
          const field = form.getField(name);
          if (!field) continue;
          
          if (field instanceof PDFTextField) {
            field.setText(value || '');
          } else if (field instanceof PDFDropdown) {
            if (value) field.select(value);
            else field.clear();
          } else if (field instanceof PDFCheckBox) {
            if (value) field.check();
            else field.uncheck();
          } else if (field instanceof PDFRadioGroup) {
            if (value) field.select(value);
            else field.clear();
          } else if (field instanceof PDFOptionList) {
            if (value) field.select(value);
            else field.clear();
          }
        } catch (fieldErr) {
      trackError('Pdf Form Filler', 'processing_error');
          console.warn(`Failed to set field ${name}:`, fieldErr);
        }
      }
      
      if (flatten) {
        form.flatten();
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: flatten ? `completed_${file.name}` : `filled_${file.name}`,
        title: 'Form Filled Successfully!',
        subtitle: flatten ? 'Your document has been filled and flattened.' : 'Your document has been filled.',
        downloadText: 'Download Completed PDF'
      });
    } catch (err) {
      trackError('Pdf Form Filler', 'processing_error');
      console.error(err);
      setErrorMsg("Failed to process the form.");
    } finally {
      setLoading(false);
    }
  };

  const processButton = (
    <button 
      onClick={fillForm} 
      disabled={loading || formFields.length === 0}
      className="w-full px-6 py-4 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? (
        <><Loader2 className="w-6 h-6 animate-spin"/> Processing...</>
      ) : (
        <><FileSignature className="w-6 h-6"/> Fill Form & Download</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="PDF Form Filler"
      description="Fill out interactive PDF forms easily in your browser without Adobe Acrobat."
      icon={FileSignature}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-extrabold text-gray-900">Form Fields</h3>
        {formFields.length > 0 && (
          <button 
            onClick={clearForm}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-600 transition-colors"
          >
            <Eraser className="w-4 h-4" /> Clear All
          </button>
        )}
      </div>

      {isScanning ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-medium">Scanning document...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-medium text-red-800">{errorMsg}</div>
        </div>
      ) : formFields.length === 0 && file ? (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-center space-y-2">
          <FileText className="w-10 h-10 text-amber-400 mx-auto" />
          <h4 className="font-bold text-amber-800">No form fields detected</h4>
          <p className="text-sm text-amber-700">
            This PDF does not contain any interactive AcroForm fields. Please upload a fillable PDF form document.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {formFields.map((field) => (
            <div key={field.name} className="space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 tracking-wide break-words">
                {field.name}
              </label>
              
              {field.type === 'text' && (
                <input 
                  type="text" 
                  value={formData[field.name] || ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter text..."
                />
              )}
              
              {field.type === 'dropdown' && (
                <select 
                  value={formData[field.name] || ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">-- Select an option --</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              
              {field.type === 'radio' && (
                <div className="space-y-2 pt-1">
                  {field.options.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name={field.name}
                        checked={formData[field.name] === opt}
                        onChange={() => updateField(field.name, opt)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {field.type === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input 
                    type="checkbox" 
                    checked={formData[field.name] || false}
                    onChange={(e) => updateField(field.name, e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 font-medium">Checked</span>
                </label>
              )}
            </div>
          ))}
          
          {formFields.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <input 
                  type="checkbox" 
                  checked={flatten}
                  onChange={(e) => setFlatten(e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-indigo-900">Flatten Document</span>
                  <span className="text-xs text-indigo-700">Make answers permanent and read-only.</span>
                </div>
              </label>
            </div>
          )}
        </div>
      )}
    </ToolPreviewLayout>
  );
}

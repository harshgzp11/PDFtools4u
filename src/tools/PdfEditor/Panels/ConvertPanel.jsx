import React, { useState } from 'react';
import { ArrowLeftRight, Download, Loader2, X, AlertCircle, FileCode2, Info } from 'lucide-react';
import { convertPdfToDocx, convertPdfToExcel, convertPdfToImages, convertPdfToPpt } from '../../../utils/pdfConversion';
import { trackError } from '../../../lib/analytics';
import { trackEvent } from '../../lib/analytics';

export default function ConvertPanel({ file, onClose }) {
  const [format, setFormat] = useState('docx');
  const [docxMode, setDocxMode] = useState('editable');
  const [imageFormat, setImageFormat] = useState('jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successUrl, setSuccessUrl] = useState(null);
  const [successFilename, setSuccessFilename] = useState('');
  const [error, setError] = useState(null);

  const handleConvert = async () => {
    trackEvent('tool_executed', { tool_name: 'Convert Panel' });
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccessUrl(null);

    try {
      let blob;
      let filename = file.name.replace('.pdf', '');

      if (format === 'docx') {
        blob = await convertPdfToDocx(file, docxMode, setProgress);
        filename += '.docx';
      } else if (format === 'xlsx') {
        blob = await convertPdfToExcel(file, setProgress);
        filename += '.xlsx';
      } else if (format === 'image') {
        blob = await convertPdfToImages(file, imageFormat, setProgress);
        filename += '_images.zip';
      } else if (format === 'pptx') {
        blob = await convertPdfToPpt(file, setProgress);
        filename += '.pptx';
      } else {
        throw new Error("Unsupported format");
      }
      
      const url = URL.createObjectURL(blob);
      setSuccessUrl(url);
      setSuccessFilename(filename);
    } catch (err) {
      trackError('Convert Panel', 'processing_error');
      console.error(err);
      setError(err.message || "Failed to convert PDF. The PDF might be scanned or composed of vectors.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return (
    <div className="absolute xl:relative right-0 top-0 bottom-0 w-80 h-full bg-white border-l border-gray-200 shadow-2xl xl:shadow-xl flex flex-col z-30 flex-shrink-0 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
          Convert PDF
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {successUrl ? (
          <div className="flex flex-col items-center justify-center text-center gap-4 mt-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <FileCode2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Conversion Complete</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your file has been converted successfully.
              </p>
            </div>
            <a
              href={successUrl}
              download={successFilename}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Download File
            </a>
            <button
              onClick={() => setSuccessUrl(null)}
              className="text-sm text-indigo-600 hover:underline"
            >
              Convert to another format
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Convert To</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${format === 'docx' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => setFormat('docx')}
                  >
                    Word (.docx)
                  </button>
                  <button 
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${format === 'xlsx' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => setFormat('xlsx')}
                  >
                    Excel (.xlsx)
                  </button>
                  <button 
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${format === 'image' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => setFormat('image')}
                  >
                    Image (.jpg)
                  </button>
                  <button 
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${format === 'pptx' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => setFormat('pptx')}
                  >
                    PPT (.pptx)
                  </button>
                </div>
              </div>

              {format === 'docx' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-bold text-gray-800">Export Mode</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${docxMode === 'editable' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="docxMode" value="editable" checked={docxMode === 'editable'} onChange={() => setDocxMode('editable')} className="mt-1" />
                      <div>
                        <div className="font-bold text-sm text-gray-900">Editable Text</div>
                        <div className="text-xs text-gray-600 mt-0.5">Extracts selectable text and headings. Ideal for re-writing or editing content.</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${docxMode === 'visual' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="docxMode" value="visual" checked={docxMode === 'visual'} onChange={() => setDocxMode('visual')} className="mt-1" />
                      <div>
                        <div className="font-bold text-sm text-gray-900">Visual Layout (Exact Copy)</div>
                        <div className="text-xs text-gray-600 mt-0.5">Preserves original fonts, tables, and multi-column designs as high-res images inside Word.</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {format === 'image' && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Image Format</span>
                  <div className="flex bg-white rounded-md border border-gray-200 overflow-hidden">
                    <button 
                      onClick={() => setImageFormat('jpeg')}
                      className={`px-3 py-1 text-sm font-medium transition-colors ${imageFormat === 'jpeg' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      JPG
                    </button>
                    <div className="w-px bg-gray-200"></div>
                    <button 
                      onClick={() => setImageFormat('png')}
                      className={`px-3 py-1 text-sm font-medium transition-colors ${imageFormat === 'png' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      PNG
                    </button>
                  </div>
                </div>
              )}

              {format === 'xlsx' && (
                <div className="flex items-start gap-2 text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs leading-relaxed">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <p><strong>Note:</strong> Table data is extracted using X/Y coordinate spatial mapping into a native Excel (.xlsx) file directly in your browser.</p>
                </div>
              )}

              {format === 'pptx' && (
                <div className="flex items-start gap-2 text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs leading-relaxed">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <p><strong>Note:</strong> Generates a presentation with pages as uneditable slide backgrounds.</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-4">
              <div className="flex items-start gap-3 bg-indigo-50/50 text-indigo-900 p-3 rounded-xl text-xs leading-relaxed border border-indigo-100 shadow-sm">
                <div className="text-indigo-600 mt-0.5 shrink-0 text-base">🔒</div>
                <div>
                  <strong className="block mb-0.5 text-sm">100% Private & Local Processing</strong>
                  Your files never leave your device. Because we process everything securely inside your browser without external servers, complex PDF tables in "Editable Text" mode are extracted as plain structured text.
                </div>
              </div>

              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
              >
                {isProcessing ? (
                  <span className="inline-flex items-center justify-center gap-2 min-w-[200px] h-7 text-sm font-bold whitespace-nowrap">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Converting... {progress}%
                  </span>
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5" />
                    Convert File
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

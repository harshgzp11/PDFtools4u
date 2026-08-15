import React, { useState } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { Download, Lock, FileText, CheckCircle, ArrowLeft, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function ProtectPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setPassword('');
      setRepeatPassword('');
      setThumbnails([]);
      setExtractingThumbs(true);
      
      try {
        const thumbs = await getPdfThumbnails(newFile, 0.5);
        setThumbnails(thumbs);
      } catch (e) {
      trackError('Protect Pdf', 'processing_error');
        console.error(e);
        alert(`Failed to load PDF: ${e.message}`);
        setFile(null);
      } finally {
        setExtractingThumbs(false);
      }
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setPassword('');
    setRepeatPassword('');
    setThumbnails([]);
  };

  const protectPdf = async () => {
    if (!file || !password || password !== repeatPassword) return;
    trackEvent('tool_executed', { tool_name: 'Protect PDF file' });
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      pdfDoc.encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
        }
      });
      
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `protected_${file.name}`,
        title: 'PDF Protected Successfully!',
        subtitle: 'Your encrypted document is ready.',
      });
      
    } catch (err) {
      trackError('Protect Pdf', 'processing_error');
      console.error(err);
      alert("Failed to protect PDF. The file might already be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = password.length > 0 && password === repeatPassword;

  const processButton = (
    <button 
      onClick={protectPdf} 
      disabled={loading || !canSubmit || extractingThumbs}
      className="w-full px-6 py-4 bg-slate-800 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? (
        <><Loader2 className="w-6 h-6 animate-spin"/> Encrypting...</>
      ) : (
        <><Lock className="w-6 h-6"/> Protect PDF Now</>
      )}
    </button>
  );

  const customPreview = (
    <div className="w-full h-full flex flex-col">
      {extractingThumbs ? (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 gap-4">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p className="font-medium animate-pulse">Rendering preview...</p>
        </div>
      ) : (
        <div className={getDynamicGridClass(thumbnails.length) + " w-full pb-8"}>
          {thumbnails.map((thumb) => {
            const idx = thumb.originalIndex;
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
                
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center pointer-events-none">
                  <div className="bg-slate-800 text-white p-3 md:p-4 rounded-full shadow-2xl backdrop-blur-sm bg-slate-800/90">
                    <Lock className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center bg-white/90 border-gray-300 text-gray-700 shadow-sm z-10">
                  {idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Protect PDF file"
      description="Encrypt your PDF with a password to prevent unauthorized access."
      icon={Lock}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      customPreviewNode={customPreview}
    >
      <div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Protect PDF</h3>
        <p className="text-gray-500 text-sm">Set a password to encrypt your document securely.</p>
      </div>
      
      <div className="space-y-5">
         <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-700 tracking-wider">Type a password</label>
           <div className="relative">
             <input 
               type={showPassword ? "text" : "password"} 
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all pr-12"
               placeholder="Enter password..."
             />
             <button 
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
             >
               {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
             </button>
           </div>
         </div>

         <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-700 tracking-wider">Repeat password</label>
           <input 
             type={showPassword ? "text" : "password"} 
             value={repeatPassword}
             onChange={(e) => setRepeatPassword(e.target.value)}
             className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 outline-none transition-all ${
               repeatPassword && password !== repeatPassword 
                 ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50' 
                 : 'border-gray-300 focus:ring-slate-500 focus:border-slate-500'
             }`}
             placeholder="Repeat password..."
           />
           {repeatPassword && password !== repeatPassword && (
             <p className="text-xs text-red-500 mt-1 font-medium">Passwords do not match.</p>
           )}
         </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
         <p className="text-sm text-slate-700 font-medium flex items-start gap-2">
           <Lock className="w-5 h-5 text-slate-500 flex-shrink-0" /> 
           <span>Your file will be encrypted using standard PDF encryption. Make sure you don't forget this password!</span>
         </p>
      </div>
    </ToolPreviewLayout>
  );
}

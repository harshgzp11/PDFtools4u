import React, { useState, useEffect } from 'react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { Unlock, FileText, CheckCircle, ArrowLeft, RefreshCw, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackError } from '../lib/analytics';

export default function UnlockPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccessData(null);
      setPassword('');
      setErrorMsg('');
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setPassword('');
    setErrorMsg('');
  };

  const unlockPdf = async () => {
    if (!file || !password) return;
    setLoading(true);
    setErrorMsg('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Load and decrypt the PDF using the provided password
      const pdfDoc = await PDFDocument.load(arrayBuffer, { password: password });
      
      // Saving without encryption options outputs a decrypted PDF
      const decryptedBytes = await pdfDoc.save({ useObjectStreams: false });
      
      const blob = new Blob([decryptedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `unlocked_${file.name}`,
        title: 'PDF Unlocked Successfully!',
        subtitle: 'The password protection has been completely removed. You can now download the unlocked PDF.',
        downloadText: 'Download Unlocked PDF'
      });
      
    } catch (err) {
      trackError('Unlock Pdf', 'processing_error');
      console.error("Unlock error:", err);
      let errorType = 'unknown_error';
      if (err.message && err.message.toLowerCase().includes('password')) {
        errorType = 'invalid_password';
        setErrorMsg('Incorrect password. Please try again.');
      } else {
        errorType = 'corrupted_file';
        setErrorMsg('Failed to unlock document. The file might be corrupted or uses an unsupported encryption method.');
      }
      trackError('Unlock PDF', errorType);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = password.length > 0;

  const processButton = (
    <button 
      onClick={unlockPdf} 
      disabled={loading || !canSubmit}
      className="w-full px-6 py-4 bg-emerald-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? (
        <><Loader2 className="w-6 h-6 animate-spin"/> Unlocking...</>
      ) : (
        <><Unlock className="w-6 h-6"/> Unlock PDF Now</>
      )}
    </button>
  );

  const customPreview = (
    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-6 py-12">
       <div className="bg-slate-100 p-8 rounded-full shadow-inner border border-slate-200 relative">
          <Unlock className="w-20 h-20 text-slate-400" />
          <div className="absolute top-4 right-4 bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md">
            !
          </div>
       </div>
       <div className="text-center space-y-2 max-w-sm">
         <h3 className="text-xl font-extrabold text-slate-700">Encrypted Document</h3>
         <p className="text-slate-500 text-sm leading-relaxed">
           This document is protected with a password. We cannot render a preview until it is unlocked.
         </p>
       </div>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Unlock PDF file"
      description="Remove PDF password security, giving you the freedom to use your PDFs as you want."
      icon={Unlock}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      customPreviewNode={customPreview}
      gridMode={false}
    >
      <div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Unlock PDF</h3>
        <p className="text-gray-500 text-sm">Enter the password to decrypt the document.</p>
      </div>
      
      <div className="space-y-5">
         <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-700 tracking-wider">Document Password</label>
           <div className="relative">
             <input 
               type={showPassword ? "text" : "password"} 
               value={password}
               onChange={(e) => {
                 setPassword(e.target.value);
                 if (errorMsg) setErrorMsg(''); // clear error when typing
               }}
               className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 outline-none transition-all pr-12 ${
                 errorMsg ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50 text-red-900' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900'
               }`}
               placeholder="Enter password to unlock..."
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && canSubmit) {
                   unlockPdf();
                 }
               }}
             />
             <button 
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
             >
               {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
             </button>
           </div>
         </div>

         {errorMsg && (
           <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
             <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
             <div className="text-sm font-medium text-red-800">
               {errorMsg}
             </div>
           </div>
         )}
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
         <p className="text-sm text-slate-700 font-medium flex items-start gap-2">
           <Unlock className="w-5 h-5 text-slate-500 flex-shrink-0" /> 
           <span>Once unlocked, you can download a new PDF file with all restrictions and passwords removed.</span>
         </p>
      </div>
    </ToolPreviewLayout>
  );
}

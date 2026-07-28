import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, Lock, FileText, CheckCircle, ArrowLeft, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';

export default function ProtectPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [success, setSuccess] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  
  const [thumbnails, setThumbnails] = useState([]);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  const handleFile = async (newFile) => {
    if (newFile && newFile.type === 'application/pdf') {
      setFile(newFile);
      setSuccess(false);
      setOutputUrl(null);
      setPassword('');
      setRepeatPassword('');
      setThumbnails([]);
      setExtractingThumbs(true);
      
      try {
        const thumbs = await getPdfThumbnails(newFile, 0.5);
        setThumbnails(thumbs);
      } catch (e) {
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
    setSuccess(false);
    setOutputUrl(null);
    setPassword('');
    setRepeatPassword('');
    setThumbnails([]);
  };

  const protectPdf = async () => {
    if (!file || !password || password !== repeatPassword) return;
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Encrypt the document with the provided password
      pdfDoc.encrypt({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
        }
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setSuccess(true);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `protected_${file.name}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to protect PDF. The file might already be encrypted or corrupted.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = password.length > 0 && password === repeatPassword;

  // State 1: Upload Focus
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">Protect PDF file</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Encrypt your PDF with a password to prevent unauthorized access.
          </p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto">
          <DragDropZone 
            accept="application/pdf"
            multiple={false}
            onFileSelect={handleFile}
            label="Select PDF file"
            icon={Lock}
            className="p-20 py-32 bg-slate-50/50 hover:bg-slate-100 border-slate-300 hover:border-slate-400"
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
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">PDF is now protected!</h2>
        <p className="text-lg text-gray-600 mb-10">Your encrypted document is ready.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a 
            href={outputUrl} 
            download={`protected_${file.name}`}
            className="px-10 py-5 bg-slate-800 text-white rounded-xl font-bold text-xl hover:bg-slate-900 shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
          >
            <Download className="w-8 h-8" /> Download Protected PDF
          </a>
          <button 
            onClick={resetTool}
            className="px-8 py-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Start Over
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
          className="absolute top-6 left-6 p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900 border border-gray-200 z-10"
          title="Back to upload"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="mt-12">
          {extractingThumbs ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Rendering preview...</p>
            </div>
          ) : (
            <div className={getDynamicGridClass(thumbnails.length)}>
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
      </div>

      {/* Settings Panel (Right Sidebar) */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col bg-white border-l border-gray-200 pb-8 px-6 lg:px-0">
        <div className="p-6 lg:p-8 space-y-8 flex-1">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Protect PDF</h3>
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
        </div>

        {/* Primary Action Sticky Bottom */}
        <div className="p-6 lg:p-8 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={protectPdf} 
            disabled={loading || !canSubmit}
            className="w-full px-6 py-5 bg-slate-800 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-slate-900 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? 'Encrypting...' : (
              <><Lock className="w-6 h-6"/> Protect PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

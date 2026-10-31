import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Lock, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackEvent, trackError } from '../lib/analytics';
import { convertPdfToImages, isPdfEncrypted } from '../utils/pdfConversion';

export default function PdfToImage() {
  const isPngRoute = typeof window !== 'undefined' && window.location.pathname.includes('pdf-to-png');
  
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState(isPngRoute ? 'png' : 'jpeg'); // 'jpeg' or 'png'
  const [dpi, setDpi] = useState('medium'); // 'low' (108 DPI), 'medium' (144 DPI), 'high' (216 DPI)
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const createdUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (window.__sharedFile) {
      if (isValidPdf(window.__sharedFile)) {
        handleFile(window.__sharedFile);
      }
      window.__sharedFile = null;
    }
  }, []);

  const isValidPdf = (f) => {
    if (!f) return false;
    if (f.type === 'application/pdf') return true;
    if (/\.pdf$/i.test(f.name || '')) return true;
    return false;
  };

  const handleFile = async (newFile) => {
    if (isValidPdf(newFile)) {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      }
      setFile(newFile);
      setSuccessData(null);
      setProgress(0);
      setPassword('');
      setErrorMessage('');

      // Check if file is password-protected immediately
      const encrypted = await isPdfEncrypted(newFile);
      setPasswordRequired(encrypted);
    } else {
      alert("Please upload a valid PDF document (.pdf).");
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    const toolName = isPngRoute ? 'PDF to PNG' : 'PDF to JPG';
    trackEvent('tool_executed', { tool_name: toolName });
    setIsProcessing(true);
    setProgress(0);
    setErrorMessage('');

    try {
      const result = await convertPdfToImages(file, {
        format,
        dpi,
        password: password || undefined,
        onProgress: setProgress
      });

      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
      }
      const url = URL.createObjectURL(result.blob);
      createdUrlRef.current = url;

      setSuccessData({
        originalSize: file.size || 0,
        outputSize: result.blob.size || 0,
        url,
        filename: result.filename,
        title: result.isZip ? 'Images Ready!' : 'Image Ready!',
        subtitle: result.isZip
          ? `Successfully converted ${result.numPages} pages into ${result.format.toUpperCase()} images archive.`
          : `Successfully converted 1 page directly into ${result.format.toUpperCase()} image.`,
        downloadText: result.isZip ? 'Download Images (ZIP)' : `Download ${result.format.toUpperCase()}`,
      });
      setPasswordRequired(false);
    } catch (err) {
      trackError('Pdf To Image', 'processing_error');
      console.error("PDF conversion error:", err);
      const isPassErr = err && (err.name === 'PasswordException' || String(err.message || '').includes('password') || String(err.message || '').includes('PASSWORD_REQUIRED') || String(err.message || '').includes('Password'));
      if (isPassErr) {
        setPasswordRequired(true);
        if (password) {
          setErrorMessage('Incorrect password. Please enter the correct password.');
        } else {
          setErrorMessage('This PDF is password-protected. Please enter the password below.');
        }
      } else {
        const msg = err.message || 'Failed to convert PDF to images.';
        setErrorMessage(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    if (createdUrlRef.current) {
      URL.revokeObjectURL(createdUrlRef.current);
      createdUrlRef.current = null;
    }
    setFile(null);
    setSuccessData(null);
    setIsProcessing(false);
    setProgress(0);
    setPassword('');
    setPasswordRequired(false);
    setErrorMessage('');
  };

  const toolTitle = isPngRoute ? 'PDF to PNG' : 'PDF to JPG';
  const toolDescription = isPngRoute
    ? 'Convert every page of your PDF into high-quality, transparent PNG images.'
    : 'Convert every page of your PDF into crisp, high-quality JPG images.';

  const processButton = (
    <div className="space-y-3">
      {passwordRequired && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <Lock className="w-4 h-4 text-amber-600" /> Password Required
          </div>
          <p className="text-xs text-amber-700">This document is encrypted. Enter its password to proceed:</p>
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Enter document password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>
      )}

      {errorMessage && !passwordRequired && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button 
        onClick={handleConvert} 
        disabled={isProcessing || !file || (passwordRequired && !password.trim())}
        className="w-full px-6 py-4 bg-yellow-500 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden cursor-pointer"
      >
        {isProcessing && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-yellow-400/50 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}
        {isProcessing ? (
          <span className="relative z-10 text-yellow-900 inline-flex items-center justify-center min-w-[200px] h-7 text-sm font-bold whitespace-nowrap">
            Converting... {progress}%
          </span>
        ) : (
          <>
            <ImageIcon className="w-6 h-6 relative z-10"/> 
            Convert to {format === 'jpeg' ? 'JPG' : 'PNG'}
          </>
        )}
      </button>
    </div>
  );

  return (
    <ToolPreviewLayout
      title={toolTitle}
      description={toolDescription}
      icon={ImageIcon}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
    >
      <div className="space-y-6">
        {/* Format Selector */}
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Image Format</h3>
          <div className="flex flex-col gap-3">
            <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${format === 'jpeg' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'}`}>
              <input 
                type="radio" 
                name="format" 
                value="jpeg" 
                checked={format === 'jpeg'} 
                onChange={() => setFormat('jpeg')} 
                className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 border-gray-300" 
              />
              <div>
                <p className="font-bold text-gray-900">JPG</p>
                <p className="text-sm text-gray-500">Compact file size with clean white background, ideal for web & sharing</p>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${format === 'png' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'}`}>
              <input 
                type="radio" 
                name="format" 
                value="png" 
                checked={format === 'png'} 
                onChange={() => setFormat('png')} 
                className="w-5 h-5 text-yellow-600 focus:ring-yellow-500 border-gray-300" 
              />
              <div>
                <p className="font-bold text-gray-900">PNG</p>
                <p className="text-sm text-gray-500">Lossless compression, pixel-perfect diagrams, transparent layers</p>
              </div>
            </label>
          </div>
        </div>

        {/* Resolution / DPI Selector */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-yellow-500" /> Resolution / Quality
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'Draft', dpi: '~108 DPI', desc: 'Fastest' },
              { id: 'medium', label: 'Standard', dpi: '~144 DPI', desc: 'Recommended' },
              { id: 'high', label: 'High', dpi: '~216 DPI', desc: 'Print-Ready' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDpi(item.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  dpi === item.id 
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-900 ring-2 ring-yellow-400/30' 
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <p className="font-bold text-sm">{item.label}</p>
                <p className="text-xs text-gray-500">{item.dpi}</p>
                <p className="text-[11px] text-gray-400 mt-1">{item.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Single-page documents download directly as an image; multi-page documents are packaged into a clean ZIP archive.
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

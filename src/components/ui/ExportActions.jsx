import React, { useState, useEffect } from 'react';
import { Download, Share2, Lock, Type, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

export default function ExportActions({ pdfBytes, fileName, onReset }) {
  const [processedBytes, setProcessedBytes] = useState(pdfBytes);
  const [downloadUrl, setDownloadUrl] = useState(null);
  
  // State for features
  const [watermarkText, setWatermarkText] = useState('');
  const [isApplyingWatermark, setIsApplyingWatermark] = useState(false);
  const [watermarkApplied, setWatermarkApplied] = useState(false);

  const [password, setPassword] = useState('');
  
  const [shareStatus, setShareStatus] = useState('idle');

  // Update download URL whenever processedBytes changes
  useEffect(() => {
    if (processedBytes) {
      const blob = new Blob([processedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [processedBytes]);

  const applyWatermark = async () => {
    if (!watermarkText.trim()) return;
    setIsApplyingWatermark(true);
    try {
      const pdfDoc = await PDFDocument.load(processedBytes);
      const pages = pdfDoc.getPages();
      
      pages.forEach(page => {
        const { width, height } = page.getSize();
        const fontSize = 60;
        const textWidth = watermarkText.length * (fontSize * 0.5); // approximate
        
        page.drawText(watermarkText, {
          x: width / 2 - textWidth / 2,
          y: height / 2,
          size: fontSize,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.3,
          rotate: degrees(45),
        });
      });
      
      const newBytes = await pdfDoc.save();
      setProcessedBytes(newBytes);
      setWatermarkApplied(true);
      setWatermarkText('');
    } catch (err) {
      console.error('Failed to apply watermark:', err);
      alert('Failed to apply watermark.');
    } finally {
      setIsApplyingWatermark(false);
    }
  };

  const handleShare = async () => {
    if (!processedBytes) return;
    
    const file = new File([processedBytes], fileName, { type: 'application/pdf' });
    
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      alert("Your browser doesn't support native sharing for this file.");
      return;
    }

    setShareStatus('sharing');
    try {
      await navigator.share({
        files: [file],
        title: fileName,
        text: 'Here is my processed PDF!'
      });
      setShareStatus('success');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      setShareStatus('idle');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm animate-in fade-in zoom-in-95 mt-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-3xl font-extrabold text-gray-900 mb-2">File Ready!</h3>
        <p className="text-gray-500">Your PDF has been processed and is ready for export.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Pre-export actions */}
        <div className="space-y-6">
          <h4 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Pre-Export Additions</h4>
          
          {/* Watermark Section */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Type className="w-4 h-4 text-blue-500" /> Add Watermark
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. CONFIDENTIAL"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                disabled={watermarkApplied}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
              />
              <button
                onClick={applyWatermark}
                disabled={!watermarkText.trim() || isApplyingWatermark || watermarkApplied}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isApplyingWatermark ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Apply'}
              </button>
            </div>
            {watermarkApplied && <p className="text-xs text-green-600 font-medium">Watermark applied successfully!</p>}
          </div>

          {/* Password Protection Section */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 opacity-60">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Lock className="w-4 h-4 text-orange-500" /> Password Protect
              </label>
              <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              />
              <button disabled className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-bold cursor-not-allowed">
                Lock
              </button>
            </div>
            <p className="text-xs text-gray-500">True client-side WASM encryption is being investigated.</p>
          </div>
        </div>

        {/* Final Export Actions */}
        <div className="space-y-6 flex flex-col justify-center">
           <h4 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Export</h4>
           
           <a
             href={downloadUrl}
             download={fileName}
             className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:-translate-y-1"
           >
             <Download className="w-6 h-6" />
             Download PDF
           </a>

           <button
             onClick={handleShare}
             disabled={shareStatus === 'sharing'}
             className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
           >
             <Share2 className="w-6 h-6" />
             {shareStatus === 'sharing' ? 'Opening Share Menu...' : shareStatus === 'success' ? 'Shared!' : 'Share via OS (Mobile/Mac/Win)'}
           </button>
        </div>
      </div>
      
      {onReset && (
        <div className="text-center mt-4 border-t border-gray-100 pt-6">
          <button
            onClick={onReset}
            className="text-gray-500 hover:text-gray-900 font-medium text-sm flex items-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Start Over
          </button>
        </div>
      )}
    </div>
  );
}

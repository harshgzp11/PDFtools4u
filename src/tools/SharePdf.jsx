import React, { useState } from 'react';
import { Share2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import AdSlot from '../components/ui/AdSlot';

export default function SharePdf() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, sharing, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleShare = async () => {
    if (!file) return;

    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      setStatus('error');
      setErrorMessage("Your browser doesn't support sharing files directly, or this file type isn't allowed.");
      return;
    }

    setStatus('sharing');
    try {
      await navigator.share({
        files: [file],
        title: file.name,
        text: 'Check out this PDF file!'
      });
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setFile(null); // Reset after successful share
      }, 3000);
    } catch (error) {
      // User cancelling the share dialog throws an abort error, which we can ignore
      if (error.name === 'AbortError') {
        setStatus('idle');
      } else {
        setStatus('error');
        setErrorMessage(error.message || 'Failed to share the file.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Share PDF</h2>
        <p className="text-xl text-gray-500">
          Share your PDF directly to other apps via your system's share menu.
        </p>
      </div>

      {!file ? (
        <DragDropZone 
          accept="application/pdf"
          onFileSelect={setFile}
          label="Select a PDF to share"
          icon={Share2}
          className="p-16 py-24"
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <FileText className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 truncate mb-2">{file.name}</h3>
          <p className="text-gray-500 mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

          {status === 'error' && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Shared successfully!</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setFile(null)}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={status === 'sharing' || status === 'success'}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              <Share2 className="w-5 h-5" />
              {status === 'sharing' ? 'Sharing...' : 'Share File'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-12">
        <AdSlot />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Unlock, Eye, EyeOff, Loader2, AlertCircle, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackEvent, trackError } from '../lib/analytics';
import { inspectEncryptedPdf, unlockPdfDocument } from '../utils/pdfDecryption';

export default function UnlockPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [preflight, setPreflight] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmSignedLoss, setConfirmSignedLoss] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const activeBlobUrlRef = useRef(null);

  // Revoke object URLs to prevent browser memory leaks
  const cleanupBlobUrl = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, []);

  const handleFile = async (newFile) => {
    if (!newFile) return;

    // Validate that file is a PDF (by MIME type or filename extension)
    const isPdf = newFile.type === 'application/pdf' || newFile.name?.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      cleanupBlobUrl();
      setFile(null);
      setSuccessData(null);
      setPassword('');
      setPreflight(null);
      setConfirmSignedLoss(false);
      setErrorMsg('Please select a valid PDF document (.pdf).');
      return;
    }

    cleanupBlobUrl();
    setFile(newFile);
    setSuccessData(null);
    setPassword('');
    setErrorMsg('');
    setPreflight(null);
    setConfirmSignedLoss(false);
    setInspecting(true);

    try {
      const inspection = await inspectEncryptedPdf(newFile);
      setPreflight(inspection);
      if (!inspection.isValid) {
        setErrorMsg(inspection.error || 'Failed to inspect PDF file.');
      }
    } catch (err) {
      setErrorMsg('Failed to read the selected file: ' + (err.message || 'Unknown error'));
    } finally {
      setInspecting(false);
    }
  };

  const resetTool = () => {
    cleanupBlobUrl();
    setFile(null);
    setSuccessData(null);
    setPassword('');
    setErrorMsg('');
    setPreflight(null);
    setConfirmSignedLoss(false);
    setInspecting(false);
  };

  const unlockPdf = async () => {
    if (!file) return;

    const isPermsOnly = preflight?.hasPermissionsOnly;
    if (!isPermsOnly && !password) {
      setErrorMsg('Please enter the password to unlock this document.');
      return;
    }

    trackEvent('tool_executed', { tool_name: 'Unlock PDF file' });
    setLoading(true);
    setErrorMsg('');

    try {
      const result = await unlockPdfDocument({
        pdfData: file,
        password: password
      });

      // Clear sensitive password from memory immediately upon success
      setPassword('');

      cleanupBlobUrl();
      const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      activeBlobUrlRef.current = url;

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const downloadFilename = `${baseName}_unlocked.pdf`;

      setSuccessData({
        originalSize: file.size || 0,
        outputSize: result.outputSize || blob.size,
        url,
        filename: downloadFilename,
        title: 'PDF Unlocked Successfully!',
        subtitle: [
          result.isSigned
            ? 'Password protection removed successfully. (Note: Existing digital signatures were invalidated by security removal).'
            : 'The password protection and permission restrictions have been completely removed. You can now download the unlocked PDF.',
          result.hasActiveContent
            ? `(Active Content Notice: This document contains embedded ${result.activeContentTypes.join(', ')}. PDFTools4U preserves these structures without executing unvetted code in your browser).`
            : ''
        ].filter(Boolean).join(' '),
        downloadText: 'Download Unlocked PDF'
      });
    } catch (err) {
      let errorType = 'unknown_error';
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('password') || msg.includes('incorrect')) {
        errorType = 'invalid_password';
        setErrorMsg(err.message || 'Incorrect password. Please verify the password and try again.');
        console.warn('Unlock attempt failed: Incorrect password provided.');
      } else if (msg.includes('unsupported')) {
        errorType = 'unsupported_encryption';
        setErrorMsg(err.message);
        console.warn('Unlock attempt failed:', err.message);
      } else {
        errorType = 'processing_error';
        setErrorMsg(err.message || 'Failed to unlock document. The file might be corrupted or malformed.');
        console.error('Unlock error:', err.message || err);
      }
      trackError('Unlock PDF', errorType);
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyUnlocked = Boolean(preflight?.isValid && !preflight?.isEncrypted);
  const isPermissionsOnly = Boolean(preflight?.isValid && preflight?.hasPermissionsOnly);
  const canSubmit =
    Boolean(file) &&
    Boolean(preflight?.isValid) &&
    !isAlreadyUnlocked &&
    (password.length > 0 || isPermissionsOnly) &&
    (!preflight?.isSigned || confirmSignedLoss) &&
    !loading &&
    !inspecting;

  const processButton = isAlreadyUnlocked ? (
    <div className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
      <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        <span>Document Already Unlocked</span>
      </div>
      <p className="text-xs text-emerald-700">
        This PDF is not password-protected and does not require unlocking. It is ready for viewing, printing, and editing.
      </p>
    </div>
  ) : (
    <button
      onClick={unlockPdf}
      disabled={loading || inspecting || !canSubmit}
      className="w-full px-6 py-4 bg-emerald-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" /> Unlocking PDF...
        </>
      ) : (
        <>
          <Unlock className="w-6 h-6" /> {isPermissionsOnly && !password ? 'Remove Restrictions' : 'Unlock PDF Now'}
        </>
      )}
    </button>
  );

  const customPreview = (
    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-6 py-12 px-4">
      <div className="bg-slate-100 p-8 rounded-full shadow-inner border border-slate-200 relative">
        <Unlock className="w-16 h-16 text-slate-400" />
        {isAlreadyUnlocked ? (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md">
            ✓
          </div>
        ) : (
          <div className="absolute top-2 right-2 bg-amber-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md">
            !
          </div>
        )}
      </div>

      <div className="text-center space-y-2 max-w-sm">
        {inspecting ? (
          <div className="flex items-center justify-center gap-2 text-slate-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Inspecting document security...
          </div>
        ) : isAlreadyUnlocked ? (
          <>
            <h3 className="text-xl font-extrabold text-slate-700">Document Unlocked</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              This document has no open password or encryption restrictions.
            </p>
          </>
        ) : isPermissionsOnly ? (
          <>
            <h3 className="text-xl font-extrabold text-slate-700">Permissions Restricted</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              This document opens freely, but restricts printing or editing via an owner password.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-extrabold text-slate-700">Encrypted Document</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              This document is protected with a password. Enter credentials to unlock and preview.
            </p>
          </>
        )}
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
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-1">Unlock PDF</h3>
          <p className="text-gray-500 text-sm">
            {isPermissionsOnly
              ? 'Remove permission restrictions using an empty password or provide the owner password.'
              : 'Enter the document password to decrypt and permanently unlock the PDF.'}
          </p>
        </div>

        {/* Digital Signature Warning & Confirmation Notice */}
        {preflight?.isSigned && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed space-y-2">
              <div>
                <span className="font-bold block text-sm mb-0.5">Digital Signatures Detected</span>
                This document contains cryptographic digital signatures ({preflight.signatureNames?.join(', ') || 'Signed'}). Unlocking modifies the document structure and removes encryption, which will invalidate the digital signatures.
              </div>
              <label className="flex items-center gap-2 pt-1 font-semibold text-amber-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="confirm-signature-loss"
                  checked={confirmSignedLoss}
                  onChange={(e) => setConfirmSignedLoss(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-amber-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>I understand that existing digital signatures will be invalidated</span>
              </label>
            </div>
          </div>
        )}

        {/* Active Content Security Notice */}
        {preflight?.hasActiveContent && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              <span className="font-bold block text-sm mb-0.5">Active Content Notice</span>
              This document contains active elements ({preflight.activeContentTypes?.join(', ') || 'JavaScript actions'}). 
              PDFTools4U preserves these structures safely without executing unvetted code in your browser.
            </div>
          </div>
        )}

        {/* Already Unlocked Guidance */}
        {isAlreadyUnlocked && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <span className="font-bold block mb-1">No Password Required</span>
              This PDF document is already unencrypted. You can open, edit, and print it without any password.
            </div>
          </div>
        )}

        {/* Password Input (only shown when document is valid and encrypted) */}
        {preflight?.isValid && preflight?.isEncrypted && (
          <div className="space-y-2">
            <label
              htmlFor="pdf-password"
              className="block text-sm font-bold text-gray-700 tracking-wider"
            >
              Document Password {isPermissionsOnly && <span className="font-normal text-xs text-slate-500">(Optional for Permissions Only)</span>}
            </label>
            <div className="relative">
              <input
                id="pdf-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                disabled={loading || inspecting}
                aria-label="Document Password"
                aria-invalid={Boolean(errorMsg)}
                aria-describedby={errorMsg ? 'password-error' : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 outline-none transition-all pr-12 text-gray-900 ${
                  errorMsg
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50 text-red-900'
                    : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                }`}
                placeholder={isPermissionsOnly ? 'Leave blank or enter owner password...' : 'Enter password to unlock...'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit && !loading) {
                    unlockPdf();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            id="password-error"
            role="alert"
            className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-medium text-red-800">{errorMsg}</div>
          </div>
        )}

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-700 font-medium flex items-start gap-2 leading-relaxed">
            <Unlock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <span>
              All document processing and decryption happen locally in your browser. Your password and PDF files never leave your device.
            </span>
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

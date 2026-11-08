import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Eye, EyeOff, Loader2, AlertCircle, AlertTriangle, 
  ShieldCheck, ChevronDown, ChevronUp, ArrowRight 
} from 'lucide-react';
import { getPdfThumbnails } from '../lib/pdfRenderer';
import { getDynamicGridClass } from '../lib/utils';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackEvent, trackError } from '../lib/analytics';
import { 
  preflightInspectPdf, 
  evaluatePassword, 
  protectPdfDocument 
} from '../utils/pdfProtection';

export default function ProtectPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Advanced permissions state
  const [showPermissions, setShowPermissions] = useState(false);
  const [printingPerm, setPrintingPerm] = useState('highResolution'); // 'highResolution' | 'lowResolution' | 'none'
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowModifying, setAllowModifying] = useState(false);
  const [allowAnnotating, setAllowAnnotating] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [repeatOwnerPassword, setRepeatOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  // Status & feedback state
  const [preflight, setPreflight] = useState(null);
  const [confirmSignedLoss, setConfirmSignedLoss] = useState(false);
  const [confirmPdf20Downgrade, setConfirmPdf20Downgrade] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [extractingThumbs, setExtractingThumbs] = useState(false);

  // Memory management: retain created object URL to revoke on cleanup/unmount
  const activeBlobUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, []);

  const clearBlobUrl = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  };

  const handleFile = async (newFile) => {
    if (!newFile) return;

    // Validate that file is a PDF (by MIME type or filename extension)
    const isPdf = newFile.type === 'application/pdf' || newFile.name?.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMsg('Please select a valid PDF document (.pdf).');
      return;
    }

    clearBlobUrl();
    setFile(newFile);
    setSuccessData(null);
    setPassword('');
    setRepeatPassword('');
    setOwnerPassword('');
    setRepeatOwnerPassword('');
    setConfirmSignedLoss(false);
    setConfirmPdf20Downgrade(false);
    setErrorMsg('');
    setThumbnails([]);
    setPreflight(null);

    // Preflight inspection
    try {
      const inspectResult = await preflightInspectPdf(newFile);
      setPreflight(inspectResult);

      if (!inspectResult.isValid) {
        setErrorMsg(inspectResult.error);
        return;
      }

      // If document is valid, render preview thumbnails
      setExtractingThumbs(true);
      try {
        const thumbs = await getPdfThumbnails(newFile, 0.5);
        setThumbnails(thumbs);
      } catch (thumbErr) {
        console.warn('Could not render thumbnails:', thumbErr);
      } finally {
        setExtractingThumbs(false);
      }
    } catch (err) {
      trackError('Protect Pdf', 'preflight_error');
      setErrorMsg(err.message || 'Failed to inspect PDF file.');
    }
  };

  const resetTool = () => {
    clearBlobUrl();
    setFile(null);
    setSuccessData(null);
    setPassword('');
    setRepeatPassword('');
    setOwnerPassword('');
    setRepeatOwnerPassword('');
    setShowPermissions(false);
    setConfirmSignedLoss(false);
    setConfirmPdf20Downgrade(false);
    setPreflight(null);
    setErrorMsg('');
    setThumbnails([]);
  };

  // Live password evaluations
  const userEval = evaluatePassword(password);
  const ownerEval = evaluatePassword(ownerPassword);

  const passwordsMatch = password.length > 0 && password === repeatPassword;
  const ownerPasswordsMatch = !ownerPassword || ownerPassword === repeatOwnerPassword;
  const passwordsDifferent = !ownerPassword || !password || ownerPassword !== password;

  const canSubmit = 
    Boolean(file) && 
    preflight?.isValid && 
    passwordsMatch && 
    userEval.isValid && 
    ownerPasswordsMatch && 
    passwordsDifferent && 
    (!ownerPassword || ownerEval.isValid) && 
    (!preflight?.isSigned || confirmSignedLoss) &&
    (!preflight?.isPdf20 || confirmPdf20Downgrade) &&
    !loading;

  const protectPdf = async () => {
    if (!canSubmit) return;
    trackEvent('tool_executed', { tool_name: 'Protect PDF file' });
    setLoading(true);
    setErrorMsg('');

    try {
      const arrayBuffer = await file.arrayBuffer();

      const permissionsConfig = {
        printing: printingPerm === 'none' ? false : printingPerm,
        copying: allowCopying,
        modifying: allowModifying,
        annotating: allowAnnotating,
        fillingForms: allowAnnotating,
        contentAccessibility: true,
        documentAssembly: allowModifying
      };

      const result = await protectPdfDocument({
        pdfData: arrayBuffer,
        userPassword: password,
        ownerPassword: ownerPassword || '',
        permissions: permissionsConfig
      });

      clearBlobUrl();
      const blob = new Blob([result.pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      activeBlobUrlRef.current = url;

      let subtitle = 'Your document is now encrypted with standard 128-bit AES encryption.';
      if (result.wasDowngradedFrom20) {
        subtitle += ' Encapsulated in a PDF 1.7 container for compatibility.';
      }
      if (result.isAutoGeneratedOwner) {
        subtitle += ' Permissions locked via internal random key.';
      }

      setSuccessData({
        originalSize: file.size,
        outputSize: result.outputSize,
        url,
        filename: `protected_${file.name.replace(/\.pdf$/i, '')}.pdf`,
        downloadText: 'Download Protected PDF',
        title: 'PDF Protected Successfully!',
        subtitle,
      });
    } catch (err) {
      trackError('Protect Pdf', 'processing_error');
      console.error('Protect PDF error:', err);
      setErrorMsg(err.message || 'Failed to protect PDF. The document may be corrupted or unsupported.');
    } finally {
      setLoading(false);
    }
  };

  const processButton = (
    <button 
      onClick={protectPdf} 
      disabled={!canSubmit || extractingThumbs}
      className="w-full px-6 py-4 bg-slate-800 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
    >
      {loading ? (
        <><Loader2 className="w-6 h-6 animate-spin"/> Encrypting PDF...</>
      ) : (
        <><Lock className="w-6 h-6"/> Protect PDF Now</>
      )}
    </button>
  );

  const customPreview = (
    <div className="w-full h-full flex flex-col">
      {extractingThumbs ? (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-slate-600" />
          <p className="font-medium animate-pulse text-slate-600">Rendering document preview...</p>
        </div>
      ) : thumbnails.length > 0 ? (
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
                
                <div className="absolute inset-0 bg-slate-900/20 flex flex-col items-center justify-center pointer-events-none">
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
      ) : (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 gap-4 p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <p className="font-bold text-slate-700 text-base">{file ? file.name : 'No PDF selected'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {preflight?.pageCount ? `${preflight.pageCount} pages ready to encrypt` : 'Select a PDF to begin'}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Protect PDF file"
      description="Encrypt your PDF with standard AES encryption to prevent unauthorized access."
      icon={Lock}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      customPreviewNode={customPreview}
      mobileDefaultTab="settings"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-1">Set Document Password</h3>
          <p className="text-gray-500 text-sm">
            Recipients must enter this password to open and view the document.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-bold">Cannot Protect Document</p>
              <p className="mt-0.5">{errorMsg}</p>
              {preflight?.isEncrypted && (
                <a 
                  href="/unlock-pdf" 
                  className="inline-flex items-center gap-1.5 mt-2 font-bold text-red-700 hover:text-red-900 underline"
                >
                  Go to Unlock PDF tool <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Digital Signature Warning */}
        {preflight?.isSigned && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 flex-1">
              <p className="font-bold">Digital Signature Notice</p>
              <p className="mt-0.5">
                This document contains digital signatures ({preflight.signatureNames?.join(', ') || 'signed field'}). 
                Applying password encryption alters the binary object structure and will permanently invalidate existing cryptographic signatures.
              </p>
              <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none text-xs font-bold text-amber-900 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200">
                <input 
                  type="checkbox"
                  checked={confirmSignedLoss}
                  onChange={(e) => setConfirmSignedLoss(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                />
                <span>I understand and confirm that encrypting this PDF will invalidate its digital signatures</span>
              </label>
            </div>
          </div>
        )}

        {/* PDF 2.0 Compatibility Notice */}
        {preflight?.isPdf20 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 flex-1">
              <p className="font-bold">PDF 2.0 Compatibility Notice</p>
              <p className="mt-0.5">
                This document conforms to PDF 2.0 (ISO 32000-2). The PDF 2.0 standard deprecates AES-128 encryption. 
                To encrypt this document in-browser, it will be encapsulated in a universally compatible PDF 1.7 container with AES-128 encryption.
              </p>

              {preflight.featureInspection?.status === 'detected' && preflight.advancedFeatures?.length > 0 && (
                <div className="mt-2.5 p-2.5 bg-amber-100/90 rounded-lg border border-amber-300 text-xs text-amber-950">
                  <p className="font-bold">Unsupported Advanced Features Detected:</p>
                  <p className="mt-0.5">{preflight.advancedFeatures.join(', ')}</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    These features cannot be preserved under PDF 1.7 encapsulation and will be omitted or simplified.
                  </p>
                </div>
              )}

              {preflight.featureInspection?.status === 'incomplete' && (
                <div className="mt-2.5 p-2.5 bg-amber-100/90 rounded-lg border border-amber-300 text-xs text-amber-950">
                  <p className="font-bold">Preflight Feature Inspection Incomplete:</p>
                  <p className="mt-0.5">{preflight.featureInspection.reason}</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    Caution: Because inspection was incomplete, uninspected pages may still contain advanced features that cannot be preserved.
                  </p>
                </div>
              )}

              {preflight.featureInspection?.status === 'not_detected' && (
                <div className="mt-2.5 p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                  <span className="font-bold">Preflight Scan Complete:</span> No unsupported advanced features detected across {preflight.pageCount} page(s). Standard content will be preserved.
                </div>
              )}

              <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none text-xs font-bold text-amber-900 bg-amber-100/70 p-2.5 rounded-lg border border-amber-200">
                <input 
                  type="checkbox"
                  checked={confirmPdf20Downgrade}
                  onChange={(e) => setConfirmPdf20Downgrade(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                />
                <span>I understand and accept encapsulation into a PDF 1.7 container</span>
              </label>
            </div>
          </div>
        )}

        {/* Password Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold text-gray-700">Document Open Password</label>
              {password && (
                <span className={`text-xs font-bold ${userEval.color}`}>
                  {userEval.label}
                </span>
              )}
            </div>
            
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) protectPdf();
                }}
                disabled={loading}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all pr-12 text-gray-900 ${
                  userEval.hasUnsupportedUnicode ? 'border-red-400 bg-red-50/50' : 'border-gray-300'
                }`}
                placeholder="Enter open password..."
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Strength Indicator Bar */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${userEval.barColor}`} 
                    style={{ width: `${Math.max(userEval.score, 10)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Password Validation Guidance */}
            {userEval.hasUnsupportedUnicode && (
              <p className="text-xs text-red-600 font-medium">
                Unsupported character detected ({userEval.unsupportedChar}). PDF Standard Security requires standard Latin-1 characters.
              </p>
            )}
            {userEval.hasLeadingOrTrailingSpaces && (
              <p className="text-xs text-amber-600 font-medium">
                Note: Password contains leading or trailing spaces that are part of the encryption key.
              </p>
            )}
            {userEval.isLong && (
              <p className="text-xs text-slate-500 font-medium">
                Note: Under the PDF standard (ISO 32000-1), encryption keys are derived from the first 32 characters. Any characters beyond 32 do not increase security.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700">Confirm Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) protectPdf();
              }}
              disabled={loading}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 outline-none transition-all pr-12 text-gray-900 ${
                repeatPassword && password !== repeatPassword 
                  ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/50' 
                  : 'border-gray-300 focus:ring-slate-500 focus:border-slate-500'
              }`}
              placeholder="Repeat password..."
            />
            {repeatPassword && password !== repeatPassword && (
              <p className="text-xs text-red-500 font-medium">Passwords do not match.</p>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Permissions */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setShowPermissions(!showPermissions)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-600" />
              <span className="font-bold text-sm text-slate-800">Advanced Document Permissions (Optional)</span>
            </div>
            {showPermissions ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {showPermissions && (
            <div className="p-4 space-y-4 border-t border-slate-200 bg-white">
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Viewer Permissions
                </label>

                {/* Printing Option */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Printing Access</label>
                  <select
                    value={printingPerm}
                    onChange={(e) => setPrintingPerm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                  >
                    <option value="highResolution">High-Resolution Printing Allowed (Default)</option>
                    <option value="lowResolution">Low-Resolution Printing Only</option>
                    <option value="none">Printing Forbidden</option>
                  </select>
                </div>

                {/* Copying Restriction */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={(e) => setAllowCopying(e.target.checked)}
                    className="mt-1 w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800 block">Allow Content Copying</span>
                    <span className="text-xs text-slate-500 block">Allow viewers to select and extract text and graphics</span>
                  </div>
                </label>

                {/* Modifying Restriction */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allowModifying}
                    onChange={(e) => setAllowModifying(e.target.checked)}
                    className="mt-1 w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800 block">Allow Document Editing</span>
                    <span className="text-xs text-slate-500 block">Allow viewers to alter pages and document contents</span>
                  </div>
                </label>

                {/* Annotating Restriction */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={allowAnnotating}
                    onChange={(e) => setAllowAnnotating(e.target.checked)}
                    className="mt-1 w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800 block">Allow Form Filling & Comments</span>
                    <span className="text-xs text-slate-500 block">Allow viewers to fill forms and add comment annotations</span>
                  </div>
                </label>
              </div>

              {/* Owner / Permissions Password */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-800">Permissions (Owner) Password</label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Optional password to unlock permission restrictions in PDF editors.
                  </p>
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
                    <strong>Important Consequence:</strong> If you restrict permissions and leave this field blank, a random 32-character key is generated internally to lock permissions. Neither you nor recipients will be able to unlock or modify these permissions later. If you might need to edit or print this document later, specify an Owner Password above.
                  </div>
                </div>

                <div className="relative">
                  <input 
                    type={showOwnerPassword ? "text" : "password"} 
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    disabled={loading}
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-sm pr-10 ${
                      ownerPassword && ownerPassword === password 
                        ? 'border-red-400 bg-red-50/50' 
                        : 'border-slate-300'
                    }`}
                    placeholder="Optional permissions password..."
                  />
                  <button 
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showOwnerPassword ? "Hide permissions password" : "Show permissions password"}
                  >
                    {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {ownerPassword && ownerPassword === password && (
                  <p className="text-xs text-red-600 font-medium">
                    Permissions password must be different from the Document Open password.
                  </p>
                )}

                {ownerPassword && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Confirm Permissions Password</label>
                    <input 
                      type={showOwnerPassword ? "text" : "password"} 
                      value={repeatOwnerPassword}
                      onChange={(e) => setRepeatOwnerPassword(e.target.value)}
                      disabled={loading}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg focus:ring-2 outline-none text-sm ${
                        repeatOwnerPassword && ownerPassword !== repeatOwnerPassword
                          ? 'border-red-400 bg-red-50/50'
                          : 'border-slate-300 focus:ring-slate-500'
                      }`}
                      placeholder="Repeat permissions password..."
                    />
                    {repeatOwnerPassword && ownerPassword !== repeatOwnerPassword && (
                      <p className="text-xs text-red-500 font-medium">Permissions passwords do not match.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Reader Enforcement Disclosure */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong>Standard Reader Enforcement:</strong> Permission restrictions (printing, copying, editing) are enforced by compliant PDF viewers (Adobe Acrobat, Edge, Chrome, Apple Preview). Document Open Passwords provide cryptographic AES encryption.
              </div>
            </div>
          )}
        </div>

        {/* Informational Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-700 font-medium flex items-start gap-2.5">
            <Lock className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" /> 
            <span>
              Your file is encrypted locally in your browser using standard 128-bit AES encryption. Be sure to save your password; lost passwords cannot be recovered.
            </span>
          </p>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

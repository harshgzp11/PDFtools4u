import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Download, SplitSquareVertical, CheckCircle, FileOutput, GripHorizontal, 
  File, AlertCircle, Info 
} from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackEvent, trackError } from '../lib/analytics';
import { 
  getDefaultRange, 
  getSafeBaseName, 
  validateAndParseRanges, 
  formatPageSetToRanges,
  parseKeywords
} from '../utils/pdfSplitUtils';

export default function PdfSplitter() {
  const [file, setFile] = useState(null);
  const [splitMode, setSplitMode] = useState('ranges'); // 'ranges' or 'single'
  const [pageRange, setPageRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Active object URL reference for memory leak prevention
  const activeUrlRef = useRef(null);

  const revokeActiveUrl = useCallback(() => {
    if (activeUrlRef.current) {
      try {
        URL.revokeObjectURL(activeUrlRef.current);
      } catch {
        // Safe fallback
      }
      activeUrlRef.current = null;
    }
  }, []);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      revokeActiveUrl();
    };
  }, [revokeActiveUrl]);

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    // MIME type check with extension fallback (.pdf / .PDF)
    const isPdf = selectedFile.type === 'application/pdf' || /\.pdf$/i.test(selectedFile.name || '');
    if (!isPdf) {
      toast.error('Please select a valid PDF file (.pdf).');
      return;
    }

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('The selected PDF file is empty (0 bytes).');
      }

      const { PDFDocument } = await import('pdf-lib');
      let pdf;
      try {
        pdf = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
      } catch (loadErr) {
        if (String(loadErr.message || '').includes('encrypted') || loadErr.name === 'PasswordException') {
          throw new Error('This PDF is password-protected. Please unlock it using the Unlock PDF tool first.');
        }
        throw new Error('Could not parse PDF. The file may be corrupted, truncated, or not a valid PDF.');
      }

      const pages = pdf.getPageCount();
      if (!pages || pages < 1) {
        throw new Error('The PDF document contains no pages.');
      }

      // PDF is verified and readable: release previous URL and commit state
      revokeActiveUrl();
      setFile(selectedFile);
      setSuccessData(null);
      setPdfInfo({ pages });
      setPageRange(getDefaultRange(pages));
      setSplitMode('ranges');
      toast.success(`Loaded "${selectedFile.name}" (${pages} pages).`);
    } catch (err) {
      trackError('Pdf Splitter', 'processing_error');
      console.error('PDF load failed:', err);
      toast.error(err.message || 'Could not read PDF info.');
      // Do not leave application in broken state if no previous valid file
      if (!pdfInfo) {
        setFile(null);
        setPdfInfo(null);
        setPageRange('');
      }
    }
  };

  const resetTool = () => {
    revokeActiveUrl();
    setFile(null);
    setPageRange('');
    setPdfInfo(null);
    setSuccessData(null);
    setSplitMode('ranges');
  };

  // Memoized strict range validation result
  const rangeValidation = useMemo(() => {
    return validateAndParseRanges(pageRange, pdfInfo?.pages);
  }, [pageRange, pdfInfo?.pages]);

  // For the grid preview highlight
  const validIndices = useMemo(() => {
    if (splitMode === 'single' && pdfInfo) {
      return new Set(Array.from({ length: pdfInfo.pages }, (_, i) => i));
    }
    return rangeValidation.selectedIndices;
  }, [rangeValidation, pdfInfo, splitMode]);

  // Interactive thumbnail click handler (toggles inclusion in ranges)
  const handleTogglePage = (pageNum) => {
    if (!pdfInfo) return;

    if (splitMode === 'single') {
      // Switching from all-pages mode to custom range with this single page
      setSplitMode('ranges');
      setPageRange(String(pageNum));
      return;
    }

    const activeIndices = rangeValidation.isValid ? rangeValidation.selectedIndices : new Set();
    const newPageSet = new Set();
    activeIndices.forEach(zeroIdx => newPageSet.add(zeroIdx + 1));

    if (newPageSet.has(pageNum)) {
      newPageSet.delete(pageNum);
    } else {
      newPageSet.add(pageNum);
    }

    const newRangeStr = formatPageSetToRanges(newPageSet);
    setPageRange(newRangeStr);
  };

  // Helper to copy source document metadata to output segments independently
  const copyMetadata = (sourcePdf, targetPdf) => {
    // 1. Title
    try {
      const title = sourcePdf.getTitle();
      if (title && typeof title === 'string') targetPdf.setTitle(title);
    } catch {
      // Non-fatal
    }

    // 2. Author
    try {
      const author = sourcePdf.getAuthor();
      if (author && typeof author === 'string') targetPdf.setAuthor(author);
    } catch {
      // Non-fatal
    }

    // 3. Subject
    try {
      const subject = sourcePdf.getSubject();
      if (subject && typeof subject === 'string') targetPdf.setSubject(subject);
    } catch {
      // Non-fatal
    }

    // 4. Keywords: safely convert string/array to Array<string> required by pdf-lib
    try {
      const rawKeywords = sourcePdf.getKeywords();
      if (rawKeywords) {
        const keywordList = parseKeywords(rawKeywords);
        if (keywordList.length > 0) {
          targetPdf.setKeywords(keywordList);
        }
      }
    } catch {
      // Non-fatal: keyword failure must never prevent subsequent metadata
    }

    // 5. Producer: independent preservation
    try {
      const producer = sourcePdf.getProducer();
      if (producer && typeof producer === 'string' && producer.trim()) {
        targetPdf.setProducer(producer.trim());
      }
    } catch {
      // Non-fatal
    }
  };

  const splitPdf = async () => {
    if (!file || (splitMode === 'ranges' && !rangeValidation.isValid)) return;
    trackEvent('tool_executed', { tool_name: 'Split PDF' });
    setLoading(true);
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const safeBase = getSafeBaseName(file.name);
      const folderName = `${safeBase}_split`;
      const folder = zip.folder(folderName);

      const arrayBuffer = await file.arrayBuffer();
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
      const numPages = pdf.getPageCount();

      if (splitMode === 'single') {
        for (let i = 1; i <= numPages; i++) {
          const newPdf = await PDFDocument.create();
          copyMetadata(pdf, newPdf);
          const [copiedPage] = await newPdf.copyPages(pdf, [i - 1]);
          newPdf.addPage(copiedPage);
          const pdfBytes = await newPdf.save();
          folder.file(`page_${i}.pdf`, pdfBytes);
        }
      } else {
        const ranges = rangeValidation.validRanges;
        for (let idx = 0; idx < ranges.length; idx++) {
          const range = ranges[idx];
          const newPdf = await PDFDocument.create();
          copyMetadata(pdf, newPdf);
          const indices = [];
          for (let i = range.start; i <= range.end; i++) {
            indices.push(i - 1);
          }
          const copiedPages = await newPdf.copyPages(pdf, indices);
          copiedPages.forEach(p => newPdf.addPage(p));
          const pdfBytes = await newPdf.save();
          
          const filename = range.start === range.end 
            ? `part${idx+1}_page_${range.start}.pdf` 
            : `part${idx+1}_pages_${range.start}-${range.end}.pdf`;
            
          folder.file(filename, pdfBytes);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      
      // Revoke prior URL before assigning new one
      revokeActiveUrl();
      const url = URL.createObjectURL(content);
      activeUrlRef.current = url;
      
      setSuccessData({
        originalSize: file?.size || 0,
        outputSize: content.size || 0,
        url,
        filename: `${folderName}.zip`,
        downloadText: 'Download Split PDFs (ZIP)',
        title: 'PDF Split Successfully!',
        subtitle: `Your split PDFs are packaged in a ZIP archive (${(content.size / 1024).toFixed(1)} KB).`,
      });
      toast.success('PDF split completed successfully!');
    } catch (err) {
      trackError('Pdf Splitter', 'processing_error');
      console.error('Split error:', err);
      toast.error(err.message || 'Failed to split PDF.');
    } finally {
      setLoading(false);
    }
  };

  const renderGridItem = (thumb, idx) => {
    const isSelected = validIndices.has(idx);
    const pageNum = idx + 1;
    
    return (
      <div 
        key={thumb.id}
        role="button"
        tabIndex={0}
        aria-label={`Page ${pageNum}, ${isSelected ? 'included in split' : 'excluded from split'}`}
        aria-pressed={isSelected}
        onClick={() => handleTogglePage(pageNum)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTogglePage(pageNum);
          }
        }}
        className={`relative aspect-[1/1.4] rounded-xl shadow-md border-4 overflow-hidden flex flex-col transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:scale-[1.02] ${
          isSelected 
            ? 'border-indigo-500 bg-indigo-50 opacity-100' 
            : 'border-transparent bg-white opacity-40 grayscale hover:opacity-75'
        }`}
      >
        <img 
          src={thumb.dataUrl} 
          alt={`Page ${pageNum}`} 
          className="w-full h-full object-cover pointer-events-none"
        />
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-indigo-500/10">
            <CheckCircle className="w-12 h-12 text-indigo-500 drop-shadow-md" />
          </div>
        )}
        <div className={`absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center shadow-sm ${
          isSelected ? 'bg-indigo-500 border-indigo-600 text-white' : 'bg-white/90 border-gray-300 text-gray-700'
        }`}>
          {pageNum}
        </div>
      </div>
    );
  };

  const isProcessDisabled = loading || (splitMode === 'ranges' && !rangeValidation.isValid);

  const processButton = (
    <button 
      onClick={splitPdf} 
      disabled={isProcessDisabled}
      className="w-full px-6 py-4 bg-indigo-600 border border-transparent rounded-xl shadow-lg text-lg font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {loading ? 'Processing...' : (
        <><Download className="w-6 h-6"/> Split PDF to ZIP</>
      )}
    </button>
  );

  return (
    <ToolPreviewLayout
      title="Split PDF"
      description="Divide a PDF into multiple smaller PDF files by defining ranges or splitting every page."
      icon={SplitSquareVertical}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={loading}
      successData={successData}
      processButton={processButton}
      gridMode={true}
      renderGridItem={renderGridItem}
      gridQuality={0.4}
    >
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Split Mode</h3>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button 
            type="button"
            onClick={() => setSplitMode('ranges')}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-colors cursor-pointer ${
              splitMode === 'ranges' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <GripHorizontal className="w-6 h-6 mb-2" />
            <span className="text-sm">Custom Ranges</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setSplitMode('single')}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-colors cursor-pointer ${
              splitMode === 'single' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileOutput className="w-6 h-6 mb-2" />
            <span className="text-sm">Single Pages</span>
          </button>
        </div>

        {splitMode === 'ranges' && (
          <div className="p-5 border border-indigo-100 bg-indigo-50 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label htmlFor="split-page-range" className="block text-sm font-bold text-gray-700 mb-2">
                Define Ranges
              </label>
              <input 
                id="split-page-range"
                type="text" 
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1-3, 4-5"
                aria-describedby={rangeValidation.error ? "split-range-error" : "split-range-help"}
                aria-invalid={!rangeValidation.isValid}
                className={`w-full border rounded-lg shadow-sm px-4 py-3 text-sm focus:ring-2 outline-none transition-colors ${
                  rangeValidation.error
                    ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-white'
                    : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                }`}
              />
              {rangeValidation.error ? (
                <p id="split-range-error" className="text-xs font-semibold text-rose-600 mt-2 flex items-center gap-1.5" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rangeValidation.error}</span>
                </p>
              ) : (
                <p id="split-range-help" className="text-xs text-indigo-700 font-medium mt-2">
                  Comma-separate to create multiple PDF files. You can also click page thumbnails to toggle selection.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm font-medium text-gray-600 mt-2">
          <div className="flex items-center gap-2">
            <File className="w-4 h-4" />
            <span>Output Files:</span>
          </div>
          <span 
            className="text-indigo-600 font-bold bg-indigo-100 px-2 py-0.5 rounded-full"
            aria-live="polite"
          >
            {splitMode === 'single' ? (pdfInfo?.pages || 0) : rangeValidation.validRanges.length} PDFs
          </span>
        </div>

        {/* Feature limitation & preservation notice */}
        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Preservation Notice:</strong> Interactive form fields and document bookmarks may not be preserved when splitting PDFs.
          </span>
        </div>
      </div>
    </ToolPreviewLayout>
  );
}

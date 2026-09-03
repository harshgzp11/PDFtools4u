import React, { useState, useRef, useEffect } from 'react';
import { FileCode, Upload, FileText, Settings2, Download, AlertCircle, FileDigit, Eye, Printer, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ToolLayout from '../components/ui/ToolLayout';

export default function HtmlToPdf() {
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('html'); // 'html', 'css', or 'preview'
  
  // Settings
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [format, setFormat] = useState('a4'); // 'a4' | 'letter'
  const [margin, setMargin] = useState('standard'); // 'none' (0) | 'compact' (5mm) | 'standard' (10mm)
  const [scale, setScale] = useState(2);
  const [allowJS, setAllowJS] = useState(false); // Security toggle
  
  const previewIframeRef = useRef(null);

  // Update preview when content changes and tab is preview
  useEffect(() => {
    if (activeTab === 'preview' && previewIframeRef.current) {
      const doc = previewIframeRef.current.contentWindow.document;
      const completeHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>${cssContent}</style>
          </head>
          <body>${htmlContent}</body>
        </html>
      `;
      doc.open();
      doc.write(completeHTML);
      doc.close();
    }
  }, [activeTab, htmlContent, cssContent]);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'html') setHtmlContent(event.target.result);
      if (type === 'css') setCssContent(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const getMarginMM = () => {
    const marginMap = { 'none': 0, 'compact': 5, 'standard': 10 };
    return marginMap[margin];
  };

  const generateCanvasPDF = async () => {
    if (!htmlContent.trim()) {
      toast.error('Please provide some HTML content');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Generating PDF via Canvas...');

    try {
      const iframe = document.createElement('iframe');
      // Fix #5: JavaScript execution toggle
      iframe.sandbox = allowJS ? "allow-same-origin allow-scripts" : "allow-same-origin"; 
      iframe.style.position = 'absolute';
      iframe.style.width = format === 'a4' ? '794px' : '816px'; 
      iframe.style.height = '1000px'; // Will expand dynamically
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const marginMM = getMarginMM();

      // Fix #2 partial: Add page break CSS to avoid splitting elements mid-way
      const pageBreakCSS = `
        p, h1, h2, h3, h4, h5, h6, tr, img, div, table, ul, ol, li {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        body {
          margin: 0;
          padding: ${marginMM}mm;
          font-family: sans-serif;
        }
      `;

      const completeHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${pageBreakCSS}
              ${cssContent}
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(completeHTML);
      doc.close();

      await new Promise(resolve => {
        iframe.onload = () => resolve();
        setTimeout(resolve, 1500); 
      });

      const element = doc.body;
      iframe.style.height = element.scrollHeight + 'px';

      // Fix #1 partial workaround: using html2canvas. 
      // (The true fix is the Native Print button below)
      const canvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Slice the image into multiple pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight; 
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save('html-converted-image.pdf');
      document.body.removeChild(iframe);
      toast.success('Canvas PDF generated successfully!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF. Check console for details.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fix #1 and #2: Native browser print allows true text selection and native page break handling
  const generateNativePDF = () => {
    if (!htmlContent.trim()) {
      toast.error('Please provide some HTML content');
      return;
    }

    const marginMM = getMarginMM();
    const completeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>HTML to PDF Export</title>
          <style>
            @page {
              size: ${format} ${orientation};
              margin: ${marginMM}mm;
            }
            body { margin: 0; font-family: sans-serif; }
            ${cssContent}
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    // Open in a new window/tab to trigger native print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to use Native Print.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(completeHTML);
    printWindow.document.close();
  };

  return (
    <ToolLayout
      title="HTML to PDF Converter"
      description="Convert HTML code or files to high-quality PDF documents securely."
      icon={<FileCode className="w-8 h-8 text-blue-500" />}
    >
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden relative">
          {/* Header Tabs - Fix #3: Added Preview Tab */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={() => setActiveTab('html')}
              className={`flex-1 py-4 px-4 sm:px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'html' ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileCode className="w-4 h-4" />
              HTML Code
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`flex-1 py-4 px-4 sm:px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'css' ? 'text-pink-600 bg-white border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Custom CSS
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-4 px-4 sm:px-6 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'preview' ? 'text-emerald-600 bg-white border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="w-4 h-4" />
              Live Preview
            </button>
          </div>

          <div className="p-6">
            <div className="relative mb-6">
              {activeTab === 'preview' ? (
                <div className="w-full h-[400px] sm:h-[500px] border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <iframe
                    ref={previewIframeRef}
                    title="Live Preview"
                    className="w-full h-full border-none bg-white"
                    sandbox={allowJS ? "allow-same-origin allow-scripts" : "allow-same-origin"}
                  />
                </div>
              ) : (
                <>
                  <textarea
                    value={activeTab === 'html' ? htmlContent : cssContent}
                    onChange={(e) => activeTab === 'html' ? setHtmlContent(e.target.value) : setCssContent(e.target.value)}
                    placeholder={activeTab === 'html' 
                      ? "Paste your raw HTML code here...\n\nExample:\n<h1>Hello World</h1>\n<p>This is a test document.</p>" 
                      : "Paste your custom CSS here...\n\nExample:\nh1 {\n  color: blue;\n  text-align: center;\n}"}
                    className="w-full h-[400px] sm:h-[500px] p-5 bg-gray-900 text-gray-100 font-mono text-sm rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all custom-scrollbar"
                    spellCheck="false"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-white/10">
                      <Upload className="w-4 h-4" />
                      Upload .{activeTab === 'html' ? 'html' : 'css'}
                      <input
                        type="file"
                        accept={activeTab === 'html' ? ".html,.htm" : ".css"}
                        onChange={(e) => handleFileUpload(e, activeTab)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Fix #4: CORS / Asset Warning Banner */}
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <strong>External Images & CORS:</strong> Due to browser security, images hosted on external servers must support CORS or be Base64 encoded. If images appear blank in the Canvas PDF, try using the Native Print option instead.
              </div>
            </div>

            {/* Settings Bar */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileDigit className="w-3.5 h-3.5" /> Orientation
                </label>
                <select 
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Format
                </label>
                <select 
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="a4">A4</option>
                  <option value="letter">US Letter</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" /> Margins
                </label>
                <select 
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="none">None (0mm)</option>
                  <option value="compact">Compact (5mm)</option>
                  <option value="standard">Standard (10mm)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Canvas Scale
                </label>
                <select 
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value={1}>1x (Standard)</option>
                  <option value={2}>2x (Crisp Text)</option>
                  <option value={3}>3x (Ultra HD)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Security
                </label>
                <label className="flex items-center gap-2 cursor-pointer h-[42px] px-3 bg-white border border-gray-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={allowJS}
                    onChange={(e) => setAllowJS(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">Allow Scripts</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={generateNativePDF}
                disabled={isProcessing}
                className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-800 border-2 border-gray-200 rounded-2xl font-bold text-lg hover:border-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
              >
                <Printer className="w-6 h-6 text-gray-600 group-hover:text-gray-900" />
                <div className="flex flex-col items-start text-left">
                  <span>Print Native PDF</span>
                  <span className="text-xs font-normal text-gray-500">Perfect text & page breaks</span>
                </div>
              </button>

              <button
                onClick={generateCanvasPDF}
                disabled={isProcessing}
                className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
                )}
                <div className="flex flex-col items-start text-left">
                  <span>{isProcessing ? 'Generating...' : 'Export Canvas PDF'}</span>
                  <span className="text-xs font-normal text-indigo-200">Exact layout snapshot</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Security / Info Banner */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0 mt-0.5">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-900 mb-1">100% Client-Side Processing</h4>
            <p className="text-emerald-700 text-sm leading-relaxed">
              Your HTML code is rendered entirely inside your browser. No code or sensitive data is ever uploaded to external servers. Use Native Print for selectable text, or Canvas Export for a pixel-perfect image snapshot.
            </p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}

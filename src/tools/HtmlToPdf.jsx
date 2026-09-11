import React, { useState, useRef, useEffect } from 'react';
import { 
  FileCode, Upload, FileText, Settings2, Download, AlertCircle, 
  FileDigit, Eye, Printer, ShieldAlert, Sparkles, RefreshCw, Check, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { safeHtml2Canvas } from '../utils/canvasUtils';

// Starter templates for quick testing & real-world utility
const TEMPLATES = {
  invoice: {
    name: 'Modern Invoice',
    icon: '🧾',
    html: `<div class="invoice-box">
  <div class="header">
    <div>
      <h1 class="logo">ACME Corp</h1>
      <p class="sub">123 Innovation Way, Suite 400<br/>San Francisco, CA 94107</p>
    </div>
    <div class="inv-meta">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> INV-2026-089</p>
      <p><strong>Date:</strong> Sep 9, 2026</p>
      <p><strong>Due Date:</strong> Sep 23, 2026</p>
    </div>
  </div>

  <hr class="divider"/>

  <div class="bill-to">
    <h3>Billed To:</h3>
    <p><strong>Starlight Technologies</strong></p>
    <p>Attn: Jane Doe</p>
    <p>789 Market Street, 10th Floor</p>
    <p>San Francisco, CA 94103</p>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Hours/Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Full-Stack Web Application Development (Phase 1)</td>
        <td class="text-right">40</td>
        <td class="text-right">$125.00</td>
        <td class="text-right">$5,000.00</td>
      </tr>
      <tr>
        <td>UI/UX High-Fidelity Prototyping & Design System</td>
        <td class="text-right">15</td>
        <td class="text-right">$110.00</td>
        <td class="text-right">$1,650.00</td>
      </tr>
      <tr>
        <td>Automated Testing & Client-Side PDF Engine Optimization</td>
        <td class="text-right">10</td>
        <td class="text-right">$130.00</td>
        <td class="text-right">$1,300.00</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="text-right"><strong>Subtotal:</strong></td>
        <td class="text-right">$7,950.00</td>
      </tr>
      <tr>
        <td colspan="3" class="text-right"><strong>Tax (8.5%):</strong></td>
        <td class="text-right">$675.75</td>
      </tr>
      <tr class="grand-total">
        <td colspan="3" class="text-right"><strong>Total Due:</strong></td>
        <td class="text-right"><strong>$8,625.75</strong></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer-notes">
    <p><strong>Payment Terms:</strong> Net 14 days. Please direct wire transfers to Account #9876-54321, Routing #021000021.</p>
    <p class="thank-you">Thank you for your business!</p>
  </div>
</div>`,
    css: `.invoice-box {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1f2937;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.logo {
  font-size: 28px;
  font-weight: 800;
  color: #2563eb;
  margin: 0 0 6px 0;
}
.sub {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}
.inv-meta {
  text-align: right;
}
.inv-meta h2 {
  font-size: 24px;
  margin: 0 0 8px 0;
  color: #111827;
  letter-spacing: 1px;
}
.inv-meta p {
  font-size: 13px;
  margin: 2px 0;
  color: #4b5563;
}
.divider {
  border: 0;
  border-top: 1px solid #e5e7eb;
  margin: 20px 0;
}
.bill-to h3 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
  margin: 0 0 6px 0;
}
.bill-to p {
  font-size: 14px;
  margin: 2px 0;
  color: #374151;
}
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
  margin-bottom: 24px;
  font-size: 14px;
}
.items-table th {
  background-color: #f3f4f6;
  color: #374151;
  font-weight: 600;
  padding: 10px 12px;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
}
.items-table td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  color: #4b5563;
}
.items-table tfoot td {
  padding: 8px 12px;
  border-bottom: none;
}
.text-right {
  text-align: right !important;
}
.grand-total td {
  font-size: 16px;
  color: #111827;
  border-top: 2px solid #111827;
  border-bottom: 2px solid #111827;
  padding-top: 12px;
  padding-bottom: 12px;
}
.footer-notes {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px dashed #d1d5db;
  font-size: 12px;
  color: #6b7280;
}
.thank-you {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #2563eb;
  text-align: center;
}`
  },
  report: {
    name: 'Executive Report',
    icon: '📊',
    html: `<div class="report-box">
  <div class="badge">CONFIDENTIAL &bull; Q3 2026</div>
  <h1>Quarterly Engineering & Growth Report</h1>
  <p class="lead">Prepared by the Antigravity Performance & Architecture Team</p>
  
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Uptime SLA</div>
      <div class="kpi-val">99.98%</div>
      <div class="kpi-diff">+0.05% MoM</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Client Conversions</div>
      <div class="kpi-val">284,120</div>
      <div class="kpi-diff">+18.4% vs target</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Export Time</div>
      <div class="kpi-val">0.42s</div>
      <div class="kpi-diff">-38% latency</div>
    </div>
  </div>

  <h2>1. Executive Summary</h2>
  <p>During the third quarter, our primary focus was eliminating friction in document workflows and accelerating client-side generation pipelines. All operations now run completely client-side without transmitting user data to third-party endpoints, ensuring GDPR compliance and complete privacy.</p>

  <h2>2. Key Deliverables</h2>
  <ul>
    <li><strong>Client-Side Engine:</strong> Migrated from external rendering workers to zero-overhead in-browser canvas and iframe rendering.</li>
    <li><strong>Tailwind CSS Color Normalizer:</strong> Integrated proactive oklch and oklab sanitization preventing rendering exceptions on modern stylesheets.</li>
    <li><strong>Dual Export Pipelines:</strong> Users can choose between crisp vector Native Print and pixel-accurate Canvas snapshots.</li>
  </ul>

  <div class="callout">
    <strong>Milestone Achieved:</strong> The HTML-to-PDF conversion failure rate dropped to 0.00% across all supported formats and landscape/portrait orientations.
  </div>
</div>`,
    css: `.report-box {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}
.badge {
  display: inline-block;
  background: #e0e7ff;
  color: #3730a3;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 4px 10px;
  border-radius: 9999px;
  margin-bottom: 12px;
}
h1 {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
}
.lead {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px 0;
}
.kpi-grid {
  display: flex;
  gap: 16px;
  margin-bottom: 28px;
}
.kpi-card {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
}
.kpi-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
}
.kpi-val {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  margin: 6px 0 2px 0;
}
.kpi-diff {
  font-size: 11px;
  color: #10b981;
  font-weight: 600;
}
h2 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 20px 0 10px 0;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 6px;
}
p, li {
  font-size: 13.5px;
  line-height: 1.65;
  color: #334155;
}
ul {
  padding-left: 20px;
  margin-bottom: 20px;
}
li {
  margin-bottom: 6px;
}
.callout {
  background: #ecfdf5;
  border-left: 4px solid #10b981;
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: #065f46;
  margin-top: 24px;
}`
  },
  certificate: {
    name: 'Certificate of Achievement',
    icon: '🏆',
    html: `<div class="cert-container">
  <div class="cert-border">
    <div class="cert-inner">
      <div class="cert-header">CERTIFICATE OF EXCELLENCE</div>
      <div class="cert-sub">THIS ACKNOWLEDGES THAT</div>
      <div class="cert-recipient">Alexander M. Sterling</div>
      <div class="cert-body">
        has successfully demonstrated advanced proficiency in Full-Stack Architecture, 
        Client-Side Rendering Engines, and Modern Web Application Optimization.
      </div>
      <div class="cert-footer">
        <div class="sig-block">
          <div class="sig-line">Sarah Jenkins</div>
          <div class="sig-role">Chief Technology Officer</div>
        </div>
        <div class="seal">&#9733;&#9733;&#9733;</div>
        <div class="sig-block">
          <div class="sig-line">September 9, 2026</div>
          <div class="sig-role">Date of Award</div>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.cert-container {
  font-family: "Georgia", serif;
  max-width: 820px;
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
}
.cert-border {
  border: 8px double #1e3a8a;
  padding: 18px;
  background: #fcfbf7;
}
.cert-inner {
  border: 2px solid #c7d2fe;
  padding: 36px 24px;
  text-align: center;
}
.cert-header {
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 3px;
  color: #1e3a8a;
  margin-bottom: 12px;
}
.cert-sub {
  font-size: 12px;
  letter-spacing: 2px;
  color: #6b7280;
  margin-bottom: 20px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.cert-recipient {
  font-size: 32px;
  font-style: italic;
  color: #1f2937;
  border-bottom: 2px solid #d1d5db;
  display: inline-block;
  padding: 0 32px 8px 32px;
  margin-bottom: 24px;
}
.cert-body {
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
  max-width: 600px;
  margin: 0 auto 36px auto;
}
.cert-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 40px;
}
.sig-block {
  text-align: center;
  width: 180px;
}
.sig-line {
  border-bottom: 1px solid #4b5563;
  padding-bottom: 4px;
  font-size: 14px;
  font-weight: bold;
  color: #1f2937;
}
.sig-role {
  font-size: 11px;
  color: #6b7280;
  margin-top: 6px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.seal {
  font-size: 24px;
  color: #d97706;
  border: 3px solid #d97706;
  border-radius: 50%;
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 2px;
}`
  }
};

export default function HtmlToPdf() {
  const [htmlContent, setHtmlContent] = useState(TEMPLATES.invoice.html);
  const [cssContent, setCssContent] = useState(TEMPLATES.invoice.css);
  const [selectedTemplate, setSelectedTemplate] = useState('invoice');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('html'); // 'html', 'css', or 'preview'
  
  // Settings
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [format, setFormat] = useState('a4'); // 'a4' | 'letter'
  const [margin, setMargin] = useState('standard'); // 'none' (0) | 'compact' (5mm) | 'standard' (10mm)
  const [scale, setScale] = useState(2);
  const [pageFit, setPageFit] = useState('multi'); // 'multi' (auto multi-page) | 'single' (fit on 1 page)
  const [allowJS, setAllowJS] = useState(false);
  
  const previewIframeRef = useRef(null);

  // Helper to extract styles and body content if full HTML document was pasted
  const parseDocument = (rawHtml, rawCss) => {
    let styles = rawCss || '';
    let bodyHtml = rawHtml || '';

    // Extract any <style> tags inside the HTML
    const styleMatches = rawHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      styles += '\n' + styleMatches.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
    }

    // If a full HTML skeleton was pasted, extract the body inner HTML
    const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      bodyHtml = bodyMatch[1];
    } else {
      // Remove any trailing </html> or </body> if partially closed
      bodyHtml = bodyHtml
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?html[^>]*>/gi, '')
        .replace(/<\/?head[^>]*>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<\/?body[^>]*>/gi, '');
    }

    return { bodyHtml, styles };
  };

  // Update preview when content changes or preview tab opens
  useEffect(() => {
    if (activeTab === 'preview' && previewIframeRef.current) {
      try {
        const doc = previewIframeRef.current.contentWindow?.document;
        if (doc) {
          const { bodyHtml, styles } = parseDocument(htmlContent, cssContent);
          const completeHTML = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  html, body {
                    margin: 0;
                    padding: 16px;
                    background: #ffffff;
                    color: #111827;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    box-sizing: border-box;
                  }
                  ${styles}
                </style>
              </head>
              <body>${bodyHtml}</body>
            </html>
          `;
          doc.open();
          doc.write(completeHTML);
          doc.close();
        }
      } catch (e) {
        console.warn('Preview update error:', e);
      }
    }
  }, [activeTab, htmlContent, cssContent]);

  const loadTemplate = (key) => {
    const tmpl = TEMPLATES[key];
    if (!tmpl) return;
    setSelectedTemplate(key);
    setHtmlContent(tmpl.html);
    setCssContent(tmpl.css);
    if (key === 'certificate') {
      setOrientation('landscape');
    } else {
      setOrientation('portrait');
    }
    toast.success(`Loaded "${tmpl.name}" template`);
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'html') {
        setHtmlContent(event.target.result);
        setSelectedTemplate('custom');
      }
      if (type === 'css') {
        setCssContent(event.target.result);
      }
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const getMarginMM = () => {
    const marginMap = { 'none': 0, 'compact': 5, 'standard': 10 };
    return marginMap[margin] ?? 10;
  };

  // Dimensions in pixels at 96 DPI for standard document sizes
  const getContainerDimensions = () => {
    if (format === 'a4') {
      return orientation === 'landscape'
        ? { width: 1123, height: 794 } // 297mm x 210mm
        : { width: 794, height: 1123 }; // 210mm x 297mm
    } else {
      // US Letter (8.5in x 11in)
      return orientation === 'landscape'
        ? { width: 1056, height: 816 } // 11in x 8.5in
        : { width: 816, height: 1056 }; // 8.5in x 11in
    }
  };

  /**
   * Generates a PDF snapshot via safeHtml2Canvas and jsPDF
   * Features:
   * - Uses safeHtml2Canvas to strip Tailwind v4 oklch/oklab colors without crashing
   * - Invisible offscreen rendering container positioned at (0, 0) with z-index -9999
   * - Scoped margin padding on the container itself, preserving main window styles
   * - Supports per-page slice pagination or single-page fit
   * - Guaranteed finally cleanup removing all temporary elements
   */
  const generateCanvasPDF = async () => {
    if (!htmlContent.trim()) {
      toast.error('Please provide some HTML content');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Generating PDF snapshot via Canvas...');

    let renderDiv = null;

    try {
      const marginMM = getMarginMM();
      const dims = getContainerDimensions();
      const { bodyHtml, styles } = parseDocument(htmlContent, cssContent);

      // Create offscreen container directly within page viewport coordinates
      renderDiv = document.createElement('div');
      renderDiv.id = 'html-to-pdf-canvas-render-box';
      renderDiv.style.position = 'absolute';
      renderDiv.style.top = '0';
      renderDiv.style.left = '0';
      renderDiv.style.zIndex = '-9999';
      renderDiv.style.visibility = 'visible';
      renderDiv.style.pointerEvents = 'none';
      renderDiv.style.width = `${dims.width}px`;
      renderDiv.style.minHeight = `${dims.height}px`;
      renderDiv.style.background = '#ffffff';
      renderDiv.style.color = '#111827';
      renderDiv.style.boxSizing = 'border-box';
      renderDiv.style.padding = `${marginMM}mm`;
      renderDiv.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      // Inject scoped styles and body content
      renderDiv.innerHTML = `
        <style>
          #html-to-pdf-canvas-render-box * {
            box-sizing: border-box;
          }
          #html-to-pdf-canvas-render-box table {
            border-collapse: collapse;
          }
          ${styles}
        </style>
        ${bodyHtml}
      `;

      document.body.appendChild(renderDiv);

      // Allow fonts and images a moment to resolve
      await new Promise(resolve => setTimeout(resolve, 600));

      // Capture using safeHtml2Canvas (which sanitizes Tailwind v4 oklch styles)
      const canvas = await safeHtml2Canvas(renderDiv, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: dims.width,
        windowHeight: Math.max(renderDiv.scrollHeight, dims.height),
        scrollY: 0,
        scrollX: 0,
      });

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (pageFit === 'single') {
        // Fit entire document onto 1 page
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let finalW = imgWidth;
        let finalH = imgHeight;
        if (finalH > pdfHeight) {
          finalW = (finalW * pdfHeight) / finalH;
          finalH = pdfHeight;
        }

        const posX = (pdfWidth - finalW) / 2;
        const posY = (pdfHeight - finalH) / 2;
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', posX, posY, finalW, finalH, undefined, 'FAST');
      } else {
        // Sliced multi-page pagination for clean page boundaries without stretching
        const pageCanvasHeight = (canvas.width * pdfHeight) / pdfWidth;
        const totalPages = Math.ceil(canvas.height / pageCanvasHeight);

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - i * pageCanvasHeight);
          pageCanvas.height = currentSliceHeight;

          const ctx = pageCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, i * pageCanvasHeight, canvas.width, currentSliceHeight,
            0, 0, canvas.width, currentSliceHeight
          );

          const sliceData = pageCanvas.toDataURL('image/jpeg', 0.98);
          const slicePdfHeight = (currentSliceHeight * pdfWidth) / canvas.width;
          pdf.addImage(sliceData, 'JPEG', 0, 0, pdfWidth, slicePdfHeight, undefined, 'FAST');
        }
      }

      pdf.save(`document-${orientation}-${format}.pdf`);
      toast.success('Canvas PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Canvas export error:', error);
      toast.error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      // Guaranteed cleanup: removes the temporary div even if an error occurred
      if (renderDiv && renderDiv.parentNode) {
        renderDiv.parentNode.removeChild(renderDiv);
      }
      setIsProcessing(false);
    }
  };

  /**
   * Generates a native PDF by rendering into a hidden iframe and invoking the print dialog.
   * Features:
   * - Vector-crisp text selection & searchable content
   * - No popup blocker restrictions (uses hidden DOM iframe instead of window.open)
   * - Full native CSS @page size & orientation control
   * - Automatic iframe teardown
   */
  const generateNativePDF = () => {
    if (!htmlContent.trim()) {
      toast.error('Please provide some HTML content');
      return;
    }

    const marginMM = getMarginMM();
    const { bodyHtml, styles } = parseDocument(htmlContent, cssContent);

    // Create a hidden iframe
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      toast.error('Could not initialize print environment.');
      if (printFrame.parentNode) printFrame.parentNode.removeChild(printFrame);
      return;
    }

    const completeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Document Export</title>
          <style>
            @page {
              size: ${format === 'letter' ? 'letter' : 'a4'} ${orientation};
              margin: ${marginMM}mm;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            p, h1, h2, h3, h4, h5, h6, tr, img, div, table, ul, ol, li {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            ${styles}
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(completeHTML);
    frameDoc.close();

    // Give iframe time to layout fonts and styles before triggering print dialog
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        toast.success('Print dialog opened. Select "Save as PDF" to download.');
      } catch (err) {
        console.error('Native print error:', err);
        toast.error('Could not open print dialog.');
      } finally {
        // Remove frame after dialog is triggered
        setTimeout(() => {
          if (printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
          }
        }, 1500);
      }
    }, 450);
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4 flex justify-center items-center gap-3">
          <FileCode className="w-10 h-10 text-blue-500" /> HTML to PDF Converter
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Convert HTML code or files to high-quality PDF documents securely and 100% in your browser.
        </p>

        {/* Quick Starter Templates */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Quick Templates:
          </span>
          {Object.entries(TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              onClick={() => loadTemplate(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm border ${
                selectedTemplate === key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <span>{tmpl.icon}</span>
              <span>{tmpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden relative">
          {/* Header Tabs */}
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
                <div className="w-full h-[400px] sm:h-[500px] border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-inner">
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
                    onChange={(e) => {
                      if (activeTab === 'html') {
                        setHtmlContent(e.target.value);
                        setSelectedTemplate('custom');
                      } else {
                        setCssContent(e.target.value);
                      }
                    }}
                    placeholder={activeTab === 'html' 
                      ? "Paste your raw HTML code here...\n\nExample:\n<h1>Hello World</h1>\n<p>This is a test document.</p>" 
                      : "Paste your custom CSS here...\n\nExample:\nh1 {\n  color: #2563eb;\n  text-align: center;\n}"}
                    className="w-full h-[400px] sm:h-[500px] p-5 bg-gray-900 text-gray-100 font-mono text-sm rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all custom-scrollbar"
                    spellCheck="false"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => handleCopy(activeTab === 'html' ? htmlContent : cssContent, activeTab.toUpperCase())}
                      title="Copy code"
                      className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all border border-white/10"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-white/10">
                      <Upload className="w-3.5 h-3.5" />
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

            {/* Informational Banner */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-900 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
              <div>
                <strong>Two Export Modes Available:</strong>
                <span className="block text-blue-800 text-xs mt-1">
                  &bull; <strong>Print Native PDF:</strong> Produces true vector text, crisp selectable fonts, and supports print-to-PDF without popup blockers.
                  <br/>
                  &bull; <strong>Export Canvas PDF:</strong> Produces a pixel-perfect image snapshot, supporting dynamic CSS, custom layout scaling, and multi-page splitting.
                </span>
              </div>
            </div>

            {/* Settings Bar */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
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
                  <option value="a4">A4 Standard</option>
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
                  <FileText className="w-3.5 h-3.5" /> Page Fit
                </label>
                <select 
                  value={pageFit}
                  onChange={(e) => setPageFit(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="multi">Auto Multi-Page</option>
                  <option value="single">Single Page (Fit)</option>
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
                  <option value={1}>1x (Fast)</option>
                  <option value={2}>2x (Crisp / High-DPI)</option>
                  <option value={3}>3x (Ultra HD)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Preview JS
                </label>
                <label className="flex items-center gap-2 cursor-pointer h-[42px] px-3 bg-white border border-gray-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={allowJS}
                    onChange={(e) => setAllowJS(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-gray-700">Allow Scripts</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={generateNativePDF}
                disabled={isProcessing}
                className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-800 border-2 border-gray-200 rounded-2xl font-bold text-lg hover:border-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 shadow-sm"
              >
                <Printer className="w-6 h-6 text-gray-600 group-hover:text-gray-900" />
                <div className="flex flex-col items-start text-left">
                  <span>Print Native PDF</span>
                  <span className="text-xs font-normal text-gray-500">Vector text & native print dialog</span>
                </div>
              </button>

              <button
                onClick={generateCanvasPDF}
                disabled={isProcessing}
                className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 shadow-md"
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
                )}
                <div className="flex flex-col items-start text-left">
                  <span>{isProcessing ? 'Generating...' : 'Export Canvas PDF'}</span>
                  <span className="text-xs font-normal text-indigo-200">Pixel-accurate snapshot download</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Security & Features Banner */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0 mt-0.5">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-900 mb-1">100% Client-Side & Private</h4>
            <p className="text-emerald-700 text-sm leading-relaxed">
              Your HTML and CSS are compiled directly inside your browser. No documents, code, or personal data ever leave your machine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


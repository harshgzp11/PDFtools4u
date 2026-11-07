export const BLOG_INTENT_GUIDANCE = {
  'compress-pdf-to-100kb-200kb': {
    heading: 'Choose the right PDF compression guide',
    text: 'Use this guide for general PDF compression techniques to meet exam-portal size limits. For a Form 16, use the tax-document workflow; for certificates and marksheets, use the government-document workflow.',
    related: [
      { id: 'compress-marksheet-certificate-pdf-100kb', label: 'Compress certificates and marksheets for exam forms' },
      { id: 'compress-form-16-pdf-under-500kb', label: 'Compress Form 16 below 500KB for ITR' }
    ]
  },
  'compress-marksheet-certificate-pdf-100kb': {
    heading: 'Certificate and marksheet compression workflow',
    text: 'This guide focuses on certificates, caste documents, and marksheets where seals, signatures, and small printed text must remain readable. Use the general exam guide for broad 100KB or 200KB portal troubleshooting, or the Form 16 guide for tax documents.',
    related: [
      { id: 'compress-pdf-to-100kb-200kb', label: 'General 100KB and 200KB compression techniques' },
      { id: 'compress-form-16-pdf-under-500kb', label: 'Prepare a Form 16 PDF for ITR upload' }
    ]
  },
  'compress-form-16-pdf-under-500kb': {
    heading: 'Tax-document compression workflow',
    text: 'This guide is specifically for Form 16, ITR uploads, tax figures, and digital-signature checks. It is not a general certificate compressor guide; use the exam-document guide or marksheet workflow for those file types.',
    related: [
      { id: 'compress-pdf-to-100kb-200kb', label: 'Compress a general exam PDF to 100KB or 200KB' },
      { id: 'compress-marksheet-certificate-pdf-100kb', label: 'Compress certificates and marksheets without losing seals' }
    ]
  },
  'driving-license-pdf-to-high-quality-jpg': {
    heading: 'Choose the right identity conversion guide',
    text: 'This guide covers driving licence PDFs used for vehicle, banking, and KYC verification. For Aadhaar or PAN, use the identity-card workflow; for academic records, use the marksheet conversion guide.',
    related: [
      { id: 'convert-aadhaar-pan-card-pdf-to-jpg', label: 'Convert Aadhaar or PAN PDF to JPG for KYC' },
      { id: 'marksheet-pdf-to-jpg-converter', label: 'Convert marksheet PDFs to high-resolution JPG' }
    ]
  },
  'convert-aadhaar-pan-card-pdf-to-jpg': {
    heading: 'Identity-card conversion workflow',
    text: 'This guide is limited to e-Aadhaar and e-PAN files, password handling, masking, and KYC upload checks. Driving licence conversion and marksheet conversion have different document requirements and separate guides.',
    related: [
      { id: 'driving-license-pdf-to-high-quality-jpg', label: 'Convert a driving licence PDF for KYC' },
      { id: 'marksheet-pdf-to-jpg-converter', label: 'Convert an academic marksheet PDF to JPG' }
    ]
  },
  'marksheet-pdf-to-jpg-converter': {
    heading: 'Academic document workflows',
    text: 'This guide covers converting marksheet PDFs into JPG images for application forms. If your portal requires combining all semester grade sheets into one file or compressing a PDF directly, use our dedicated academic guides below.',
    related: [
      { id: 'combine-multiple-marksheets-into-one-pdf', label: 'Combine Multiple Marksheets into One PDF' },
      { id: 'compress-marksheet-certificate-pdf-100kb', label: 'Compress Marksheet and Certificate PDFs' }
    ]
  },
  'html-to-pdf-with-css': {
    heading: 'Choose the right HTML-to-PDF guide',
    text: 'This guide owns CSS styling, fonts, colors, backgrounds, and layout fidelity. Use the page-break guide when your main problem is pagination, split tables, or content breaking across PDF pages.',
    related: [
      { id: 'convert-html-to-multi-page-pdf-page-breaks', label: 'Fix HTML-to-PDF page breaks and split tables' }
    ]
  },
  'convert-html-to-multi-page-pdf-page-breaks': {
    heading: 'Pagination-focused HTML-to-PDF workflow',
    text: 'This guide owns CSS pagination, break-before, break-after, break-inside, and multi-page document troubleshooting. Use the CSS styling guide for fonts, backgrounds, and visual layout fidelity.',
    related: [
      { id: 'html-to-pdf-with-css', label: 'Preserve CSS styles when converting HTML to PDF' }
    ]
  },
  'reorder-pdf-pages-visually-online': {
    heading: 'Choose the right PDF page workflow',
    text: 'Reorder pages when the whole document should stay together. Split a PDF to extract selected pages, merge separate files before arranging them, or rotate pages when orientation is the only problem.',
    related: [
      { id: 'merge-pdf-files-into-one-master-document', label: 'Combine PDF files before organizing their pages' },
      { id: 'split-pdf-pages-online-free', label: 'Extract selected pages or page ranges' },
      { id: 'rotate-pdf-pages-online-free', label: 'Correct sideways or upside-down PDF pages' }
    ]
  },
  'how-to-sign-pdf-document-online-free': {
    heading: 'Contract and form signing workflow',
    text: 'Signing is often one step in legal and business paperwork. Flatten your PDF after signing to prevent signature tampering, redact confidential financial data before sending, or add draft watermarks to preliminary agreements.',
    related: [
      { id: 'flatten-pdf-form-before-submitting', label: 'Flatten PDF after signing to lock signature layers' },
      { id: 'permanently-redact-text-in-pdf-online', label: 'Permanently redact confidential numbers and text' },
      { id: 'add-custom-watermark-pdf-online-confidential-draft', label: 'Add Confidential or Draft watermarks to proposals' },
      { id: 'server-side-vs-client-side-processing', label: 'Why client-side processing keeps your legal files safe' }
    ]
  }
,
  'combine-multiple-marksheets-into-one-pdf': {
    heading: 'Marksheet document preparation workflow',
    text: 'Combine multiple semester marksheets when you need a consolidated academic PDF for admissions or employment. If your portal requires individual JPG image uploads instead of a merged PDF, use our marksheet conversion guide; if the merged file exceeds size limits, use our certificate compression workflow.',
    related: [
      { id: 'marksheet-pdf-to-jpg-converter', label: 'Convert marksheet PDF pages to high-resolution JPG' },
      { id: 'compress-marksheet-certificate-pdf-100kb', label: 'Compress marksheets under 100KB without losing seals' }
    ]
  },
  'convert-salary-slip-pdf-to-editable-word': {
    heading: 'Salary slip and payslip workflow',
    text: 'Use this guide to extract earnings, deductions, and tax tables from payslips into editable Word format. If your primary goal is removing the password before emailing or archiving, use our password-removal guide; for general documents, see our full PDF-to-Word guide.',
    related: [
      { id: 'remove-password-from-salary-slip-bank-statement', label: 'Remove password protection from salary slips and bank PDFs' },
      { id: 'convert-pdf-to-editable-word-without-losing-formatting', label: 'General guide for converting PDFs to editable Word documents' }
    ]
  },
  'pretty-print-clean-json-online': {
    heading: 'Developer data formatting workflow',
    text: 'Use this guide to clean, format, and validate messy JSON payloads. To convert JSON datasets into CSV tables for Excel, use our dedicated converter tool; for architectural privacy details, read our client-side processing guide.',
    related: [
      { id: 'server-side-vs-client-side-processing', label: 'Why client-side processing keeps your API data safe' }
    ]
  },
  'how-to-make-scanned-pdf-searchable-online-free': {
    heading: 'Choose the right OCR workflow',
    text: 'Use this guide when you have a scanned PDF document and need to make its text selectable, searchable, and copyable without altering the document layout. If you have standalone image files, screenshots, or receipts and want to extract their text, use our image-to-text extraction workflow.',
    related: [
      { id: 'extract-text-from-image-online', label: 'Extract and copy text from images, photos, and screenshots' },
      { id: 'pdf-to-word', label: 'Convert scanned PDF into an editable Word document' }
    ]
  },
  'extract-text-from-image-online': {
    heading: 'Choose the right text extraction workflow',
    text: 'Use this guide to copy text from standalone images (PNG, JPG, WebP), receipts, and screenshots using local browser OCR. If you have a multi-page scanned PDF and want to make it searchable while preserving its original page layout, use our scanned PDF searchable guide.',
    related: [
      { id: 'how-to-make-scanned-pdf-searchable-online-free', label: 'Make scanned PDF documents searchable online free' },
      { id: 'convert-image', label: 'Convert image formats between HEIC, PNG, JPG, and WebP' }
    ]
  },
};

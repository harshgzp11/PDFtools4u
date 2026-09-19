export const BLOG_INTENT_GUIDANCE = {
  'compress-pdf-to-100kb-200kb': {
    heading: 'Choose the right PDF compression guide',
    text: 'Use this guide for general UPSC, SSC, and exam-portal PDF size limits. For a Form 16, use the tax-document workflow; for certificates and marksheets, use the government-document workflow.',
    related: [
      { id: 'compress-marksheet-certificate-pdf-100kb', label: 'Compress certificates and marksheets for exam forms' },
      { id: 'compress-form-16-pdf-under-500kb', label: 'Compress Form 16 below 500KB for ITR' }
    ]
  },
  'compress-marksheet-certificate-pdf-100kb': {
    heading: 'Certificate and marksheet compression workflow',
    text: 'This guide focuses on certificates, caste documents, and marksheets where seals, signatures, and small printed text must remain readable. Use the general exam guide for broad 100KB or 200KB portal troubleshooting, or the Form 16 guide for tax documents.',
    related: [
      { id: 'compress-pdf-to-100kb-200kb', label: 'Compare general 100KB and 200KB exam limits' },
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
    heading: 'Academic-record conversion workflow',
    text: 'This guide focuses on 10th, 12th, and college marksheets for admissions, scholarships, and recruitment. Identity-card and driving-licence uploads use different privacy and verification requirements.',
    related: [
      { id: 'convert-aadhaar-pan-card-pdf-to-jpg', label: 'Convert Aadhaar or PAN PDF for KYC' },
      { id: 'driving-license-pdf-to-high-quality-jpg', label: 'Convert a driving licence PDF for KYC' }
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
  }
};

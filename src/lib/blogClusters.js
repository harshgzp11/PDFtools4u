export const BLOG_CLUSTERS = [
  {
    slug: 'developer-tools',
    label: 'Developer Tools',
    title: 'Developer PDF and Browser Processing Guides',
    description: 'Technical guides for client-side document processing, WebAssembly, HTML to PDF, CSS page breaks, and browser-based developer tools.',
    intro: 'Explore practical engineering guides for building and using browser-based document workflows. These articles cover client-side processing, HTML and CSS rendering, WebAssembly, and privacy-aware developer utilities.'
  },
  {
    slug: 'government-exams-academics',
    label: 'Govt Exams & Academics',
    title: 'Government Exam and Academic Document Guides',
    description: 'Guides for resizing exam photos, compressing certificates, merging marksheets, and preparing academic documents for online portals.',
    intro: 'Prepare photos, signatures, marksheets, certificates, and assignments for exam, admission, scholarship, and recruitment portals with practical size and format guidance.'
  },
  {
    slug: 'identity-kyc-corporate',
    label: 'Indian Taxes, KYC & Corporate Identity',
    title: 'KYC, Identity, Tax, and Corporate Document Guides',
    description: 'Privacy-focused guides for driving licences, Form 16, Aadhaar, PAN, salary slips, and other identity or tax documents.',
    intro: 'Learn how to prepare sensitive identity, tax, and employment documents for KYC and official submissions while checking current portal requirements and file quality.'
  },
  {
    slug: 'financial-parsing-developer',
    label: 'Financial Parsing & Developer Utilities',
    title: 'Financial Parsing and Developer Utility Guides',
    description: 'Guides for extracting receipt images, processing financial PDFs, and formatting developer data privately in the browser.',
    intro: 'Find focused workflows for receipt and financial-document processing alongside browser-based data utilities for developers.'
  },
  {
    slug: 'file-optimization-image-conversion',
    label: 'General File Optimization & Image Conversions',
    title: 'PDF Optimization and Image Conversion Guides',
    description: 'Practical guides for splitting, merging, rotating, compressing, and converting PDFs and images online.',
    intro: 'Use these practical guides to manage PDF pages, convert image formats, and prepare files for sharing, storage, and upload workflows.'
  },
  {
    slug: 'financial-tax',
    label: 'Financial & Tax',
    title: 'Financial and Tax Document Guides',
    description: 'Guides for converting and preparing spreadsheets, tax records, and financial documents for reliable PDF workflows.',
    intro: 'Learn how to prepare financial spreadsheets and tax-related documents while preserving readable tables, page layout, and important figures.'
  },
  {
    slug: 'government-id',
    label: 'Government & ID',
    title: 'Government ID and Secure Document Guides',
    description: 'Guides for protecting and redacting sensitive government, legal, and identity documents before sharing them.',
    intro: 'Explore secure document workflows for removing sensitive information and preparing government or legal PDFs for controlled sharing.'
  },
  {
    slug: 'productivity',
    label: 'Productivity',
    title: 'PDF Productivity and Annotation Guides',
    description: 'Guides for annotating, reviewing, organizing, and collaborating on PDF documents privately in the browser.',
    intro: 'Make document review easier with practical guides for annotations, highlights, notes, and privacy-aware PDF workflows.'
  }
];

export function getBlogCluster(slug) {
  return BLOG_CLUSTERS.find(cluster => cluster.slug === slug);
}

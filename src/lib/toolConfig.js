import { 
  Type, FileJson, Code, FileText, Image as ImageIcon, Layers, Scissors, Stamp, ImagePlus, Eraser, Code2, Crop, SlidersHorizontal,
  Minimize, ScanText, RotateCw, Trash2, FileUp, Files, BookOpen, PenTool, Hash, EyeOff, FileSignature, Share2, 
  FileCode2, FileSpreadsheet, Presentation, Lock, Unlock, Layers3, ArrowLeftRight, ChevronRight, Shield, Zap, MousePointerClick,
  Maximize, Settings2, FileOutput, ArrowRight, Search
} from 'lucide-react';

export const DOMAINS = [
  {
    title: "PDF Tools",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    categories: [
      {
        name: "ORGANIZE PDF",
        tools: [
          { id: 'pdf-merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one.', icon: Layers, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'pdf-split', name: 'Split PDF', description: 'Separate pages or extract sections.', icon: Scissors, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'delete-pdf-pages', name: 'Remove pages', description: 'Remove pages from your PDF.', icon: Trash2, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'extract-pdf-pages', name: 'Extract pages', description: 'Extract specific pages into a new PDF.', icon: FileUp, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'organize-pdf', name: 'Organize PDF', description: 'Sort, add and delete PDF pages.', icon: Files, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'number-pages', name: 'Number Pages', description: 'Add page numbers to PDFs.', icon: Hash, color: 'text-orange-500', bg: 'bg-orange-50' },
        ]
      },
      {
        name: "OPTIMIZE PDF",
        tools: [
          { id: 'compress-pdf', name: 'Compress PDF', description: 'Reduce PDF file size without losing quality.', icon: Minimize, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'flatten-pdf', name: 'Flatten PDF', description: 'Make forms and annotations uneditable.', icon: Layers3, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'pdf-ocr', name: 'OCR PDF', description: 'Make scanned PDF documents searchable.', icon: ScanText, color: 'text-green-500', bg: 'bg-green-50' },
        ]
      },
      {
        name: "CONVERT TO PDF",
        tools: [
          { id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert JPG images to PDF.', icon: ImagePlus, color: 'text-yellow-500', bg: 'bg-yellow-50' },
          { id: 'word-to-pdf', name: 'WORD to PDF', description: 'Convert Word document to PDF.', icon: FileCode2, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'ppt-to-pdf', name: 'POWERPOINT to PDF', description: 'Convert PowerPoint to PDF.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'excel-to-pdf', name: 'EXCEL to PDF', description: 'Convert Excel to PDF document.', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
        ]
      },
      {
        name: "CONVERT FROM PDF",
        tools: [
          { id: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Convert PDF to JPG images.', icon: ImageIcon, color: 'text-yellow-500', bg: 'bg-yellow-50' },
          { id: 'pdf-to-word', name: 'PDF to WORD', description: 'Convert PDF to editable Word document.', icon: FileCode2, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'pdf-to-ppt', name: 'PDF to POWERPOINT', description: 'Convert PDF to PowerPoint presentation.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'pdf-to-excel', name: 'PDF to EXCEL', description: 'Convert PDF to Excel spreadsheet.', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'pdf-converter', name: 'Universal Converter', description: 'Convert documents to and from PDF.', icon: ArrowLeftRight, color: 'text-blue-600', bg: 'bg-blue-50' },
        ]
      },
      {
        name: "EDIT PDF",
        tools: [
          { id: 'rotate-pdf', name: 'Rotate PDF', description: 'Rotate PDF pages as needed.', icon: RotateCw, color: 'text-pink-500', bg: 'bg-pink-50' },
          { id: 'edit-pdf', name: 'Edit PDF', description: 'Edit text, images and links in PDFs.', icon: PenTool, color: 'text-pink-500', bg: 'bg-pink-50' },
          { id: 'pdf-annotator', name: 'PDF Annotator', description: 'Highlight and annotate PDFs.', icon: FileSignature, color: 'text-pink-500', bg: 'bg-pink-50' },
          { id: 'pdf-form-filler', name: 'PDF Forms', description: 'Fill and complete interactive PDF forms.', icon: PenTool, color: 'text-pink-500', bg: 'bg-pink-50' },
          { id: 'crop-pdf', name: 'Crop PDF', description: 'Trim PDF margins or empty space.', icon: Crop, color: 'text-pink-500', bg: 'bg-pink-50' },
          { id: 'pdf-reader', name: 'PDF Reader', description: 'View, navigate, and search PDFs.', icon: BookOpen, color: 'text-pink-500', bg: 'bg-pink-50' },
        ]
      },
      {
        name: "PDF SECURITY",
        tools: [
          { id: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove password from PDF.', icon: Unlock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'protect-pdf', name: 'Protect PDF', description: 'Encrypt PDF with a password.', icon: Lock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'sign-pdf', name: 'Sign PDF', description: 'Add a signature to your PDF.', icon: FileSignature, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'pdf-watermark', name: 'Add watermark', description: 'Add text or image watermark.', icon: Stamp, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'redact-pdf', name: 'Redact PDF', description: 'Permanently remove sensitive info.', icon: EyeOff, color: 'text-blue-500', bg: 'bg-blue-50' },
        ]
      }
    ]
  },
  {
    title: "Image Tools",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    categories: [
      {
        name: "EDIT IMAGE",
        tools: [
          { id: 'resize-image', name: 'Resize Image', description: 'Change dimensions of any image.', icon: Maximize, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'image-crop', name: 'Crop & Rotate', description: 'Visually crop and rotate your images.', icon: Crop, color: 'text-sky-500', bg: 'bg-sky-50' },
          { id: 'photo-editor', name: 'Photo Editor', description: 'Apply filters and adjustments to photos.', icon: SlidersHorizontal, color: 'text-violet-500', bg: 'bg-violet-50' },
          { id: 'bg-remover', name: 'Remove Background', description: 'Automatically remove image backgrounds.', icon: Eraser, color: 'text-rose-500', bg: 'bg-rose-50' },
        ]
      },
      {
        name: "OPTIMIZE & CONVERT",
        tools: [
          { id: 'compress-image', name: 'Compress Image', description: 'Reduce image file size instantly.', icon: Minimize, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { id: 'convert-image', name: 'Convert Image', description: 'Convert PNG, JPG, WebP, GIF.', icon: ArrowLeftRight, color: 'text-orange-500', bg: 'bg-orange-50' },
        ]
      }
    ]
  },
  {
    title: "Document Tools (DOCX, XLSX, PPTX, TXT)",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    categories: [
      {
        name: "WORD & TEXT (DOCX, DOC, TXT)",
        tools: [
          { id: 'word-to-pdf', name: 'WORD to PDF', description: 'Convert Word document (.docx, .doc) to PDF.', icon: FileCode2, color: 'text-red-500', bg: 'bg-red-50' },
          { id: 'pdf-to-word', name: 'PDF to WORD', description: 'Convert PDF to editable Word document (.docx).', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'docx-to-text', name: 'DOCX to Text', description: 'Extract raw text from Word documents.', icon: FileText, color: 'text-sky-500', bg: 'bg-sky-50' },
          { id: 'docx-to-html', name: 'DOCX to HTML', description: 'Convert Word documents to clean HTML code.', icon: Code, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'text-to-docx', name: 'Text to DOCX', description: 'Generate a Word document from text.', icon: FileCode2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { id: 'txt-to-pdf', name: 'TXT to PDF', description: 'Convert plain text files (.txt) into formatted PDF.', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50' },
        ]
      },
      {
        name: "SPREADSHEETS & PRESENTATIONS (XLSX, XLS, PPTX, PPT)",
        tools: [
          { id: 'excel-to-pdf', name: 'EXCEL to PDF', description: 'Convert Excel spreadsheets (.xlsx, .xls, .csv) to PDF.', icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { id: 'pdf-to-excel', name: 'PDF to EXCEL', description: 'Convert PDF tables into Excel spreadsheet (.xlsx).', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'ppt-to-pdf', name: 'POWERPOINT to PDF', description: 'Convert PowerPoint (.pptx, .ppt) to PDF.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'pdf-to-ppt', name: 'PDF to POWERPOINT', description: 'Convert PDF to PowerPoint presentation (.pptx).', icon: Presentation, color: 'text-amber-500', bg: 'bg-amber-50' },
        ]
      }
    ]
  },
  {
    title: "Text & Developer Tools",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    categories: [
      {
        name: "Text & Data",
        tools: [
          { id: 'text-reformatter', name: 'Text Case & Reformatter', description: 'Change case, remove duplicates & clean whitespace.', icon: Type, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'data-converter', name: 'Data Converters', description: 'Convert CSV to JSON, JSON to CSV, and Base64.', icon: FileJson, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'dev-tools', name: 'Developer Text Tools', description: 'Word counters, JSON Minifier/Beautifier and more.', icon: Code, color: 'text-purple-500', bg: 'bg-purple-50' },
          { id: 'html-to-image', name: 'HTML to Image', description: 'Render HTML/CSS code into a downloadable image.', icon: Code2, color: 'text-teal-500', bg: 'bg-teal-50' },
        ]
      }
    ]
  }
];

export const POPULAR_TOOL_IDS = ['compress-pdf', 'pdf-to-word', 'pdf-merge', 'jpg-to-pdf', 'pdf-to-jpg', 'sign-pdf', 'edit-pdf', 'organize-pdf'];

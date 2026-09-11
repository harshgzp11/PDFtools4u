// Related Tools Cross-Linking Map
// Maps each tool to exactly 4 semantically related tools for internal link equity distribution.
// Used by ToolSEOContent.jsx to render "Related Tools" cards below each tool page.

export const RELATED_TOOLS = {
  // PDF ORGANIZE
  'pdf-merge': ['compress-pdf', 'protect-pdf', 'redact-pdf', 'pdf-annotator'],
  'pdf-split': ['organize-pdf', 'delete-pdf-pages', 'pdf-merge', 'compress-pdf'],
  'delete-pdf-pages': ['organize-pdf', 'pdf-merge', 'pdf-split', 'compress-pdf'],
  'extract-pdf-pages': ['pdf-split', 'pdf-merge', 'organize-pdf', 'edit-pdf'],
  'organize-pdf': ['delete-pdf-pages', 'extract-pdf-pages', 'pdf-merge', 'pdf-split'],
  'number-pages': ['organize-pdf', 'pdf-merge', 'edit-pdf', 'protect-pdf'],

  // PDF OPTIMIZE
  'compress-pdf': ['pdf-merge', 'pdf-split', 'flatten-pdf', 'pdf-ocr'],
  'flatten-pdf': ['compress-pdf', 'protect-pdf', 'pdf-form-filler', 'redact-pdf'],
  'pdf-ocr': ['edit-pdf', 'pdf-split', 'compress-image', 'word-to-pdf'],

  // CONVERT TO PDF (FIXED: Workflow priority ordered ahead of reverse converters)
  'jpg-to-pdf': ['compress-pdf', 'protect-pdf', 'pdf-merge', 'edit-pdf'],
  'word-to-pdf': ['compress-pdf', 'protect-pdf', 'pdf-merge', 'pdf-to-word'],
  'ppt-to-pdf': ['compress-pdf', 'protect-pdf', 'pdf-merge', 'pdf-to-ppt'],
  'excel-to-pdf': ['compress-pdf', 'protect-pdf', 'pdf-merge', 'pdf-to-excel'],
  'txt-to-pdf': ['compress-pdf', 'protect-pdf', 'pdf-merge', 'docx-to-text'],

  // CONVERT FROM PDF
  'pdf-to-jpg': ['compress-image', 'resize-image', 'image-crop', 'jpg-to-pdf'],
  'pdf-to-word': ['edit-pdf', 'pdf-split', 'word-to-pdf', 'docx-to-text'],
  'pdf-to-excel': ['edit-pdf', 'pdf-split', 'excel-to-pdf', 'data-converter'],
  'pdf-to-ppt': ['edit-pdf', 'pdf-split', 'compress-pdf', 'ppt-to-pdf'],
  'pdf-converter': ['edit-pdf', 'pdf-split', 'compress-image', 'word-to-pdf'],

  // EDIT PDF
  'edit-pdf': ['protect-pdf', 'compress-pdf', 'redact-pdf', 'pdf-merge'],
  'rotate-pdf': ['organize-pdf', 'crop-pdf', 'edit-pdf', 'pdf-merge'],
  'pdf-annotator': ['sign-pdf', 'protect-pdf', 'compress-pdf', 'redact-pdf'],
  'pdf-form-filler': ['sign-pdf', 'protect-pdf', 'compress-pdf', 'flatten-pdf'],
  'crop-pdf': ['compress-pdf', 'protect-pdf', 'redact-pdf', 'pdf-annotator'],
  'pdf-reader': ['pdf-annotator', 'edit-pdf', 'pdf-to-word', 'compress-pdf'],

  // PDF SECURITY
  'unlock-pdf': ['protect-pdf', 'pdf-to-jpg', 'compress-pdf', 'redact-pdf'],
  'protect-pdf': ['compress-pdf', 'redact-pdf', 'flatten-pdf', 'pdf-merge'],
  'sign-pdf': ['protect-pdf', 'compress-pdf', 'redact-pdf', 'pdf-form-filler'],
  'pdf-watermark': ['protect-pdf', 'edit-pdf', 'sign-pdf', 'compress-pdf'],
  'redact-pdf': ['protect-pdf', 'compress-pdf', 'flatten-pdf', 'pdf-merge'],

  // IMAGE TOOLS
  'compress-image': ['jpg-to-pdf', 'resize-image', 'image-crop', 'pdf-to-jpg'],
  'resize-image': ['jpg-to-pdf', 'image-crop', 'compress-image', 'pdf-to-jpg'],
  'convert-image': ['jpg-to-pdf', 'resize-image', 'compress-image', 'pdf-to-jpg'],
  'bg-remover': ['photo-editor', 'resize-image', 'compress-image', 'jpg-to-pdf'],
  'image-crop': ['jpg-to-pdf', 'resize-image', 'compress-image', 'pdf-to-jpg'],
  'photo-editor': ['jpg-to-pdf', 'resize-image', 'compress-image', 'pdf-to-jpg'],
  'html-to-image': ['convert-image', 'compress-image', 'dev-tools', 'resize-image'],

  // DOCUMENT TOOLS
  'docx-to-text': ['pdf-reader', 'docx-to-html', 'text-to-docx', 'word-to-pdf'],
  'docx-to-html': ['docx-to-text', 'text-to-docx', 'word-to-pdf', 'pdf-reader'],
  'text-to-docx': ['docx-to-text', 'txt-to-pdf', 'word-to-pdf', 'pdf-reader'],
  'rtf-to-pdf': ['txt-to-pdf', 'word-to-pdf', 'text-to-docx', 'pdf-reader'],

  // TEXT & DEV TOOLS
  'text-reformatter': ['data-converter', 'dev-tools', 'docx-to-text', 'html-to-image'],
  'data-converter': ['dev-tools', 'text-reformatter', 'pdf-to-excel', 'html-to-image'],
  'dev-tools': ['data-converter', 'text-reformatter', 'html-to-image', 'compress-image'],
};

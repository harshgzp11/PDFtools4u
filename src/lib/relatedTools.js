// Related Tools Cross-Linking Map
// Maps each tool to 3-4 semantically related tools for internal link equity distribution.
// Used by ToolSEOContent.jsx to render "Related Tools" cards below each tool page.

export const RELATED_TOOLS = {
  // PDF ORGANIZE
  'pdf-merge': ['compress-pdf', 'organize-pdf', 'number-pages', 'pdf-split'],
  'pdf-split': ['extract-pdf-pages', 'delete-pdf-pages', 'pdf-merge', 'organize-pdf'],
  'delete-pdf-pages': ['extract-pdf-pages', 'pdf-split', 'organize-pdf'],
  'extract-pdf-pages': ['delete-pdf-pages', 'pdf-split', 'pdf-merge'],
  'organize-pdf': ['pdf-merge', 'pdf-split', 'number-pages', 'rotate-pdf'],
  'number-pages': ['organize-pdf', 'pdf-merge', 'edit-pdf'],

  // PDF OPTIMIZE
  'compress-pdf': ['pdf-merge', 'pdf-split', 'flatten-pdf', 'pdf-ocr'],
  'flatten-pdf': ['compress-pdf', 'protect-pdf', 'pdf-form-filler'],
  'pdf-ocr': ['pdf-to-word', 'pdf-to-text', 'compress-pdf', 'pdf-to-excel'],

  // CONVERT TO PDF
  'jpg-to-pdf': ['compress-image', 'resize-image', 'pdf-to-jpg', 'pdf-merge'],
  'png-to-pdf': ['jpg-to-pdf', 'convert-image', 'compress-image'],
  'word-to-pdf': ['pdf-to-word', 'docx-to-text', 'txt-to-pdf'],
  'ppt-to-pdf': ['pdf-to-ppt', 'word-to-pdf', 'excel-to-pdf'],
  'excel-to-pdf': ['pdf-to-excel', 'ppt-to-pdf', 'word-to-pdf'],

  // CONVERT FROM PDF
  'pdf-to-jpg': ['pdf-to-png', 'compress-image', 'jpg-to-pdf', 'resize-image'],
  'pdf-to-png': ['pdf-to-jpg', 'convert-image', 'bg-remover'],
  'pdf-to-word': ['pdf-to-excel', 'pdf-ocr', 'word-to-pdf', 'pdf-to-text'],
  'pdf-to-excel': ['pdf-to-word', 'pdf-ocr', 'excel-to-pdf'],
  'pdf-to-ppt': ['ppt-to-pdf', 'pdf-to-word', 'pdf-converter'],
  'pdf-converter': ['pdf-to-word', 'word-to-pdf', 'pdf-to-excel', 'pdf-to-jpg'],

  // EDIT PDF
  'edit-pdf': ['pdf-annotator', 'sign-pdf', 'pdf-form-filler', 'crop-pdf'],
  'pdf-editor': ['edit-pdf', 'pdf-annotator', 'sign-pdf'],
  'rotate-pdf': ['organize-pdf', 'crop-pdf', 'edit-pdf'],
  'pdf-annotator': ['edit-pdf', 'sign-pdf', 'pdf-reader'],
  'pdf-form-filler': ['edit-pdf', 'flatten-pdf', 'sign-pdf'],
  'crop-pdf': ['rotate-pdf', 'edit-pdf', 'compress-pdf'],
  'pdf-reader': ['pdf-annotator', 'edit-pdf', 'pdf-to-text'],

  // PDF SECURITY
  'unlock-pdf': ['protect-pdf', 'pdf-to-jpg', 'compress-pdf'],
  'protect-pdf': ['unlock-pdf', 'sign-pdf', 'redact-pdf', 'flatten-pdf'],
  'sign-pdf': ['edit-pdf', 'protect-pdf', 'pdf-form-filler'],
  'pdf-watermark': ['protect-pdf', 'edit-pdf', 'sign-pdf'],
  'redact-pdf': ['protect-pdf', 'flatten-pdf', 'edit-pdf'],

  // IMAGE TOOLS
  'compress-image': ['resize-image', 'convert-image', 'jpg-to-pdf'],
  'resize-image': ['compress-image', 'image-crop', 'convert-image'],
  'convert-image': ['compress-image', 'resize-image', 'jpg-to-pdf', 'bg-remover'],
  'bg-remover': ['compress-image', 'convert-image', 'image-crop', 'photo-editor'],
  'image-crop': ['resize-image', 'photo-editor', 'compress-image'],
  'photo-editor': ['image-crop', 'bg-remover', 'resize-image', 'compress-image'],
  'html-to-image': ['convert-image', 'compress-image', 'dev-tools'],

  // DOCUMENT TOOLS
  'docx-to-text': ['pdf-to-text', 'docx-to-html', 'text-to-docx'],
  'docx-to-html': ['docx-to-text', 'text-to-docx', 'word-to-pdf'],
  'text-to-docx': ['docx-to-text', 'txt-to-pdf', 'word-to-pdf'],
  'txt-to-pdf': ['text-to-docx', 'word-to-pdf', 'rtf-to-pdf'],
  'rtf-to-pdf': ['txt-to-pdf', 'word-to-pdf', 'text-to-docx'],

  // TEXT & DEV TOOLS
  'text-reformatter': ['data-converter', 'dev-tools', 'docx-to-text'],
  'data-converter': ['dev-tools', 'text-reformatter', 'pdf-to-excel'],
  'dev-tools': ['data-converter', 'text-reformatter', 'html-to-image'],
};

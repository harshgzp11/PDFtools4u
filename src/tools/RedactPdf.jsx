import React from 'react';
import PdfEditor from './PdfEditor/index';

export default function RedactPdf() {
  return (
    <PdfEditor 
      initialTool="redact"
      title="Redact PDF"
      description="Permanently blackout sensitive text, images, and data from your PDF documents. Redact private information instantly directly in your browser."
      allowedTools={['select', 'hand', 'redact']}
    />
  );
}

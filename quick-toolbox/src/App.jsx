import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TextReformatter from './tools/TextReformatter';
import DataConverter from './tools/DataConverter';
import DevTools from './tools/DevTools';
import PdfTextExtractor from './tools/PdfTextExtractor';
import TextToPdfCompiler from './tools/TextToPdfCompiler';
import ImageConverter from './tools/ImageConverter';
import PdfMerger from './tools/PdfMerger';
import PdfSplitter from './tools/PdfSplitter';
import PdfWatermark from './tools/PdfWatermark';
import RotatePdf from './tools/RotatePdf';
import JpgToPdf from './tools/JpgToPdf';
import BackgroundRemover from './tools/BackgroundRemover';
import HtmlToImage from './tools/HtmlToImage';
import ImageCropRotate from './tools/ImageCropRotate';
import PhotoEditor from './tools/PhotoEditor';
import PlaceholderTool from './tools/PlaceholderTool';

// New Phase 1 Tools
import DeletePdfPages from './tools/DeletePdfPages';
import ExtractPdfPages from './tools/ExtractPdfPages';
import OrganizePdf from './tools/OrganizePdf';
import ProtectPdf from './tools/ProtectPdf';
import FlattenPdf from './tools/FlattenPdf';
import SignPdf from './tools/SignPdf';
import CompressPdf from './tools/CompressPdf';

import { ArrowLeft } from 'lucide-react';

const PLACEHOLDER_TOOLS = {
  'pdf-converter': 'PDF Converter',
  'pdf-ocr': 'PDF OCR',
  'edit-pdf': 'Edit PDF',
  'pdf-annotator': 'PDF Annotator',
  'pdf-reader': 'PDF Reader',
  'number-pages': 'Number Pages',
  'crop-pdf': 'Crop PDF',
  'redact-pdf': 'Redact PDF',
  'pdf-form-filler': 'PDF Form Filler',
  'share-pdf': 'Share PDF',
  'pdf-to-word': 'PDF to Word',
  'pdf-to-excel': 'PDF to Excel',
  'pdf-to-ppt': 'PDF to PPT',
  'pdf-to-jpg': 'PDF to JPG',
  'word-to-pdf': 'Word to PDF',
  'excel-to-pdf': 'Excel to PDF',
  'ppt-to-pdf': 'PPT to PDF',
  'txt-to-pdf': 'TXT to PDF',
  'rtf-to-pdf': 'RTF to PDF',
  'unlock-pdf': 'Unlock PDF'
};

function App() {
  const [activeTool, setActiveTool] = useState(() => {
    return window.location.hash.replace('#', '') || null;
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state when browser back/forward buttons are pressed
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTool(window.location.hash.replace('#', '') || null);
      window.scrollTo(0, 0); // Scroll to top on navigation
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (toolId) => {
    if (toolId) {
      window.location.hash = toolId;
    } else {
      // Clear hash cleanly without leaving a stray # if possible
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
      setActiveTool(null);
      window.scrollTo(0, 0);
    }
  };

  const renderTool = () => {
    if (PLACEHOLDER_TOOLS[activeTool]) {
      return <PlaceholderTool toolName={PLACEHOLDER_TOOLS[activeTool]} />;
    }

    switch(activeTool) {
      case 'text-reformatter': return <TextReformatter />;
      case 'data-converter': return <DataConverter />;
      case 'dev-tools': return <DevTools />;
      case 'pdf-extractor': return <PdfTextExtractor />;
      case 'pdf-compiler': return <TextToPdfCompiler />;
      case 'image-converter': return <ImageConverter />;
      case 'pdf-merge': return <PdfMerger />;
      case 'pdf-split': return <PdfSplitter />;
      case 'pdf-watermark': return <PdfWatermark />;
      case 'rotate-pdf': return <RotatePdf />;
      case 'jpg-to-pdf': return <JpgToPdf />;
      case 'bg-remover': return <BackgroundRemover />;
      case 'html-to-image': return <HtmlToImage />;
      case 'image-crop': return <ImageCropRotate />;
      case 'photo-editor': return <PhotoEditor />;
      
      // Phase 1 Tools
      case 'delete-pdf-pages': return <DeletePdfPages />;
      case 'extract-pdf-pages': return <ExtractPdfPages />;
      case 'organize-pdf': return <OrganizePdf />;
      case 'protect-pdf': return <ProtectPdf />;
      case 'flatten-pdf': return <FlattenPdf />;
      case 'sign-pdf': return <SignPdf />;
      case 'compress-pdf': return <CompressPdf />;
      
      default: return null;
    }
  };

  return (
    <Layout 
      onHomeClick={() => navigateTo(null)} 
      onSearch={(q) => { setSearchQuery(q); navigateTo(null); }}
    >
      {activeTool ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => navigateTo(null)} 
            className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          {renderTool()}
        </div>
      ) : (
        <Dashboard onSelectTool={navigateTo} searchQuery={searchQuery} />
      )}
    </Layout>
  );
}

export default App;
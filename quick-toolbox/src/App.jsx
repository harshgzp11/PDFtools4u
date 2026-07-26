import React, { useState } from 'react';
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
import JpgToPdf from './tools/JpgToPdf';
import BackgroundRemover from './tools/BackgroundRemover';
import HtmlToImage from './tools/HtmlToImage';
import ImageCropRotate from './tools/ImageCropRotate';
import PhotoEditor from './tools/PhotoEditor';
import { ArrowLeft } from 'lucide-react';

function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const renderTool = () => {
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
      case 'jpg-to-pdf': return <JpgToPdf />;
      case 'bg-remover': return <BackgroundRemover />;
      case 'html-to-image': return <HtmlToImage />;
      case 'image-crop': return <ImageCropRotate />;
      case 'photo-editor': return <PhotoEditor />;
      default: return null;
    }
  };

  return (
    <Layout 
      onHomeClick={() => setActiveTool(null)} 
      onSearch={(q) => { setSearchQuery(q); setActiveTool(null); }}
    >
      {activeTool ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setActiveTool(null)} 
            className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          {renderTool()}
        </div>
      ) : (
        <Dashboard onSelectTool={setActiveTool} searchQuery={searchQuery} />
      )}
    </Layout>
  );
}

export default App;
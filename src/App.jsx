import React, { useState, useEffect, Suspense } from 'react';
import { Toaster } from 'sonner';
import CommandMenu from './components/CommandMenu';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ToolSkeleton from './components/ui/ToolSkeleton';
import PlaceholderTool from './tools/PlaceholderTool';
import ToolSEOContent from './components/ui/ToolSEOContent';

const PdfEditor = React.lazy(() => import('./tools/PdfEditor/index'));
const PdfConverterHub = React.lazy(() => import('./tools/PdfConverterHub'));
const TextReformatter = React.lazy(() => import('./tools/TextReformatter'));
const DataConverter = React.lazy(() => import('./tools/DataConverter'));
const DevTools = React.lazy(() => import('./tools/DevTools'));
const PdfTextExtractor = React.lazy(() => import('./tools/PdfTextExtractor'));
const TextToPdfCompiler = React.lazy(() => import('./tools/TextToPdfCompiler'));
const ImageConverter = React.lazy(() => import('./tools/ImageConverter'));
const PdfMerger = React.lazy(() => import('./tools/PdfMerger'));
const PdfSplitter = React.lazy(() => import('./tools/PdfSplitter'));
const PdfWatermark = React.lazy(() => import('./tools/PdfWatermark'));
const RotatePdf = React.lazy(() => import('./tools/RotatePdf'));
const JpgToPdf = React.lazy(() => import('./tools/JpgToPdf'));
const BackgroundRemover = React.lazy(() => import('./tools/BackgroundRemover'));
const HtmlToImage = React.lazy(() => import('./tools/HtmlToImage'));
const ImageCropRotate = React.lazy(() => import('./tools/ImageCropRotate'));
const PhotoEditor = React.lazy(() => import('./tools/PhotoEditor/index'));

const DeletePdfPages = React.lazy(() => import('./tools/DeletePdfPages'));
const ExtractPdfPages = React.lazy(() => import('./tools/ExtractPdfPages'));
const OrganizePdf = React.lazy(() => import('./tools/OrganizePdf'));
const ProtectPdf = React.lazy(() => import('./tools/ProtectPdf'));
const UnlockPdf = React.lazy(() => import('./tools/UnlockPdf'));
const FlattenPdf = React.lazy(() => import('./tools/FlattenPdf'));
const SignPdf = React.lazy(() => import('./tools/SignPdf'));
const CompressPdf = React.lazy(() => import('./tools/CompressPdf'));
const NumberPages = React.lazy(() => import('./tools/NumberPages'));
const PdfFormFiller = React.lazy(() => import('./tools/PdfFormFiller'));
const CropPdf = React.lazy(() => import('./tools/CropPdf'));
const RedactPdf = React.lazy(() => import('./tools/RedactPdf'));
const TxtToPdf = React.lazy(() => import('./tools/TxtToPdf'));

const CompressImage = React.lazy(() => import('./tools/CompressImage'));
const ResizeImage = React.lazy(() => import('./tools/ResizeImage'));
const ConvertImage = React.lazy(() => import('./tools/ConvertImage'));

const DocxToText = React.lazy(() => import('./tools/DocxToText'));
const DocxToHtml = React.lazy(() => import('./tools/DocxToHtml'));
const TextToDocx = React.lazy(() => import('./tools/TextToDocx'));

const PdfToImage = React.lazy(() => import('./tools/PdfToImage'));
const PdfToWord = React.lazy(() => import('./tools/PdfToWord'));
const PdfToExcel = React.lazy(() => import('./tools/PdfToExcel'));
const PdfToPpt = React.lazy(() => import('./tools/PdfToPpt'));
const PptToPdf = React.lazy(() => import('./tools/PptToPdf'));
const PdfOcr = React.lazy(() => import('./tools/PdfOcr'));
const ExcelToPdf = React.lazy(() => import('./tools/ExcelToPdf'));
const WordToPdf = React.lazy(() => import('./tools/WordToPdf'));
const PdfReader = React.lazy(() => import('./tools/PdfReader'));
const PdfAnnotator = React.lazy(() => import('./tools/PdfAnnotator'));
const RtfToPdf = React.lazy(() => import('./tools/RtfToPdf'));

const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));

// Blog System
const BlogList = React.lazy(() => import('./pages/BlogList'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));

// Legal & Trust
const AboutUs = React.lazy(() => import('./pages/AboutUs'));
const ContactUs = React.lazy(() => import('./pages/ContactUs'));

const TOOL_COMPONENTS = {
  'edit-pdf': PdfEditor,
  'pdf-converter': PdfConverterHub,
  'text-reformatter': TextReformatter,
  'data-converter': DataConverter,
  'dev-tools': DevTools,
  'pdf-extractor': PdfTextExtractor,
  'pdf-compiler': TextToPdfCompiler,
  'image-converter': ImageConverter,
  'pdf-merge': PdfMerger,
  'pdf-split': PdfSplitter,
  'pdf-watermark': PdfWatermark,
  'rotate-pdf': RotatePdf,
  'jpg-to-pdf': JpgToPdf,
  'bg-remover': BackgroundRemover,
  'html-to-image': HtmlToImage,
  'image-crop': ImageCropRotate,
  'photo-editor': PhotoEditor,
  
  'delete-pdf-pages': DeletePdfPages,
  'extract-pdf-pages': ExtractPdfPages,
  'organize-pdf': OrganizePdf,
  'protect-pdf': ProtectPdf,
  'unlock-pdf': UnlockPdf,
  'flatten-pdf': FlattenPdf,
  'sign-pdf': SignPdf,
  'compress-pdf': CompressPdf,
  'number-pages': NumberPages,
  'pdf-form-filler': PdfFormFiller,
  'crop-pdf': CropPdf,
  'redact-pdf': RedactPdf,
  'txt-to-pdf': TxtToPdf,

  'compress-image': CompressImage,
  'resize-image': ResizeImage,
  'convert-image': ConvertImage,
  
  'docx-to-text': DocxToText,
  'docx-to-html': DocxToHtml,
  'text-to-docx': TextToDocx,

  'pdf-to-jpg': PdfToImage,
  'pdf-to-word': PdfToWord,
  'pdf-to-excel': PdfToExcel,
  'pdf-to-ppt': PdfToPpt,
  'ppt-to-pdf': PptToPdf,
  'pdf-ocr': PdfOcr,
  'excel-to-pdf': ExcelToPdf,
  'word-to-pdf': WordToPdf,
  'pdf-reader': PdfReader,
  'pdf-annotator': PdfAnnotator,
  'rtf-to-pdf': RtfToPdf,
  'privacy': PrivacyPolicy,
  'terms': TermsOfService,
  'about': AboutUs,
  'contact': ContactUs,
};

const PLACEHOLDER_TOOLS = {};

function App() {
  const [activeTool, setActiveTool] = useState(() => {
    const path = window.location.pathname.replace('/', '');
    return path || null;
  });
  
  const [visitedTools, setVisitedTools] = useState(() => {
    const path = window.location.pathname.replace('/', '');
    return path ? [path] : [];
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardTab, setDashboardTab] = useState(null);

  // Sync state when browser back/forward buttons are pressed
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '');
      setActiveTool(path || null);
      if (path) {
        setVisitedTools(prev => prev.includes(path) ? prev : [...prev, path]);
      }
      window.scrollTo(0, 0); // Scroll to top on navigation
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (toolId) => {
    if (toolId) {
      window.history.pushState({}, "", "/" + toolId + window.location.search);
      setActiveTool(toolId);
      setVisitedTools(prev => prev.includes(toolId) ? prev : [...prev, toolId]);
      window.scrollTo(0, 0);
    } else {
      window.history.pushState({}, "", "/" + window.location.search);
      setActiveTool(null);
      window.scrollTo(0, 0);
    }
  };

  return (
    <>
      <Toaster theme="light" position="bottom-right" />
      <CommandMenu onSelectTool={navigateTo} />
      <Layout 
        onNavigateToDomain={(domain) => { 
          setDashboardTab(domain); 
          navigateTo(null); 
        }} 
        onSelectTool={navigateTo}
        onSearch={(q) => { setSearchQuery(q); navigateTo(null); }}
        isToolView={!!activeTool}
      >
        {activeTool ? (
          <div className="relative w-full h-full flex flex-col min-h-0">
            <Suspense fallback={<ToolSkeleton />}>
              {activeTool === 'blog' ? (
                <BlogList onNavigate={navigateTo} />
              ) : activeTool.startsWith('blog/') ? (
                <BlogPost id={activeTool.split('/')[1]} onNavigate={navigateTo} />
              ) : (
                visitedTools.map(toolId => {
                  if (toolId === 'blog' || toolId.startsWith('blog/')) return null;
                  
                  const isPlaceholder = PLACEHOLDER_TOOLS[toolId];
                  const ToolComponent = TOOL_COMPONENTS[toolId];
                  
                  if (!isPlaceholder && !ToolComponent) return null;
                  
                  const isActive = activeTool === toolId;
                  
                  return (
                    <div 
                      key={toolId}
                      style={{ display: isActive ? 'flex' : 'none' }}
                      className={isActive ? "flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden animate-in fade-in zoom-in-[0.98] duration-300 custom-scrollbar" : ""}
                    >
                      <div className="flex-shrink-0 min-h-full flex flex-col">
                        {isPlaceholder ? (
                          <PlaceholderTool toolName={PLACEHOLDER_TOOLS[toolId]} />
                        ) : (
                          <ToolComponent />
                        )}
                        
                        {/* SEO Content Injection */}
                        <ToolSEOContent toolId={toolId} />
                      </div>
                    </div>
                  );
                })
              )}
            </Suspense>
          </div>
        ) : (
          <Dashboard onSelectTool={navigateTo} searchQuery={searchQuery} defaultTab={dashboardTab} />
        )}
      </Layout>
    </>
  );
}

export default App;
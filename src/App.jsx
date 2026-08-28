import React, { useState, useEffect, Suspense } from 'react';
import { Toaster } from 'sonner';
import CommandMenu from './components/CommandMenu';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ToolSkeleton from './components/ui/ToolSkeleton';
import PlaceholderTool from './tools/PlaceholderTool';
import ToolSEOContent from './components/ui/ToolSEOContent';
import SEOHead from './components/SEOHead';


// Custom lazy function to handle Vite chunk loading errors
const lazyWithRetry = (componentImport) =>
  React.lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return { default: () => null }; // Prevent React from crashing before reload
      }
      throw error;
    }
  });

const PdfEditor = lazyWithRetry(() => import('./tools/PdfEditor/index'));
const PdfConverterHub = lazyWithRetry(() => import('./tools/PdfConverterHub'));
const TextReformatter = lazyWithRetry(() => import('./tools/TextReformatter'));
const DataConverter = lazyWithRetry(() => import('./tools/DataConverter'));
const DevTools = lazyWithRetry(() => import('./tools/DevTools'));
const PdfTextExtractor = lazyWithRetry(() => import('./tools/PdfTextExtractor'));
const TextToPdfCompiler = lazyWithRetry(() => import('./tools/TextToPdfCompiler'));
const ImageConverter = lazyWithRetry(() => import('./tools/ImageConverter'));
const PdfMerger = lazyWithRetry(() => import('./tools/PdfMerger'));
const PdfSplitter = lazyWithRetry(() => import('./tools/PdfSplitter'));
const PdfWatermark = lazyWithRetry(() => import('./tools/PdfWatermark'));
const RotatePdf = lazyWithRetry(() => import('./tools/RotatePdf'));
const JpgToPdf = lazyWithRetry(() => import('./tools/JpgToPdf'));
const BackgroundRemover = lazyWithRetry(() => import('./tools/BackgroundRemover'));
const HtmlToImage = lazyWithRetry(() => import('./tools/HtmlToImage'));
const ImageCropRotate = lazyWithRetry(() => import('./tools/ImageCropRotate'));
const PhotoEditor = lazyWithRetry(() => import('./tools/PhotoEditor/index'));

const DeletePdfPages = lazyWithRetry(() => import('./tools/DeletePdfPages'));
const ExtractPdfPages = lazyWithRetry(() => import('./tools/ExtractPdfPages'));
const OrganizePdf = lazyWithRetry(() => import('./tools/OrganizePdf'));
const ProtectPdf = lazyWithRetry(() => import('./tools/ProtectPdf'));
const UnlockPdf = lazyWithRetry(() => import('./tools/UnlockPdf'));
const FlattenPdf = lazyWithRetry(() => import('./tools/FlattenPdf'));
const SignPdf = lazyWithRetry(() => import('./tools/SignPdf'));
const CompressPdf = lazyWithRetry(() => import('./tools/CompressPdf'));
const NumberPages = lazyWithRetry(() => import('./tools/NumberPages'));
const PdfFormFiller = lazyWithRetry(() => import('./tools/PdfFormFiller'));
const CropPdf = lazyWithRetry(() => import('./tools/CropPdf'));
const RedactPdf = lazyWithRetry(() => import('./tools/RedactPdf'));
const TxtToPdf = lazyWithRetry(() => import('./tools/TxtToPdf'));

const CompressImage = lazyWithRetry(() => import('./tools/CompressImage'));
const ResizeImage = lazyWithRetry(() => import('./tools/ResizeImage'));
const ConvertImage = lazyWithRetry(() => import('./tools/ConvertImage'));

const DocxToText = lazyWithRetry(() => import('./tools/DocxToText'));
const DocxToHtml = lazyWithRetry(() => import('./tools/DocxToHtml'));
const TextToDocx = lazyWithRetry(() => import('./tools/TextToDocx'));

const PdfToImage = lazyWithRetry(() => import('./tools/PdfToImage'));
const PdfToWord = lazyWithRetry(() => import('./tools/PdfToWord'));
const PdfToExcel = lazyWithRetry(() => import('./tools/PdfToExcel'));
const PdfToPpt = lazyWithRetry(() => import('./tools/PdfToPpt'));
const PptToPdf = lazyWithRetry(() => import('./tools/PptToPdf'));
const PdfOcr = lazyWithRetry(() => import('./tools/PdfOcr'));
const ExcelToPdf = lazyWithRetry(() => import('./tools/ExcelToPdf'));
const WordToPdf = lazyWithRetry(() => import('./tools/WordToPdf'));
const PdfReader = lazyWithRetry(() => import('./tools/PdfReader'));
const PdfAnnotator = lazyWithRetry(() => import('./tools/PdfAnnotator'));
const RtfToPdf = lazyWithRetry(() => import('./tools/RtfToPdf'));

const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));

// Blog System
const BlogList = lazyWithRetry(() => import('./pages/BlogList'));
const BlogPost = lazyWithRetry(() => import('./pages/BlogPost'));

// Sitemap / Hub
const AllTools = lazyWithRetry(() => import('./pages/AllTools'));

// Legal & Trust
const AboutUs = lazyWithRetry(() => import('./pages/AboutUs'));
const ContactUs = lazyWithRetry(() => import('./pages/ContactUs'));

// 404 Page
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

// Redirect map: non-canonical alias → canonical slug
// Users hitting an alias URL get seamlessly redirected to the canonical URL
const URL_REDIRECTS = {
  'merge-pdf': 'pdf-merge',
  'split-pdf': 'pdf-split',
  'pdf-protect': 'protect-pdf',
  'pdf-unlock': 'unlock-pdf',
  'pdf-compress': 'compress-pdf',
  'ocr-pdf': 'pdf-ocr',
  // Short aliases for legal pages (footer links use these)
  'privacy': 'privacy-policy',
  'terms': 'terms-of-service',
};

const TOOL_COMPONENTS = {
  'edit-pdf': PdfEditor,
  'pdf-editor': PdfEditor,
  'pdf-converter': PdfConverterHub,
  'text-reformatter': TextReformatter,
  'data-converter': DataConverter,
  'dev-tools': DevTools,
  'pdf-extractor': PdfTextExtractor,
  'pdf-to-text': PdfTextExtractor,
  'pdf-compiler': TextToPdfCompiler,
  'image-converter': ImageConverter,
  'pdf-merge': PdfMerger,
  'pdf-split': PdfSplitter,
  'pdf-watermark': PdfWatermark,
  'rotate-pdf': RotatePdf,
  'jpg-to-pdf': JpgToPdf,
  'png-to-pdf': JpgToPdf,
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
  'pdf-to-png': PdfToImage,
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
  'privacy-policy': PrivacyPolicy,
  'terms-of-service': TermsOfService,
  'about': AboutUs,
  'contact': ContactUs,
  'all-tools': AllTools,
};

const PLACEHOLDER_TOOLS = {};

// Resolve a slug: if it's an alias, return the canonical slug; otherwise return as-is
function resolveSlug(slug) {
  return URL_REDIRECTS[slug] || slug;
}

function App() {
  const [activeTool, setActiveTool] = useState(() => {
    const rawPath = window.location.pathname.replace('/', '').toLowerCase();
    const path = resolveSlug(rawPath);
    // If the URL was an alias, or uppercase, silently replace it with the canonical URL
    if (window.location.pathname !== '/' + path && path) {
      window.history.replaceState({}, '', '/' + path + window.location.search);
    }
    return path || null;
  });
  
  const [visitedTools, setVisitedTools] = useState(() => {
    const rawPath = window.location.pathname.replace('/', '').toLowerCase();
    const path = resolveSlug(rawPath);
    return path ? [path] : [];
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardTab, setDashboardTab] = useState(null);

  // Sync state when browser back/forward buttons are pressed
  useEffect(() => {
    const handlePopState = () => {
      const rawPath = window.location.pathname.replace('/', '').toLowerCase();
      const path = resolveSlug(rawPath);
      // Redirect alias URLs on back/forward navigation too
      if (window.location.pathname !== '/' + path && path) {
        window.history.replaceState({}, '', '/' + path + window.location.search);
      }
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
      // Always resolve to canonical slug before navigating
      const canonicalId = resolveSlug(toolId);
      window.history.pushState({}, "", "/" + canonicalId + window.location.search);
      setActiveTool(canonicalId);
      setVisitedTools(prev => prev.includes(canonicalId) ? prev : [...prev, canonicalId]);
      window.scrollTo(0, 0);
    } else {
      window.history.pushState({}, "", "/" + window.location.search);
      setActiveTool(null);
      window.scrollTo(0, 0);
    }
  };

  return (
    <>
      <SEOHead activeTool={activeTool} />
      <Toaster theme="light" position="bottom-right" />
      <CommandMenu onSelectTool={navigateTo} />
      <Layout 
        onNavigateToDomain={(domain) => { 
          setDashboardTab(domain); 
          navigateTo(null); 
        }} 
        onSelectTool={navigateTo}
        onSearch={(q) => { setSearchQuery(q); navigateTo(null); }}
        isToolView={!!activeTool && activeTool !== 'blog' && !activeTool.startsWith('blog/') && !['privacy-policy', 'terms-of-service', 'about', 'contact'].includes(activeTool)}
      >
        {activeTool ? (
          <div className="relative w-full h-full flex flex-col min-h-0">
            <Suspense fallback={<ToolSkeleton />}>
              {activeTool === 'blog' ? (
                <BlogList onNavigate={navigateTo} />
              ) : activeTool.startsWith('blog/') ? (
                <BlogPost id={activeTool.split('/')[1]} onNavigate={navigateTo} />
              ) : (() => {
                // Check if activeTool matches any known component
                const hasKnownTool = TOOL_COMPONENTS[activeTool] || PLACEHOLDER_TOOLS[activeTool];
                if (!hasKnownTool) {
                  // 404: Unknown route — show NotFound page with related tools
                  return <NotFound onSelectTool={navigateTo} />;
                }
                return visitedTools.map(toolId => {
                  if (toolId === 'blog' || toolId.startsWith('blog/')) return null;
                  
                  const isPlaceholder = PLACEHOLDER_TOOLS[toolId];
                  const ToolComponent = TOOL_COMPONENTS[toolId];
                  
                  if (!isPlaceholder && !ToolComponent) return null;
                  
                  const isActive = activeTool === toolId;
                  
                  return (
                    <div 
                      key={toolId}
                      style={{ display: isActive ? 'flex' : 'none' }}
                      className={isActive ? "flex-1 flex flex-col w-full h-full min-h-0 animate-in fade-in zoom-in-[0.98] duration-300" : ""}
                    >
                      <div className="flex-shrink-0 min-h-full flex flex-col">
                        {isPlaceholder ? (
                          <PlaceholderTool toolName={PLACEHOLDER_TOOLS[toolId]} />
                        ) : (
                          <ToolComponent />
                        )}
                        
                        {/* SEO Content Injection */}
                        <ToolSEOContent toolId={toolId} onSelectTool={navigateTo} />
                      </div>
                    </div>
                  );
                });
              })()}
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
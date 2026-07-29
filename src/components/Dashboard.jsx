import React, { useState } from 'react';
import { 
  Type, FileJson, Code, FileText, Image as ImageIcon, Layers, Scissors, Stamp, ImagePlus, Eraser, Code2, Crop, SlidersHorizontal,
  Minimize, ScanText, RotateCw, Trash2, FileUp, Files, BookOpen, PenTool, Hash, EyeOff, FileSignature, Share2, 
  FileCode2, FileSpreadsheet, Presentation, Lock, Unlock, Layers3, ArrowLeftRight, ChevronRight, Shield, Zap, MousePointerClick,
  Maximize, Settings2, FileOutput, ArrowRight, Search
} from 'lucide-react';

const DOMAINS = [
  {
    title: "PDF Tools",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    categories: [
      {
        name: "Organize & Edit",
        tools: [
          { id: 'pdf-merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one.', icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { id: 'pdf-split', name: 'Split PDF', description: 'Separate pages or extract sections.', icon: Scissors, color: 'text-cyan-500', bg: 'bg-cyan-50' },
          { id: 'rotate-pdf', name: 'Rotate PDF', description: 'Rotate PDF pages as needed.', icon: RotateCw, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'delete-pdf-pages', name: 'Delete PDF Pages', description: 'Remove pages from your PDF.', icon: Trash2, color: 'text-rose-500', bg: 'bg-rose-50' },
          { id: 'extract-pdf-pages', name: 'Extract PDF Pages', description: 'Extract specific pages into a new PDF.', icon: FileUp, color: 'text-violet-500', bg: 'bg-violet-50' },
          { id: 'organize-pdf', name: 'Organize PDF', description: 'Sort, add and delete PDF pages.', icon: Files, color: 'text-purple-500', bg: 'bg-purple-50' },
          { id: 'edit-pdf', name: 'Edit PDF', description: 'Edit text, images and links in PDFs.', icon: PenTool, color: 'text-teal-500', bg: 'bg-teal-50' },
          { id: 'pdf-annotator', name: 'PDF Annotator', description: 'Highlight and annotate PDFs.', icon: FileSignature, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { id: 'pdf-form-filler', name: 'Form Filler', description: 'Fill and complete interactive PDF forms.', icon: PenTool, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'pdf-reader', name: 'PDF Reader', description: 'View, navigate, and search PDFs.', icon: BookOpen, color: 'text-sky-500', bg: 'bg-sky-50' },
          { id: 'number-pages', name: 'Number Pages', description: 'Add page numbers to PDFs.', icon: Hash, color: 'text-cyan-500', bg: 'bg-cyan-50' },
          { id: 'crop-pdf', name: 'Crop PDF', description: 'Trim PDF margins or empty space.', icon: Crop, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'redact-pdf', name: 'Redact PDF', description: 'Permanently remove sensitive info.', icon: EyeOff, color: 'text-slate-500', bg: 'bg-slate-50' },
        ]
      },
      {
        name: "Optimize & Secure",
        tools: [
          { id: 'compress-pdf', name: 'Compress PDF', description: 'Reduce PDF file size without losing quality.', icon: Minimize, color: 'text-red-500', bg: 'bg-red-50' },
          { id: 'protect-pdf', name: 'Protect PDF', description: 'Encrypt PDF with a password.', icon: Lock, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove password from PDF.', icon: Unlock, color: 'text-red-500', bg: 'bg-red-50' },
          { id: 'flatten-pdf', name: 'Flatten PDF', description: 'Make forms and annotations uneditable.', icon: Layers3, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'sign-pdf', name: 'Sign PDF', description: 'Add a signature to your PDF.', icon: FileSignature, color: 'text-pink-500', bg: 'bg-pink-50' },
          { id: 'pdf-watermark', name: 'Watermark PDF', description: 'Add text or image watermark.', icon: Stamp, color: 'text-rose-500', bg: 'bg-rose-50' },
        ]
      },
      {
        name: "Convert to/from PDF",
        tools: [
          { id: 'pdf-converter', name: 'PDF Converter', description: 'Convert documents to and from PDF.', icon: ArrowLeftRight, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'pdf-ocr', name: 'PDF OCR', description: 'Make scanned PDF documents searchable.', icon: ScanText, color: 'text-red-500', bg: 'bg-red-50' },
          { id: 'pdf-to-word', name: 'PDF to Word', description: 'Convert PDF to editable Word document.', icon: FileCode2, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Convert PDF to Excel spreadsheet.', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'pdf-to-ppt', name: 'PDF to PPT', description: 'Convert PDF to PowerPoint presentation.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Convert PDF to JPG images.', icon: ImageIcon, color: 'text-yellow-500', bg: 'bg-yellow-50' },
          { id: 'word-to-pdf', name: 'Word to PDF', description: 'Convert Word document to PDF.', icon: FileCode2, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'excel-to-pdf', name: 'Excel to PDF', description: 'Convert Excel to PDF document.', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'ppt-to-pdf', name: 'PPT to PDF', description: 'Convert PowerPoint to PDF.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert JPG images to PDF.', icon: ImagePlus, color: 'text-yellow-500', bg: 'bg-yellow-50' },
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
        name: "Edit & Optimize",
        tools: [
          { id: 'compress-image', name: 'Compress Image', description: 'Reduce image file size instantly.', icon: Minimize, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { id: 'resize-image', name: 'Resize Image', description: 'Change dimensions of any image.', icon: Maximize, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'convert-image', name: 'Convert Image', description: 'Convert PNG, JPG, WebP, GIF.', icon: ArrowLeftRight, color: 'text-orange-500', bg: 'bg-orange-50' },
          { id: 'bg-remover', name: 'Remove Background', description: 'Automatically remove image backgrounds.', icon: Eraser, color: 'text-rose-500', bg: 'bg-rose-50' },
          { id: 'image-crop', name: 'Crop & Rotate', description: 'Visually crop and rotate your images.', icon: Crop, color: 'text-sky-500', bg: 'bg-sky-50' },
          { id: 'photo-editor', name: 'Photo Editor', description: 'Apply filters and adjustments to photos.', icon: SlidersHorizontal, color: 'text-violet-500', bg: 'bg-violet-50' },
        ]
      }
    ]
  },
  {
    title: "Document Tools (DOCX)",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    categories: [
      {
        name: "Word Utilities",
        tools: [
          { id: 'docx-to-text', name: 'DOCX to Text', description: 'Extract raw text from Word documents.', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'docx-to-html', name: 'DOCX to HTML', description: 'Convert Word documents to clean HTML.', icon: Code, color: 'text-green-500', bg: 'bg-green-50' },
          { id: 'text-to-docx', name: 'Text to DOCX', description: 'Generate a Word document from text.', icon: FileCode2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
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

const POPULAR_TOOL_IDS = ['compress-pdf', 'pdf-to-word', 'pdf-merge', 'jpg-to-pdf', 'pdf-to-jpg', 'sign-pdf', 'edit-pdf', 'organize-pdf'];

export default function Dashboard({ onSelectTool, searchQuery: globalQuery, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || DOMAINS[0].title);
  const [localSearch, setLocalSearch] = useState('');
  
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
      setTimeout(scrollToAllTools, 100); // small delay to ensure rendering
    }
  }, [defaultTab]);

  const query = (globalQuery || localSearch).toLowerCase();
  
  const allTools = DOMAINS.flatMap(d => d.categories.flatMap(c => c.tools));
  const popularTools = POPULAR_TOOL_IDS.map(id => allTools.find(t => t.id === id)).filter(Boolean);

  const scrollToAllTools = () => {
    const el = document.getElementById('all-tools');
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100; // Offset for sticky navbar
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // If user is searching, show flattened search results
  if (query) {
    const filteredTools = allTools.filter(tool => 
      tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
    );
    
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col gap-6 mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Search Results</h2>
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <input
              id="dashboard-search"
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              placeholder="Search for PDF tools, image converters, formatters..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </div>
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredTools.map(tool => {
              const Icon = tool.icon;
              return (
                <div 
                  key={tool.id} 
                  onClick={() => onSelectTool(tool.id)}
                  className="group bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-full"
                >
                  <div className={`p-4 rounded-2xl mb-5 ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform duration-300`}>
                    {Icon ? <Icon className="w-10 h-10 stroke-[1.5]" /> : <div className="w-10 h-10 bg-red-500 rounded-full animate-pulse" />}
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{tool.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mt-auto">{tool.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 text-lg">No tools found matching "{query}"</div>
        )}
      </div>
    );
  }

  const activeDomain = DOMAINS.find(d => d.title === activeTab);

  return (
    <div className="space-y-32 animate-in fade-in duration-500 pb-20">
      
      {/* Hero Section */}
      <section className="flex flex-col gap-16 pt-8 lg:pt-16">
        
        {/* Top part: Text + Illustration */}
        <div className="flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left: Text */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight">
              We make utilities <span className="text-blue-600">easy.</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              All the tools you'll need to work smarter with PDFs, Images, Documents, and Data. 100% free and completely private.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <button 
                onClick={scrollToAllTools}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                Explore All Tools <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Right: Illustration / Pics */}
          <div className="flex-1 w-full flex justify-center items-center">
            <div className="relative w-full max-w-lg aspect-square flex justify-center items-center">
              {/* Decorative background blob */}
              <div className="absolute inset-0 bg-blue-100 rounded-full blur-[80px] opacity-60"></div>
              
              {/* Center icon */}
              <div className="relative bg-white p-8 rounded-[2rem] shadow-2xl shadow-blue-900/10 z-20 animate-[bounce_4s_infinite]">
                <FileText className="w-20 h-20 text-blue-600" />
              </div>
              
              {/* Floating icons */}
              <div className="absolute top-1/4 left-8 bg-white p-5 rounded-2xl shadow-xl shadow-blue-900/5 -rotate-12 z-10 hover:scale-110 transition-transform">
                <Scissors className="w-10 h-10 text-cyan-500" />
              </div>
              
              <div className="absolute bottom-1/4 right-8 bg-white p-5 rounded-2xl shadow-xl shadow-blue-900/5 rotate-12 z-10 hover:scale-110 transition-transform">
                <ImageIcon className="w-10 h-10 text-yellow-500" />
              </div>
              
              <div className="absolute top-12 right-1/4 bg-white p-4 rounded-2xl shadow-xl shadow-blue-900/5 rotate-6 z-10 hover:scale-110 transition-transform">
                <Layers className="w-8 h-8 text-indigo-500" />
              </div>
              
              <div className="absolute bottom-12 left-1/4 bg-white p-4 rounded-2xl shadow-xl shadow-blue-900/5 -rotate-6 z-10 hover:scale-110 transition-transform">
                <Lock className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>
        </div>



        {/* Universal PDF Converter CTA (Now below) */}
        <div className="w-full flex justify-center items-center">
          <div 
            onClick={() => onSelectTool('pdf-converter')}
            className="group relative w-full max-w-5xl bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 sm:p-12 shadow-2xl hover:shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all duration-500 cursor-pointer overflow-hidden transform hover:-translate-y-1"
          >
            {/* Subtle background glow/shape */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 -left-10 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-block px-4 py-1.5 bg-[#f5c324] text-yellow-900 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm mb-6">
                  Most Essential
                </div>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
                  Universal Document Converter
                </h2>
                <p className="text-blue-100 text-lg mb-8 leading-relaxed max-w-xl mx-auto md:mx-0">
                  Upload any PDF, Image, Word, Excel, or PPT file. Convert to everything. One tool rules them all.
                </p>
                
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <span className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg">
                    Open Converter <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
                <div className="relative bg-white/10 p-8 rounded-3xl backdrop-blur-sm border border-white/20">
                  <ArrowLeftRight className="w-20 h-20 text-white" />
                  
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full border-4 border-indigo-600 bg-[#ff3b30] flex items-center justify-center text-white z-30 shadow-lg group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full border-4 border-indigo-600 bg-[#34c759] flex items-center justify-center text-white z-20 shadow-lg group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-full border-4 border-indigo-600 bg-[#ff9500] flex items-center justify-center text-white z-10 shadow-lg group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Most Popular Tools */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Most Popular Tools</h2>
          <p className="text-xl text-gray-500">The most frequently used utilities by our users.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularTools.map(tool => {
            const Icon = tool.icon;
            return (
              <div 
                key={tool.id} 
                onClick={() => onSelectTool(tool.id)}
                className="group bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer flex items-center gap-5"
              >
                <div className={`p-4 rounded-xl ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors truncate">{tool.name}</h3>
                  <p className="text-gray-500 text-sm truncate">{tool.description}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Categorized Tools Grid with Tabs */}
      <section id="all-tools" className="pt-24 border-t border-gray-200">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Toolbox Domains</h2>
          <p className="text-xl text-gray-500">Navigate our specialized toolsets.</p>
        </div>

        {/* Domain Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {DOMAINS.map(domain => (
            <button
              key={domain.title}
              onClick={() => setActiveTab(domain.title)}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                activeTab === domain.title 
                  ? `${domain.bg} ${domain.color} ${domain.border} border-2 shadow-sm scale-105` 
                  : `bg-white text-gray-500 border-2 border-gray-200 hover:bg-gray-50 hover:text-gray-800`
              }`}
            >
              {domain.title}
            </button>
          ))}
        </div>

        {/* Active Domain Content */}
        <div className="space-y-16 animate-in fade-in zoom-in-95 duration-300" key={activeTab}>
          {activeDomain.categories.map((category, idx) => (
            <div key={idx} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-200 pb-3">{category.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {category.tools.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <div 
                      key={tool.id} 
                      onClick={() => onSelectTool(tool.id)}
                      className="group bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-transparent hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-full"
                    >
                      <div className={`p-4 rounded-2xl mb-5 ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform duration-300`}>
                        {Icon ? <Icon className="w-10 h-10 stroke-[1.5]" /> : <div className="w-10 h-10 bg-red-500 rounded-full animate-pulse" />}
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{tool.name}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mt-auto">{tool.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

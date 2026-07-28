import React from 'react';
import { 
  Type, FileJson, Code, FileText, Image as ImageIcon, FileOutput, Layers, Scissors, Stamp, ImagePlus, Eraser, Code2, Crop, SlidersHorizontal,
  Minimize, FileDigit, ScanText, Combine, SplitSquareHorizontal, RotateCw, Trash2, FileUp, Files, BookOpen, PenTool, Hash, EyeOff, FileSignature, Share2, 
  FileCode2, FileSpreadsheet, Presentation, Lock, Unlock, Layers3, AlignVerticalJustifyCenter, ArrowLeftRight,
  ChevronRight, Shield, Zap, MousePointerClick
} from 'lucide-react';

const CATEGORIES = [
  {
    name: "Text & Data Utilities",
    tools: [
      { id: 'text-reformatter', name: 'Text Case & Reformatter', description: 'Change case, remove duplicates & clean whitespace instantly.', icon: Type, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'data-converter', name: 'Data Converters', description: 'Convert CSV to JSON, JSON to CSV, and Base64 Encode/Decode.', icon: FileJson, color: 'text-green-500', bg: 'bg-green-50' },
      { id: 'dev-tools', name: 'Developer Text Tools', description: 'Word counters, JSON Minifier/Beautifier and more.', icon: Code, color: 'text-purple-500', bg: 'bg-purple-50' },
    ]
  },
  {
    name: "Advanced Image Tools",
    tools: [
      { id: 'bg-remover', name: 'Remove Background', description: 'Automatically remove image backgrounds with AI.', icon: Eraser, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { id: 'html-to-image', name: 'HTML to Image', description: 'Render HTML/CSS code into a downloadable image.', icon: Code2, color: 'text-teal-500', bg: 'bg-teal-50' },
      { id: 'image-crop', name: 'Crop & Rotate', description: 'Visually crop and rotate your images.', icon: Crop, color: 'text-sky-500', bg: 'bg-sky-50' },
      { id: 'photo-editor', name: 'Photo Editor', description: 'Apply filters and adjustments to your photos.', icon: SlidersHorizontal, color: 'text-violet-500', bg: 'bg-violet-50' },
    ]
  },
  {
    name: "Compress",
    tools: [
      { id: 'compress-pdf', name: 'Compress PDF', description: 'Reduce PDF file size without losing quality.', icon: Minimize, color: 'text-red-500', bg: 'bg-red-50' },
    ]
  },
  {
    name: "Convert",
    tools: [
      { id: 'pdf-converter', name: 'PDF Converter', description: 'Convert documents to and from PDF.', icon: ArrowLeftRight, color: 'text-orange-500', bg: 'bg-orange-50' },
      { id: 'pdf-ocr', name: 'PDF OCR', description: 'Make scanned PDF documents searchable.', icon: ScanText, color: 'text-red-500', bg: 'bg-red-50' },
    ]
  },
  {
    name: "Organize",
    tools: [
      { id: 'pdf-merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one.', icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-50' },
      { id: 'pdf-split', name: 'Split PDF', description: 'Separate pages or extract sections.', icon: Scissors, color: 'text-cyan-500', bg: 'bg-cyan-50' },
      { id: 'rotate-pdf', name: 'Rotate PDF', description: 'Rotate PDF pages as needed.', icon: RotateCw, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'delete-pdf-pages', name: 'Delete PDF Pages', description: 'Remove pages from your PDF.', icon: Trash2, color: 'text-rose-500', bg: 'bg-rose-50' },
      { id: 'extract-pdf-pages', name: 'Extract PDF Pages', description: 'Extract specific pages into a new PDF.', icon: FileUp, color: 'text-violet-500', bg: 'bg-violet-50' },
      { id: 'organize-pdf', name: 'Organize PDF', description: 'Sort, add and delete PDF pages.', icon: Files, color: 'text-purple-500', bg: 'bg-purple-50' },
    ]
  },
  {
    name: "View & Edit",
    tools: [
      { id: 'edit-pdf', name: 'Edit PDF', description: 'Edit text, images and links in PDFs.', icon: PenTool, color: 'text-teal-500', bg: 'bg-teal-50' },
      { id: 'pdf-annotator', name: 'PDF Annotator', description: 'Highlight and annotate PDFs.', icon: FileSignature, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { id: 'pdf-reader', name: 'PDF Reader', description: 'View, navigate, and search PDFs.', icon: BookOpen, color: 'text-sky-500', bg: 'bg-sky-50' },
      { id: 'number-pages', name: 'Number Pages', description: 'Add page numbers to PDFs.', icon: Hash, color: 'text-cyan-500', bg: 'bg-cyan-50' },
      { id: 'crop-pdf', name: 'Crop PDF', description: 'Trim PDF margins or empty space.', icon: Crop, color: 'text-green-500', bg: 'bg-green-50' },
      { id: 'redact-pdf', name: 'Redact PDF', description: 'Permanently remove sensitive info.', icon: EyeOff, color: 'text-slate-500', bg: 'bg-slate-50' },
      { id: 'pdf-watermark', name: 'Watermark PDF', description: 'Add text or image watermark.', icon: Stamp, color: 'text-rose-500', bg: 'bg-rose-50' },
      { id: 'pdf-form-filler', name: 'PDF Form Filler', description: 'Fill out and complete PDF forms.', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'share-pdf', name: 'Share PDF', description: 'Share PDFs securely via link.', icon: Share2, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    ]
  },
  {
    name: "Convert from PDF",
    tools: [
      { id: 'pdf-to-word', name: 'PDF to Word', description: 'Convert PDF to editable Word document.', icon: FileCode2, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Convert PDF to Excel spreadsheet.', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
      { id: 'pdf-to-ppt', name: 'PDF to PPT', description: 'Convert PDF to PowerPoint presentation.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
      { id: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Convert PDF to JPG images.', icon: ImageIcon, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    ]
  },
  {
    name: "Convert to PDF",
    tools: [
      { id: 'word-to-pdf', name: 'Word to PDF', description: 'Convert Word document to PDF.', icon: FileCode2, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'excel-to-pdf', name: 'Excel to PDF', description: 'Convert Excel to PDF document.', icon: FileSpreadsheet, color: 'text-green-500', bg: 'bg-green-50' },
      { id: 'ppt-to-pdf', name: 'PPT to PDF', description: 'Convert PowerPoint to PDF.', icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
      { id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert JPG images to PDF.', icon: ImagePlus, color: 'text-yellow-500', bg: 'bg-yellow-50' },
      { id: 'txt-to-pdf', name: 'TXT to PDF', description: 'Convert text file to PDF.', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'rtf-to-pdf', name: 'RTF to PDF', description: 'Convert RTF document to PDF.', icon: AlignVerticalJustifyCenter, color: 'text-purple-500', bg: 'bg-purple-50' },
    ]
  },
  {
    name: "Sign",
    tools: [
      { id: 'sign-pdf', name: 'Sign PDF', description: 'Add a signature to your PDF.', icon: FileSignature, color: 'text-pink-500', bg: 'bg-pink-50' },
    ]
  },
  {
    name: "More",
    tools: [
      { id: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove password from PDF.', icon: Unlock, color: 'text-red-500', bg: 'bg-red-50' },
      { id: 'protect-pdf', name: 'Protect PDF', description: 'Encrypt PDF with a password.', icon: Lock, color: 'text-green-500', bg: 'bg-green-50' },
      { id: 'flatten-pdf', name: 'Flatten PDF', description: 'Make forms and annotations uneditable.', icon: Layers3, color: 'text-blue-500', bg: 'bg-blue-50' },
    ]
  }
];

const POPULAR_TOOL_IDS = ['pdf-converter', 'pdf-merge', 'jpg-to-pdf', 'sign-pdf', 'edit-pdf', 'compress-pdf'];

export default function Dashboard({ onSelectTool, searchQuery }) {
  const query = searchQuery.toLowerCase();
  
  const allTools = CATEGORIES.flatMap(c => c.tools);
  const popularTools = POPULAR_TOOL_IDS.map(id => allTools.find(t => t.id === id)).filter(Boolean);

  const scrollToAllTools = () => {
    const el = document.getElementById('all-tools');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If user is searching, only show the search results grid
  if (query) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Search Results</h2>
        {CATEGORIES.map((category, idx) => {
          const filteredTools = category.tools.filter(tool => 
            tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
          );
          if (filteredTools.length === 0) return null;
          return (
            <div key={idx} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-200 pb-3">{category.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {filteredTools.map(tool => {
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
          );
        })}
        {CATEGORIES.every(c => !c.tools.some(t => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query))) && (
          <div className="text-center py-20 text-gray-500 text-lg">No tools found matching "{searchQuery}"</div>
        )}
      </div>
    );
  }

  // Full Landing Page Layout
  return (
    <div className="space-y-32 animate-in fade-in duration-500 pb-20">
      
      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row items-center gap-12 pt-8 lg:pt-16">
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight">
            We make utilities <span className="text-blue-600">easy.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            All the tools you'll need to be more productive, format text, and work smarter with documents. 100% free and completely private.
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
        
        {/* Abstract Hero Graphic */}
        <div className="flex-1 w-full relative hidden lg:flex justify-center items-center h-[450px]">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-[3rem] border border-blue-100 shadow-inner transform rotate-3"></div>
          
          <div className="w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 flex flex-col gap-4 z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            <div className="w-full h-3 bg-gray-100 rounded"></div>
            <div className="w-5/6 h-3 bg-gray-100 rounded"></div>
            <div className="w-full h-3 bg-gray-100 rounded"></div>
            <div className="w-full h-40 bg-blue-50 rounded-xl flex items-center justify-center mt-4 border border-blue-100/50">
              <ImageIcon className="w-16 h-16 text-blue-300" />
            </div>
          </div>

          <div className="absolute top-12 left-10 p-5 bg-white rounded-2xl text-red-500 shadow-xl border border-gray-100 animate-bounce" style={{animationDuration: '3s'}}>
            <FileText className="w-10 h-10" />
          </div>
          <div className="absolute bottom-16 right-10 p-5 bg-white rounded-2xl text-green-500 shadow-xl border border-gray-100 animate-pulse" style={{animationDuration: '4s'}}>
            <FileSpreadsheet className="w-10 h-10" />
          </div>
          <div className="absolute top-24 right-24 p-4 bg-purple-500 rounded-2xl text-white shadow-xl transform rotate-12 hover:rotate-0 transition-transform">
            <Scissors className="w-8 h-8" />
          </div>
        </div>
      </section>

      {/* Most Popular Tools */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Most Popular Tools</h2>
          <p className="text-xl text-gray-500">20+ tools to convert, compress, and edit files for free.</p>
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

      {/* Feature Sections */}
      <section className="space-y-24">
        {/* Feature 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 lg:pr-12 text-center lg:text-left">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Work Directly on Your Files</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Do more than just view files. Highlight, add text, images, and annotations to your documents. You can instantly connect to 30 other tools to enhance your files further.
            </p>
          </div>
          <div className="flex-1 w-full aspect-video bg-gradient-to-tr from-gray-50 to-gray-100 rounded-3xl border border-gray-200 shadow-inner flex items-center justify-center p-8 lg:p-12">
            <div className="w-full h-full bg-white shadow-md rounded-xl border border-gray-200 p-6 relative">
              <div className="w-3/4 h-4 bg-gray-200 rounded mb-6"></div>
              <div className="w-full h-3 bg-gray-100 rounded mb-3"></div>
              <div className="w-5/6 h-3 bg-gray-100 rounded mb-3"></div>
              <div className="w-full h-3 bg-gray-100 rounded mb-3"></div>
              
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-blue-500 border-dashed rounded-lg bg-blue-50/50 flex items-center justify-center">
                <MousePointerClick className="w-10 h-10 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-6 lg:pl-12 text-center lg:text-left">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Maximum Privacy & Security</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your files never leave your device. All processing is done locally directly in your web browser. We don't upload your data to any servers, ensuring 100% privacy for your sensitive documents.
            </p>
          </div>
          <div className="flex-1 w-full aspect-video bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-100 shadow-inner flex items-center justify-center">
            <Shield className="w-32 h-32 text-green-500 drop-shadow-md animate-pulse" style={{animationDuration: '3s'}} />
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-6 lg:pr-12 text-center lg:text-left">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Lightning Fast Execution</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              No waiting for uploads or downloads. Because everything runs natively in your browser using modern web technologies, operations that used to take minutes now happen instantly.
            </p>
          </div>
          <div className="flex-1 w-full aspect-video bg-gradient-to-tr from-yellow-50 to-amber-50 rounded-3xl border border-yellow-100 shadow-inner flex items-center justify-center">
            <div className="relative">
              <Zap className="w-32 h-32 text-yellow-500 drop-shadow-md" />
              <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* All Tools Grid (Categorized) */}
      <section id="all-tools" className="pt-24 border-t border-gray-200">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Explore All Tools</h2>
          <p className="text-xl text-gray-500">Find exactly what you need from our comprehensive collection.</p>
        </div>

        <div className="space-y-16">
          {CATEGORIES.map((category, idx) => (
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

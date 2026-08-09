import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, FileJson, Code, FileText, Image as ImageIcon, Layers, Scissors, Stamp, ImagePlus, Eraser, Code2, Crop, SlidersHorizontal,
  Minimize, ScanText, RotateCw, Trash2, FileUp, Files, BookOpen, PenTool, Hash, EyeOff, FileSignature, Share2, 
  FileCode2, FileSpreadsheet, Presentation, Lock, Unlock, Layers3, ArrowLeftRight, ChevronRight, Shield, Zap, MousePointerClick,
  Maximize, Settings2, FileOutput, ArrowRight, Search, ShieldCheck, ServerOff, Eye, Globe, RefreshCw, CheckCircle2, Sparkles, Cpu
} from 'lucide-react';
import { DOMAINS, POPULAR_TOOL_IDS } from '../lib/toolConfig';
import { searchToolsFuzzy } from '../lib/fuzzySearch';

export default function Dashboard({ onSelectTool, searchQuery: globalQuery, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || DOMAINS[0].title);
  const [localSearch, setLocalSearch] = useState('');
  const searchInputRef = useRef(null);
  const heroSearchRef = useRef(null);
  
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
      setTimeout(scrollToAllTools, 100);
    }
  }, [defaultTab]);

  // Maintain focus on search input when switching views
  useEffect(() => {
    if (localSearch && searchInputRef.current && document.activeElement !== searchInputRef.current) {
      searchInputRef.current.focus();
      const length = searchInputRef.current.value.length;
      // Use setTimeout to ensure the cursor moves to the end on all browsers
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.setSelectionRange(length, length);
        }
      }, 0);
    } else if (!localSearch && heroSearchRef.current && document.activeElement !== heroSearchRef.current) {
      if (document.activeElement === document.body) {
        heroSearchRef.current.focus();
      }
    }
  }, [localSearch]);

  const query = (globalQuery || localSearch).toLowerCase();
  
  const allTools = DOMAINS.flatMap(d => d.categories.flatMap(c => c.tools));
  const popularTools = POPULAR_TOOL_IDS.map(id => allTools.find(t => t.id === id)).filter(Boolean);

  const scrollToAllTools = () => {
    const el = document.getElementById('all-tools');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // If user is searching, show fuzzy matching search results
  if (query) {
    const filteredTools = searchToolsFuzzy(query);
    
    return (
      <div className="space-y-10 animate-in fade-in duration-500 p-4 md:p-8">
        <div className="flex flex-col gap-6 mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Search Results</h2>
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
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
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* Hero Section - Clean Smallpdf Style */}
      <section className="relative pt-6 pb-12 lg:pt-12 lg:pb-16 px-4 md:px-8 mb-12">
        {/* Soft Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-gradient-to-b from-blue-50/60 via-indigo-50/20 to-transparent rounded-3xl -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          {/* Left: Headline & Actions */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            
            {/* Soft Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs sm:text-sm font-semibold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>100% Free & Completely Private</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Free Online <span className="text-blue-600">PDF & Image Tools</span>
            </h1>

            {/* Subtitle — supporting long-tail keywords */}
            <h2 className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Edit, convert, compress, merge & sign documents right in your browser. Zero file uploads, 100% secure & private.
            </h2>

            {/* Search Input Bar (Smallpdf style quick action) */}
            <div className="pt-2 max-w-lg mx-auto lg:mx-0">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  ref={heroSearchRef}
                  type="text"
                  placeholder="Search 40+ tools (e.g. Merge, OCR, Convert...)"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-11 pr-32 py-3.5 bg-white border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={scrollToAllTools}
                  className="absolute right-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center gap-1"
                >
                  Explore <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action buttons & Trust row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button 
                onClick={scrollToAllTools}
                className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                Explore All Tools <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onSelectTool('pdf-converter')}
                className="px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-semibold text-base shadow-xs transition-all flex items-center gap-2"
              >
                Universal Converter <Zap className="w-4 h-4 text-amber-500" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-medium text-gray-500 pt-1">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Client-Side Only</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" /> No Software Install</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-600" /> No Registration</span>
            </div>

          </div>

          {/* Right: Smallpdf-Style Clean Soft Cards Showcase */}
          <div className="flex-1 w-full max-w-xl lg:max-w-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Tool Card 1: PDF Converter */}
              <div 
                onClick={() => onSelectTool('pdf-converter')}
                className="group bg-blue-50/70 hover:bg-blue-50 border border-blue-100/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between h-40"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors flex items-center justify-between">
                    PDF Converter
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">Convert PDF to Word, Excel, PPT & Images</p>
                </div>
              </div>

              {/* Tool Card 2: Compress PDF */}
              <div 
                onClick={() => onSelectTool('compress-pdf')}
                className="group bg-rose-50/70 hover:bg-rose-50 border border-rose-100/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between h-40"
              >
                <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Minimize className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-rose-600 transition-colors flex items-center justify-between">
                    Compress PDF
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">Reduce document size while maintaining quality</p>
                </div>
              </div>

              {/* Tool Card 3: Edit PDF & Sign */}
              <div 
                onClick={() => onSelectTool('edit-pdf')}
                className="group bg-amber-50/70 hover:bg-amber-50 border border-amber-100/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between h-40"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-amber-600 transition-colors flex items-center justify-between">
                    Edit & Sign PDF
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">Add text, annotations, signatures & forms</p>
                </div>
              </div>

              {/* Tool Card 4: OCR Text Extractor */}
              <div 
                onClick={() => onSelectTool('pdf-ocr')}
                className="group bg-purple-50/70 hover:bg-purple-50 border border-purple-100/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between h-40"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <ScanText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-purple-600 transition-colors flex items-center justify-between">
                    OCR Text Extractor
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">Extract editable text from scanned documents</p>
                </div>
              </div>

              {/* Tool Card 5: Merge PDF */}
              <div 
                onClick={() => onSelectTool('pdf-merge')}
                className="group bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between h-40"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Files className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                    Merge PDF
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">Combine multiple files into a single document</p>
                </div>
              </div>

              {/* Tool Card 6: Protect PDF */}
              <div 
                onClick={() => onSelectTool('protect-pdf')}
                className="group bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-100/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between h-40"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-600 transition-colors flex items-center justify-between">
                    Protect & Unlock
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">Encrypt PDFs or remove password restrictions</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Universal Document Converter Banner - Clean Light Style */}
      <div className="w-full flex justify-center items-center px-4 md:px-8 mb-16">
        <div 
          onClick={() => onSelectTool('pdf-converter')}
          className="group relative w-full max-w-7xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-8 sm:p-10 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-0.5"
        >
          {/* Decorative subtle background pattern */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-sm mb-4">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> All-In-One Document Suite
              </div>
              
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3 tracking-tight">
                Universal Document Converter
              </h2>
              <p className="text-blue-100 text-base mb-6 leading-relaxed max-w-xl mx-auto md:mx-0">
                Convert PDFs, Images, Word, Excel, PowerPoint, and Text instantly in your browser.
              </p>
              
              <div className="flex items-center justify-center md:justify-start gap-4">
                <span className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all flex items-center gap-2 shadow-sm group-hover:gap-3">
                  Open Converter <ArrowRight className="w-4 h-4 text-blue-600 transition-all" />
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center relative">
              <div className="relative bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20">
                <ArrowLeftRight className="w-14 h-14 text-white" />
                <div className="absolute -bottom-2 -left-2 w-9 h-9 rounded-full border-2 border-white bg-rose-500 flex items-center justify-center text-white shadow-md">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center text-white shadow-md">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full border-2 border-white bg-amber-500 flex items-center justify-center text-white shadow-md">
                  <ImageIcon className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Most Popular Tools */}
      <section className="mt-32 px-4 md:px-8">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Most Popular Tools</h2>
          <p className="text-xl text-gray-500">The most frequently used utilities by our users.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
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

      {/* ========== Privacy & Security Trust Section ========== */}
      <section className="mt-32 px-4 md:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-200 mx-auto">
            <ShieldCheck className="w-4 h-4" /> Your Privacy Matters
          </div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">100% Private & Secure</h2>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto">
            Every file you process stays on your device. Nothing ever leaves your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Card 1: Client-Side */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all group">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <ServerOff className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">No Server Uploads</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              All processing happens locally in your browser's memory. Your files never touch our servers.
            </p>
          </div>

          {/* Card 2: No Data Collection */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all group">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <Eye className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Zero Data Collection</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              We don't track, store, or analyze any content from your documents. What's yours stays yours.
            </p>
          </div>

          {/* Card 3: Encryption */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all group">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <Lock className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Secure by Design</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Built with browser-native APIs and modern encryption standards. No external dependencies for file handling.
            </p>
          </div>

          {/* Card 4: Open & Free */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all group">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <Globe className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Free & Unlimited</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              No hidden limits, no watermarks, no signup required. Use every tool as many times as you need.
            </p>
          </div>
        </div>

        {/* Trust Banner */}
        <div className="mt-10 max-w-4xl mx-auto bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-shrink-0 p-3 bg-emerald-100 rounded-xl">
            <Shield className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="text-center sm:text-left">
            <h4 className="font-bold text-emerald-900 text-lg">Client-Side Data Privacy Guarantee</h4>
            <p className="text-emerald-700 text-sm mt-1">
              All PDF, image, and document processing occurs 100% locally in your browser memory. No file data is ever transmitted to external servers. Your documents remain strictly on your machine at all times.
            </p>
          </div>
        </div>
      </section>

      {/* ========== How It Works Section ========== */}
      <section className="mt-32 px-4 md:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">How It Works</h2>
          <p className="text-xl text-gray-500">Three simple steps. No signup required.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center group">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-5 text-blue-600 font-extrabold text-2xl group-hover:scale-110 transition-transform">
              1
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Choose a Tool</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Pick from 40+ specialized tools for PDFs, images, documents and more.
            </p>
          </div>
          <div className="text-center group">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5 text-indigo-600 font-extrabold text-2xl group-hover:scale-110 transition-transform">
              2
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Upload Your File</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Drag and drop or browse. Your file stays in your browser — nothing is uploaded.
            </p>
          </div>
          <div className="text-center group">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600 font-extrabold text-2xl group-hover:scale-110 transition-transform">
              3
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Download Result</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your processed file is ready instantly. Download it or share it with another tool.
            </p>
          </div>
        </div>
      </section>

      {/* ========== ALL TOOLS - Smallpdf-style Grid ========== */}
      <section id="all-tools" className="mt-32 px-4 md:px-8">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">All Tools</h2>
          <p className="text-xl text-gray-500">Everything you need, organized by category.</p>
        </div>

        {/* Domain Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {DOMAINS.map(domain => (
            <button
              key={domain.title}
              onClick={() => setActiveTab(domain.title)}
              className={`px-6 py-3 rounded-xl font-bold text-base transition-all ${
                activeTab === domain.title 
                  ? `${domain.bg} ${domain.color} ${domain.border} border-2 shadow-sm scale-105` 
                  : `bg-white text-gray-500 border-2 border-gray-200 hover:bg-gray-50 hover:text-gray-800`
              }`}
            >
              {domain.title}
            </button>
          ))}
        </div>

        {/* Smallpdf-style categorized columns */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-10 shadow-sm" key={activeTab}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-10 animate-in fade-in duration-300">
            {activeDomain.categories.map((category, idx) => (
              <div key={idx} className="flex flex-col">
                <h3 className="font-bold text-gray-400 text-xs tracking-wider uppercase mb-4 pb-2 border-b border-gray-100">
                  {category.name}
                </h3>
                <ul className="space-y-1">
                  {category.tools.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <li key={tool.id}>
                        <button
                          onClick={() => onSelectTool(tool.id)}
                          className="w-full text-left flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 group transition-colors"
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${tool.color} group-hover:scale-110 transition-transform`} />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors whitespace-nowrap">
                            {tool.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

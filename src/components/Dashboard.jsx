import React, { useState, useEffect } from 'react';
import { 
  Type, FileJson, Code, FileText, Image as ImageIcon, Layers, Scissors, Stamp, ImagePlus, Eraser, Code2, Crop, SlidersHorizontal,
  Minimize, ScanText, RotateCw, Trash2, FileUp, Files, BookOpen, PenTool, Hash, EyeOff, FileSignature, Share2, 
  FileCode2, FileSpreadsheet, Presentation, Lock, Unlock, Layers3, ArrowLeftRight, ChevronRight, Shield, Zap, MousePointerClick,
  Maximize, Settings2, FileOutput, ArrowRight, Search, ShieldCheck, ServerOff, Eye, Globe, RefreshCw
} from 'lucide-react';
import { DOMAINS, POPULAR_TOOL_IDS } from '../lib/toolConfig';



export default function Dashboard({ onSelectTool, searchQuery: globalQuery, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || DOMAINS[0].title);
  const [localSearch, setLocalSearch] = useState('');
  
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
      setTimeout(scrollToAllTools, 100);
    }
  }, [defaultTab]);

  const query = (globalQuery || localSearch).toLowerCase();
  
  const allTools = DOMAINS.flatMap(d => d.categories.flatMap(c => c.tools));
  const popularTools = POPULAR_TOOL_IDS.map(id => allTools.find(t => t.id === id)).filter(Boolean);

  const scrollToAllTools = () => {
    const el = document.getElementById('all-tools');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // If user is searching, show flattened search results
  if (query) {
    const filteredTools = allTools.filter(tool => 
      tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
    );
    
    return (
      <div className="space-y-10 animate-in fade-in duration-500 p-4 md:p-8">
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
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* Hero Section */}
      <section className="flex flex-col gap-16 pt-8 lg:pt-16 px-4 md:px-8">
        
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

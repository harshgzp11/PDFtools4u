import React, { useState, useEffect } from 'react';

import { Search, Shield, Zap, Menu, X, FileText, Image as ImageIcon, ChevronDown, BookOpen } from 'lucide-react';
import { DOMAINS } from '../lib/toolConfig';
import Footer from './Footer';

export default function Layout({ children, onNavigateToDomain, onSearch, onSelectTool, isToolView = false }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [expandedMobileDomain, setExpandedMobileDomain] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.mega-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDropdownClick = (domainTitle) => {
    setActiveDropdown(activeDropdown === domainTitle ? null : domainTitle);
  };

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  return (
    <div className={`bg-white text-gray-900 flex flex-col font-sans selection:bg-blue-100 min-h-screen overflow-y-auto custom-scrollbar`}>
      {/* Navbar */}
      <nav className={`flex-shrink-0 sticky top-0 z-[100] transition-all duration-300 bg-white/80 backdrop-blur-2xl border-b border-gray-200/80 ${
        scrolled ? 'shadow-sm' : ''
      }`}>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center cursor-pointer group" onClick={() => { onNavigateToDomain(null); setIsMobileMenuOpen(false); }}>
              <img 
                src="/images/pdftool4u-logo.png" 
                alt="PDFTools4u Logo" 
                className="h-10 md:h-12 w-auto max-w-[220px] object-contain group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center">
                <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg mr-2.5 shadow-lg shadow-blue-500/30">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-gray-900">PDFTools4U</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2 relative mega-dropdown-container h-full">
              {DOMAINS.slice(0, 2).map((domain, index) => (
                <div 
                  key={domain.title} 
                  className="relative group flex items-center h-full"
                  onMouseEnter={() => setActiveDropdown(domain.title)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button 
                    onClick={() => {
                      onNavigateToDomain(domain.title);
                      setActiveDropdown(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeDropdown === domain.title ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                     {domain.title === 'PDF Tools' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                     {domain.title}
                     <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === domain.title ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Mega Dropdown */}
                  {activeDropdown === domain.title && (
                    <>
                      <div className="absolute top-full left-0 right-0 h-4 bg-transparent z-10" />
                      <div 
                        className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-max max-w-[95vw] bg-white border border-gray-200 shadow-2xl rounded-xl p-6 z-[9999] animate-in fade-in slide-in-from-top-2"
                        onMouseEnter={() => setActiveDropdown(domain.title)}
                        onMouseLeave={() => setActiveDropdown(null)}
                      >
                        <div className="flex gap-6 lg:gap-10">
                          {domain.categories.map((category, idx) => (
                            <div key={idx} className="flex flex-col space-y-4">
                              <h3 className="font-bold text-gray-400 text-xs tracking-wider uppercase">{category.name}</h3>
                              <ul className="space-y-1">
                                {domain.categories[idx].tools.map(tool => {
                                  const Icon = tool.icon;
                                  return (
                                    <li key={tool.id}>
                                      <button 
                                        onClick={() => {
                                          onSelectTool(tool.id);
                                          setActiveDropdown(null);
                                        }}
                                        className="w-full text-left flex items-center gap-3 group transition-all p-2 -mx-2 rounded-lg hover:bg-gray-50"
                                      >
                                        <Icon className={`w-5 h-5 shrink-0 ${tool.color} transition-transform group-hover:scale-110`} />
                                        <span className="font-semibold text-gray-700 text-sm group-hover:text-black transition-colors whitespace-nowrap">
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
                        
                        <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end items-center">
                          <button 
                            onClick={() => {
                              onNavigateToDomain(domain.title);
                              setActiveDropdown(null);
                            }}
                            className={`text-xs font-bold flex items-center gap-1 ${domain.color} hover:opacity-80`}
                          >
                            View all {domain.title} &rarr;
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              <button 
                onClick={() => onSelectTool('blog')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-1.5 ml-2"
              >
                 <BookOpen className="w-4 h-4" />
                 Blog
              </button>

              {/* Search Button */}
              <div className="ml-3 pl-3 border-l border-gray-200/80">
                <button 
                  onClick={openSearch}
                  className="flex items-center justify-between w-64 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/10 transition-all text-gray-600 group"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="font-medium text-sm">Search tools...</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <kbd className="bg-white text-gray-500 px-1.5 py-0.5 rounded md border-b border-gray-300 font-bold shadow-sm">⌘</kbd>
                    <kbd className="bg-white text-gray-500 px-1.5 py-0.5 rounded md border-b border-gray-300 font-bold shadow-sm">K</kbd>
                  </div>
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button onClick={openSearch} className="p-2 text-gray-600 hover:text-blue-600">
                <Search className="w-5 h-5" />
              </button>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-900 z-50 relative">
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-16 px-4 animate-in slide-in-from-top-4 duration-300 md:hidden overflow-y-auto pb-20">
          <div className="flex flex-col gap-4 mt-4">
            <button onClick={() => { openSearch(); setIsMobileMenuOpen(false); }} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 text-base font-medium text-gray-900">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" /> Search Tools
              </div>
              <kbd className="bg-white text-gray-500 px-2 py-0.5 rounded text-xs border border-gray-200 font-bold shadow-sm">⌘K</kbd>
            </button>
            <div className="h-px bg-gray-100 w-full" />
            
            {/* Mobile Accordions */}
            {DOMAINS.slice(0, 2).map((domain) => (
              <div key={domain.title} className="flex flex-col gap-1">
                <button 
                  onClick={() => setExpandedMobileDomain(expandedMobileDomain === domain.title ? null : domain.title)} 
                  className="flex items-center justify-between text-base font-medium text-gray-700 hover:text-blue-600 py-2 w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    {domain.title === 'PDF Tools' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                    {domain.title}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedMobileDomain === domain.title ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedMobileDomain === domain.title && (
                  <div className="flex flex-col gap-1 pl-6 py-2 border-l-2 border-gray-100 ml-2 animate-in slide-in-from-top-2">
                    <button 
                      onClick={() => { onNavigateToDomain(domain.title); setIsMobileMenuOpen(false); }}
                      className="text-left text-blue-600 font-bold py-1 mb-1 text-sm"
                    >
                      View All {domain.title} &rarr;
                    </button>
                    {domain.categories.flatMap(c => c.tools).slice(0, 6).map(tool => (
                      <button 
                        key={tool.id}
                        onClick={() => { onSelectTool(tool.id); setIsMobileMenuOpen(false); }}
                        className="text-left py-1.5 text-sm text-gray-600 hover:text-gray-900"
                      >
                        {tool.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <button 
              onClick={() => { onSelectTool('blog'); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-2 text-base font-medium text-gray-700 hover:text-blue-600 py-2 w-full text-left"
            >
              <BookOpen className="w-4 h-4" />
              Blog & Tips
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Area */}
      <div className={`flex-1 flex w-full max-w-[1920px] mx-auto px-2 sm:px-4 py-4 gap-4 xl:gap-6 justify-center items-start`}>
        
        {/* Left Sidebar Ad */}
        <aside className="hidden 2xl:flex flex-col w-[160px] flex-shrink-0 h-full max-h-full rounded-2xl relative overflow-hidden">
          <div className="flex-1 bg-gray-50 border border-gray-200/60 rounded-2xl flex items-center justify-center relative group">
             <span className="text-gray-300 text-xs font-bold uppercase tracking-[0.2em] -rotate-90">Advertisement</span>
          </div>
        </aside>

        <main className={`flex-1 w-full min-w-0 flex flex-col`}>
          <div className={`flex-1 w-full rounded-2xl flex flex-col`}>
            {children}
          </div>
        </main>

        {/* Right Sidebar Ad */}
        <aside className="hidden xl:flex flex-col w-[160px] flex-shrink-0 h-full max-h-full rounded-2xl relative overflow-hidden">
          <div className="flex-1 bg-gray-50 border border-gray-200/60 rounded-2xl flex items-center justify-center relative group">
             <span className="text-gray-300 text-xs font-bold uppercase tracking-[0.2em] -rotate-90">Advertisement</span>
          </div>
        </aside>

      </div>

      <Footer onSelectTool={onSelectTool} />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Search, Shield, Zap, Menu, X, FileText, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { DOMAINS } from '../lib/toolConfig';

export default function Layout({ children, onNavigateToDomain, onSearch, onSelectTool }) {
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
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-2xl border-b border-gray-200/80 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center cursor-pointer group" onClick={() => { onNavigateToDomain(null); setIsMobileMenuOpen(false); }}>
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mr-3 group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/30">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-900">QuickToolbox</span>
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
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      activeDropdown === domain.title ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                     {domain.title === 'PDF Tools' ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                     {domain.title}
                     <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === domain.title ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Mega Dropdown */}
                  {activeDropdown === domain.title && (
                    <>
                      {/* Invisible bridge to prevent hover gap issues */}
                      <div className="absolute top-full left-0 right-0 h-6 bg-transparent z-10" />

                      {/* Arrow indicator centered on the button */}
                      <div className="absolute top-full mt-[2px] w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 z-[55] left-1/2 -translate-x-1/2 pointer-events-none"></div>

                      <div className="fixed top-[90px] left-1/2 -translate-x-1/2 w-max max-w-[95vw] bg-white border border-gray-200 shadow-2xl rounded-xl p-8 z-50 animate-in fade-in slide-in-from-top-2">
                        
                        <div className="flex gap-8 lg:gap-12">
                          {domain.categories.map((category, idx) => (
                            <div key={idx} className="flex flex-col space-y-6">
                              <h3 className="font-bold text-gray-500 text-[15px] tracking-wider uppercase">{category.name}</h3>
                              <ul className="space-y-6">
                                {category.tools.map(tool => {
                                  const Icon = tool.icon;
                                  return (
                                    <li key={tool.id}>
                                      <button 
                                        onClick={() => {
                                          onSelectTool(tool.id);
                                          setActiveDropdown(null);
                                        }}
                                        className="text-left flex items-center gap-4 group transition-colors"
                                      >
                                        <Icon className={`w-7 h-7 ${tool.color} transition-transform group-hover:scale-110`} />
                                        <span className="font-semibold text-gray-700 text-base group-hover:text-black transition-colors whitespace-nowrap">
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
                        
                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-sm text-gray-500"></span>
                          <button 
                            onClick={() => {
                              onNavigateToDomain(domain.title);
                              setActiveDropdown(null);
                            }}
                            className={`text-sm font-bold flex items-center gap-1 ${domain.color} hover:opacity-80`}
                          >
                            View all {domain.title} &rarr;
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {/* Move Search Button Here */}
              <div className="ml-4 pl-4 border-l border-gray-200/80">
                <button 
                  onClick={openSearch}
                  className="flex items-center justify-between w-72 px-5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-100 hover:bg-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all text-gray-700 group"
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
                    <span className="font-medium text-[15px]">Search tools...</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="bg-white text-gray-700 px-2.5 py-1 rounded-lg text-xs border-b-2 border-gray-300 font-bold shadow-sm">⌘</kbd>
                    <kbd className="bg-white text-gray-700 px-2.5 py-1 rounded-lg text-xs border-b-2 border-gray-300 font-bold shadow-sm">K</kbd>
                  </div>
                </button>
              </div>
            </div>

            {/* Desktop Actions Placeholder to maintain centering */}
            <div className="hidden lg:flex items-center gap-4 w-[180px]">
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-4">
              <button onClick={openSearch} className="p-2 text-gray-600 hover:text-blue-600">
                <Search className="w-6 h-6" />
              </button>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-900 z-50 relative">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-6 animate-in slide-in-from-top-4 duration-300 md:hidden">
          <div className="flex flex-col gap-6">
            <button onClick={() => { openSearch(); setIsMobileMenuOpen(false); }} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 text-lg font-medium text-gray-900">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-500" /> Search Tools
              </div>
              <kbd className="bg-white text-gray-500 px-2 py-0.5 rounded-md text-xs border border-gray-200 font-bold shadow-sm">⌘K</kbd>
            </button>
            <div className="h-px bg-gray-100 w-full" />
            
            {/* Mobile Accordions */}
            {DOMAINS.slice(0, 2).map((domain) => (
              <div key={domain.title} className="flex flex-col gap-2">
                <button 
                  onClick={() => setExpandedMobileDomain(expandedMobileDomain === domain.title ? null : domain.title)} 
                  className="flex items-center justify-between text-lg font-medium text-gray-700 hover:text-blue-600 py-2 w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    {domain.title === 'PDF Tools' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    {domain.title}
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedMobileDomain === domain.title ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedMobileDomain === domain.title && (
                  <div className="flex flex-col gap-1 pl-8 py-2 border-l-2 border-gray-100 ml-2 animate-in slide-in-from-top-2">
                    <button 
                      onClick={() => { onNavigateToDomain(domain.title); setIsMobileMenuOpen(false); }}
                      className="text-left text-blue-600 font-bold py-2 mb-2"
                    >
                      View All {domain.title} &rarr;
                    </button>
                    {domain.categories.flatMap(c => c.tools).slice(0, 6).map(tool => (
                      <button 
                        key={tool.id}
                        onClick={() => { onSelectTool(tool.id); setIsMobileMenuOpen(false); }}
                        className="text-left py-2 text-gray-600 hover:text-gray-900"
                      >
                        {tool.name}
                      </button>
                    ))}
                    <div className="text-sm text-gray-400 italic pt-2">And more...</div>
                  </div>
                )}
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex w-full px-2 sm:px-4 pt-32 pb-12 gap-4 xl:gap-6 justify-center items-start">
        
        {/* Left Sidebar Ad - Sticky & Thin */}
        <aside className="hidden 2xl:block w-[160px] flex-shrink-0 pt-2 sticky top-32 space-y-6">
          <div className="h-[600px] bg-white border border-gray-200 shadow-sm rounded-2xl flex items-center justify-center">
             <span className="text-gray-400 text-xs font-medium uppercase tracking-widest -rotate-90">Advertisement</span>
          </div>
        </aside>

        <main className="flex-1 w-full min-w-0 flex flex-col gap-8">
          <div className="p-6 sm:p-10 min-h-[600px]">
            {children}
          </div>
          
          {/* Trust Section */}
          <div className="mt-auto pt-10 pb-6 border-t border-gray-100/80 flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-emerald-500" />
              <h3 className="font-bold text-gray-900 text-xl tracking-tight">100% Private & Secure Processing</h3>
            </div>
            <p className="text-gray-500 text-base max-w-2xl leading-relaxed">
              Your files never leave your device. All processing is done locally in your browser for maximum security. We don't upload your data to any servers.
            </p>
          </div>
        </main>

        {/* Right Sidebar Ad - Sticky & Thin */}
        <aside className="hidden xl:block w-[160px] flex-shrink-0 pt-2 sticky top-32 space-y-6">
          <div className="h-[600px] bg-white border border-gray-200 shadow-sm rounded-2xl flex items-center justify-center">
             <span className="text-gray-400 text-xs font-medium uppercase tracking-widest -rotate-90">Advertisement</span>
          </div>
        </aside>

      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Processed locally. No server uploads.</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm font-medium">
              <a href="#privacy" className="text-gray-500 hover:text-blue-600 transition-colors">Privacy Policy</a>
              <a href="#terms" className="text-gray-500 hover:text-blue-600 transition-colors">Terms of Service</a>
              <a href="#contact" className="text-gray-500 hover:text-blue-600 transition-colors">Contact</a>
            </div>

            <div className="text-sm text-gray-400 font-medium">
              &copy; {new Date().getFullYear()} QuickToolbox. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#fcfcfc] text-gray-900 flex flex-col font-sans selection:bg-blue-100">
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
            <div className="hidden lg:flex items-center gap-2 relative mega-dropdown-container">
              {DOMAINS.slice(0, 2).map((domain) => (
                <div 
                  key={domain.title} 
                  className="relative group"
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
                    <div className={`absolute top-full mt-4 w-max max-w-[95vw] bg-white border border-gray-200 shadow-2xl rounded-xl p-8 z-50 animate-in fade-in slide-in-from-top-2 ${
                      domain.title === 'PDF Tools' ? 'left-1/2 -translate-x-[20%]' : 'left-1/2 -translate-x-1/2'
                    }`}>
                      <div className={`absolute -top-2 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 ${
                        domain.title === 'PDF Tools' ? 'left-[20%] -ml-2' : 'left-1/2 -ml-2'
                      }`}></div>
                      
                      <div className="flex gap-8 lg:gap-12">
                        {domain.categories.map((category, idx) => (
                          <div key={idx} className="flex flex-col space-y-5">
                            <h3 className="font-bold text-gray-500 text-xs tracking-widest uppercase">{category.name}</h3>
                            <ul className="space-y-4">
                              {category.tools.map(tool => {
                                const Icon = tool.icon;
                                return (
                                  <li key={tool.id}>
                                    <button 
                                      onClick={() => {
                                        onSelectTool(tool.id);
                                        setActiveDropdown(null);
                                      }}
                                      className="text-left flex items-center gap-3 group transition-colors"
                                    >
                                      <Icon className={`w-5 h-5 ${tool.color} transition-transform group-hover:scale-110`} />
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
                      
                      <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Explore all tools in this category</span>
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
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={openSearch}
                className="flex items-center justify-between w-64 px-4 py-2.5 border border-gray-200/80 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white hover:border-blue-300 hover:shadow-md transition-all text-sm text-gray-500"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <span>Search tools...</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="bg-white text-gray-500 px-2 py-0.5 rounded-md text-xs border border-gray-200 font-bold shadow-sm">⌘</kbd>
                  <kbd className="bg-white text-gray-500 px-2 py-0.5 rounded-md text-xs border border-gray-200 font-bold shadow-sm">K</kbd>
                </div>
              </button>
              
              
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-4">
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
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 min-h-[600px] shadow-sm">
            {children}
          </div>
          
          {/* Trust Box */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-3xl p-6 sm:p-10 border border-blue-100/60 flex flex-col sm:flex-row items-center gap-8 mt-auto shadow-sm">
            <div className="p-4 bg-white rounded-2xl text-blue-600 flex-shrink-0 border border-blue-100 shadow-sm">
              <Shield className="w-10 h-10" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-gray-900 text-xl tracking-tight">100% Private & Secure Processing</h3>
              <p className="text-gray-600 mt-2 leading-relaxed max-w-2xl">
                Your files never leave your device. All processing is done locally in your browser for maximum security. We don't upload your data to any servers.
              </p>
            </div>
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

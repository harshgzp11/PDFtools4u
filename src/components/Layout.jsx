import React, { useState, useEffect } from 'react';
import { Search, Shield, Zap, Menu, X, FileText, Image as ImageIcon, Github } from 'lucide-react';

export default function Layout({ children, onHomeClick, onSearch }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-gray-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-2xl border-b border-gray-200/80 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center cursor-pointer group" onClick={() => { onHomeClick(); setIsMobileMenuOpen(false); }}>
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mr-3 group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/30">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-gray-900">QuickToolbox</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button onClick={onHomeClick} className="text-gray-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-2">
                 <FileText className="w-4 h-4" /> PDF Tools
              </button>
              <button onClick={onHomeClick} className="text-gray-600 hover:text-emerald-600 font-medium transition-colors flex items-center gap-2">
                 <ImageIcon className="w-4 h-4" /> Image Tools
              </button>
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
              
              <a href="#" className="p-2.5 text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm">
                <Github className="w-5 h-5" />
              </a>
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
            <button onClick={() => { onHomeClick(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 text-lg font-medium text-gray-700 hover:text-blue-600 py-2">
               <FileText className="w-5 h-5" /> PDF Tools
            </button>
            <button onClick={() => { onHomeClick(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 text-lg font-medium text-gray-700 hover:text-emerald-600 py-2">
               <ImageIcon className="w-5 h-5" /> Image Tools
            </button>
            <div className="mt-auto pb-10">
               <a href="#" className="flex items-center justify-center gap-2 p-4 bg-gray-900 text-white rounded-2xl font-medium w-full">
                 <Github className="w-5 h-5" /> Star on GitHub
               </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Area - Content Only (No sidebars) */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-12 gap-8 justify-center items-start">
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
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

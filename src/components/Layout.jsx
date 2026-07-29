import React, { useState, useEffect } from 'react';
import { Search, Shield, Zap, Command, FileText } from 'lucide-react';
import AdSlot from './ui/AdSlot';

export default function Layout({ children, onHomeClick, onSearch }) {
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdkOpen((open) => !open);
        // We will implement the actual CMDK modal in App.jsx or here later.
        // For now, we can focus the search input in the dashboard if on home, or open a modal.
        const searchInput = document.getElementById('dashboard-search');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer group" onClick={onHomeClick}>
              <div className="p-1.5 bg-blue-50 rounded-lg mr-3 group-hover:bg-blue-100 transition-colors border border-blue-100">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">QuickToolbox</span>
            </div>
            
            <div className="flex-1 max-w-xl mx-8 hidden md:block">
              {/* Cmd+K visual prompt */}
              <button 
                onClick={() => {
                   const searchInput = document.getElementById('dashboard-search');
                   if (searchInput) searchInput.focus();
                }}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white hover:border-gray-300 transition-all text-sm text-gray-500 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Search tools...</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="bg-white text-gray-500 px-2 py-0.5 rounded text-xs border border-gray-200 font-medium shadow-sm">⌘</kbd>
                  <kbd className="bg-white text-gray-500 px-2 py-0.5 rounded text-xs border border-gray-200 font-medium shadow-sm">K</kbd>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-4">
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-6 lg:gap-8 justify-center items-start">
        
        {/* Left Sidebar Ad - Sticky */}
        <aside className="hidden 2xl:block w-[240px] flex-shrink-0 pt-2 sticky top-24 space-y-6">
          <AdSlot orientation="vertical" className="h-[600px] bg-white border-gray-200 shadow-sm" />
          <AdSlot orientation="vertical" className="bg-white border-gray-200 shadow-sm" />
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full min-w-0 flex flex-col gap-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 min-h-[600px] shadow-sm">
            {children}
          </div>
          
          {/* Trust Box */}
          <div className="bg-blue-50/50 rounded-2xl p-6 sm:p-8 border border-blue-100 flex flex-col sm:flex-row items-center gap-6 mt-auto shadow-sm">
            <div className="p-4 bg-blue-100 rounded-full text-blue-600 flex-shrink-0 border border-blue-200">
              <Shield className="w-8 h-8" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-gray-900 text-lg">100% Private & Secure Processing</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Your files never leave your device. All processing is done locally in your browser for maximum security. We don't upload your data to any servers.
              </p>
            </div>
          </div>
        </main>
        
        {/* Right Sidebar Ad - Sticky */}
        <aside className="hidden xl:block w-[240px] flex-shrink-0 pt-2 sticky top-24 space-y-6">
          <AdSlot orientation="vertical" className="h-[600px] bg-white border-gray-200 shadow-sm" />
          <AdSlot orientation="vertical" className="bg-white border-gray-200 shadow-sm" />
        </aside>
        
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Processed locally. No server uploads.</span>
            </div>
            
            {/* Legal Links (Placeholders) */}
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="#privacy" className="text-gray-500 hover:text-blue-600 transition-colors">Privacy Policy</a>
              <a href="#terms" className="text-gray-500 hover:text-blue-600 transition-colors">Terms of Service</a>
              <a href="#contact" className="text-gray-500 hover:text-blue-600 transition-colors">Contact</a>
            </div>

            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} QuickToolbox. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

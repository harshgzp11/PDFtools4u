import React from 'react';
import { Search, Shield, Zap, Home } from 'lucide-react';
import AdSlot from './ui/AdSlot';

export default function Layout({ children, onHomeClick, onSearch }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer" onClick={onHomeClick}>
              <Zap className="h-8 w-8 text-blue-600 mr-2" />
              <span className="font-bold text-xl tracking-tight text-gray-900">QuickToolbox</span>
            </div>
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Search tools..."
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={onHomeClick} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
                 <Home className="w-4 h-4"/> Home
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout Area */}
      <div className="flex-1 flex w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 justify-center items-start">
        
        {/* Left Sidebar Ad - Sticky */}
        <aside className="hidden xl:block w-[300px] flex-shrink-0 pt-2 sticky top-24 space-y-6">
          <AdSlot orientation="vertical" className="h-[600px]" />
          <AdSlot orientation="vertical" />
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full min-w-0 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 min-h-[600px]">
            {children}
          </div>
          
          {/* Trust Box moved to the bottom of the main content */}
          <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 flex items-center gap-4 mt-auto">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600 flex-shrink-0">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 text-lg">100% Private & Secure Processing</h3>
              <p className="text-sm text-blue-800/80 mt-1">
                Your files never leave your device. All processing is done locally in your browser for maximum security. We don't upload your data to any servers.
              </p>
            </div>
          </div>
        </main>
        
        {/* Right Sidebar Ad - Sticky */}
        <aside className="hidden lg:block w-[300px] flex-shrink-0 pt-2 sticky top-24 space-y-6">
          <AdSlot orientation="vertical" className="h-[600px]" />
          <AdSlot orientation="vertical" />
        </aside>
        
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Files are processed safely in your browser and never uploaded to a server.</span>
            </div>
            <div className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} QuickToolbox. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

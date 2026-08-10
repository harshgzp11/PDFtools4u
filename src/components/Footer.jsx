import React from 'react';
import { Zap, Globe } from 'lucide-react';


export default function Footer({ onSelectTool }) {
  return (
    <footer className="bg-black text-gray-300 pt-20 pb-8 px-4 md:px-8 mt-32 w-full border-t border-zinc-900">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Keyword-Rich Tagline */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
            <div className="flex items-center">
              <img 
                src="/images/pdftool4u-logo.png" 
                alt="PDFTools4u Logo" 
                className="h-10 md:h-12 w-auto max-w-[220px] object-contain brightness-0 invert"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center">
                <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg mr-2.5 shadow-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white">PDFTools4U</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Free, secure online PDF converter and editor. Convert, merge, compress, and edit PDFs directly in your browser with zero file uploads.
            </p>
          </div>

          {/* Column 1: Popular Utilities */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold mb-2">Popular Utilities</h4>
            <button onClick={() => onSelectTool('pdf-merge')} title="Merge PDF Online - Combine PDF files free" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Merge PDF</button>
            <button onClick={() => onSelectTool('compress-pdf')} title="Compress PDF File Size - Reduce PDF size free" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Compress PDF</button>
            <button onClick={() => onSelectTool('pdf-split')} title="Split PDF Pages - Extract pages from PDF" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Split PDF</button>
            <button onClick={() => onSelectTool('pdf-ocr')} title="OCR PDF Online - Convert scanned PDF to text" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">OCR PDF</button>
          </div>

          {/* Column 2: Convert & Edit */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold mb-2">Convert & Edit</h4>
            <button onClick={() => onSelectTool('pdf-to-word')} title="PDF to Word Converter Free" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">PDF to Word</button>
            <button onClick={() => onSelectTool('word-to-pdf')} title="Convert DOCX to PDF Online" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Word to PDF</button>
            <button onClick={() => onSelectTool('excel-to-pdf')} title="Convert Excel Sheet to PDF" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Excel to PDF</button>
            <button onClick={() => onSelectTool('pdf-to-jpg')} title="Convert PDF Pages to JPG PNG" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">PDF to Image</button>
          </div>

          {/* Column 3: Security & Privacy */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold mb-2">Security & Privacy</h4>
            <button onClick={() => onSelectTool('about')} title="100% Client-Side Private Processing - Files Stay in Browser" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Client-Side Security</button>
            <button onClick={() => onSelectTool('unlock-pdf')} title="Remove PDF Password Online Free" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Unlock PDF</button>
            <button onClick={() => onSelectTool('protect-pdf')} title="Add Password to PDF Free" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Protect PDF</button>
            <button onClick={() => onSelectTool('sign-pdf')} title="Electronic Signature PDF Free" className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Sign PDF</button>
          </div>

          {/* Column 4: Company & Legal */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold mb-2">Company & Legal</h4>
            <button onClick={() => onSelectTool('about')} className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">About Us</button>
            <button onClick={() => onSelectTool('privacy')} className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Privacy Policy</button>
            <button onClick={() => onSelectTool('terms')} className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Terms of Service</button>
            <button onClick={() => onSelectTool('blog')} className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Blog / Guides</button>
          </div>
        </div>


        {/* Bottom Legal Section */}
        <div className="border-t border-zinc-800/80 pt-8 flex flex-col lg:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} PDFTools4U &mdash; Made with ❤️ for local-first users.</p>
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <button onClick={() => onSelectTool('privacy')} className="hover:text-white transition-colors cursor-pointer">Privacy Policy</button>
            <button onClick={() => onSelectTool('terms')} className="hover:text-white transition-colors cursor-pointer">Terms of Service</button>
            <button onClick={() => onSelectTool('contact')} className="hover:text-white transition-colors cursor-pointer">Contact Us</button>
            <div className="flex items-center gap-1.5 ml-4">
              <Globe className="w-4 h-4" />
              <span>English</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

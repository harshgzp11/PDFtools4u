import React from 'react';
import { Zap, Globe } from 'lucide-react';

const FacebookIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const TwitterIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

const LinkedinIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const YoutubeIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
  </svg>
);

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

        {/* Social Icons */}
        <div className="border-t border-zinc-800/80 pt-8 pb-4 flex justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <a href="#linkedin" className="text-gray-400 hover:text-white transition-colors">
              <LinkedinIcon className="w-5 h-5" />
            </a>
            <a href="#facebook" className="text-gray-400 hover:text-white transition-colors">
              <FacebookIcon className="w-5 h-5" />
            </a>
            <a href="#youtube" className="text-gray-400 hover:text-white transition-colors">
              <YoutubeIcon className="w-5 h-5" />
            </a>
            <a href="#twitter" className="text-gray-400 hover:text-white transition-colors">
              <TwitterIcon className="w-5 h-5" />
            </a>
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

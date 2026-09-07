import React from 'react';
import { Zap, Globe } from 'lucide-react';
import { DOMAINS, POPULAR_TOOL_IDS } from '../lib/toolConfig';

export default function Footer({ onSelectTool }) {
  const handleLinkClick = (e, route) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelectTool(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Use the first 3 domains + a legal column for a 4-column layout, or map them all
  // For the grid, we will use the 4 domains from toolConfig.
  
  return (
    <footer 
      className="bg-black text-gray-300 pt-20 pb-8 px-4 md:px-8 mt-32 w-full border-t border-zinc-900"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 500px' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Keyword-Rich Tagline */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
            <a href="/" className="flex items-center cursor-pointer" aria-label="Home" onClick={(e) => handleLinkClick(e, null)}>
              <img 
                src="/images/pdftool4u-logo.webp" 
                alt="PDFtools4u Logo" 
                width="266"
                height="70"
                className="h-10 md:h-12 w-auto max-w-[220px] object-contain brightness-0 invert"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center">
                <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg mr-2.5 shadow-lg">
                  <Zap className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white">PDFtools4u</span>
              </div>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed">
              Free, secure online PDF converter and editor. Convert, merge, compress, and edit PDFs directly in your browser with zero file uploads.
            </p>
          </div>

          {/* Dynamic Domain Columns */}
          {DOMAINS.map((domain, idx) => (
            <div key={idx} className="flex flex-col gap-4">
              <h4 className="text-white font-bold mb-2">{domain.title.replace(' Tools', '')}</h4>
              {domain.categories.flatMap(c => c.tools).slice(0, 5).map(tool => (
                <a 
                  key={tool.id} 
                  href={`/${tool.id}`} 
                  onClick={(e) => handleLinkClick(e, tool.id)}
                  className="text-left text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {tool.name}
                </a>
              ))}
              {/* If it's the first column, add All Tools link at the bottom */}
              {idx === 0 && (
                <a 
                  href="/all-tools" 
                  onClick={(e) => handleLinkClick(e, 'all-tools')}
                  className="text-left text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-semibold mt-2"
                >
                  View All Tools →
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Legal Section */}
        <div className="border-t border-zinc-800/80 pt-8 flex flex-col lg:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} PDFtools4u &mdash; Made with ❤️ for local-first users.</p>
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="/privacy" onClick={(e) => handleLinkClick(e, 'privacy')} className="hover:text-white transition-colors cursor-pointer">Privacy Policy</a>
            <a href="/terms" onClick={(e) => handleLinkClick(e, 'terms')} className="hover:text-white transition-colors cursor-pointer">Terms of Service</a>
            <a href="/about" onClick={(e) => handleLinkClick(e, 'about')} className="hover:text-white transition-colors cursor-pointer">About Us</a>
            <a href="/contact" onClick={(e) => handleLinkClick(e, 'contact')} className="hover:text-white transition-colors cursor-pointer">Contact Us</a>
            <a href="/blog" onClick={(e) => handleLinkClick(e, 'blog')} className="hover:text-white transition-colors cursor-pointer">Blog</a>
            <a href="/security" onClick={(e) => handleLinkClick(e, 'security')} className="hover:text-white transition-colors cursor-pointer text-emerald-400">Security & Architecture</a>
            <a href="mailto:support@pdftools4u.in" className="hover:text-white transition-colors cursor-pointer font-medium text-gray-400">support@pdftools4u.in</a>
            <div className="flex items-center gap-1.5 ml-4">
              <Globe className="w-4 h-4" aria-hidden="true" />
              <span>English</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, LayoutDashboard, ChevronRight, X, Sparkles } from 'lucide-react';
import { searchToolsFuzzy } from '../lib/fuzzySearch';

export default function CommandMenu({ onSelectTool }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Global keydown handler to open Command Menu via Ctrl+K / CMD+K or '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for custom trigger event (e.g. clicking header search bar)
  useEffect(() => {
    const handleOpenModal = () => {
      setOpen(true);
    };
    document.addEventListener('openCommandMenu', handleOpenModal);
    return () => document.removeEventListener('openCommandMenu', handleOpenModal);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Compute fuzzy search results
  const results = searchToolsFuzzy(query);

  // Keyboard navigation inside modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && selectedIndex < results.length) {
        const selectedTool = results[selectedIndex];
        onSelectTool(selectedTool.id);
        setOpen(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-gray-900/60 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div 
        className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-[0.98] duration-200"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center border-b border-gray-100 px-5 py-3.5 bg-gray-50/50">
          <Search className="w-6 h-6 text-gray-400 flex-shrink-0 mr-3" />
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search 40+ tools (e.g. excel, word, ocr, merge, compress)..." 
            className="flex-1 bg-transparent border-none py-2 text-lg font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0" 
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); setSelectedIndex(0); inputRef.current?.focus(); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block bg-white text-gray-400 font-semibold px-2.5 py-1 rounded-lg text-xs border border-gray-200 shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 flex-1 custom-scrollbar">
          
          {/* Quick Navigation Home */}
          {!query && (
            <div className="mb-2">
              <div 
                onClick={() => { onSelectTool(null); setOpen(false); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer bg-blue-50/60 hover:bg-blue-50 text-blue-700 transition-colors font-medium text-sm"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 text-blue-600" />
                  <span>Go to All Tools Dashboard</span>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          )}

          {results.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                {query ? `Matching Tools (${results.length})` : 'Popular & All Tools'}
              </div>
              
              {results.map((tool, idx) => {
                const Icon = tool.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={tool.id}
                    onClick={() => {
                      onSelectTool(tool.id);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-md translate-x-1' 
                        : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : `${tool.bg} ${tool.color}`}`}>
                        {Icon ? <Icon className="w-5 h-5 stroke-[2]" /> : <Zap className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base tracking-tight truncate">{tool.name}</h4>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {tool.domainTitle}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className={`w-5 h-5 flex-shrink-0 ml-3 transition-transform ${isSelected ? 'text-white translate-x-1' : 'text-gray-300'}`} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No matching tools found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                Try searching for keywords like &quot;excel&quot;, &quot;word&quot;, &quot;compress&quot;, &quot;ocr&quot;, or &quot;merge&quot;.
              </p>
            </div>
          )}

        </div>

        {/* Footer Hint */}
        <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50/70 flex items-center justify-between text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] shadow-2xs text-gray-500">↑</kbd>
              <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] shadow-2xs text-gray-500">↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] shadow-2xs text-gray-500">↵</kbd> Select
            </span>
          </div>
          <div className="flex items-center gap-1 text-blue-600 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> 40+ Local Client-Side Tools
          </div>
        </div>

      </div>
    </div>
  );
}

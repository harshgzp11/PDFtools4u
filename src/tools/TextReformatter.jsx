import React, { useState, useEffect } from 'react';
import { copyToClipboard, downloadTextAsFile } from '../lib/utils';
import { Copy, Download, Trash2, ArrowDownAZ, ArrowUpZA, Hash, Search } from 'lucide-react';
import { toast } from 'sonner';
import AdSlot from '../components/ui/AdSlot';

export default function TextReformatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  
  // Toggles for Quick Actions
  const [activeCase, setActiveCase] = useState(null); // 'upper', 'lower', 'title', 'snake'
  const [removeDupes, setRemoveDupes] = useState(false);
  const [cleanSpace, setCleanSpace] = useState(false);
  const [numbered, setNumbered] = useState(false);
  const [sortMode, setSortMode] = useState(null); // 'asc', 'desc'

  // States for one-off features
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Re-calculate output whenever input or toggles change
  useEffect(() => {
    let res = input;
    if (!res) {
      setOutput('');
      return;
    }

    if (removeDupes) {
      res = [...new Set(res.split('\n'))].join('\n');
    }
    
    if (cleanSpace) {
      res = res.split('\n')
        .map(line => line.trim().replace(/[ \t]{2,}/g, ' '))
        .filter(line => line.length > 0)
        .join('\n');
    }
    
    if (sortMode === 'asc') {
      res = res.split('\n').sort((a, b) => a.localeCompare(b)).join('\n');
    } else if (sortMode === 'desc') {
      res = res.split('\n').sort((a, b) => b.localeCompare(a)).join('\n');
    }

    if (numbered) {
      res = res.split('\n').map((line, idx) => `${idx + 1}. ${line}`).join('\n');
    }

    if (activeCase === 'upper') {
      res = res.toUpperCase();
    } else if (activeCase === 'lower') {
      res = res.toLowerCase();
    } else if (activeCase === 'title') {
      res = res.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (activeCase === 'snake') {
      res = res.replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('_');
    }

    setOutput(res);
  }, [input, activeCase, removeDupes, cleanSpace, numbered, sortMode]);

  const toggleCase = (type) => setActiveCase(prev => prev === type ? null : type);
  const toggleSort = (mode) => setSortMode(prev => prev === mode ? null : mode);

  // One-off actions update the base input directly so they persist across toggles
  const applyFindReplace = () => {
    if (!input || !findText) return;
    const res = input.split(findText).join(replaceText);
    setInput(res);
    setFindText('');
    setReplaceText('');
    toast.success('Find & Replace applied!');
  };

  const handleCopy = async () => {
    await copyToClipboard(output);
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    downloadTextAsFile(output, 'reformatted_text.txt');
    toast.success('Downloaded as reformatted_text.txt');
  };

  // Helper for toggle button styling
  const toggleBtnClass = (isActive) => 
    `px-3 py-1.5 border rounded-lg shadow-sm text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Text Case & Line Reformatter</h2>
        <p className="text-gray-500">Format text case, remove duplicate lines, clean up messy whitespace, sort, and replace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Input Text</label>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-80 p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 font-mono text-sm resize-none transition-all shadow-sm"
            placeholder="Paste your text here..."
          />
          {input && (
            <button onClick={() => setInput('')} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
              <Trash2 className="w-4 h-4"/> Clear Input
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Output Result</label>
          <textarea 
            value={output}
            readOnly
            className="w-full h-80 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm resize-none shadow-sm"
            placeholder="Result will appear here..."
          />
          <div className="flex gap-2 justify-end">
            <button 
              onClick={handleCopy} 
              disabled={!output}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Copy className="w-4 h-4"/> Copy
            </button>
            <button 
              onClick={handleDownload} 
              disabled={!output}
              className="px-3 py-1.5 bg-blue-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4"/> Download .txt
            </button>
          </div>
        </div>
      </div>

      {/* Ad Slot - Safely separated from buttons by space-y-6 on parent and extra padding */}
      <div className="pt-2">
        <AdSlot orientation="horizontal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Quick Actions (Toggles)</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleCase('upper')} className={toggleBtnClass(activeCase === 'upper')}>UPPERCASE</button>
              <button onClick={() => toggleCase('lower')} className={toggleBtnClass(activeCase === 'lower')}>lowercase</button>
              <button onClick={() => toggleCase('title')} className={toggleBtnClass(activeCase === 'title')}>Title Case</button>
              <button onClick={() => toggleCase('snake')} className={toggleBtnClass(activeCase === 'snake')}>snake_case</button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => setRemoveDupes(!removeDupes)} className={toggleBtnClass(removeDupes)}>Remove Duplicates</button>
              <button onClick={() => setCleanSpace(!cleanSpace)} className={toggleBtnClass(cleanSpace)}>Clean Whitespace</button>
              <button onClick={() => setNumbered(!numbered)} className={`${toggleBtnClass(numbered)} flex items-center gap-1`}><Hash className="w-4 h-4"/> Number Lines</button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => toggleSort('asc')} className={`${toggleBtnClass(sortMode === 'asc')} flex items-center gap-1`}><ArrowDownAZ className="w-4 h-4"/> Sort A-Z</button>
              <button onClick={() => toggleSort('desc')} className={`${toggleBtnClass(sortMode === 'desc')} flex items-center gap-1`}><ArrowUpZA className="w-4 h-4"/> Sort Z-A</button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Find & Replace</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex flex-1 gap-2">
                <input 
                  type="text" 
                  placeholder="Find..." 
                  value={findText} 
                  onChange={(e) => setFindText(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 shadow-sm text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <input 
                  type="text" 
                  placeholder="Replace..." 
                  value={replaceText} 
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 shadow-sm text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button 
                onClick={applyFindReplace}
                disabled={!findText}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm text-sm font-medium hover:bg-blue-700 whitespace-nowrap disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

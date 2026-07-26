import React, { useState } from 'react';
import { copyToClipboard, downloadTextAsFile } from '../lib/utils';
import { Copy, Download, Trash2 } from 'lucide-react';

export default function TextReformatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleCase = (type) => {
    let res = '';
    if (type === 'upper') res = input.toUpperCase();
    else if (type === 'lower') res = input.toLowerCase();
    else if (type === 'title') {
      res = input.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (type === 'snake') {
      res = input.replace(/\W+/g, ' ')
        .split(/ |\B(?=[A-Z])/)
        .map(word => word.toLowerCase())
        .join('_');
    }
    setOutput(res);
  };

  const removeDuplicates = () => {
    const lines = input.split('\n');
    const unique = [...new Set(lines)];
    setOutput(unique.join('\n'));
  };

  const cleanWhitespace = () => {
    const cleaned = input.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .replace(/[ \t]{2,}/g, ' '); // Replace multiple spaces with single space
    setOutput(cleaned);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Text Case & Line Reformatter</h2>
        <p className="text-gray-500">Format text case, remove duplicate lines, and clean up messy whitespace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Input Text</label>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
            placeholder="Paste your text here..."
          />
          {input && (
            <button onClick={() => setInput('')} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 className="w-4 h-4"/> Clear Input
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Output Result</label>
          <textarea 
            value={output}
            readOnly
            className="w-full h-64 p-4 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm resize-none"
            placeholder="Result will appear here..."
          />
          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => copyToClipboard(output)} 
              disabled={!output}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              <Copy className="w-4 h-4"/> Copy
            </button>
            <button 
              onClick={() => downloadTextAsFile(output, 'reformatted_text.txt')} 
              disabled={!output}
              className="px-3 py-1.5 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4"/> Download .txt
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleCase('upper')} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50">UPPERCASE</button>
          <button onClick={() => handleCase('lower')} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50">lowercase</button>
          <button onClick={() => handleCase('title')} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50">Title Case</button>
          <button onClick={() => handleCase('snake')} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50">snake_case</button>
          <div className="w-px h-8 bg-gray-300 mx-2 self-center hidden sm:block"></div>
          <button onClick={removeDuplicates} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 text-blue-600">Remove Duplicates</button>
          <button onClick={cleanWhitespace} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 text-blue-600">Clean Whitespace</button>
        </div>
      </div>
    </div>
  );
}

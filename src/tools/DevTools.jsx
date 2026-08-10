import React, { useState, useEffect } from 'react';
import { copyToClipboard, downloadTextAsFile } from '../lib/utils';
import { Copy, Download } from 'lucide-react';
import { trackError } from '../lib/analytics';

export default function DevTools() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ words: 0, chars: 0, charsNoSpaces: 0, lines: 0, readTime: 0 });

  useEffect(() => {
    const text = input || '';
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s+/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split('\n').length : 0;
    const readTime = Math.ceil(words / 200); // Average 200 words per minute

    setStats({ words, chars, charsNoSpaces, lines, readTime });
  }, [input]);

  const minifyJson = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (err) {
      trackError('Dev Tools', 'processing_error');
      setError("Invalid JSON format.");
    }
  };

  const beautifyJson = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (err) {
      trackError('Dev Tools', 'processing_error');
      setError("Invalid JSON format.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Developer Code & Text Tools</h2>
        <p className="text-gray-500">Analyze text statistics instantly or format/minify JSON payloads.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-purple-700">{stats.words}</span>
          <span className="text-xs text-purple-600 font-medium uppercase mt-1">Words</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-purple-700">{stats.chars}</span>
          <span className="text-xs text-purple-600 font-medium uppercase mt-1">Characters</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-purple-700">{stats.charsNoSpaces}</span>
          <span className="text-xs text-purple-600 font-medium uppercase mt-1">Chars (no space)</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-purple-700">{stats.lines}</span>
          <span className="text-xs text-purple-600 font-medium uppercase mt-1">Lines</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-purple-700">{stats.readTime} min</span>
          <span className="text-xs text-purple-600 font-medium uppercase mt-1">Read Time</span>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Input JSON / Text</label>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm resize-none"
            placeholder="Paste JSON or text here..."
          />
          <div className="flex gap-2">
            <button onClick={beautifyJson} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 text-purple-600">Beautify JSON</button>
            <button onClick={minifyJson} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 text-purple-600">Minify JSON</button>
          </div>
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
            <button onClick={() => copyToClipboard(output)} disabled={!output} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"><Copy className="w-4 h-4"/> Copy</button>
            <button onClick={() => downloadTextAsFile(output, 'formatted.json')} disabled={!output} className="px-3 py-1.5 bg-purple-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"><Download className="w-4 h-4"/> Download JSON</button>
          </div>
        </div>
      </div>
    </div>
  );
}

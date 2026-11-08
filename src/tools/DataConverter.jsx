import React, { useState } from 'react';
import { copyToClipboard, downloadTextAsFile } from '../lib/utils';
import { Copy, Download, Trash2, ArrowRightLeft } from 'lucide-react';
import { trackError } from '../lib/analytics';

export default function DataConverter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [mobileActiveTab, setMobileActiveTab] = useState('input'); // 'input' | 'output' | 'both'

  const csvToJson = () => {
    try {
      if (!input.trim()) return;
      const lines = input.trim().split('\n');
      if (lines.length < 2) throw new Error("Need at least a header and one data row.");

      const headers = lines[0].split(',').map(h => h.trim());
      const result = lines.slice(1).map(line => {
        const obj = {};
        const currentline = line.split(',');
        headers.forEach((header, i) => {
          obj[header] = currentline[i] ? currentline[i].trim() : '';
        });
        return obj;
      });
      setOutput(JSON.stringify(result, null, 2));
      setError('');
      if (mobileActiveTab === 'input') setMobileActiveTab('output');
    } catch (err) {
      trackError('Data Converter', 'processing_error');
      setError(err.message || "Invalid CSV format.");
    }
  };

  const jsonToCsv = () => {
    try {
      if (!input.trim()) return;
      const arr = JSON.parse(input);
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("Input must be a non-empty JSON array.");

      const headers = Object.keys(arr[0]);
      const csv = [
        headers.join(','),
        ...arr.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
      ].join('\n');

      setOutput(csv);
      setError('');
      if (mobileActiveTab === 'input') setMobileActiveTab('output');
    } catch (err) {
      trackError('Data Converter', 'processing_error');
      setError("Invalid JSON format. Please provide a valid JSON array of objects.");
    }
  };

  const encodeBase64 = () => {
    try {
      setOutput(btoa(input));
      setError('');
      if (mobileActiveTab === 'input') setMobileActiveTab('output');
    } catch (err) {
      trackError('Data Converter', 'processing_error');
      setError("Failed to encode text.");
    }
  };

  const decodeBase64 = () => {
    try {
      setOutput(atob(input));
      setError('');
      if (mobileActiveTab === 'input') setMobileActiveTab('output');
    } catch (err) {
      trackError('Data Converter', 'processing_error');
      setError("Invalid Base64 string.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Data Converters</h2>
        <p className="text-sm md:text-base text-gray-500">Convert between CSV and JSON, or Encode/Decode Base64 strings safely in your browser.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Prominent Mobile Conversion Action Bar (< lg): First-viewport accessible with 44px touch targets */}
      <div className="lg:hidden bg-white border border-gray-200 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
          <span>Conversion Actions</span>
          <span className="text-[11px] font-normal text-gray-400">Select format to transform</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={csvToJson}
            className="min-h-[44px] py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:bg-blue-200 cursor-pointer shadow-xs"
          >
            CSV <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" /> JSON
          </button>
          <button
            type="button"
            onClick={jsonToCsv}
            className="min-h-[44px] py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:bg-blue-200 cursor-pointer shadow-xs"
          >
            JSON <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" /> CSV
          </button>
          <button
            type="button"
            onClick={encodeBase64}
            className="min-h-[44px] py-2 px-3 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center active:bg-gray-200 cursor-pointer shadow-xs"
          >
            Text to Base64
          </button>
          <button
            type="button"
            onClick={decodeBase64}
            className="min-h-[44px] py-2 px-3 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center active:bg-gray-200 cursor-pointer shadow-xs"
          >
            Base64 to Text
          </button>
        </div>
      </div>

      {/* Mobile View Switcher (< lg) */}
      <div className="lg:hidden flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200 select-none" role="tablist" aria-label="Data Converter Views">
        <button
          type="button"
          role="tab"
          aria-selected={mobileActiveTab === 'input'}
          onClick={() => setMobileActiveTab('input')}
          className={`flex-1 min-h-[44px] py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileActiveTab === 'input' ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Input Data</span>
          {input.trim() && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileActiveTab === 'output'}
          onClick={() => setMobileActiveTab('output')}
          className={`flex-1 min-h-[44px] py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileActiveTab === 'output' ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Output Result</span>
          {output.trim() && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileActiveTab === 'both'}
          onClick={() => setMobileActiveTab('both')}
          className={`flex-1 min-h-[44px] py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileActiveTab === 'both' ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Both</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Data Panel */}
        <div className={`space-y-2 ${mobileActiveTab === 'output' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Input Data</label>
            {input && (
              <span className="text-xs text-gray-400 font-mono">
                {input.length} chars • {input.split('\n').length} lines
              </span>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-52 sm:h-64 lg:h-80 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm resize-none shadow-xs"
            placeholder="Paste CSV, JSON array, or plain text here..."
          />
        </div>

        {/* Output Result Panel */}
        <div className={`space-y-2 ${mobileActiveTab === 'input' ? 'hidden lg:block' : 'block'}`}>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Output Result</label>
            {output && (
              <span className="text-xs text-gray-400 font-mono">
                {output.length} chars • {output.split('\n').length} lines
              </span>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            className="w-full h-52 sm:h-64 lg:h-80 p-4 border border-gray-300 rounded-xl bg-gray-50 font-mono text-sm resize-none shadow-xs"
            placeholder="Result will appear here..."
          />
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(output)}
              disabled={!output}
              className="min-h-[44px] px-3.5 py-2 bg-white border border-gray-300 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-2 cursor-pointer active:bg-gray-100"
            >
              <Copy className="w-4 h-4"/> Copy Result
            </button>
            <button
              type="button"
              onClick={() => downloadTextAsFile(output, 'data.txt')}
              disabled={!output}
              className="min-h-[44px] px-3.5 py-2 bg-green-600 border border-transparent rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 flex items-center gap-2 cursor-pointer active:bg-green-800"
            >
              <Download className="w-4 h-4"/> Download
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Conversion Tools bar (>= lg) */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Conversion Tools</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200">
            <button type="button" onClick={csvToJson} className="px-4 py-2 bg-gray-50 rounded-lg shadow-xs text-sm font-medium hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
              CSV <ArrowRightLeft className="w-3 h-3 text-gray-400"/> JSON
            </button>
            <button type="button" onClick={jsonToCsv} className="px-4 py-2 bg-gray-50 rounded-lg shadow-xs text-sm font-medium hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
              JSON <ArrowRightLeft className="w-3 h-3 text-gray-400"/> CSV
            </button>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200">
            <button type="button" onClick={encodeBase64} className="px-4 py-2 bg-gray-50 rounded-lg shadow-xs text-sm font-medium hover:bg-gray-100 cursor-pointer">
              Text to Base64
            </button>
            <button type="button" onClick={decodeBase64} className="px-4 py-2 bg-gray-50 rounded-lg shadow-xs text-sm font-medium hover:bg-gray-100 cursor-pointer">
              Base64 to Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

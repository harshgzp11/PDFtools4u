import React, { useState } from 'react';
import { copyToClipboard, downloadTextAsFile } from '../lib/utils';
import { Copy, Download, Trash2, ArrowRightLeft } from 'lucide-react';
import { trackError } from '../lib/analytics';

export default function DataConverter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

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
    } catch (err) {
      trackError('Data Converter', 'processing_error');
      setError("Invalid JSON format. Please provide a valid JSON array of objects.");
    }
  };

  const encodeBase64 = () => {
    try {
      setOutput(btoa(input));
      setError('');
    } catch (err) {
      trackError('Data Converter', 'processing_error');
      setError("Failed to encode text.");
    }
  };

  const decodeBase64 = () => {
    try {
      setOutput(atob(input));
      setError('');
    } catch (err) {
      trackError('Data Converter', 'processing_error');
      setError("Invalid Base64 string.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Converters</h2>
        <p className="text-gray-500">Convert between CSV and JSON, or Encode/Decode Base64 strings safely in your browser.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Input Data</label>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-80 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm resize-none"
            placeholder="Paste CSV or JSON array or Text here..."
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Output Result</label>
          <textarea 
            value={output}
            readOnly
            className="w-full h-80 p-4 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm resize-none"
            placeholder="Result will appear here..."
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => copyToClipboard(output)} disabled={!output} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"><Copy className="w-4 h-4"/> Copy</button>
            <button onClick={() => downloadTextAsFile(output, 'data.txt')} disabled={!output} className="px-3 py-1.5 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><Download className="w-4 h-4"/> Download</button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Conversion Tools</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
            <button onClick={csvToJson} className="px-4 py-2 bg-gray-50 rounded shadow-sm text-sm font-medium hover:bg-gray-100 flex items-center gap-2">CSV <ArrowRightLeft className="w-3 h-3 text-gray-400"/> JSON</button>
            <button onClick={jsonToCsv} className="px-4 py-2 bg-gray-50 rounded shadow-sm text-sm font-medium hover:bg-gray-100 flex items-center gap-2">JSON <ArrowRightLeft className="w-3 h-3 text-gray-400"/> CSV</button>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
            <button onClick={encodeBase64} className="px-4 py-2 bg-gray-50 rounded shadow-sm text-sm font-medium hover:bg-gray-100">Text to Base64</button>
            <button onClick={decodeBase64} className="px-4 py-2 bg-gray-50 rounded shadow-sm text-sm font-medium hover:bg-gray-100">Base64 to Text</button>
          </div>
        </div>
      </div>
    </div>
  );
}

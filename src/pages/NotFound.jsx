import React from 'react';
import { ArrowRight, Search, AlertTriangle } from 'lucide-react';
import { DOMAINS } from '../lib/toolConfig';
import { trackEvent } from '../lib/analytics';

const SUGGESTED_TOOLS = [
  'compress-pdf', 'pdf-to-word', 'pdf-merge', 'jpg-to-pdf', 
  'pdf-to-jpg', 'sign-pdf', 'unlock-pdf', 'pdf-ocr'
];

export default function NotFound({ onSelectTool }) {
  const allTools = DOMAINS.flatMap(d => d.categories.flatMap(c => c.tools));
  const suggested = SUGGESTED_TOOLS.map(id => allTools.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="flex flex-col items-center px-4 pt-12 pb-24 animate-in fade-in duration-500">
      {/* 404 Hero */}
      <div className="text-center mb-12 max-w-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          The page you're looking for doesn't exist or may have moved. 
          Try one of our popular tools below, or search for what you need.
        </p>
      </div>

      {/* Search CTA */}
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        className="flex items-center gap-3 px-6 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all mb-12 group"
      >
        <Search className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span className="text-gray-600 font-medium">Search for a tool...</span>
        <div className="flex items-center gap-1 text-[10px] ml-4">
          <kbd className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border-b border-gray-300 font-bold shadow-sm">⌘</kbd>
          <kbd className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border-b border-gray-300 font-bold shadow-sm">K</kbd>
        </div>
      </button>

      {/* Suggested Tools Grid */}
      <div className="w-full max-w-4xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Popular Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {suggested.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  trackEvent('404_suggested_tool_click', {
                    destination_tool: tool.id,
                  });
                  onSelectTool(tool.id);
                }}
                className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 bg-white transition-all duration-200 text-left cursor-pointer"
                title={`Use ${tool.name} tool`}
              >
                <div className={`p-2 rounded-lg ${tool.bg} transition-transform group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${tool.color}`} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                    {tool.name}
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Back to Home */}
      <button
        onClick={() => onSelectTool(null)}
        className="mt-10 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
      >
        Back to Home <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Zap, LayoutDashboard, Layers, Scissors, ImageIcon, FileText } from 'lucide-react';
import '../CommandMenu.css';

export default function CommandMenu({ onSelectTool }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-sm flex items-start justify-center pt-24 p-4" onClick={() => setOpen(false)}>
      <div 
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <Command label="Command Menu" className="w-full flex flex-col">
          <div className="flex items-center border-b border-gray-100 px-4">
            <Search className="w-6 h-6 text-gray-400" />
            <Command.Input 
              placeholder="Search tools or commands..." 
              className="flex-1 bg-transparent border-none py-5 px-4 text-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0" 
              autoFocus
            />
            <kbd className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-sm border border-gray-200 shadow-sm">ESC</kbd>
          </div>
          <Command.List className="max-h-[65vh] overflow-y-auto p-3">
            <Command.Empty className="py-12 text-center text-gray-500 text-lg">No tools found.</Command.Empty>

            <Command.Group heading="Navigation" className="text-sm font-semibold text-gray-400 px-3 py-2">
              <Command.Item 
                onSelect={() => { onSelectTool(null); setOpen(false); }}
                className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
              >
                <LayoutDashboard className="w-5 h-5" /> Go to Dashboard
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Most Popular Tools" className="text-sm font-semibold text-gray-400 px-3 py-2 border-t border-gray-100 mt-2 pt-4">
              <Command.Item 
                onSelect={() => { onSelectTool('pdf-converter'); setOpen(false); }}
                className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
              >
                <Zap className="w-5 h-5 text-yellow-500" /> Universal PDF Converter
              </Command.Item>
              <Command.Item 
                onSelect={() => { onSelectTool('compress-pdf'); setOpen(false); }}
                className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
              >
                <FileText className="w-5 h-5 text-blue-500" /> Compress PDF
              </Command.Item>
              <Command.Item 
                onSelect={() => { onSelectTool('pdf-merge'); setOpen(false); }}
                className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
              >
                <Layers className="w-5 h-5 text-indigo-500" /> Merge PDF
              </Command.Item>
              <Command.Item 
                onSelect={() => { onSelectTool('pdf-split'); setOpen(false); }}
                className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
              >
                <Scissors className="w-5 h-5 text-cyan-500" /> Split PDF
              </Command.Item>
              <Command.Item 
                onSelect={() => { onSelectTool('pdf-to-word'); setOpen(false); }}
                className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
              >
                <FileText className="w-5 h-5 text-teal-500" /> PDF to Word
              </Command.Item>
              <Command.Item 
                onSelect={() => { onSelectTool('image-converter'); setOpen(false); }}
                className="flex items-center gap-4 px-4 py-4 rounded-xl cursor-pointer data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
              >
                <ImageIcon className="w-5 h-5 text-green-500" /> Image Converter
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

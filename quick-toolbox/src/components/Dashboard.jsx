import React from 'react';
import { Type, FileJson, Code, FileText, Image as ImageIcon, FileOutput, Layers, Scissors, Stamp, ImagePlus, Eraser, Code2, Crop, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = [
  {
    name: "Text & Data Utilities",
    tools: [
      { id: 'text-reformatter', name: 'Text Case & Reformatter', description: 'Change case, remove duplicates & clean whitespace instantly.', icon: Type, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'data-converter', name: 'Data Converters', description: 'Convert CSV to JSON, JSON to CSV, and Base64 Encode/Decode.', icon: FileJson, color: 'text-green-500', bg: 'bg-green-50' },
      { id: 'dev-tools', name: 'Developer Text Tools', description: 'Word counters, JSON Minifier/Beautifier and more.', icon: Code, color: 'text-purple-500', bg: 'bg-purple-50' },
    ]
  },
  {
    name: "Document & Asset Utilities",
    tools: [
      { id: 'pdf-extractor', name: 'PDF Text Extractor', description: 'Extract all readable text from any PDF document safely.', icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
      { id: 'pdf-compiler', name: 'Text/Image to PDF', description: 'Compile raw text or images into a downloadable PDF.', icon: FileOutput, color: 'text-orange-500', bg: 'bg-orange-50' },
      { id: 'image-converter', name: 'Image Converter & Resizer', description: 'Convert WebP to PNG/JPG, resize and compress images.', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-50' },
    ]
  },
  {
    name: "Advanced PDF Tools",
    tools: [
      { id: 'pdf-merge', name: 'Merge PDF', description: 'Combine multiple PDF files into one.', icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-50' },
      { id: 'pdf-split', name: 'Split PDF', description: 'Extract pages from your PDF.', icon: Scissors, color: 'text-cyan-500', bg: 'bg-cyan-50' },
      { id: 'pdf-watermark', name: 'Add Watermark', description: 'Stamp text across PDF pages.', icon: Stamp, color: 'text-rose-500', bg: 'bg-rose-50' },
      { id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert images to a PDF document.', icon: ImagePlus, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    ]
  },
  {
    name: "Advanced Image Tools",
    tools: [
      { id: 'bg-remover', name: 'Remove Background', description: 'Automatically remove image backgrounds with AI.', icon: Eraser, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      { id: 'html-to-image', name: 'HTML to Image', description: 'Render HTML/CSS code into a downloadable image.', icon: Code2, color: 'text-teal-500', bg: 'bg-teal-50' },
      { id: 'image-crop', name: 'Crop & Rotate', description: 'Visually crop and rotate your images.', icon: Crop, color: 'text-sky-500', bg: 'bg-sky-50' },
      { id: 'photo-editor', name: 'Photo Editor', description: 'Apply filters and adjustments to your photos.', icon: SlidersHorizontal, color: 'text-violet-500', bg: 'bg-violet-50' },
    ]
  }
];

export default function Dashboard({ onSelectTool, searchQuery }) {
  const query = searchQuery.toLowerCase();

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Every tool you need, in one place.</h1>
        <p className="text-lg text-gray-600">Lightning-fast utilities that run entirely in your browser. No servers, no waiting, 100% private.</p>
      </div>

      {CATEGORIES.map((category, idx) => {
        const filteredTools = category.tools.filter(tool => 
          tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query)
        );

        if (filteredTools.length === 0) return null;

        return (
          <div key={idx} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">{category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map(tool => {
                const Icon = tool.icon;
                return (
                  <div 
                    key={tool.id} 
                    onClick={() => onSelectTool(tool.id)}
                    className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300 flex flex-col items-start"
                  >
                    <div className={`p-3 rounded-xl mb-4 ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{tool.name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{tool.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {CATEGORIES.every(c => !c.tools.some(t => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query))) && (
        <div className="text-center py-20 text-gray-500">
          No tools found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}

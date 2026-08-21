import React from 'react';
import { DOMAINS } from '../lib/toolConfig';
import { ArrowRight } from 'lucide-react';

export default function AllTools({ onSelectTool }) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          All PDF & Image Tools
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Explore our complete directory of free, secure, and client-side web tools. 
          Edit, convert, and compress files directly in your browser.
        </p>
      </div>

      <div className="space-y-16">
        {DOMAINS.map((domain, domainIdx) => (
          <div key={domainIdx} className="space-y-8">
            <h2 className={`text-3xl font-bold pb-4 border-b-2 ${domain.border} inline-block pr-8`}>
              {domain.title}
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {domain.categories.map((category, catIdx) => (
                <div key={catIdx} className="flex flex-col gap-4">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">
                    {category.name}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {category.tools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <a
                          key={tool.id}
                          href={`/${tool.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if(onSelectTool) onSelectTool(tool.id);
                          }}
                          className={`group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${tool.bg}`}
                        >
                          <div className={`p-2 rounded-lg bg-white/60 shadow-sm ${tool.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                              {tool.name}
                            </h4>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

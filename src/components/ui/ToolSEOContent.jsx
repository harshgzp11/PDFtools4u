import React, { useState } from 'react';
import { ChevronDown, CheckCircle2, FileText, HelpCircle, Lightbulb, ArrowRight, ShieldCheck } from 'lucide-react';
import { SEO_CONTENT } from '../../lib/seoContent';
import { RELATED_TOOLS } from '../../lib/relatedTools';
import { SEO_HEAD } from '../../lib/seoHead';
import { DOMAINS } from '../../lib/toolConfig';
import { trackEvent } from '../../lib/analytics';

// Find tool info from DOMAINS config
function findToolInfo(toolId) {
  for (const domain of DOMAINS) {
    for (const cat of domain.categories) {
      const tool = cat.tools.find(t => t.id === toolId);
      if (tool) return tool;
    }
  }
  return null;
}

export default function ToolSEOContent({ toolId, onSelectTool }) {
  const content = SEO_CONTENT[toolId];
  const headMeta = SEO_HEAD[toolId];
  const relatedToolIds = RELATED_TOOLS[toolId] || [];
  
  if (!content) return null;

  return (
    <div className="w-full mx-auto mt-16 px-4 pb-24 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* H1 — Critical for SEO. Styled as a visible, elegant heading. */}
      {headMeta?.h1 && (
        <h1 className="sr-only">{headMeta.h1}</h1>
      )}

      {/* Introduction */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{content.title}</h2>
        <p className="text-lg text-gray-600 mx-auto leading-relaxed">
          {content.description}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* How to use */}
        <div className="py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">How to use this tool</h3>
          </div>
          <ol className="space-y-4">
            {content.howTo.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Features */}
        <div className="py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Features</h3>
          </div>
          <ul className="space-y-4">
            {content.features.map((feature, idx) => {
              const [title, desc] = feature.split(':');
              return (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-gray-700">
                    <strong className="text-gray-900">{title}:</strong>
                    {desc}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Why Section */}
      <div className="py-8 md:py-10">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Why use our {content.title.split(' ')[0]} tool?</h3>
        <p className="text-gray-700 leading-relaxed text-lg">
          {content.why}
        </p>
      </div>

      {/* Global Privacy Trust Banner for all tools */}
      <div className="my-8 md:my-12 max-w-4xl mx-auto bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden border border-indigo-700/50">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-overlay filter blur-[64px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-overlay filter blur-[64px] opacity-60"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

        <div className="flex flex-col gap-3 flex-1 text-center md:text-left relative z-10">
          <div className="inline-flex items-center justify-center md:justify-start gap-2 text-indigo-200 text-sm mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> 100% Client-Side Processing
          </div>
          <h3 className="text-2xl md:text-3xl font-semibold text-white leading-tight">
            Your Privacy is Guaranteed
          </h3>
          <p className="text-indigo-100/90 text-lg max-w-xl leading-relaxed">
            Unlike other converters, we process your files entirely inside your web browser using WebAssembly. <span className="text-white font-medium">Your files are never uploaded to our servers.</span>
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="pt-8">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-extrabold text-gray-900 text-center">Frequently Asked Questions</h3>
        </div>
        
        <div className="space-y-2 w-full mx-auto">
          {content.faq.map((item, idx) => (
            <FAQItem key={idx} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>

      {/* Related Tools Section */}
      {relatedToolIds.length > 0 && (
        <div className="pt-12 border-t border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Related Tools You May Need</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedToolIds.slice(0, 4).map(relatedId => {
              const toolInfo = findToolInfo(relatedId);
              if (!toolInfo) return null;
              const Icon = toolInfo.icon;
              return (
                <button
                  key={relatedId}
                  onClick={() => {
                    trackEvent('related_tool_click', {
                      source_tool: toolId,
                      destination_tool: relatedId,
                    });
                    if (onSelectTool) {
                      onSelectTool(relatedId);
                    } else {
                      window.history.pushState({}, '', '/' + relatedId);
                      window.location.reload();
                    }
                  }}
                  className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 bg-white transition-all duration-200 text-left cursor-pointer"
                  title={`Use ${toolInfo.name} tool`}
                >
                  <div className={`p-2 rounded-lg ${toolInfo.bg} transition-transform group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 ${toolInfo.color}`} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                      {toolInfo.name}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{toolInfo.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 overflow-hidden transition-all hover:border-gray-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
      >
        <span className="font-bold text-gray-900 pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div 
        className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="p-5 pt-0 text-gray-600 leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

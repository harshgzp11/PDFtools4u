import React, { useState } from 'react';
import { ChevronDown, CheckCircle2, FileText, HelpCircle, Lightbulb } from 'lucide-react';
import { SEO_CONTENT } from '../../lib/seoContent';

export default function ToolSEOContent({ toolId }) {
  const content = SEO_CONTENT[toolId];
  
  if (!content) return null;

  return (
    <div className="w-full mx-auto mt-16 px-4 pb-24 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
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

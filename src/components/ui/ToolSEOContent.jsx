import React, { useState } from 'react';
import { ChevronDown, CheckCircle2, FileText, HelpCircle, Lightbulb, ArrowRight, ShieldCheck, Server, BookOpen } from 'lucide-react';
import { SEO_CONTENT, CATEGORY_FALLBACKS } from '../../lib/seoContent';
import { RELATED_TOOLS } from '../../lib/relatedTools';
import { SEO_HEAD } from '../../lib/seoHead';
import { DOMAINS } from '../../lib/toolConfig';
import { BLOG_POSTS } from '../../lib/blogData';
import { trackEvent } from '../../lib/analytics';

// Find tool info and domain from DOMAINS config
function findToolInfo(toolId) {
  for (const domain of DOMAINS) {
    for (const cat of domain.categories) {
      const tool = cat.tools.find(t => t.id === toolId);
      if (tool) return { tool, domainTitle: domain.title };
    }
  }
  return { tool: null, domainTitle: null };
}

export default function ToolSEOContent({ toolId, onSelectTool }) {
  const { tool: toolInfo, domainTitle } = findToolInfo(toolId);
  const headMeta = SEO_HEAD[toolId];
  const relatedToolIds = RELATED_TOOLS[toolId] || [];
  
  // Build fallback content if specific content is missing
  let content = SEO_CONTENT[toolId];
  const fallback = domainTitle ? CATEGORY_FALLBACKS[domainTitle] : CATEGORY_FALLBACKS['PDF Tools'];

  if (!content && toolInfo && fallback) {
    content = {
      title: `${toolInfo.name} Online Free`,
      description: toolInfo.description,
      why: fallback.getOverview(toolInfo.name),
      howTo: fallback.getHowTo(toolInfo.name),
      specs: fallback.specs,
      features: [
        "100% Secure & Private Processing: Document privacy is guaranteed. All file conversions are protected with end-to-end encryption and client-side processing.",
        "Data Protection: Uploaded files are automatically deleted from server caches immediately after conversion."
      ],
      faq: fallback.faq
    };
  } else if (content && fallback) {
    // Merge missing fields (like specs) into existing content
    content = {
      ...content,
      specs: content.specs || fallback.specs,
      why: content.why || fallback.getOverview(toolInfo?.name || "Tool"),
      faq: content.faq?.length >= 7 ? content.faq : fallback.faq
    };
  }

  if (!content) return null;

  // Find related blog guides (naively matching by words in toolId)
  const relatedBlogs = BLOG_POSTS.filter(post => 
    post.published && 
    toolId.split('-').some(keyword => 
      keyword.length > 2 && post.id.includes(keyword)
    )
  ).slice(0, 3);

  return (
    <div className="w-full mx-auto mt-16 px-4 pb-24 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* H1 — Critical for SEO. Styled as a visible, elegant heading. */}
      {headMeta?.h1 && (
        <h1 className="sr-only">{headMeta.h1}</h1>
      )}

      {/* Introduction & Overview */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{content.title}</h2>
        <p className="text-lg text-gray-600 mx-auto leading-relaxed max-w-3xl">
          {content.description}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* How to use */}
        <div className="py-4">
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

        {/* Technical Specs Table */}
        <div className="py-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Technical Specifications</h3>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left text-gray-600">
              <tbody>
                {content.specs?.map((spec, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <th className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-100 w-1/3">{spec.key}</th>
                    <td className="px-4 py-3 border-b border-gray-100">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Overview & Why Section */}
      <div className="py-8 md:py-10 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Why use our {content.title.split(' ')[0]} tool?</h3>
        <p className="text-gray-700 leading-relaxed text-lg text-justify">
          {content.why}
        </p>
      </div>

      {/* Global Privacy Trust Banner for all tools */}
      <div className="my-8 md:my-12 max-w-4xl mx-auto bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden border border-indigo-700/50">
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
      <div className="pt-8 max-w-4xl mx-auto">
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
      
      {/* Related Guides / Blogs Section */}
      {relatedBlogs.length > 0 && (
        <div className="pt-12 border-t border-gray-100 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center">Related Guides & Tutorials</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedBlogs.map(blog => (
              <a 
                key={blog.id} 
                href={`/blog/${blog.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (onSelectTool) onSelectTool(`blog/${blog.id}`);
                }}
                className="group block border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all"
              >
                {blog.coverImage && (
                  <div className="h-32 w-full overflow-hidden bg-gray-100">
                    <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-bold text-gray-900 text-sm mb-2 group-hover:text-blue-600 line-clamp-2">{blog.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{blog.excerpt}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Tools Section */}
      {relatedToolIds.length > 0 && (
        <div className="pt-12 border-t border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Related Tools You May Need</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedToolIds.slice(0, 4).map(relatedId => {
              const { tool: toolInfo } = findToolInfo(relatedId);
              if (!toolInfo) return null;
              const Icon = toolInfo.icon;
              return (
                <a
                  href={`/${relatedId}`}
                  key={relatedId}
                  onClick={(e) => {
                    e.preventDefault();
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
                </a>
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

import React, { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ArrowLeft, Calendar, User, Clock, ArrowRight, Zap, Folder, ShieldCheck, Share2, ChevronDown } from 'lucide-react';
import { BLOG_POSTS } from '../lib/blogData';
import { DOMAINS } from '../lib/toolConfig';
import { trackEvent } from '../lib/analytics';

export default function BlogPost({ id, onNavigate }) {
  const post = BLOG_POSTS.find(p => p.id === id);

  // Find tool info for CTA
  const targetTool = useMemo(() => {
    if (!post || !post.targetToolUrl) return null;
    let foundTool = null;
    for (const domain of DOMAINS) {
      for (const cat of domain.categories) {
        const t = cat.tools.find(t => t.id === post.targetToolUrl);
        if (t) {
          foundTool = t;
          break;
        }
      }
      if (foundTool) break;
    }
    return foundTool;
  }, [post]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          alert('Link copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post]);

  if (!post || !post.published) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4 animate-in fade-in zoom-in-95">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Article Not Found or Coming Soon</h2>
        <p className="text-gray-500 mb-8">This article is currently being written or doesn't exist.</p>
        <button onClick={() => onNavigate('blog')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">
          Back to Blog
        </button>
      </div>
    );
  }

  const readTime = Math.ceil((post.content.split(' ').length || 1) / 200);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 animate-in fade-in">
        <button 
          onClick={() => onNavigate('blog')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all articles
        </button>

      <div className="mb-12 text-center flex flex-col items-center">
        <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-4 py-1.5 rounded-full mb-6 flex items-center gap-2">
          <Folder className="w-4 h-4" /> {post.cluster}
        </span>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
          {post.title}
        </h1>
        
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 font-medium">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {post.date}</span>
          <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {post.author}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {readTime} min read</span>
        </div>
      </div>

      <div className="w-full rounded-3xl overflow-hidden mb-12 shadow-lg relative">
        <img src={post.coverImage} alt={post.title} className="w-full h-auto object-cover" />
      </div>

      <article className="prose prose-lg md:prose-xl prose-indigo mx-auto max-w-3xl prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-img:rounded-xl">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            details: ({node, ...props}) => <details className="group border-b border-gray-200 overflow-hidden transition-all hover:border-gray-300 [&_summary::-webkit-details-marker]:hidden" {...props} />,
            summary: ({node, children, ...props}) => (
              <summary className="w-full flex items-center justify-between py-5 text-left focus:outline-none cursor-pointer bg-transparent" {...props}>
                <span className="font-bold text-gray-900 pr-4">{children}</span>
                <ChevronDown className="w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 group-open:rotate-180" />
              </summary>
            ),
            a: ({ href, children, ...props }) => {
              if (href && href.startsWith('/')) {
                return (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      const toolId = href.replace(/^\//, '');
                      onNavigate(toolId || null);
                    }}
                    className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" {...props}>
                  {children}
                </a>
              );
            }
          }}
        >
          {post.content}
        </ReactMarkdown>
      </article>

      {/* Bottom Tool CTA */}
      {targetTool && (
        <div className="mt-16 max-w-3xl mx-auto border border-gray-200/80 bg-white/60 backdrop-blur-xl rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="flex flex-col gap-2 flex-1 text-center md:text-left">
            <h3 className="text-xl font-extrabold text-gray-900 flex items-center justify-center md:justify-start gap-2">
              <Zap className="w-5 h-5 text-indigo-500" />
              Use the {targetTool.name} tool
            </h3>
            <p className="text-gray-500 font-medium text-sm">
              Process your files locally in your browser. Complete privacy, no uploads.
            </p>
          </div>
          <button 
            onClick={() => {
              trackEvent('blog_cta_click', {
                blog_slug: id,
                target_tool: targetTool.id,
              });
              onNavigate(targetTool.id);
            }}
            className="group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all w-full md:w-auto shadow-md shadow-indigo-200"
          >
            Launch Tool <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 max-w-3xl mx-auto">
        <div className="font-bold text-gray-900">Share this article:</div>
        <div className="flex gap-4">
          <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded-md hover:bg-blue-50 transition-colors">
            <Share2 className="w-3.5 h-3.5" /> Share Article
          </button>
        </div>
      </div>
    </div>
  );
}

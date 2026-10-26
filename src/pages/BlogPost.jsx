import React, { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
  ArrowLeft, Calendar, User, Clock, ArrowRight, Folder, ShieldCheck, 
  Share2, ChevronDown, Wrench, BookOpen 
} from 'lucide-react';
import { BLOG_POSTS } from '../lib/blogData';
import { DOMAINS, POPULAR_TOOL_IDS } from '../lib/toolConfig';
import { trackEvent } from '../lib/analytics';

export default function BlogPost({ id, onNavigate }) {
  const post = BLOG_POSTS.find(p => p.id === id);

  // Map of all tools across DOMAINS
  const allTools = useMemo(() => {
    const list = [];
    const map = new Map();
    DOMAINS.forEach(domain => {
      domain.categories.forEach(cat => {
        cat.tools.forEach(tool => {
          if (!map.has(tool.id)) {
            const enriched = { ...tool, domain: domain.title };
            map.set(tool.id, enriched);
            list.push(enriched);
          }
        });
      });
    });
    return { list, map };
  }, []);

  // Primary target tool for main CTA banner
  const targetTool = useMemo(() => {
    if (!post || !post.targetToolUrl) return null;
    const cleanId = post.targetToolUrl.replace(/^\//, '');
    return allTools.map.get(cleanId) || null;
  }, [post, allTools]);

  // Extract 4-5 tools talked about in this blog (or relevant to its workflow)
  const mentionedTools = useMemo(() => {
    if (!post) return [];
    const foundIds = new Set();
    const result = [];

    // 1. Primary tool first
    if (post.targetToolUrl) {
      const cleanTarget = post.targetToolUrl.replace(/^\//, '');
      if (allTools.map.has(cleanTarget)) {
        foundIds.add(cleanTarget);
        result.push(allTools.map.get(cleanTarget));
      }
    }

    // 2. Extract all tools linked in post markdown: [Name](/tool-id)
    if (post.content) {
      const linkMatches = [...post.content.matchAll(/\]\(\/([a-z0-9-]+)\)/g)];
      linkMatches.forEach(m => {
        const slug = m[1];
        if (allTools.map.has(slug) && !foundIds.has(slug)) {
          foundIds.add(slug);
          result.push(allTools.map.get(slug));
        }
      });
    }

    // 3. Backfill up to 4 tools using related category / popular tools
    if (result.length < 4) {
      const targetDomain = result[0]?.domain;
      const candidates = allTools.list.filter(
        t => !foundIds.has(t.id) && (t.domain === targetDomain || POPULAR_TOOL_IDS.includes(t.id))
      );
      for (const candidate of candidates) {
        if (result.length >= 4) break;
        result.push(candidate);
        foundIds.add(candidate.id);
      }
    }

    return result.slice(0, 4);
  }, [post, allTools]);

  // Find 3 related guides (preferring same cluster)
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    const sameCluster = BLOG_POSTS.filter(
      candidate => candidate.published && candidate.id !== post.id && candidate.cluster === post.cluster
    );
    if (sameCluster.length >= 3) {
      return sameCluster.slice(0, 3);
    }
    const others = BLOG_POSTS.filter(
      candidate => candidate.published && candidate.id !== post.id && candidate.cluster !== post.cluster
    );
    return [...sameCluster, ...others].slice(0, 3);
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
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mb-10 transition-colors cursor-pointer"
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
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Published {post.date}</span>
          {post.lastUpdated && (
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-orange-500" /> Updated {post.lastUpdated}</span>
          )}
          <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {post.author}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {readTime} min read</span>
        </div>
      </div>

      <div className="w-full rounded-3xl overflow-hidden mb-12 shadow-lg relative">
        <img src={post.coverImage} alt={post.title} className="w-full h-auto object-cover" />
      </div>

      <article className="prose prose-slate lg:prose-lg mx-auto max-w-3xl prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-img:rounded-xl">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            details: ({node, ...props}) => <details className="group border-b border-gray-200 overflow-hidden transition-all hover:border-gray-300 [&_summary::-webkit-details-marker]:hidden my-6" {...props} />,
            summary: ({node, children, ...props}) => (
              <summary className="w-full flex items-center justify-between py-5 text-left focus:outline-none cursor-pointer bg-transparent" {...props}>
                <span className="font-bold text-gray-900 pr-4 text-[inherit]">{children}</span>
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
                      const path = href.replace(/^\//, '');
                      onNavigate(path || null);
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

      {/* 4-5 Tools Talked About in This Guide */}
      {mentionedTools.length > 0 && (
        <section className="mt-14 max-w-3xl mx-auto border-t border-gray-100 pt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Featured Tools for This Workflow</h2>
              <p className="text-xs text-gray-500">Free, private tools mentioned in this guide. Processed locally in your browser.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {mentionedTools.map(tool => {
              const IconComp = tool.icon;
              return (
                <a
                  key={tool.id}
                  href={`/${tool.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    trackEvent('blog_tool_click', {
                      blog_slug: id,
                      tool_id: tool.id,
                    });
                    onNavigate(tool.id);
                  }}
                  className="group p-4 bg-white hover:bg-blue-50/40 border border-gray-200 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-start gap-3.5 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl ${tool.bg || 'bg-blue-50'} ${tool.color || 'text-blue-600'} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs`}>
                    {IconComp ? <IconComp className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm truncate">
                        {tool.name}
                      </h3>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottom Tool CTA Banner */}
      {targetTool && (
        <div className="mt-14 max-w-4xl mx-auto bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-[2rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden border border-indigo-700/50">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-overlay filter blur-[64px] opacity-60 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-overlay filter blur-[64px] opacity-60"></div>
          
          <div className="flex flex-col gap-3 flex-1 text-center md:text-left relative z-10">
            <div className="inline-flex items-center justify-center md:justify-start gap-2 text-indigo-200 text-sm mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Secure & Local
            </div>
            <h3 className="text-2xl md:text-3xl font-semibold text-white flex items-center justify-center md:justify-start gap-3 leading-tight">
              Ready to use the {targetTool.name} tool?
            </h3>
            <p className="text-indigo-100/90 text-lg max-w-xl leading-relaxed">
              Process your files instantly in your browser. <span className="text-white font-medium">Zero server uploads.</span> Complete privacy guaranteed.
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
            className="group relative z-10 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-indigo-900 px-8 py-3.5 rounded-2xl font-semibold transition-all duration-300 w-full md:w-auto shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
          >
            Launch Tool <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* Related Guides Section */}
      {relatedPosts.length > 0 && (
        <section className="mt-14 max-w-4xl mx-auto border-t border-gray-100 pt-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Related Guides</h2>
                <p className="text-xs text-gray-500">More guides to help optimize your documents.</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('blog')}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              All articles <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {relatedPosts.map(related => (
              <a
                key={related.id}
                href={`/blog/${related.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`blog/${related.id}`);
                }}
                className="group flex flex-col bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg overflow-hidden transition-all duration-300 cursor-pointer"
              >
                {related.coverImage && (
                  <div className="h-32 overflow-hidden bg-gray-100 relative">
                    <img
                      src={related.coverImage}
                      alt={related.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-indigo-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      {related.cluster}
                    </span>
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {related.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                    {related.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                    {related.excerpt}
                  </p>
                  <div className="mt-auto text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:underline">
                    Read Guide <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 max-w-3xl mx-auto">
        <div className="font-bold text-gray-900 text-sm">Share this article:</div>
        <div className="flex gap-4">
          <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded-md hover:bg-blue-50 transition-colors cursor-pointer">
            <Share2 className="w-3.5 h-3.5" /> Share Article
          </button>
        </div>
      </div>
    </div>
  );
}

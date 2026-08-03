import React, { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Calendar, User, Clock, ArrowRight, Zap, Folder, ShieldCheck } from 'lucide-react';
import { BLOG_POSTS } from '../lib/blogData';
import { DOMAINS } from '../lib/toolConfig';

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

  useEffect(() => {
    window.scrollTo(0, 0);

    // Dynamic SEO Injection
    if (post) {
      document.title = `${post.title} - PDFTools4U Blog`;
      
      const metaTags = [
        { name: 'description', content: post.excerpt },
        { property: 'og:title', content: post.title },
        { property: 'og:description', content: post.excerpt },
        { property: 'og:image', content: post.coverImage },
        { property: 'og:type', content: 'article' },
      ];

      // Add noindex for unpublished stubs
      if (!post.published) {
        metaTags.push({ name: 'robots', content: 'noindex, nofollow' });
      }

      const injectedTags = metaTags.map(tag => {
        let meta = document.createElement('meta');
        Object.keys(tag).forEach(key => meta.setAttribute(key, tag[key]));
        document.head.appendChild(meta);
        return meta;
      });

      // JSON-LD Structured Data
      let script = null;
      if (post.published) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        
        let schemaData = post.customSchema;
        
        if (!schemaData) {
          // Use HowTo schema if the title suggests a tutorial
          const isTutorial = post.title.toLowerCase().includes('how to') || post.title.toLowerCase().includes('guide');
          
          schemaData = isTutorial ? {
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": post.title,
            "description": post.excerpt,
            "image": post.coverImage,
            "step": [
              {
                "@type": "HowToStep",
                "text": "Upload your file to the designated tool."
              },
              {
                "@type": "HowToStep",
                "text": "Click convert and download the processed file."
              }
            ]
          } : {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.title,
            "image": [post.coverImage],
            "datePublished": new Date(post.date).toISOString(),
            "author": [{
                "@type": "Organization",
                "name": post.author,
                "url": "https://pdftools4u.in"
              }]
          };
        }

        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);
      }

      return () => {
        document.title = 'PDFTools4U';
        injectedTags.forEach(tag => tag.remove());
        if (script) script.remove();
      };
    }
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

      <div className="w-full h-64 md:h-[400px] rounded-3xl overflow-hidden mb-12 shadow-lg relative bg-gray-100">
        <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
      </div>

      {/* Mid-Article Tool CTA */}
      {targetTool && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-3xl p-6 md:p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex-1 space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              Try the {targetTool.name} tool now
            </h3>
            <p className="text-gray-600">{targetTool.description} Free and processed locally.</p>
          </div>
          <button 
            onClick={() => onNavigate(targetTool.id)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all whitespace-nowrap w-full md:w-auto"
          >
            Launch Tool <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <article className="prose prose-lg md:prose-xl prose-indigo mx-auto max-w-3xl prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-img:rounded-xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </article>

      {/* Bottom Tool CTA */}
      {targetTool && (
        <div className="mt-16 max-w-3xl mx-auto bg-gray-900 rounded-3xl p-8 md:p-10 flex flex-col items-center text-center shadow-xl">
          <ShieldCheck className="w-12 h-12 text-green-400 mb-4" />
          <h3 className="text-2xl font-bold text-white mb-4">
            Ready to use the {targetTool.name} tool?
          </h3>
          <p className="text-gray-400 mb-8 max-w-xl">
            Our tools run entirely in your web browser. No uploads, no waiting, and complete privacy for your sensitive documents.
          </p>
          <button 
            onClick={() => onNavigate(targetTool.id)}
            className="flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-indigo-50 px-8 py-4 rounded-xl font-extrabold shadow-lg transition-all w-full md:w-auto"
          >
            Use {targetTool.name} Free <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 max-w-3xl mx-auto">
        <div className="font-bold text-gray-900">Share this article:</div>
        <div className="flex gap-4">
           <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="text-indigo-600 hover:underline font-medium text-sm flex items-center gap-1.5">Copy Link</button>
        </div>
      </div>
    </div>
  );
}

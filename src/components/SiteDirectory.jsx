import React from 'react';
import { DOMAINS } from '../lib/toolConfig';
import { BLOG_POSTS } from '../lib/blogData';

export default function SiteDirectory({ onSelectTool }) {
  const handleLinkClick = (e, route) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (onSelectTool) {
      onSelectTool(route);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeBlogPosts = BLOG_POSTS.filter(post => post.published);

  return (
    <section 
      className="max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-10 mt-20 border-t border-gray-200"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 400px' }}
    >
      <h3 className="text-2xl font-bold text-gray-900 mb-8">All Tools & Resources</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        
        {/* Render Domains */}
        {DOMAINS.map(domain => (
          <div key={domain.title} className="flex flex-col gap-4">
            <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">{domain.title}</h4>
            <ul className="flex flex-col gap-2">
              {domain.categories.flatMap(c => c.tools).map(tool => (
                <li key={tool.id}>
                  <a 
                    href={`/${tool.id}`} 
                    onClick={(e) => handleLinkClick(e, tool.id)}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {tool.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Render Blog Posts */}
        {activeBlogPosts.length > 0 && (
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Guides & Articles</h4>
            <ul className="flex flex-col gap-2">
              {activeBlogPosts.map(post => (
                <li key={post.id}>
                  <a 
                    href={`/blog/${post.id}`} 
                    onClick={(e) => handleLinkClick(e, `blog/${post.id}`)}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {post.title}
                  </a>
                </li>
              ))}
              <li className="mt-2">
                <a 
                  href="/blog" 
                  onClick={(e) => handleLinkClick(e, 'blog')}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View All Articles →
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

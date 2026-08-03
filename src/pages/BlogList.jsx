import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, BookOpen, Calendar, User, Clock } from 'lucide-react';
import { BLOG_POSTS, BLOG_CATEGORIES } from '../lib/blogData';

export default function BlogList({ onNavigate }) {
  const [activeCategory, setActiveCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'All';
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveCategory(params.get('category') || 'All');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    const newUrl = category === 'All' 
      ? window.location.pathname 
      : `${window.location.pathname}?category=${encodeURIComponent(category)}`;
    window.history.pushState({}, '', newUrl);
  };

  const filteredPosts = useMemo(() => {
    if (activeCategory === 'All') return BLOG_POSTS;
    return BLOG_POSTS.filter(post => post.cluster === activeCategory);
  }, [activeCategory]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12 md:py-20 animate-in fade-in">
        <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center gap-2 p-2 px-4 bg-indigo-50 text-indigo-700 rounded-full font-bold text-sm mb-4">
          <BookOpen className="w-4 h-4" />
          <span>Tips & Guides</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          PDFTools4U Blog
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Helpful guides, tutorials, and tips for managing your digital documents.
        </p>
      </div>

      {/* Category Filter Navbar */}
      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-md py-4 mb-8 border-y border-gray-100 flex items-center justify-start sm:justify-center overflow-x-auto gap-2 custom-scrollbar">
        <button
          onClick={() => handleCategoryChange('All')}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-colors ${
            activeCategory === 'All' 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {BLOG_CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-colors ${
              activeCategory === category 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.map(post => (
          <div 
            key={post.id} 
            className={`group flex flex-col bg-white rounded-3xl border border-gray-200 overflow-hidden transition-all duration-300 relative
              ${post.published 
                ? 'hover:shadow-xl hover:border-indigo-200 cursor-pointer' 
                : 'opacity-80 grayscale-[30%] cursor-not-allowed'
              }
            `}
            onClick={() => post.published && onNavigate('blog/' + post.id)}
          >
            <div className="h-56 overflow-hidden relative bg-gray-100">
              {post.coverImage && (
                <img 
                  src={post.coverImage} 
                  alt={post.title} 
                  className={`w-full h-full object-cover transition-transform duration-500 ${post.published ? 'group-hover:scale-105' : ''}`}
                  loading="lazy"
                />
              )}
              {/* Overlay Gradient */}
              {post.published && (
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="bg-indigo-600/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  {post.cluster}
                </span>
              </div>

              {!post.published && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-gray-900 text-white font-extrabold text-sm px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Coming Soon
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-8 flex flex-col flex-1">
              <div className="flex items-center gap-4 text-xs text-gray-500 font-medium mb-4">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
              </div>
              
              <h3 className={`text-2xl font-bold text-gray-900 mb-3 transition-colors ${post.published ? 'group-hover:text-indigo-600' : ''}`}>
                {post.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed mb-6">
                {post.excerpt}
              </p>
              
              {post.published ? (
                <div className="flex items-center text-indigo-600 font-bold text-sm mt-auto group-hover:gap-2 transition-all">
                  Read Article <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              ) : (
                <div className="flex items-center text-gray-400 font-bold text-sm mt-auto">
                  Available soon
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

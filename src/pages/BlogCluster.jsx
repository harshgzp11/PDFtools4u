import React from 'react';
import { ArrowRight, BookOpen, Calendar } from 'lucide-react';
import { BLOG_POSTS } from '../lib/blogData';
import { BLOG_CLUSTERS, getBlogCluster } from '../lib/blogClusters';

export default function BlogCluster({ slug, onNavigate }) {
  const cluster = getBlogCluster(slug);
  const posts = cluster
    ? BLOG_POSTS.filter(post => post.published && post.cluster === cluster.label)
    : [];

  if (!cluster) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Topic not found</h1>
        <button onClick={() => onNavigate('blog')} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white">
          Back to Blog
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 md:py-20">
      <nav className="mb-8 text-sm text-gray-500" aria-label="Breadcrumb">
        <a href="/blog" onClick={(event) => { event.preventDefault(); onNavigate('blog'); }} className="text-blue-600 hover:underline">
          Blog
        </a>
        <span className="mx-2">/</span>
        <span>{cluster.label}</span>
      </nav>

      <header className="mb-12 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
          <BookOpen className="h-4 w-4" /> Topic hub
        </div>
        <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">{cluster.title}</h1>
        <p className="text-xl leading-relaxed text-gray-600">{cluster.intro}</p>
      </header>

      <section aria-labelledby="cluster-guides-heading">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 id="cluster-guides-heading" className="text-2xl font-bold text-gray-900">{cluster.label} guides</h2>
          <span className="text-sm font-medium text-gray-500">{posts.length} {posts.length === 1 ? 'guide' : 'guides'}</span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <article key={post.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {post.coverImage && <img src={post.coverImage} alt={post.title} className="h-48 w-full object-cover" loading="lazy" />}
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-500">
                  <Calendar className="h-3.5 w-3.5" /> {post.date}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">
                  <a
                    href={`/blog/${post.id}`}
                    onClick={(event) => { event.preventDefault(); onNavigate(`blog/${post.id}`); }}
                    className="hover:text-indigo-600 hover:underline"
                  >
                    {post.title}
                  </a>
                </h3>
                <p className="mb-5 flex-1 leading-relaxed text-gray-600">{post.excerpt}</p>
                <a
                  href={`/blog/${post.id}`}
                  onClick={(event) => { event.preventDefault(); onNavigate(`blog/${post.id}`); }}
                  className="inline-flex items-center gap-2 font-bold text-indigo-600 hover:underline"
                >
                  Read guide <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-gray-200 pt-8" aria-labelledby="related-topics-heading">
        <h2 id="related-topics-heading" className="mb-5 text-2xl font-bold text-gray-900">Explore related topics</h2>
        <div className="flex flex-wrap gap-3">
          {BLOG_CLUSTERS.filter(relatedCluster => relatedCluster.slug !== cluster.slug).map(relatedCluster => (
            <a
              key={relatedCluster.slug}
              href={`/blog/topic/${relatedCluster.slug}`}
              onClick={(event) => { event.preventDefault(); onNavigate(`blog/topic/${relatedCluster.slug}`); }}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:border-blue-300 hover:bg-blue-50 hover:underline"
            >
              {relatedCluster.label}
            </a>
          ))}
        </div>
      </section>

      <div className="mt-12 border-t border-gray-200 pt-8">
        <a href="/blog" onClick={(event) => { event.preventDefault(); onNavigate('blog'); }} className="font-bold text-blue-600 hover:underline">
          Browse all blog guides
        </a>
      </div>
    </main>
  );
}

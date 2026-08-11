import { useEffect } from 'react';
import { SEO_HEAD, HOMEPAGE_SEO } from '../lib/seoHead';
import { SEO_CONTENT } from '../lib/seoContent';
import { DOMAINS, POPULAR_TOOL_IDS } from '../lib/toolConfig';
import { BLOG_POSTS } from '../lib/blogData';

const BASE_URL = 'https://pdftools4u.in';
const OG_IMAGE = `${BASE_URL}/images/og-card.png`;
const SITE_NAME = 'PDFTools4U';
const SITE_LOGO = `${BASE_URL}/images/pdftool4u-logo.png`;
const CONTACT_EMAIL = 'pdftools4u.official@gmail.com';

// Publisher object reused across BlogPosting and Article schemas
const PUBLISHER = {
  '@type': 'Organization',
  'name': SITE_NAME,
  'url': BASE_URL,
  'logo': {
    '@type': 'ImageObject',
    'url': SITE_LOGO,
  },
};

/**
 * SEOHead — Centralized metadata & structured data engine for every route.
 *
 * Handles: title, description, canonical, OG tags, Twitter cards, JSON-LD structured data.
 * All injected tags are cleaned up on unmount to prevent stale meta during SPA navigation.
 *
 * Route types handled:
 *   - Homepage (activeTool = null)
 *   - Tool pages (activeTool = 'compress-pdf', 'pdf-merge', etc.)
 *   - Blog list (activeTool = 'blog')
 *   - Blog posts (activeTool = 'blog/<slug>')
 *   - Static pages (activeTool = 'privacy', 'terms', 'about', 'contact')
 */
export default function SEOHead({ activeTool }) {
  useEffect(() => {
    const injectedElements = [];

    // ─── Helpers ──────────────────────────────────────────────

    /** Inject or update a <meta> tag */
    const setMeta = (attr, attrValue, content) => {
      let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (el) {
        el.setAttribute('content', content);
      } else {
        el = document.createElement('meta');
        el.setAttribute(attr, attrValue);
        el.setAttribute('content', content);
        document.head.appendChild(el);
        injectedElements.push(el);
      }
    };

    /** Inject or update a <link> tag */
    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (el) {
        el.setAttribute('href', href);
      } else {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        el.setAttribute('href', href);
        document.head.appendChild(el);
        injectedElements.push(el);
      }
    };

    /** Inject a JSON-LD <script> into <head> */
    const addJsonLd = (data) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(data);
      document.head.appendChild(script);
      injectedElements.push(script);
    };

    // ─── Route Classification ────────────────────────────────

    const isBlogList = activeTool === 'blog';
    const isBlogPost = activeTool && activeTool.startsWith('blog/');
    const isBlogRoute = isBlogList || isBlogPost;
    const isStaticPage = ['privacy', 'terms', 'about', 'contact'].includes(activeTool);
    const isToolPage = activeTool && !isBlogRoute && !isStaticPage;
    const isHomepage = !activeTool;

    // ─── Resolve metadata ────────────────────────────────────

    let title, description, canonicalUrl, ogImage, ogType, noindex;

    if (isBlogPost) {
      const slug = activeTool.split('/')[1];
      const post = BLOG_POSTS.find(p => p.id === slug && p.published);
      title = post ? `${post.title} — ${SITE_NAME} Blog` : `Article Not Found — ${SITE_NAME}`;
      description = post ? post.excerpt : 'This article is currently being written or does not exist.';
      canonicalUrl = `${BASE_URL}/${activeTool}`;
      ogImage = post?.coverImage || OG_IMAGE;
      ogType = 'article';
      noindex = post?.noindex || false;
    } else if (isBlogList) {
      const seoData = SEO_HEAD['blog'];
      title = seoData?.title || `Blog — ${SITE_NAME}`;
      description = seoData?.description || HOMEPAGE_SEO.description;
      canonicalUrl = `${BASE_URL}/blog`;
      ogImage = OG_IMAGE;
      ogType = 'website';
      noindex = seoData?.noindex || false;
    } else if (activeTool) {
      const seoData = SEO_HEAD[activeTool] || HOMEPAGE_SEO;
      title = seoData.title;
      description = seoData.description;
      canonicalUrl = `${BASE_URL}/${activeTool}`;
      ogImage = OG_IMAGE;
      ogType = 'website';
      noindex = seoData.noindex || false;
    } else {
      title = HOMEPAGE_SEO.title;
      description = HOMEPAGE_SEO.description;
      canonicalUrl = BASE_URL;
      ogImage = OG_IMAGE;
      ogType = 'website';
      noindex = HOMEPAGE_SEO.noindex || false;
    }

    // ─── 1. Inject Meta Tags ─────────────────────────────────

    document.title = title;
    setMeta('name', 'description', description);
    setLink('canonical', canonicalUrl);
    
    if (noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    }

    // Open Graph
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'en_IN');

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    // ─── 2. Structured Data (JSON-LD) ────────────────────────

    // ────────────────────────────────────────────────────────
    // HOMEPAGE SCHEMAS
    // ────────────────────────────────────────────────────────
    if (isHomepage) {
      // WebSite schema
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': SITE_NAME,
        'url': BASE_URL,
        'description': HOMEPAGE_SEO.description,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${BASE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      });

      // Organization schema (enhanced)
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': SITE_NAME,
        'alternateName': ['PDF Tools 4 U', 'PDF Tools For You', 'PDFTools4u'],
        'url': BASE_URL,
        'logo': SITE_LOGO,
        'description': 'Free, secure online PDF and image tools that process files locally in your browser.',
        'contactPoint': {
          '@type': 'ContactPoint',
          'email': CONTACT_EMAIL,
          'contactType': 'customer support',
          'availableLanguage': ['English', 'Hindi'],
        },
        'sameAs': [],
      });

      // ItemList of popular tools (for potential carousel rich results)
      const allTools = DOMAINS.flatMap(d => d.categories.flatMap(c => c.tools));
      const popularTools = POPULAR_TOOL_IDS
        .map(id => allTools.find(t => t.id === id))
        .filter(Boolean);

      if (popularTools.length) {
        addJsonLd({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          'name': 'Popular PDF & Image Tools',
          'description': 'Most used free online PDF and image tools on PDFTools4U.',
          'itemListElement': popularTools.map((tool, i) => ({
            '@type': 'ListItem',
            'position': i + 1,
            'name': tool.name,
            'url': `${BASE_URL}/${tool.id}`,
          })),
        });
      }
    }

    // ────────────────────────────────────────────────────────
    // TOOL PAGE SCHEMAS
    // ────────────────────────────────────────────────────────
    if (isToolPage) {
      const toolContent = SEO_CONTENT[activeTool];
      const seoData = SEO_HEAD[activeTool];

      // Find tool info from DOMAINS config
      let toolInfo = null;
      let toolCategory = null;
      let toolDomain = null;
      for (const domain of DOMAINS) {
        for (const cat of domain.categories) {
          const t = cat.tools.find(t => t.id === activeTool);
          if (t) {
            toolInfo = t;
            toolCategory = cat.name;
            toolDomain = domain.title;
            break;
          }
        }
        if (toolInfo) break;
      }

      const schemas = [];

      // BreadcrumbList
      const breadcrumbItems = [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
      ];
      if (toolDomain) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          'position': 2,
          'name': toolDomain,
          'item': BASE_URL,
        });
      }
      breadcrumbItems.push({
        '@type': 'ListItem',
        'position': toolDomain ? 3 : 2,
        'name': toolInfo?.name || activeTool,
        'item': canonicalUrl,
      });
      schemas.push({ '@type': 'BreadcrumbList', 'itemListElement': breadcrumbItems });

      // WebApplication (enhanced with PriceSpecification)
      if (toolInfo) {
        const webApp = {
          '@type': 'WebApplication',
          'name': `${toolInfo.name} — ${SITE_NAME}`,
          'url': canonicalUrl,
          'description': toolInfo.description,
          'applicationCategory': 'UtilityApplication',
          'operatingSystem': 'Any',
          'browserRequirements': 'Requires a modern browser with JavaScript enabled',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'INR',
            'availability': 'https://schema.org/InStock',
            'priceSpecification': {
              '@type': 'PriceSpecification',
              'price': '0',
              'priceCurrency': 'USD',
              'description': 'Completely free, no hidden charges.',
            },
          },
        };

        // Add feature list if seoContent provides features
        if (toolContent?.features?.length) {
          webApp.featureList = toolContent.features.join('; ');
        }

        schemas.push(webApp);
      }

      // FAQPage (from seoContent)
      if (toolContent?.faq?.length) {
        schemas.push({
          '@type': 'FAQPage',
          'mainEntity': toolContent.faq.map(item => ({
            '@type': 'Question',
            'name': item.q,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': item.a,
            },
          })),
        });
      }

      // HowTo (from seoContent)
      if (toolContent?.howTo?.length) {
        schemas.push({
          '@type': 'HowTo',
          'name': seoData?.h1 || toolContent?.title || (toolInfo?.name || activeTool),
          'description': seoData?.description || toolInfo?.description || '',
          'step': toolContent.howTo.map((step, i) => ({
            '@type': 'HowToStep',
            'position': i + 1,
            'text': step,
          })),
        });
      }

      // Wrap all tool schemas in @graph
      if (schemas.length) {
        addJsonLd({ '@context': 'https://schema.org', '@graph': schemas });
      }
    }

    // ────────────────────────────────────────────────────────
    // BLOG LIST SCHEMAS
    // ────────────────────────────────────────────────────────
    if (isBlogList) {
      const schemas = [];

      // BreadcrumbList: Home > Blog
      schemas.push({
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
          { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': `${BASE_URL}/blog` },
        ],
      });

      // CollectionPage
      schemas.push({
        '@type': 'CollectionPage',
        'name': `Blog & Guides — ${SITE_NAME}`,
        'description': SEO_HEAD['blog']?.description || 'Expert guides on PDF tools, document conversion, and productivity tips.',
        'url': `${BASE_URL}/blog`,
        'isPartOf': { '@type': 'WebSite', 'name': SITE_NAME, 'url': BASE_URL },
      });

      addJsonLd({ '@context': 'https://schema.org', '@graph': schemas });
    }

    // ────────────────────────────────────────────────────────
    // BLOG POST SCHEMAS
    // ────────────────────────────────────────────────────────
    if (isBlogPost) {
      const slug = activeTool.split('/')[1];
      const post = BLOG_POSTS.find(p => p.id === slug && p.published);

      if (post) {
        const schemas = [];

        // BreadcrumbList: Home > Blog > [Post Title]
        schemas.push({
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
            { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': `${BASE_URL}/blog` },
            { '@type': 'ListItem', 'position': 3, 'name': post.title, 'item': canonicalUrl },
          ],
        });

        // Parse date for ISO format
        let isoDate;
        try {
          isoDate = new Date(post.date).toISOString();
        } catch {
          isoDate = new Date().toISOString();
        }

        // BlogPosting schema
        schemas.push({
          '@type': 'BlogPosting',
          'headline': post.title,
          'description': post.excerpt,
          'image': [post.coverImage || OG_IMAGE],
          'datePublished': isoDate,
          'dateModified': post.lastModified ? new Date(post.lastModified).toISOString() : isoDate,
          'author': {
            '@type': 'Organization',
            'name': post.author || SITE_NAME,
            'url': BASE_URL,
          },
          'publisher': PUBLISHER,
          'mainEntityOfPage': {
            '@type': 'WebPage',
            '@id': canonicalUrl,
          },
          'url': canonicalUrl,
        });

        // Inject custom schemas from post (HowTo, FAQPage, etc.) if present
        if (post.customSchema) {
          const customData = post.customSchema;
          // If customSchema has @graph, merge its entries into our schemas array
          if (customData['@graph'] && Array.isArray(customData['@graph'])) {
            customData['@graph'].forEach(schema => schemas.push(schema));
          } else {
            // Single schema object — strip @context (will be at wrapper level)
            const { '@context': _, ...schemaBody } = customData;
            schemas.push(schemaBody);
          }
        }

        addJsonLd({ '@context': 'https://schema.org', '@graph': schemas });

        // Add noindex for unpublished posts (safety — already filtered by `published`)
        // This block only runs if post exists and is published, but kept for defensive clarity
      }

      // Handle unpublished/missing posts — add noindex
      if (!post) {
        setMeta('name', 'robots', 'noindex, nofollow');
      }
    }

    // ────────────────────────────────────────────────────────
    // STATIC PAGE SCHEMAS (about, contact, privacy, terms)
    // ────────────────────────────────────────────────────────
    if (isStaticPage) {
      const pageNames = {
        'about': 'About Us',
        'contact': 'Contact Us',
        'privacy': 'Privacy Policy',
        'terms': 'Terms of Service',
      };

      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
          { '@type': 'ListItem', 'position': 2, 'name': pageNames[activeTool] || activeTool, 'item': canonicalUrl },
        ],
      });
    }

    // ─── Cleanup on unmount or route change ──────────────────
    return () => {
      injectedElements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    };
  }, [activeTool]);

  return null; // This component only manages <head>, renders nothing
}

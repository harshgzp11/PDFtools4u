import { useEffect } from 'react';
import { SEO_HEAD, HOMEPAGE_SEO } from '../lib/seoHead';
import { SEO_CONTENT } from '../lib/seoContent';
import { DOMAINS } from '../lib/toolConfig';

const BASE_URL = 'https://pdftools4u.in';
const OG_IMAGE = `${BASE_URL}/images/og-card.png`;
const SITE_NAME = 'PDFTools4U';

/**
 * SEOHead — Dynamic metadata injection for every route.
 * Handles: title, description, canonical, OG tags, Twitter cards, JSON-LD structured data.
 * All injected tags are cleaned up on unmount to prevent stale meta during SPA navigation.
 */
export default function SEOHead({ activeTool }) {
  useEffect(() => {
    const injectedElements = [];

    // Helper: inject or update a meta tag
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

    // Helper: inject or update a link tag
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

    // Helper: inject JSON-LD script
    const addJsonLd = (data) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(data);
      document.head.appendChild(script);
      injectedElements.push(script);
      return script;
    };

    // Determine metadata based on active route
    const isBlogRoute = activeTool === 'blog' || (activeTool && activeTool.startsWith('blog/'));
    const seoData = activeTool ? SEO_HEAD[activeTool] : null;
    const meta = seoData || HOMEPAGE_SEO;

    // Skip injection for blog post routes (BlogPost.jsx handles its own meta)
    if (activeTool && activeTool.startsWith('blog/')) {
      return;
    }

    // 1. Title
    document.title = meta.title;

    // 2. Meta Description
    setMeta('name', 'description', meta.description);

    // 3. Canonical URL
    const canonicalPath = activeTool ? `/${activeTool}` : '';
    const canonicalUrl = `${BASE_URL}${canonicalPath}`;
    setLink('canonical', canonicalUrl);

    // 4. Open Graph Tags
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', OG_IMAGE);
    setMeta('property', 'og:type', activeTool ? 'website' : 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'en_IN');

    // 5. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', OG_IMAGE);

    // 6. Structured Data (JSON-LD) for tool pages
    if (activeTool && !isBlogRoute && !['privacy', 'terms', 'about', 'contact'].includes(activeTool)) {
      const toolContent = SEO_CONTENT[activeTool];

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

      // BreadcrumbList Schema
      const breadcrumbs = {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': BASE_URL,
          },
        ],
      };
      if (toolDomain) {
        breadcrumbs.itemListElement.push({
          '@type': 'ListItem',
          'position': 2,
          'name': toolDomain,
          'item': BASE_URL,
        });
      }
      breadcrumbs.itemListElement.push({
        '@type': 'ListItem',
        'position': toolDomain ? 3 : 2,
        'name': toolInfo?.name || activeTool,
        'item': canonicalUrl,
      });
      schemas.push(breadcrumbs);

      // WebApplication Schema
      if (toolInfo) {
        schemas.push({
          '@type': 'WebApplication',
          'name': `${toolInfo.name} - ${SITE_NAME}`,
          'url': canonicalUrl,
          'description': toolInfo.description,
          'applicationCategory': 'UtilityApplication',
          'operatingSystem': 'Any',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'INR',
          },
          'browserRequirements': 'Requires a modern browser with JavaScript enabled',
        });
      }

      // FAQPage Schema (from seoContent)
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

      // HowTo Schema (from seoContent)
      if (toolContent?.howTo?.length) {
        schemas.push({
          '@type': 'HowTo',
          'name': meta.h1 || toolContent.title,
          'description': meta.description,
          'step': toolContent.howTo.map((step, i) => ({
            '@type': 'HowToStep',
            'position': i + 1,
            'text': step,
          })),
        });
      }

      // Wrap all schemas in @graph
      if (schemas.length) {
        addJsonLd({
          '@context': 'https://schema.org',
          '@graph': schemas,
        });
      }
    }

    // Homepage-specific schema
    if (!activeTool) {
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

      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': SITE_NAME,
        'url': BASE_URL,
        'logo': `${BASE_URL}/images/pdftool4u-logo.png`,
        'description': 'Free, secure online PDF and image tools that process files locally in your browser.',
      });
    }

    // Cleanup on unmount or when activeTool changes
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

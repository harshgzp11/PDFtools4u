const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '../dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const BASE_URL = 'https://www.pdftools4u.in';

// Helper to parse JS files for specific blocks (primitive but effective for static generation)
function extractSeoData() {
  const seoData = {};
  const toolMetadata = {};
  
  // 1. Parse seoHead.js
  const seoHeadContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/seoHead.js'), 'utf-8');
  
  // Extract HOMEPAGE_SEO
  const homeTitleMatch = seoHeadContent.match(/HOMEPAGE_SEO\s*=\s*{[^}]*title:\s*['"]([^'"]+)['"]/);
  const homeDescMatch = seoHeadContent.match(/HOMEPAGE_SEO\s*=\s*{[^}]*description:\s*['"]([^'"]+)['"]/);
  
  const defaultTitle = homeTitleMatch ? homeTitleMatch[1] : 'PDFtools4u';
  const defaultDesc = homeDescMatch ? homeDescMatch[1] : '';

  const toolConfigContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/toolConfig.js'), 'utf-8');
  const toolMatches = [...toolConfigContent.matchAll(/\{\s*id:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"]/g)];
  toolMatches.forEach(match => {
    toolMetadata['/' + match[1]] = {
      name: match[2],
      description: match[3],
    };
  });

  seoData['/'] = { title: defaultTitle, description: defaultDesc };

  // Extract SEO_HEAD items
  const seoHeadMatches = [...seoHeadContent.matchAll(/'([^']+)'\s*:\s*{\s*title:\s*['"]([^'"]+)['"]\s*,\s*description:\s*['"]([^'"]+)['"]/g)];
  seoHeadMatches.forEach(m => {
    const slug = m[1];
    let route = '/' + slug;
    if (slug === 'blog') route = '/blog';
    else if (['about', 'contact', 'privacy', 'terms', 'privacy-policy', 'terms-of-service', 'cookie-policy'].includes(slug)) route = '/' + slug;
    
    seoData[route] = { title: m[2], description: m[3] };
  });

  // 2. Parse blogData.js
  const blogDataContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/blogData.js'), 'utf-8');
  const blogIds = [...blogDataContent.matchAll(/^\s*id:\s*['"]([^'"]+)['"]/gm)];

  blogIds.forEach((idMatch) => {
    const blockStart = idMatch.index;
    const nextBlock = blogDataContent.indexOf('\n  },', blockStart);
    const blockEnd = nextBlock >= 0 ? nextBlock : blogDataContent.indexOf('\n  }\n]', blockStart);
    const block = blogDataContent.slice(blockStart, blockEnd >= 0 ? blockEnd : undefined);
    if (!/published:\s*true/.test(block)) return;
    const title = block.match(/title:\s*['"]([^'"]+)['"]/);
    const excerpt = block.match(/excerpt:\s*['"]([^'"]+)['"]/);
    const metaTitle = block.match(/metaTitle:\s*['"]([^'"]+)['"]/);
    const metaDescription = block.match(/metaDescription:\s*['"]([^'"]+)['"]/);
    if (!title || !excerpt) return;

    const route = '/blog/' + idMatch[1];
    seoData[route] = {
      title: metaTitle?.[1] || title[1] + ' — PDFtools4u Blog',
      description: metaDescription?.[1] || excerpt[1],
    };
  });

  // Extract SEO metadata for canonical blog topic hubs
  const clusterContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/blogClusters.js'), 'utf-8');
  const clusterMatches = [...clusterContent.matchAll(/\{\s*slug:\s*'([^']+)',\s*label:\s*'[^']+',\s*title:\s*'([^']+)',\s*description:\s*'([^']+)'/g)];
  clusterMatches.forEach(match => {
    seoData['/blog/topic/' + match[1]] = {
      title: match[2] + ' | PDFTools4U',
      description: match[3],
    };
  });

  return { seoData, defaultTitle, defaultDesc, toolMetadata };
}

// Alias redirects to guarantee canonical uniformity and prevent self-canonicalization on aliases
const URL_REDIRECTS = {
  '/pdf-editor': '/edit-pdf',
  '/pdf-extractor': '/pdf-to-text',
  '/image-converter': '/convert-image',
  '/merge-pdf': '/pdf-merge',
  '/split-pdf': '/pdf-split',
  '/pdf-protect': '/protect-pdf',
  '/pdf-unlock': '/unlock-pdf',
  '/pdf-compress': '/compress-pdf',
  '/ocr-pdf': '/pdf-ocr',
  '/remove-pages': '/delete-pdf-pages',
  '/privacy': '/privacy-policy',
  '/terms': '/terms-of-service',
  '/cookies': '/cookie-policy',
  '/cookie': '/cookie-policy',
};

function generateStaticRoutes() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('index.html not found in dist/. Run build first.');
    return;
  }

  const { seoData, defaultTitle, defaultDesc, toolMetadata } = extractSeoData();
  const template = fs.readFileSync(INDEX_PATH, 'utf-8');

  // Escape helpers
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

  Object.entries(seoData).forEach(([route, data]) => {
    if (route === '/') return; // index.html already has default SEO

    const preserveStaticLegal = new Set(['/privacy-policy', '/terms-of-service', '/cookie-policy']);
    if (preserveStaticLegal.has(route)) {
      console.log(`Kept static legal HTML for: ${route}`);
      return;
    }

    let html = template;
    const title = escapeHtml(data.title);
    const description = escapeHtml(data.description);

    // Replace Title
    html = html.replace(
      /<title>.*?<\/title>/, 
      `<title>${title}</title>`
    );

    // Replace Description
    html = html.replace(
      /<meta\s+name=["']description["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta name="description" content="${description}" />`
    );

    // Replace OG Title
    html = html.replace(
      /<meta\s+property=["']og:title["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta property="og:title" content="${title}" />`
    );

    // Replace OG Description
    html = html.replace(
      /<meta\s+property=["']og:description["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta property="og:description" content="${description}" />`
    );

    // Determine canonical route: map aliases to primary canonical target
    const canonicalRoute = URL_REDIRECTS[route] || route;
    const canonicalUrl = `${BASE_URL}${canonicalRoute}`;

    // Replace OG URL (default is homepage) or inject it
    if (html.includes('property="og:url"')) {
      html = html.replace(
        /<meta\s+property=["']og:url["']\s+content=["'][^>]+["']\s*\/?>/,
        `<meta property="og:url" content="${canonicalUrl}" />`
      );
    } else {
      html = html.replace('</head>', `  <meta property="og:url" content="${canonicalUrl}" />\n  </head>`);
    }

    // Replace Twitter Title
    html = html.replace(
      /<meta\s+name=["']twitter:title["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta name="twitter:title" content="${title}" />`
    );

    // Replace Twitter Description
    html = html.replace(
      /<meta\s+name=["']twitter:description["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta name="twitter:description" content="${description}" />`
    );

    // Replace Canonical URL or inject it (ensures aliases point to authoritative target)
    if (html.includes('<link rel="canonical"')) {
      html = html.replace(
        /<link\s+rel=["']canonical["']\s+href=["'][^>]+["']\s*\/?>/g,
        `<link rel="canonical" href="${canonicalUrl}" />`
      );
    } else {
      const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
      html = html.replace('</head>', `  ${canonicalTag}\n  </head>`);
    }

    const tool = toolMetadata[canonicalRoute] || toolMetadata[route];
    if (tool) {
      const toolSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${BASE_URL}${canonicalRoute}#webapp`,
        'name': `PDFTools4U - ${tool.name}`,
        'url': `${BASE_URL}${canonicalRoute}`,
        'operatingSystem': 'All',
        'applicationCategory': 'UtilitiesApplication',
        'browserRequirements': 'Requires JavaScript. Requires HTML5.',
        'description': data.description || tool.description,
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
        },
      };
      const schemaTag = `  <script type="application/ld+json" data-tool-schema="${route.slice(1)}">${JSON.stringify(toolSchema).replace(/</g, '\\u003c')}</script>`;
      html = html.replace('</head>', `${schemaTag}\n  </head>`);
    }

    // Handle saving the file
    // Instead of creating a folder with index.html, we create a direct .html file
    // e.g., /resize-image -> resize-image.html
    const isNested = route.slice(1).includes('/');
    const filePath = path.join(DIST_DIR, route.slice(1) + '.html');
    
    // Ensure parent directory exists for nested routes (e.g., /blog/post-name)
    if (isNested) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    fs.writeFileSync(filePath, html);
    console.log(`Generated SEO for: ${route} -> ${route.slice(1)}.html`);
  });

  // Inject Canonical into the root index.html too
  let rootHtml = template;
  if (rootHtml.includes('<link rel="canonical"')) {
    rootHtml = rootHtml.replace(
      /<link\s+rel=["']canonical["']\s+href=["'][^>]+["']\s*\/?>/g,
      `<link rel="canonical" href="${BASE_URL}" />`
    );
  } else {
    rootHtml = rootHtml.replace('</head>', `  <link rel="canonical" href="${BASE_URL}" />\n  </head>`);
  }
  
  fs.writeFileSync(INDEX_PATH, rootHtml);
  
  console.log('\n✅ Successfully injected SEO metadata into ' + Object.keys(seoData).length + ' static routes.');
}

generateStaticRoutes();

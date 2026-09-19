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
    else if (['about', 'contact', 'privacy', 'terms'].includes(slug)) route = '/' + slug;
    
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

function generateStaticRoutes() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('index.html not found in dist/. Run build first.');
    return;
  }

  const { seoData, defaultTitle, defaultDesc, toolMetadata } = extractSeoData();
  const template = fs.readFileSync(INDEX_PATH, 'utf-8');

  // Escape helpers
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  Object.entries(seoData).forEach(([route, data]) => {
    if (route === '/') return; // index.html already has default SEO

    let html = template;

    // Replace Title
    html = html.replace(
      /<title>.*?<\/title>/, 
      `<title>${data.title}</title>`
    );

    // Replace Description
    html = html.replace(
      /<meta\s+name=["']description["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta name="description" content="${data.description}" />`
    );

    // Replace OG Title
    html = html.replace(
      /<meta\s+property=["']og:title["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta property="og:title" content="${data.title}" />`
    );

    // Replace OG Description
    html = html.replace(
      /<meta\s+property=["']og:description["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta property="og:description" content="${data.description}" />`
    );

    // Replace OG URL (default is homepage)
    html = html.replace(
      /<meta\s+property=["']og:url["']\s+content=["'][^>]+["']\s*\/?>/,
      `<meta property="og:url" content="${BASE_URL}${route}" />`
    );

    // Replace Canonical URL or inject it
    if (html.includes('<link rel="canonical"')) {
      html = html.replace(
        /<link\s+rel=["']canonical["']\s+href=["'][^>]+["']\s*\/?>/g,
        `<link rel="canonical" href="${BASE_URL}${route}" />`
      );
    } else {
      const canonicalTag = `<link rel="canonical" href="${BASE_URL}${route}" />`;
      html = html.replace('</head>', `  ${canonicalTag}\n  </head>`);
    }

    // Inject FAQ Schema for /security route
    if (route === '/security') {
      const securityFaqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does pdftools4u.in process documents without uploading them to a remote server?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Our platform utilizes a client-side architecture powered by WebAssembly (Wasm) and modern JavaScript engines. When you select a document, it is loaded directly into your browser's local sandbox memory using the HTML5 File API. All conversions, compression, and edits execute directly on your device's CPU—zero document data or metadata is ever transmitted to an external server."
            }
          },
          {
            "@type": "Question",
            "name": "Is pdftools4u.in compliant with corporate data regulations like GDPR and HIPAA?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Because PDFtools4u operates entirely on your local machine with zero server uploads, we never receive, store, or transmit your documents or Personally Identifiable Information (PII). By eliminating third-party data processing and cloud storage, using our tools avoids data processor liabilities and supports GDPR, HIPAA, and CCPA privacy standards by design (Privacy by Architecture)."
            }
          },
          {
            "@type": "Question",
            "name": "Does using a browser-based PDF converter reduce file conversion speeds or output quality?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Local WebAssembly processing eliminates slow network upload and download bottlenecks. Conversions begin instantly without waiting in remote server queues, delivering full-fidelity output while utilizing your device's native computing performance."
            }
          },
          {
            "@type": "Question",
            "name": "Are my password-protected and encrypted PDFs safe from interception here?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Decryption and encryption occur completely inside your browser's private memory sandbox. Your master passwords and document contents are never transmitted across the network, eliminating the transit security liabilities inherent in traditional server-side conversion services."
            }
          }
        ]
      };
      const schemaTag = `  <script type="application/ld+json">\n${JSON.stringify(securityFaqSchema, null, 2)}\n  </script>`;
      html = html.replace('</head>', `${schemaTag}\n  </head>`);
    }

    const tool = toolMetadata[route];
    if (tool) {
      const toolSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': `PDFTools4U - ${tool.name}`,
        'url': `${BASE_URL}${route}`,
        'operatingSystem': 'All',
        'applicationCategory': 'UtilitiesApplication',
        'description': data.description || tool.description,
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
        },
      };
      const schemaTag = `  <script type="application/ld+json">${JSON.stringify(toolSchema).replace(/</g, '\\u003c')}</script>`;
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
      `<link rel="canonical" href="${BASE_URL}/" />`
    );
  } else {
    rootHtml = rootHtml.replace('</head>', `  <link rel="canonical" href="${BASE_URL}/" />\n  </head>`);
  }
  
  fs.writeFileSync(INDEX_PATH, rootHtml);
  
  console.log('\n✅ Successfully injected SEO metadata into ' + Object.keys(seoData).length + ' static routes.');
}

generateStaticRoutes();

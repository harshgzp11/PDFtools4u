const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '../dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const BASE_URL = 'https://www.pdftools4u.in';

// Helper to parse JS files for specific blocks (primitive but effective for static generation)
function extractSeoData() {
  const seoData = {};
  
  // 1. Parse seoHead.js
  const seoHeadContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/seoHead.js'), 'utf-8');
  
  // Extract HOMEPAGE_SEO
  const homeTitleMatch = seoHeadContent.match(/HOMEPAGE_SEO\s*=\s*{[^}]*title:\s*['"]([^'"]+)['"]/);
  const homeDescMatch = seoHeadContent.match(/HOMEPAGE_SEO\s*=\s*{[^}]*description:\s*['"]([^'"]+)['"]/);
  
  const defaultTitle = homeTitleMatch ? homeTitleMatch[1] : 'PDFtools4u';
  const defaultDesc = homeDescMatch ? homeDescMatch[1] : '';

  seoData['/'] = { title: defaultTitle, description: defaultDesc };

  // Extract SEO_HEAD items
  const toolMatches = [...seoHeadContent.matchAll(/'([^']+)'\s*:\s*{\s*title:\s*['"]([^'"]+)['"]\s*,\s*description:\s*['"]([^'"]+)['"]/g)];
  toolMatches.forEach(m => {
    const slug = m[1];
    let route = '/' + slug;
    if (slug === 'blog') route = '/blog';
    else if (['about', 'contact', 'privacy', 'terms'].includes(slug)) route = '/' + slug;
    
    seoData[route] = { title: m[2], description: m[3] };
  });

  // 2. Parse blogData.js
  const blogDataContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/blogData.js'), 'utf-8');
  const blogMatches = [...blogDataContent.matchAll(/id:\s*['"]([^'"]+)['"][^}]*?title:\s*['"]([^'"]+)['"][^}]*?excerpt:\s*['"]([^'"]+)['"]/g)];
  
  blogMatches.forEach(m => {
    const route = '/blog/' + m[1];
    seoData[route] = { title: m[2] + ' — PDFtools4u Blog', description: m[3] };
  });

  return { seoData, defaultTitle, defaultDesc };
}

function generateStaticRoutes() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('index.html not found in dist/. Run build first.');
    return;
  }

  const { seoData, defaultTitle, defaultDesc } = extractSeoData();
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

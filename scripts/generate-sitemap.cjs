const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const BASE_URL = 'https://www.pdftools4u.in';
const SRC_DIR = path.resolve(__dirname, '../src');

// Helper to get file modification date
function getFileLastMod(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.mtime.toISOString().split('T')[0];
    }
  } catch (e) {
    // Ignore errors
  }
  return new Date().toISOString().split('T')[0];
}

// Parses App.jsx to create a mapping of slug -> component file path
function getSlugToFileMap() {
  const map = {};
  try {
    const appContent = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf-8');
    
    // 1. Map Component Name -> File Path
    // Example: const PdfMerger = lazyWithRetry(() => import('./tools/PdfMerger'));
    const importRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*lazyWithRetry\(\(\)\s*=>\s*import\(['"](\.\/[^'"]+)['"]\)\)/g;
    const componentToFile = {};
    
    for (const match of appContent.matchAll(importRegex)) {
      const componentName = match[1];
      let importPath = match[2]; // e.g., ./tools/PdfMerger
      
      // Resolve extensions (.jsx, .js, or /index.jsx)
      let fullPath = path.join(SRC_DIR, importPath.replace('./', ''));
      if (fs.existsSync(fullPath + '.jsx')) {
        fullPath += '.jsx';
      } else if (fs.existsSync(fullPath + '.js')) {
        fullPath += '.js';
      } else if (fs.existsSync(path.join(fullPath, 'index.jsx'))) {
        fullPath = path.join(fullPath, 'index.jsx');
      } else if (fs.existsSync(path.join(fullPath, 'index.js'))) {
        fullPath = path.join(fullPath, 'index.js');
      }
      
      componentToFile[componentName] = fullPath;
    }
    
    // 2. Map Slug -> Component Name
    // Example: 'pdf-merge': PdfMerger,
    const mappingRegex = /'([^']+)'\s*:\s*([A-Za-z0-9_]+)/g;
    let inToolComponents = false;
    
    const lines = appContent.split('\n');
    for (const line of lines) {
      if (line.includes('const TOOL_COMPONENTS = {')) inToolComponents = true;
      if (inToolComponents && line.includes('};')) inToolComponents = false;
      
      if (inToolComponents) {
        for (const match of line.matchAll(mappingRegex)) {
          const slug = match[1];
          const compName = match[2];
          if (componentToFile[compName]) {
            map[slug] = componentToFile[compName];
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing App.jsx for slug mapping:', error);
  }
  return map;
}

function extractUrls() {
  const urls = [];
  const slugFileMap = getSlugToFileMap();
  
  // Fallback files
  const appJsxPath = path.join(SRC_DIR, 'App.jsx');
  const blogDataPath = path.join(SRC_DIR, 'lib/blogData.js');

  // Static root URLs
  urls.push({ route: '/', filePath: path.join(SRC_DIR, 'components/Dashboard.jsx') });
  urls.push({ route: '/blog', filePath: path.join(SRC_DIR, 'pages/BlogList.jsx') });
  urls.push({ route: '/about', filePath: path.join(SRC_DIR, 'pages/AboutUs.jsx') });
  urls.push({ route: '/contact', filePath: path.join(SRC_DIR, 'pages/ContactUs.jsx') });
  urls.push({ route: '/privacy-policy', filePath: path.join(SRC_DIR, 'pages/PrivacyPolicy.jsx') });
  urls.push({ route: '/terms-of-service', filePath: path.join(SRC_DIR, 'pages/TermsOfService.jsx') });
  urls.push({ route: '/all-tools', filePath: path.join(SRC_DIR, 'pages/AllTools.jsx') });

  // Parse toolConfig.js
  const toolContent = fs.readFileSync(path.join(SRC_DIR, 'lib/toolConfig.js'), 'utf-8');
  const toolMatches = [...toolContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  toolMatches.forEach(m => {
    const slug = m[1];
    urls.push({ 
      route: '/' + slug, 
      filePath: slugFileMap[slug] || appJsxPath 
    });
  });

  // Parse blogData.js
  const blogDataContent = fs.readFileSync(blogDataPath, 'utf-8');
  const blogMatches = [...blogDataContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  blogMatches.forEach(m => {
    urls.push({ 
      route: '/blog/' + m[1], 
      filePath: blogDataPath // Any edit to a blog implies blogData.js was touched
    });
  });

  // Remove duplicates based on route
  const uniqueUrls = [];
  const seen = new Set();
  for (const item of urls) {
    if (!seen.has(item.route)) {
      seen.add(item.route);
      uniqueUrls.push(item);
    }
  }

  return uniqueUrls;
}

function generateSitemap() {
  const urlsData = extractUrls();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
  xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

  urlsData.forEach(({ route, filePath }) => {
    let priority = '0.8';
    let changefreq = 'weekly';
    
    if (route === '/') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (route.startsWith('/blog/')) {
      priority = '0.7';
      changefreq = 'monthly';
    }

    const lastmod = getFileLastMod(filePath);

    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}${route === '/' ? '' : route}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>\n`;

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(`✅ Successfully generated sitemap.xml with ${urlsData.length} URLs, using accurate file modification dates.`);
}

generateSitemap();

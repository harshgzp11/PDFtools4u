const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');

// 1. Get all valid routes
const validRoutes = new Set(['/', '/blog', '/about', '/contact', '/privacy', '/terms', '/all-tools']);

try {
  const toolConfigContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/toolConfig.js'), 'utf-8');
  const toolMatches = [...toolConfigContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  toolMatches.forEach(m => validRoutes.add('/' + m[1]));

  const blogDataContent = fs.readFileSync(path.resolve(__dirname, '../src/lib/blogData.js'), 'utf-8');
  const blogMatches = [...blogDataContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  blogMatches.forEach(m => validRoutes.add('/blog/' + m[1]));
} catch (err) {
  console.error('Error generating routes:', err);
}

// 2. Scan all JSX/JS files for links
function getFiles(dir) {
  const files = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getFiles(fullPath));
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  });
  return files;
}

const allFiles = getFiles(SRC_DIR);
let brokenLinks = 0;

console.log(`Scanning ${allFiles.length} files for internal links...\\n`);

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  // Find <Link to="..."> and href="..." (if they start with /)
  const linkMatches = [...content.matchAll(/to=['"](\/[^'"]*)['"]/g), ...content.matchAll(/href=['"](\/[^'"]*)['"]/g)];
  
  linkMatches.forEach(m => {
    let link = m[1];
    
    // Ignore hashes
    if (link.includes('#')) {
      link = link.split('#')[0];
    }
    
    // Ignore empty after hash or exactly '/'
    if (!link || link === '/') return;

    if (!validRoutes.has(link)) {
      // Check if it's an asset or static file
      if (link.match(/\.(png|jpg|webp|svg|pdf|json|xml|txt)$/)) return;
      
      console.error(`❌ Broken link found: "${link}"`);
      console.error(`   File: ${file}`);
      brokenLinks++;
    }
  });
});

if (brokenLinks === 0) {
  console.log('✅ No broken internal links found!');
} else {
  console.log(`\\nFound ${brokenLinks} broken links.`);
}

const fs = require('fs');

const blogContent = fs.readFileSync('src/lib/blogData.js', 'utf8');
const toolContent = fs.readFileSync('src/lib/toolConfig.js', 'utf8');

// Primitive parse for toolConfig:
const tools = [...toolContent.matchAll(/id:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"]/g)].map(m => ({ id: m[1], name: m[2] }));

// Primitive parse for blogData:
const blogs = [...blogContent.matchAll(/title:\s*['"]([^'"]+)['"][^]*?targetToolUrl:\s*['"]([^'"]+)['"]/g)].map(m => ({ title: m[1], toolUrl: m[2] }));

let output = 'PDFTools4U - Tool to Blog Mapping\n=================================\n\n';

tools.forEach(t => {
  output += '- Tool: ' + t.name + ' (/' + t.id + ')\n';
  const matchingBlogs = blogs.filter(b => b.toolUrl === t.id);
  if (matchingBlogs.length > 0) {
    matchingBlogs.forEach(b => {
      output += '    -> Blog: ' + b.title + '\n';
    });
  } else {
    output += '    -> Blog: [No blogs currently linked to this tool]\n';
  }
  output += '\n';
});

output += '=================================\n';
output += 'SUMMARY: TOOLS WITH ZERO BLOGS\n';
output += '=================================\n\n';

const unbloggedTools = tools.filter(t => !blogs.some(b => b.toolUrl === t.id));

if (unbloggedTools.length > 0) {
  output += `There are ${unbloggedTools.length} tools with no dedicated blog posts:\n\n`;
  unbloggedTools.forEach(t => {
    output += `- ${t.name} (/${t.id})\n`;
  });
} else {
  output += 'All tools have at least one blog post!\n';
}

fs.writeFileSync('tool-blog-mapping.txt', output);
console.log('Successfully generated tool-blog-mapping.txt');

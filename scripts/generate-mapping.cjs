const fs = require('fs');
const path = require('path');

async function run() {
  const toolConfigModule = await import('../src/lib/toolConfig.js');
  const blogDataModule = await import('../src/lib/blogData.js');

  const DOMAINS = toolConfigModule.DOMAINS || [];
  const BLOG_POSTS = blogDataModule.BLOG_POSTS || [];

  // Extract all unique tools in order of appearance
  const toolsMap = new Map();
  DOMAINS.forEach(domain => {
    domain.categories.forEach(category => {
      category.tools.forEach(tool => {
        if (!toolsMap.has(tool.id)) {
          toolsMap.set(tool.id, {
            id: tool.id,
            name: tool.name,
            domain: domain.title,
            category: category.name
          });
        }
      });
    });
  });

  // Filter only published blogs (published !== false)
  const publishedBlogs = BLOG_POSTS.filter(b => b.published !== false);

  // Group blogs by targetToolUrl
  const blogsByTool = new Map();
  publishedBlogs.forEach(b => {
    const rawTarget = b.targetToolUrl || '';
    const cleanTarget = rawTarget.replace(/^\//, '').trim();
    if (!blogsByTool.has(cleanTarget)) {
      blogsByTool.set(cleanTarget, []);
    }
    blogsByTool.get(cleanTarget).push(b.title);
  });

  let output = 'PDFTools4U - Tools with Published Blogs\n';
  output += '=======================================\n\n';

  output += 'TOOLS WHICH HAVE PUBLISHED BLOGS:\n';
  output += '---------------------------------\n\n';

  let toolsWithBlogCount = 0;
  toolsMap.forEach((tool, id) => {
    const blogs = blogsByTool.get(id);
    if (blogs && blogs.length > 0) {
      toolsWithBlogCount++;
      output += `- Tool: ${tool.name} (/${id})\n`;
      blogs.forEach(title => {
        output += `    -> Blog: ${title}\n`;
      });
      output += '\n';
    }
  });

  output += '=======================================\n';
  output += 'ALL TOOLS MAPPING\n';
  output += '=======================================\n\n';

  toolsMap.forEach((tool, id) => {
    output += `- Tool: ${tool.name} (/${id})\n`;
    const blogs = blogsByTool.get(id);
    if (blogs && blogs.length > 0) {
      blogs.forEach(title => {
        output += `    -> Blog: ${title}\n`;
      });
    } else {
      output += `    -> Blog: [No blogs currently linked to this tool]\n`;
    }
    output += '\n';
  });

  output += '=======================================\n';
  output += 'SUMMARY: TOOLS WITH ZERO PUBLISHED BLOGS\n';
  output += '=======================================\n\n';

  const unbloggedTools = [];
  toolsMap.forEach((tool, id) => {
    const blogs = blogsByTool.get(id);
    if (!blogs || blogs.length === 0) {
      unbloggedTools.push(tool);
    }
  });

  if (unbloggedTools.length > 0) {
    output += `There are ${unbloggedTools.length} tools with no dedicated published blog posts:\n\n`;
    unbloggedTools.forEach(t => {
      output += `- ${t.name} (/${t.id})\n`;
    });
  } else {
    output += 'All tools have at least one published blog post!\n';
  }

  output += '\n=======================================\n';
  output += 'STATISTICS\n';
  output += '=======================================\n';
  output += `- Total Unique Tools: ${toolsMap.size}\n`;
  output += `- Tools with Published Blogs: ${toolsWithBlogCount}\n`;
  output += `- Tools without Published Blogs: ${unbloggedTools.length}\n`;
  output += `- Total Published Blogs: ${publishedBlogs.length}\n`;

  const outputPath = path.resolve(__dirname, '../tool-blog-mapping.txt');
  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`Successfully generated tool-blog-mapping.txt with ${toolsWithBlogCount} tools having published blogs.`);
}

run().catch(err => {
  console.error('Error generating mapping:', err);
  process.exit(1);
});

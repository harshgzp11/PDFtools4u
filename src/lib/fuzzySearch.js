import { DOMAINS } from './toolConfig';

// Dictionary of synonyms and keywords for enhanced search matching
const TOOL_KEYWORDS = {
  'excel-to-pdf': ['excel', 'xlsx', 'xls', 'spreadsheet', 'sheets', 'tables', 'csv', 'workbook'],
  'pdf-to-excel': ['excel', 'xlsx', 'xls', 'spreadsheet', 'sheets', 'tables', 'csv', 'workbook'],
  'word-to-pdf': ['word', 'docx', 'doc', 'document', 'text', 'msword'],
  'pdf-to-word': ['word', 'docx', 'doc', 'document', 'text', 'msword'],
  'ppt-to-pdf': ['powerpoint', 'ppt', 'pptx', 'presentation', 'slides'],
  'pdf-to-ppt': ['powerpoint', 'ppt', 'pptx', 'presentation', 'slides'],
  'jpg-to-pdf': ['jpg', 'jpeg', 'png', 'webp', 'image', 'picture', 'photo'],
  'pdf-to-jpg': ['jpg', 'jpeg', 'png', 'webp', 'image', 'picture', 'photo'],
  'png-to-pdf': ['png', 'jpg', 'jpeg', 'webp', 'image', 'picture', 'photo'],
  'pdf-to-png': ['png', 'jpg', 'jpeg', 'webp', 'image', 'picture', 'photo'],
  'compress-pdf': ['compress', 'reduce', 'shrink', 'smaller', 'size', 'minimize', 'optimize', 'compact'],
  'pdf-merge': ['merge', 'combine', 'join', 'append', 'bind', 'together', 'concatenate'],
  'pdf-split': ['split', 'separate', 'extract', 'cut', 'divide', 'break', 'pages'],
  'pdf-ocr': ['ocr', 'scan', 'scanned', 'text extractor', 'read text', 'searchable', 'image to text'],
  'edit-pdf': ['edit', 'editor', 'annotate', 'signature', 'sign', 'draw', 'text', 'form', 'modify'],
  'protect-pdf': ['protect', 'password', 'encrypt', 'lock', 'secure', 'restrict', 'safety'],
  'unlock-pdf': ['unlock', 'password', 'decrypt', 'remove password', 'open', 'free lock'],
  'sign-pdf': ['sign', 'signature', 'esign', 'electronic signature', 'autograph', 'draw sign'],
  'delete-pdf-pages': ['delete', 'remove', 'trash', 'erase', 'pages'],
  'extract-pdf-pages': ['extract', 'export', 'select', 'get', 'pages'],
  'organize-pdf': ['organize', 'reorder', 'rearrange', 'sort', 'pages', 'swap'],
  'rotate-pdf': ['rotate', 'turn', 'flip', 'orientation', 'landscape', 'portrait'],
  'crop-pdf': ['crop', 'trim', 'margins', 'cutout', 'whitespace'],
  'flatten-pdf': ['flatten', 'un-editable', 'lock form', 'read-only', 'merge layers'],
  'pdf-watermark': ['watermark', 'stamp', 'logo overlay', 'copyright', 'text mark'],
  'number-pages': ['number', 'page numbers', 'footer numbers', 'header', 'numbering'],
  'redact-pdf': ['redact', 'blackout', 'hide text', 'censor', 'remove info', 'privacy'],
  'pdf-reader': ['reader', 'viewer', 'preview', 'read pdf', 'open pdf'],
  'pdf-annotator': ['annotate', 'highlight', 'comment', 'draw', 'mark'],
  'pdf-form-filler': ['form', 'fill form', 'interactive form', 'fields', 'questionnaire'],
  'txt-to-pdf': ['txt', 'text', 'plain text', 'notepad', 'convert text'],
  'docx-to-text': ['docx', 'word', 'extract text', 'raw text'],
  'docx-to-html': ['docx', 'word', 'html', 'web page', 'code'],
  'text-to-docx': ['text', 'generate docx', 'create word'],
  'compress-image': ['compress image', 'shrink photo', 'reduce png', 'reduce jpg', 'optimize image'],
  'resize-image': ['resize image', 'scale image', 'dimensions', 'width', 'height', 'pixels'],
  'convert-image': ['convert image', 'png to jpg', 'jpg to png', 'webp', 'format converter'],
  'bg-remover': ['background', 'bg remover', 'transparent', 'cutout', 'erase background'],
  'image-crop': ['crop image', 'rotate photo', 'trim picture'],
  'photo-editor': ['photo editor', 'filter', 'brightness', 'contrast', 'edit photo'],
  'text-reformatter': ['reformatter', 'uppercase', 'lowercase', 'capitalize', 'case converter'],
  'data-converter': ['csv', 'json', 'base64', 'csv to json', 'json to csv', 'converter'],
  'dev-tools': ['developer', 'minifier', 'beautifier', 'json formatter', 'word count'],
  'html-to-image': ['html', 'css', 'render html', 'code to image', 'screenshot'],
};

// Calculate Levenshtein Distance for typo matching
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Flatten all tools with domain & category context
export function getAllRegisteredTools() {
  const tools = [];
  DOMAINS.forEach(domain => {
    domain.categories.forEach(category => {
      category.tools.forEach(tool => {
        const extraKeywords = TOOL_KEYWORDS[tool.id] || [];
        tools.push({
          ...tool,
          domainTitle: domain.title,
          categoryName: category.name,
          searchKeywords: [
            tool.name.toLowerCase(),
            tool.id.toLowerCase(),
            tool.description.toLowerCase(),
            category.name.toLowerCase(),
            domain.title.toLowerCase(),
            ...extraKeywords
          ]
        });
      });
    });
  });
  return tools;
}

// Calculate fuzzy score (0 to 100) between query and a tool
export function calculateFuzzyScore(query, tool) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const toolName = tool.name.toLowerCase();
  const toolId = tool.id.toLowerCase();
  const description = tool.description.toLowerCase();
  const keywords = TOOL_KEYWORDS[tool.id] || [];

  // 1. Exact match on ID or Name -> Max Score
  if (toolName === q || toolId === q) return 1000;

  // 2. Substring match at start of Name -> High Score
  if (toolName.startsWith(q)) return 500 + (q.length / toolName.length) * 50;

  // 3. Substring match anywhere in Name
  if (toolName.includes(q)) return 300 + (q.length / toolName.length) * 30;

  // 4. Substring match in ID or Keywords
  for (const kw of keywords) {
    if (kw === q) return 400;
    if (kw.startsWith(q)) return 250;
    if (kw.includes(q)) return 200;
  }

  // 5. Substring match in Description
  if (description.includes(q)) return 150;

  // 6. Typo Tolerance / Token Fuzzy Matching (e.g. "excl" -> "excel", "convet" -> "convert")
  const queryTokens = q.split(/\s+/);
  let totalTokenScore = 0;

  for (const qTok of queryTokens) {
    if (qTok.length < 2) continue;
    let maxTokScore = 0;

    // Compare with all target tokens (name, id, keywords)
    const targetTokens = [...toolName.split(/\s+/), ...toolId.split('-'), ...keywords];

    for (const tTok of targetTokens) {
      if (tTok.length < 2) continue;
      if (tTok.includes(qTok) || qTok.includes(tTok)) {
        maxTokScore = Math.max(maxTokScore, 80);
      } else {
        const dist = levenshteinDistance(qTok, tTok);
        const maxLen = Math.max(qTok.length, tTok.length);
        if (maxLen > 0) {
          const similarity = (maxLen - dist) / maxLen;
          // Allow max 1-2 typos for words >= 3 letters
          if (similarity >= 0.5) {
            maxTokScore = Math.max(maxTokScore, similarity * 70);
          }
        }
      }
    }
    totalTokenScore += maxTokScore;
  }

  const averageTokenScore = queryTokens.length > 0 ? totalTokenScore / queryTokens.length : 0;
  return averageTokenScore;
}

// Search and rank all registered tools
export function searchToolsFuzzy(query) {
  const allTools = getAllRegisteredTools();
  if (!query || !query.trim()) {
    return allTools; // Return all tools default
  }

  const scored = allTools
    .map(tool => ({
      tool,
      score: calculateFuzzyScore(query, tool)
    }))
    .filter(item => item.score > 25)
    .sort((a, b) => b.score - a.score);

  return scored.map(item => item.tool);
}

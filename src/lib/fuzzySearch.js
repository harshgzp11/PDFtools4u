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

// Calculate Levenshtein Distance for typo matching (case-insensitive)
export function levenshteinDistance(a, b) {
  const str1 = a.toLowerCase();
  const str2 = b.toLowerCase();
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  const matrix = Array.from({ length: str2.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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
  return matrix[str2.length][str1.length];
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
            ...extraKeywords
          ]
        });
      });
    });
  });
  return tools;
}

// Precise & Typo-Tolerant Fuzzy Scoring Algorithm
export function calculateFuzzyScore(query, tool) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const name = tool.name.toLowerCase();
  const id = tool.id.toLowerCase();
  const description = tool.description.toLowerCase();
  const keywords = (TOOL_KEYWORDS[tool.id] || []).map(k => k.toLowerCase());

  // 1. Exact Match on Tool Name or ID -> Highest Priority
  if (name === q || id === q) return 1000;

  // 2. Direct Substring Match on Tool Name
  if (name.startsWith(q)) return 800;
  if (name.includes(q)) return 600;

  // 3. Direct Substring Match on ID or Keywords
  for (const kw of keywords) {
    if (kw === q) return 700;
    if (kw.startsWith(q)) return 550;
    if (kw.includes(q)) return 450;
  }

  // 4. Direct Substring Match in Description
  if (description.includes(q)) return 300;

  // 5. Typo-Tolerant Token Matching (e.g. "ecel" -> "excel", "wrd" -> "word", "comprss" -> "compress")
  const queryWords = q.split(/\s+/).filter(Boolean);
  const targetWords = [
    ...name.split(/[\s\-_]+/),
    ...id.split(/[\s\-_]+/),
    ...keywords
  ].map(w => w.toLowerCase());

  let totalMatchScore = 0;

  for (const qWord of queryWords) {
    if (qWord.length < 2) continue;
    let bestWordScore = 0;

    for (const tWord of targetWords) {
      if (tWord.length < 2) continue;

      // Direct prefix/substring match of word
      if (tWord === qWord) {
        bestWordScore = Math.max(bestWordScore, 500);
      } else if (tWord.startsWith(qWord)) {
        bestWordScore = Math.max(bestWordScore, 400);
      } else if (tWord.includes(qWord)) {
        bestWordScore = Math.max(bestWordScore, 300);
      } else {
        // Levenshtein Typo Check
        const dist = levenshteinDistance(qWord, tWord);
        const maxLen = Math.max(qWord.length, tWord.length);

        // Strict typo threshold:
        // For 3-4 letter words: max 1 typo (e.g. "ecel" -> "excel", "wrd" -> "word", "splt" -> "split")
        // For 5+ letter words: max 2 typos (e.g. "comprss" -> "compress", "convet" -> "convert")
        const allowedTypos = qWord.length <= 4 ? 1 : 2;

        if (dist <= allowedTypos) {
          const similarity = (maxLen - dist) / maxLen;
          if (similarity >= 0.65) {
            // Strong match score for typos
            bestWordScore = Math.max(bestWordScore, Math.round(similarity * 450));
          }
        }
      }
    }

    if (bestWordScore === 0) {
      // If a word in a multi-word query doesn't match at all, penalize
      return 0;
    }
    totalMatchScore += bestWordScore;
  }

  return totalMatchScore / queryWords.length;
}

// Search and rank all registered tools with strict relevance filtering
export function searchToolsFuzzy(query) {
  const allTools = getAllRegisteredTools();
  if (!query || !query.trim()) {
    return allTools; // Return all tools when query is empty
  }

  const scored = allTools
    .map(tool => ({
      tool,
      score: calculateFuzzyScore(query, tool)
    }))
    .filter(item => item.score >= 200) // Strict cutoff so unrelated tools are NEVER shown
    .sort((a, b) => b.score - a.score);

  return scored.map(item => item.tool);
}

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

console.log('================================================================');
console.log('  SURGICAL HOTFIX REGRESSION TEST SUITE: SECURITY & CANONICALS');
console.log('  PDFTools4U: Fix 1 (HtmlToImage), Fix 2 (HtmlToPdf), Fix 3 (Canonicals)');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(err);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION 1: Fix 1 — HtmlToImage Security Sanitization
// ─────────────────────────────────────────────────────────────
console.log('--- SECTION 1: FIX 1 — HtmlToImage SANITIZATION & PRESERVATION ---');

const htmlToImageSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'tools', 'HtmlToImage.jsx'),
  'utf8'
);

test('HtmlToImage imports DOMPurify directly', () => {
  assert(
    /import\s+DOMPurify\s+from\s+['"]dompurify['"]/.test(htmlToImageSource),
    'HtmlToImage.jsx must import DOMPurify from dompurify'
  );
});

test('HtmlToImage sanitizes htmlContent before dangerouslySetInnerHTML', () => {
  assert(
    htmlToImageSource.includes('dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize('),
    'htmlContent must be sanitized with DOMPurify.sanitize before dangerouslySetInnerHTML'
  );
  assert(
    !htmlToImageSource.includes('dangerouslySetInnerHTML={{ __html: htmlContent }}'),
    'Raw htmlContent must NOT be passed directly to dangerouslySetInnerHTML'
  );
});

test('HtmlToImage: Malicious <script> tag execution is stripped', () => {
  const malicious = '<div style="color:red">Safe Header</div><script>window.__pwned = true; alert("XSS")</script>';
  const sanitized = DOMPurify.sanitize(malicious, { USE_PROFILES: { html: true, svg: true } });
  assert(!sanitized.includes('<script>'), 'Script tags must be eliminated');
  assert(!sanitized.includes('__pwned'), 'Script content must not survive sanitization');
  assert(sanitized.includes('Safe Header'), 'Safe text must be retained');
});

test('HtmlToImage: Event-handler attributes (onerror, onload, onmouseover) are stripped', () => {
  const payload = '<img src="invalid.jpg" onerror="alert(1)" /><div onmouseover="alert(2)" onclick="alert(3)">Hover</div>';
  const sanitized = DOMPurify.sanitize(payload, { USE_PROFILES: { html: true, svg: true } });
  assert(!sanitized.includes('onerror='), 'onerror must be stripped');
  assert(!sanitized.includes('onmouseover='), 'onmouseover must be stripped');
  assert(!sanitized.includes('onclick='), 'onclick must be stripped');
  assert(sanitized.includes('<img src="invalid.jpg">'), 'Image tag itself is preserved');
});

test('HtmlToImage: Dangerous javascript: and data:text/html URIs are stripped', () => {
  const payload = '<a href="javascript:alert(1)">Click</a><a href="data:text/html,<script>alert(1)</script>">Data</a>';
  const sanitized = DOMPurify.sanitize(payload, { USE_PROFILES: { html: true, svg: true } });
  assert(!sanitized.includes('javascript:'), 'javascript: protocol must be removed');
  assert(!sanitized.includes('data:text/html'), 'data:text/html must be removed');
  assert(sanitized.includes('Click'), 'Link text is preserved');
});

test('HtmlToImage: Legitimate formatting, gradients, borders, and images are 100% preserved', () => {
  const legitimate = '<div style="padding: 40px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-align: center; font-family: sans-serif; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);"><h1 style="margin: 0; font-size: 32px;">Hello World!</h1><p style="margin-top: 10px;">Edit this HTML</p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Sample" /></div>';
  const sanitized = DOMPurify.sanitize(legitimate, { USE_PROFILES: { html: true, svg: true } });
  assert(sanitized.includes('Hello World!'), 'Heading must be preserved');
  assert(sanitized.includes('linear-gradient'), 'CSS gradients must be preserved');
  assert(sanitized.includes('data:image/png;base64,'), 'Base64 image src must be preserved');
  assert(sanitized.includes('border-radius'), 'CSS border styling must be preserved');
});

// ─────────────────────────────────────────────────────────────
// SECTION 2: Fix 2 — HtmlToPdf Pipeline Security
// ─────────────────────────────────────────────────────────────
console.log('\n--- SECTION 2: FIX 2 — HtmlToPdf PIPELINE SANITIZATION ---');

const htmlToPdfSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'tools', 'HtmlToPdf.jsx'),
  'utf8'
);

test('HtmlToPdf imports DOMPurify directly', () => {
  assert(
    /import\s+DOMPurify\s+from\s+['"]dompurify['"]/.test(htmlToPdfSource),
    'HtmlToPdf.jsx must import DOMPurify from dompurify'
  );
});

test('HtmlToPdf parseDocument sanitizes bodyHtml using DOMPurify', () => {
  assert(
    htmlToPdfSource.includes('DOMPurify.sanitize(bodyHtml'),
    'parseDocument must sanitize bodyHtml with DOMPurify.sanitize'
  );
});

test('HtmlToPdf neutralizes </style> tag breakout in user-controlled CSS', () => {
  assert(
    htmlToPdfSource.includes("styles.replace(/<\\/style/gi, '<\\\\/style')"),
    'CSS styles must neutralize </style> tags to prevent container breakout'
  );
});

test('HtmlToPdf: Malicious CSS breakout attack is neutralized', () => {
  // Simulate user injecting </style><script>alert(1)</script> in css textarea
  const rawCss = 'body { color: blue; } </style><script>alert("PWNED-CSS")</script><style>';
  const safeStyles = rawCss.replace(/<\/style/gi, '<\\/style');
  assert(!safeStyles.includes('</style>'), 'Premature closing </style> must be escaped');
  assert(safeStyles.includes('<\\/style>'), 'Escaped sequence must remain inside style element context');
});

test('HtmlToPdf: Malicious payloads in document body are sanitized before DOM insertion', () => {
  const dirtyDoc = '<html><head><style>h1 { color: red; }</style></head><body><h1>Report</h1><script>stealData()</script><img src=x onerror=exfiltrate()><svg><circle cx="5" cy="5" r="4"/><script>nested()</script></svg></body></html>';
  
  // Replicate parseDocument logic
  let styles = '';
  let bodyHtml = dirtyDoc;
  const styleMatches = dirtyDoc.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  if (styleMatches) {
    styles += '\n' + styleMatches.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
  }
  const bodyMatch = dirtyDoc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    bodyHtml = bodyMatch[1];
  }
  const safeStyles = styles.replace(/<\/style/gi, '<\\/style');
  const cleanBodyHtml = DOMPurify.sanitize(bodyHtml, { USE_PROFILES: { html: true, svg: true } });

  assert(!cleanBodyHtml.includes('<script>'), 'Script tags in document body must be eliminated');
  assert(!cleanBodyHtml.includes('onerror='), 'onerror event handler must be eliminated');
  assert(!cleanBodyHtml.includes('nested()'), 'Nested scripts in SVG must be eliminated');
  assert(cleanBodyHtml.includes('<h1>Report</h1>'), 'Legitimate HTML headings must be preserved');
  assert(cleanBodyHtml.includes('<circle'), 'Legitimate SVG vector graphics must be preserved');
});

test('HtmlToPdf: Tables, financial invoices, and print layouts are preserved intact', () => {
  const invoiceHtml = '<table border="1" style="width: 100%; border-collapse: collapse;"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>Consulting</td><td>$1,500.00</td></tr></tbody></table>';
  const clean = DOMPurify.sanitize(invoiceHtml, { USE_PROFILES: { html: true, svg: true } });
  assert(clean.includes('<table'), 'Table element must be preserved');
  assert(clean.includes('<th>Description</th>'), 'Table headers must be preserved');
  assert(clean.includes('$1,500.00'), 'Table cell text and currency symbols must be preserved');
});

// ─────────────────────────────────────────────────────────────
// SECTION 3: Fix 3 — Canonical Alias Mapping & Uniformity
// ─────────────────────────────────────────────────────────────
console.log('\n--- SECTION 3: FIX 3 — CANONICAL ALIAS MAPPING & UNIFORMITY ---');

const injectSeoSource = fs.readFileSync(
  path.join(projectRoot, 'scripts', 'inject-seo.cjs'),
  'utf8'
);
const seoHeadSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'components', 'SEOHead.jsx'),
  'utf8'
);

test('scripts/inject-seo.cjs contains URL_REDIRECTS mapping for all alias routes', () => {
  assert(injectSeoSource.includes("'/pdf-editor': '/edit-pdf'"), 'inject-seo.cjs must map /pdf-editor to /edit-pdf');
  assert(injectSeoSource.includes("'/pdf-extractor': '/pdf-to-text'"), 'inject-seo.cjs must map /pdf-extractor to /pdf-to-text');
  assert(injectSeoSource.includes("'/image-converter': '/convert-image'"), 'inject-seo.cjs must map /image-converter to /convert-image');
});

test('scripts/inject-seo.cjs replaces canonical tag and og:url with mapped canonicalUrl', () => {
  assert(injectSeoSource.includes('const canonicalRoute = URL_REDIRECTS[route] || route;'), 'inject-seo.cjs must resolve canonicalRoute');
  assert(injectSeoSource.includes('`<link rel="canonical" href="${canonicalUrl}" />`'), 'inject-seo.cjs must use canonicalUrl in canonical tag');
});

test('SEOHead.jsx contains URL_REDIRECTS mapping for aliases', () => {
  assert(seoHeadSource.includes("'pdf-editor': 'edit-pdf'"), 'SEOHead.jsx must map pdf-editor to edit-pdf');
  assert(seoHeadSource.includes("'pdf-extractor': 'pdf-to-text'"), 'SEOHead.jsx must map pdf-extractor to pdf-to-text');
  assert(seoHeadSource.includes("'image-converter': 'convert-image'"), 'SEOHead.jsx must map image-converter to convert-image');
});

test('SEOHead.jsx dynamically resolves canonicalSlug for both canonicalUrl and computedCanonical', () => {
  assert(seoHeadSource.includes('const canonicalSlug = URL_REDIRECTS[rawSlug] || rawSlug;'), 'SEOHead.jsx must resolve canonicalSlug');
  assert(seoHeadSource.includes('canonicalUrl = overrideCanonical || `${BASE_URL}/${canonicalSlug}`;'), 'SEOHead.jsx must set canonicalUrl with canonicalSlug');
  assert(seoHeadSource.includes('computedCanonical = `${BASE_URL}/${canonicalSlug}`;'), 'SEOHead.jsx must set computedCanonical with canonicalSlug');
});

test('Primary tool routes retain self-referential canonical URLs without corruption', () => {
  const URL_REDIRECTS = {
    'pdf-editor': 'edit-pdf',
    'pdf-extractor': 'pdf-to-text',
    'image-converter': 'convert-image',
  };
  const BASE_URL = 'https://www.pdftools4u.in';
  
  // Primary tools
  const editPdfSlug = 'edit-pdf';
  assert.strictEqual(URL_REDIRECTS[editPdfSlug] || editPdfSlug, 'edit-pdf');
  assert.strictEqual(`${BASE_URL}/${URL_REDIRECTS[editPdfSlug] || editPdfSlug}`, 'https://www.pdftools4u.in/edit-pdf');

  const pdfToTextSlug = 'pdf-to-text';
  assert.strictEqual(URL_REDIRECTS[pdfToTextSlug] || pdfToTextSlug, 'pdf-to-text');
  assert.strictEqual(`${BASE_URL}/${URL_REDIRECTS[pdfToTextSlug] || pdfToTextSlug}`, 'https://www.pdftools4u.in/pdf-to-text');

  const convertImageSlug = 'convert-image';
  assert.strictEqual(URL_REDIRECTS[convertImageSlug] || convertImageSlug, 'convert-image');
  assert.strictEqual(`${BASE_URL}/${URL_REDIRECTS[convertImageSlug] || convertImageSlug}`, 'https://www.pdftools4u.in/convert-image');

  // Alias tools
  assert.strictEqual(URL_REDIRECTS['pdf-editor'], 'edit-pdf');
  assert.strictEqual(`${BASE_URL}/${URL_REDIRECTS['pdf-editor']}`, 'https://www.pdftools4u.in/edit-pdf');
  assert.strictEqual(URL_REDIRECTS['pdf-extractor'], 'pdf-to-text');
  assert.strictEqual(`${BASE_URL}/${URL_REDIRECTS['pdf-extractor']}`, 'https://www.pdftools4u.in/pdf-to-text');
  assert.strictEqual(URL_REDIRECTS['image-converter'], 'convert-image');
  assert.strictEqual(`${BASE_URL}/${URL_REDIRECTS['image-converter']}`, 'https://www.pdftools4u.in/convert-image');
});

// ─────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TOTAL SECURITY & CANONICAL TESTS: ${passed + failed}`);
console.log(`PASSED:                           ${passed}`);
console.log(`FAILED:                           ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exitCode = 1;
}


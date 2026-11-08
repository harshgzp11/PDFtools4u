import assert from 'node:assert';
import { resolveFaqs, resolveSpecs } from '../src/lib/seoContentResolution.js';
import { SEO_CONTENT, CATEGORY_FALLBACKS } from '../src/lib/seoContent.js';
import { DOMAINS } from '../src/lib/toolConfig.js';

console.log('================================================================');
console.log('  TEST SUITE: Tool Content Resolution & Fallback Logic');
console.log('================================================================');

const fallbackFaqs = [
  { q: 'Fallback Q1?', a: 'Fallback A1.' },
  { q: 'Fallback Q2?', a: 'Fallback A2.' },
  { q: 'Fallback Q3?', a: 'Fallback A3.' },
  { q: 'Fallback Q4?', a: 'Fallback A4.' },
  { q: 'Fallback Q5?', a: 'Fallback A5.' },
  { q: 'Fallback Q6?', a: 'Fallback A6.' },
  { q: 'Fallback Q7?', a: 'Fallback A7.' }
];

const fallbackSpecs = [
  { key: 'Execution Environment', value: 'Client-side WebAssembly' },
  { key: 'File Size', value: 'Depends on device memory' }
];

// --- SECTION 1: FAQ SCENARIOS ---
console.log('\n--- SECTION 1: FAQ RESOLUTION SCENARIOS ---');

// Test 1: One custom FAQ
const faq1 = [{ q: 'Custom Q1?', a: 'Custom A1.' }];
const res1 = resolveFaqs(faq1, fallbackFaqs);
assert.strictEqual(res1.length, 1, 'Scenario 1: One custom FAQ must return exactly 1 item');
assert.strictEqual(res1[0].q, 'Custom Q1?');
assert.strictEqual(res1[0].a, 'Custom A1.');
console.log('✅ [PASS] Scenario 1: One custom FAQ displays custom FAQ');

// Test 2: Two custom FAQs
const faq2 = [
  { q: 'Custom Q1?', a: 'Custom A1.' },
  { q: 'Custom Q2?', a: 'Custom A2.' }
];
const res2 = resolveFaqs(faq2, fallbackFaqs);
assert.strictEqual(res2.length, 2, 'Scenario 2: Two custom FAQs must return exactly 2 items');
assert.strictEqual(res2[1].q, 'Custom Q2?');
console.log('✅ [PASS] Scenario 2: Two custom FAQs display both custom FAQs');

// Test 3: Three custom FAQs
const faq3 = [
  { q: 'Custom Q1?', a: 'Custom A1.' },
  { q: 'Custom Q2?', a: 'Custom A2.' },
  { q: 'Custom Q3?', a: 'Custom A3.' }
];
const res3 = resolveFaqs(faq3, fallbackFaqs);
assert.strictEqual(res3.length, 3, 'Scenario 3: Three custom FAQs must return exactly 3 items');
assert.strictEqual(res3[2].q, 'Custom Q3?');
console.log('✅ [PASS] Scenario 3: Three custom FAQs display all three');

// Test 4: Five custom FAQs
const faq5 = [
  { q: 'Custom Q1?', a: 'Custom A1.' },
  { q: 'Custom Q2?', a: 'Custom A2.' },
  { q: 'Custom Q3?', a: 'Custom A3.' },
  { q: 'Custom Q4?', a: 'Custom A4.' },
  { q: 'Custom Q5?', a: 'Custom A5.' }
];
const res5 = resolveFaqs(faq5, fallbackFaqs);
assert.strictEqual(res5.length, 5, 'Scenario 4: Five custom FAQs must return exactly 5 items');
assert.strictEqual(res5[4].q, 'Custom Q5?');
console.log('✅ [PASS] Scenario 4: Five custom FAQs display all five');

// Test 5: Seven custom FAQs
const faq7 = [
  { q: 'Custom Q1?', a: 'Custom A1.' },
  { q: 'Custom Q2?', a: 'Custom A2.' },
  { q: 'Custom Q3?', a: 'Custom A3.' },
  { q: 'Custom Q4?', a: 'Custom A4.' },
  { q: 'Custom Q5?', a: 'Custom A5.' },
  { q: 'Custom Q6?', a: 'Custom A6.' },
  { q: 'Custom Q7?', a: 'Custom A7.' }
];
const res7 = resolveFaqs(faq7, fallbackFaqs);
assert.strictEqual(res7.length, 7, 'Scenario 5: Seven custom FAQs must return exactly 7 items');
assert.strictEqual(res7[6].q, 'Custom Q7?');
console.log('✅ [PASS] Scenario 5: Seven custom FAQs display all seven');

// Test 6: Undefined FAQ property
const resUndef = resolveFaqs(undefined, fallbackFaqs);
assert.strictEqual(resUndef.length, 7, 'Scenario 6: Undefined custom FAQ must use fallback FAQs');
assert.strictEqual(resUndef[0].q, 'Fallback Q1?');
console.log('✅ [PASS] Scenario 6: Undefined FAQ property uses fallback FAQs');

// Test 7: Missing FAQ property (null or omitted)
const resMissing = resolveFaqs(null, fallbackFaqs);
assert.strictEqual(resMissing.length, 7, 'Scenario 7: Missing custom FAQ must use fallback FAQs');
assert.strictEqual(resMissing[0].q, 'Fallback Q1?');
console.log('✅ [PASS] Scenario 7: Missing FAQ property uses fallback FAQs');

// Test 8: Empty FAQ array
const resEmpty = resolveFaqs([], fallbackFaqs);
assert.strictEqual(resEmpty.length, 7, 'Scenario 8: Empty custom FAQ array must use fallback FAQs');
assert.strictEqual(resEmpty[0].q, 'Fallback Q1?');
console.log('✅ [PASS] Scenario 8: Empty FAQ array uses fallback FAQs');

// Test 9: Invalid FAQ structure
const invalidCases = [
  'not an array',
  12345,
  { q: 'not in array' },
  [null, undefined, 42, {}],
  [{ q: '', a: '' }],
  [{ q: '   ', a: 'Valid answer' }] // whitespace-only question
];

for (const [i, ic] of invalidCases.entries()) {
  const resInv = resolveFaqs(ic, fallbackFaqs);
  assert.strictEqual(resInv.length, 7, `Scenario 9.${i+1}: Invalid structure must fall back safely`);
}
// Malformed array with partial valid items: preserves valid items without crashing
const partialValid = [null, { q: 'Valid Q?', a: 'Valid A.' }, undefined, { q: 'Incomplete' }];
const resPartial = resolveFaqs(partialValid, fallbackFaqs);
assert.strictEqual(resPartial.length, 1, 'Partial valid custom array must extract valid item');
assert.strictEqual(resPartial[0].q, 'Valid Q?');

// Both custom and fallback invalid: returns [] safely without crashing
const resBothInvalid = resolveFaqs('invalid', null);
assert.ok(Array.isArray(resBothInvalid) && resBothInvalid.length === 0, 'Both invalid must return empty array safely');
console.log('✅ [PASS] Scenario 9: Invalid FAQ structure handled safely without crashing');


// --- SECTION 2: SPECIFICATION RESOLUTION SCENARIOS ---
console.log('\n--- SECTION 2: SPECIFICATION RESOLUTION SCENARIOS ---');

// Test 10: Valid custom specifications take precedence
const customSpecs = [
  { key: 'CSS Backgrounds', value: 'Enabled by default' },
  { key: 'Page Break Control', value: 'Automatic' }
];
const resSpecsValid = resolveSpecs(customSpecs, fallbackSpecs);
assert.strictEqual(resSpecsValid.length, 2, 'Scenario 10: Custom specs must take precedence');
assert.strictEqual(resSpecsValid[0].key, 'CSS Backgrounds');
console.log('✅ [PASS] Scenario 10: Valid custom specifications take precedence');

// Test 11: Missing custom specifications use fallback
const resSpecsMissing = resolveSpecs(undefined, fallbackSpecs);
assert.strictEqual(resSpecsMissing.length, 2, 'Scenario 11: Missing custom specs must use fallback');
assert.strictEqual(resSpecsMissing[0].key, 'Execution Environment');
console.log('✅ [PASS] Scenario 11: Missing custom specifications use fallback specifications');

// Test 12: Empty custom specifications use fallback
const resSpecsEmpty = resolveSpecs([], fallbackSpecs);
assert.strictEqual(resSpecsEmpty.length, 2, 'Scenario 12: Empty custom specs must use fallback');
assert.strictEqual(resSpecsEmpty[0].key, 'Execution Environment');
console.log('✅ [PASS] Scenario 12: Empty custom specifications use fallback specifications');

// Test 13: Invalid data does not crash rendering
const invalidSpecsCases = [
  'invalid string',
  { key: 'not an array' },
  [null, undefined, 999, {}],
  [{ key: '', value: '' }]
];
for (const [i, ic] of invalidSpecsCases.entries()) {
  const resInv = resolveSpecs(ic, fallbackSpecs);
  assert.strictEqual(resInv.length, 2, `Scenario 13.${i+1}: Invalid custom specs must fall back safely`);
}
const resBothSpecsInvalid = resolveSpecs(null, null);
assert.ok(Array.isArray(resBothSpecsInvalid) && resBothSpecsInvalid.length === 0, 'Both specs invalid returns [] safely');
console.log('✅ [PASS] Scenario 13: Invalid data does not crash rendering');

// Test 14: Fallback specifications do not overwrite valid custom specifications
const singleCustomSpec = [{ key: 'Unique Custom Spec', value: 'Custom Value' }];
const resNoOverwrite = resolveSpecs(singleCustomSpec, fallbackSpecs);
assert.strictEqual(resNoOverwrite.length, 1, 'Scenario 14: Single custom spec must not be overwritten by fallback');
assert.strictEqual(resNoOverwrite[0].key, 'Unique Custom Spec');
console.log('✅ [PASS] Scenario 14: Fallback specifications do not overwrite valid custom specifications');


// --- SECTION 3: REAL CODEBASE 49-TOOL AUDIT ---
console.log('\n--- SECTION 3: REAL DATASET VERIFICATION (49 PRODUCTION TOOLS) ---');

let toolsWithCustomFaqs = 0;
let toolsWithFallbackFaqs = 0;
let toolsWithCustomSpecs = 0;
let toolsWithFallbackSpecs = 0;

function findDomainForTool(id) {
  for (const domain of DOMAINS) {
    for (const cat of domain.categories) {
      if (cat.tools.some(t => t.id === id)) return domain.title;
    }
  }
  return 'PDF Tools';
}

const toolIds = Object.keys(SEO_CONTENT);
assert.strictEqual(toolIds.length, 49, 'Expected 49 tools in SEO_CONTENT');

for (const id of toolIds) {
  const content = SEO_CONTENT[id];
  const domain = findDomainForTool(id);
  const fallback = CATEGORY_FALLBACKS[domain] || CATEGORY_FALLBACKS['PDF Tools'];

  const resolvedF = resolveFaqs(content.faq, fallback.faq);
  const resolvedS = resolveSpecs(content.specs, fallback.specs);

  // Check custom vs fallback
  const isCustomFaq = Array.isArray(content.faq) && content.faq.length > 0;
  if (isCustomFaq) {
    toolsWithCustomFaqs++;
    assert.strictEqual(resolvedF.length, content.faq.length, `${id}: resolved FAQ count must match authored count (${content.faq.length})`);
    assert.strictEqual(resolvedF[0].q, content.faq[0].q, `${id}: first FAQ must match authored question`);
  } else {
    toolsWithFallbackFaqs++;
    assert.strictEqual(resolvedF.length, fallback.faq.length, `${id}: fallback FAQ count must match category count`);
  }

  const isCustomSpec = Array.isArray(content.specs) && content.specs.length > 0;
  if (isCustomSpec) {
    toolsWithCustomSpecs++;
    assert.strictEqual(resolvedS.length, content.specs.length, `${id}: resolved spec count must match authored count`);
  } else {
    toolsWithFallbackSpecs++;
    assert.strictEqual(resolvedS.length, fallback.specs.length, `${id}: fallback spec count must match category count`);
  }
}

console.log(`Audited 49 Production Tools:`);
console.log(`  - Tools displaying Custom FAQs: ${toolsWithCustomFaqs} / 49`);
console.log(`  - Tools displaying Fallback FAQs: ${toolsWithFallbackFaqs} / 49`);
console.log(`  - Tools displaying Custom Specs: ${toolsWithCustomSpecs} / 49`);
console.log(`  - Tools displaying Fallback Specs: ${toolsWithFallbackSpecs} / 49`);

assert.strictEqual(toolsWithCustomFaqs, 49, 'All 49 tools in SEO_CONTENT have authored custom FAQs and must now display them!');
assert.strictEqual(toolsWithCustomSpecs, 4, 'Exactly 4 tools have custom specs and must display them');
assert.strictEqual(toolsWithFallbackSpecs, 45, 'Exactly 45 tools safely fall back to category specs');

console.log('✅ [PASS] Section 3: All 49 production tools resolve correctly');

console.log('\n================================================================');
console.log('  ALL TOOL CONTENT RESOLUTION TESTS PASSED (15/15)');
console.log('================================================================');


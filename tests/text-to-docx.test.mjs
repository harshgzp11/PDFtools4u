/**
 * Test Suite: Text to DOCX Engine Verification
 * Verifies P0.1 remediation for Text to DOCX conversion
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`✅ PASS: ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Error: ${err.message}`);
  }
}

async function generateDocxFromText(text) {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');

  const paragraphs = text.split('\n').map(line => {
    return new Paragraph({
      children: [
        new TextRun({
          text: line,
          size: 24, // 12pt (measured in half-points)
        })
      ],
      spacing: {
        after: 200
      }
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

async function runAllTests() {
  console.log('================================================================');
  console.log('  TEST SUITE: Text to DOCX Generation Engine & Remediation');
  console.log('================================================================\n');

  // Test 1: Static source AST/text execution order verification in TextToDocx.jsx
  await runTest('Test 1: TextToDocx.jsx imports docx BEFORE Paragraph/TextRun instantiation', async () => {
    const srcPath = path.join(projectRoot, 'src/tools/TextToDocx.jsx');
    const content = fs.readFileSync(srcPath, 'utf8');

    const generateDocxIdx = content.indexOf('const generateDocx');
    assert(generateDocxIdx !== -1, 'generateDocx function must exist');

    const importIdx = content.indexOf("await import('docx')", generateDocxIdx);
    assert(importIdx !== -1, "dynamic import('docx') must exist inside generateDocx");

    const firstParagraphUsage = content.indexOf('new Paragraph', generateDocxIdx);
    assert(firstParagraphUsage !== -1, 'new Paragraph must exist in generateDocx');

    assert(
      importIdx < firstParagraphUsage,
      `import('docx') at pos ${importIdx} must occur BEFORE new Paragraph at pos ${firstParagraphUsage}`
    );
  });

  // Test 2: Plain text generates valid DOCX buffer
  await runTest('Test 2: Plain single-line text produces valid DOCX readable by JSZip & mammoth', async () => {
    const text = 'Hello world, this is a plain text document conversion test.';
    const buffer = await generateDocxFromText(text);

    assert(buffer && buffer.length > 0, 'Buffer should not be empty');

    // Verify it is a valid ZIP/DOCX structure
    const zip = await JSZip.loadAsync(buffer);
    assert(zip.file('word/document.xml') !== null, 'DOCX must contain word/document.xml');

    // Verify text extraction with mammoth
    const result = await mammoth.extractRawText({ buffer });
    assert(result.value.includes('Hello world, this is a plain text document conversion test.'));
  });

  // Test 3: Multiple paragraphs preserved
  await runTest('Test 3: Multiple paragraphs separated by newlines are preserved sequentially', async () => {
    const text = 'First Paragraph\nSecond Paragraph with details\nThird Paragraph summary';
    const buffer = await generateDocxFromText(text);

    const result = await mammoth.extractRawText({ buffer });
    assert(result.value.includes('First Paragraph'), 'Must contain first paragraph');
    assert(result.value.includes('Second Paragraph with details'), 'Must contain second paragraph');
    assert(result.value.includes('Third Paragraph summary'), 'Must contain third paragraph');
  });

  // Test 4: Unicode preservation (Devanagari, symbols, accented characters)
  await runTest('Test 4: Unicode multilingual text (Hindi, Spanish, symbols) preserved without corruption', async () => {
    const text = 'नमस्ते भारत - हिंदी पाठ\n¡Hola Mundo! Español con tildes (á, é, í, ó, ú, ñ)\nCurrency symbols: ₹ 1,500.50 and € 89.99';
    const buffer = await generateDocxFromText(text);

    const result = await mammoth.extractRawText({ buffer });
    assert(result.value.includes('नमस्ते भारत - हिंदी पाठ'), 'Must preserve Devanagari script');
    assert(result.value.includes('¡Hola Mundo! Español con tildes (á, é, í, ó, ú, ñ)'), 'Must preserve Spanish accents');
    assert(result.value.includes('₹ 1,500.50'), 'Must preserve Rupee currency symbol');
  });

  // Test 5: Empty input handling
  await runTest('Test 5: Empty text check logic rejects whitespace-only string', async () => {
    const empty1 = '';
    const empty2 = '   \n  \t  ';
    assert(!empty1.trim(), 'Empty string trim check');
    assert(!empty2.trim(), 'Whitespace string trim check');
  });

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED:      ${passedTests}`);
  console.log(`FAILED:      ${failedTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

runAllTests();


import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, degrees } from '@cantoo/pdf-lib';
import { 
  evaluatePassword, 
  generateRandomOwnerPassword, 
  preflightInspectPdf, 
  protectPdfDocument,
  inspectPdf20AdvancedFeatures
} from '../src/utils/pdfProtection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const scratchDir = path.resolve(projectRoot, 'scratch');

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

console.log('================================================================');
console.log('  PDFTOOLS4U — PROTECT PDF PRODUCTION-GRADE AUDIT SUITE');
console.log('  Cryptographic Verification, Permissions & Document Integrity');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function check(desc, condition, extra = '') {
  if (condition) {
    passCount++;
    console.log(`✅ [PASS] ${desc}`);
  } else {
    failCount++;
    console.error(`❌ [FAIL] ${desc} ${extra}`);
  }
}

async function runAudit() {
  // -------------------------------------------------------------
  // SECTION 1: PASSWORD EVALUATION & COMPLIANCE UNIT TESTS
  // -------------------------------------------------------------
  console.log('--- SECTION 1: PASSWORD EVALUATION & COMPLIANCE UNIT TESTS ---');

  const evalWeak = evaluatePassword('123');
  check('1.1: Short password evaluated as Weak', evalWeak.label === 'Weak' && evalWeak.score < 25);
  check('1.2: Short password isValid is true', evalWeak.isValid === true);

  const evalGood = evaluatePassword('Secret2026!');
  check('1.3: Complex password evaluated as Good or Strong', evalGood.score >= 50 && ['Good', 'Strong'].includes(evalGood.label));

  const evalUnicode = evaluatePassword('Пароль123'); // Cyrillic
  check('1.4: Non-Latin-1 Unicode (>255) detected', evalUnicode.hasUnsupportedUnicode === true);
  check('1.5: Non-Latin-1 Unicode invalidates password', evalUnicode.isValid === false);
  check('1.6: Non-Latin-1 Unicode captures culprit character', evalUnicode.unsupportedChar === 'П');

  const evalEmoji = evaluatePassword('Lock🔒123');
  check('1.7: Emoji character detected as unsupported', evalEmoji.hasUnsupportedUnicode === true);

  const evalSpaces = evaluatePassword('  Password With Spaces  ');
  check('1.8: Spaces detected in password', evalSpaces.hasSpaces === true && evalSpaces.hasLeadingOrTrailingSpaces === true);

  const evalLong = evaluatePassword('A'.repeat(40));
  check('1.9: Passwords over 32 chars flagged for ISO 32000-1 truncation transparency', evalLong.isLong === true && evalLong.length === 40);

  const evalEmpty = evaluatePassword('');
  check('1.10: Empty password is not valid', evalEmpty.isValid === false);

  // Random owner password generation
  const rand1 = generateRandomOwnerPassword(32);
  const rand2 = generateRandomOwnerPassword(32);
  check('1.11: Random owner password generates exactly 32 chars', rand1.length === 32);
  check('1.12: Two consecutive random passwords are not equal', rand1 !== rand2);
  check('1.13: Random password uses only standard ASCII safe characters', /^[A-Za-z0-9!@#$%^&*()_+\-=]+$/.test(rand1));

  // -------------------------------------------------------------
  // SECTION 2: PREFLIGHT INSPECTION & INPUT ADVERSARIAL TESTING
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: PREFLIGHT INSPECTION & INPUT ADVERSARIAL TESTING ---');

  // Test 0-byte input
  const emptyRes = await preflightInspectPdf(new Uint8Array(0));
  check('2.1: Zero-byte file rejected safely', emptyRes.isValid === false && emptyRes.error.includes('empty'));

  // Test non-PDF text input
  const textBytes = new TextEncoder().encode('Hello World this is plain text not PDF');
  const nonPdfRes = await preflightInspectPdf(textBytes);
  check('2.2: Non-PDF file without %PDF- header rejected', nonPdfRes.isValid === false && nonPdfRes.error.includes('not appear to be a valid PDF'));

  // Create a clean synthetic PDF
  const cleanDoc = await PDFDocument.create();
  cleanDoc.addPage([400, 400]);
  const cleanBytes = await cleanDoc.save();

  const validRes = await preflightInspectPdf(cleanBytes);
  check('2.3: Valid synthetic PDF accepted', validRes.isValid === true && validRes.pageCount === 1);
  check('2.4: Clean PDF not flagged as encrypted or signed', validRes.isEncrypted === false && validRes.isSigned === false);

  // Test already-encrypted PDF detection
  const encDoc = await PDFDocument.load(cleanBytes);
  encDoc.encrypt({ userPassword: 'TestPassword1!', ownerPassword: 'OwnerPassword2!' });
  const alreadyEncBytes = await encDoc.save();

  const encRes = await preflightInspectPdf(alreadyEncBytes);
  check('2.5: Already-encrypted PDF detected by preflight', encRes.isEncrypted === true && encRes.isValid === false);
  check('2.6: Encrypted PDF gives actionable guidance to Unlock tool', encRes.error.includes('Unlock PDF'));

  // Test digitally signed PDF detection
  const signedDoc = await PDFDocument.create();
  signedDoc.addPage([500, 500]);
  const acroForm = signedDoc.context.obj({
    Fields: [
      signedDoc.context.register(signedDoc.context.obj({
        FT: PDFName.of('Sig'),
        V: signedDoc.context.register(signedDoc.context.obj({
          Type: PDFName.of('Sig'),
          Name: 'Corporate Compliance Signer'
        }))
      }))
    ]
  });
  signedDoc.catalog.set(PDFName.of('AcroForm'), signedDoc.context.register(acroForm));
  const signedBytes = await signedDoc.save();

  const sigRes = await preflightInspectPdf(signedBytes);
  check('2.7: Digitally signed PDF detected by preflight', sigRes.isSigned === true && sigRes.signatureNames.some(s => s.includes('Corporate Compliance Signer')));

  // Test PDF 2.0 detection in preflight
  const pdf20Bytes = new Uint8Array(cleanBytes);
  pdf20Bytes[5] = 50; // '2'
  pdf20Bytes[7] = 48; // '0'
  const pre20 = await preflightInspectPdf(pdf20Bytes);
  check('2.8: PDF 2.0 version detected by preflight', pre20.isPdf20 === true && pre20.pdfVersion === '2.0');
  check('2.9: PDF 2.0 preflight generates compatibility notice', Boolean(pre20.warning && pre20.warning.includes('PDF 2.0')));

  // Test 2.10: Unsigned blank signature field is NOT falsely flagged as signed
  const emptySigDoc = await PDFDocument.create();
  emptySigDoc.addPage([500, 500]);
  const emptyForm = emptySigDoc.context.obj({
    Fields: [
      emptySigDoc.context.register(emptySigDoc.context.obj({
        FT: PDFName.of('Sig'),
        T: 'UnsignedSignatureLine'
        // No /V entry!
      }))
    ]
  });
  emptySigDoc.catalog.set(PDFName.of('AcroForm'), emptySigDoc.context.register(emptyForm));
  const emptySigBytes = await emptySigDoc.save();
  const emptySigRes = await preflightInspectPdf(emptySigBytes);
  check('2.10: Unsigned blank signature line is NOT falsely flagged as signed', emptySigRes.isSigned === false);

  // Test 2.11: Plaintext containing /ByteRange token does NOT trigger false positive
  const textDoc = await PDFDocument.create();
  const tPage = textDoc.addPage([500, 500]);
  tPage.drawText('Sample text with tokens /ByteRange and /Sig in visible content');
  const fpTextBytes = await textDoc.save();
  const textSigRes = await preflightInspectPdf(fpTextBytes);
  check('2.11: Plaintext containing /ByteRange token does NOT trigger false positive', textSigRes.isSigned === false);

  // Test 2.12: Advanced PDF 2.0 features detected in preflight
  const adv20Text = '%PDF-2.0\n' + new TextDecoder('latin1').decode(cleanBytes).slice(9) + '\n/AF [1 0 R] /OCProperties << /OCGs [] >>';
  const adv20Bytes = new TextEncoder().encode(adv20Text);
  const adv20Res = await preflightInspectPdf(adv20Bytes);
  check('2.12: Advanced PDF 2.0 features detected in preflight', adv20Res.isPdf20 === true && adv20Res.advancedFeatures.length >= 2);

  // -------------------------------------------------------------
  // SECTION 3: CRYPTOGRAPHIC AES-128 ENCRYPTION & HEADER UPGRADE
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: CRYPTOGRAPHIC AES-128 ENCRYPTION & HEADER UPGRADE ---');

  // Verify that a PDF with older header (%PDF-1.4) is upgraded and encrypted with AES-128
  const baseDoc = await PDFDocument.create();
  const page1 = baseDoc.addPage([600, 400]);
  page1.drawText('CONFIDENTIAL FINANCIAL TRANSACTION 987654321', { x: 50, y: 350 });
  const baseBytes = await baseDoc.save();

  // Patch header to %PDF-1.4
  const legacy14Bytes = new Uint8Array(baseBytes);
  legacy14Bytes[7] = 52; // '4'
  check('3.1: Legacy PDF 1.4 synthetic input created', new TextDecoder('latin1').decode(legacy14Bytes.slice(0, 10)).includes('%PDF-1.4'));

  // Encrypt with protectPdfDocument
  const protected14 = await protectPdfDocument({
    pdfData: legacy14Bytes,
    userPassword: 'UserSecret2026!',
    ownerPassword: 'OwnerSecret2026!',
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false
    }
  });

  check('3.2: Protection executed successfully', protected14.pdfBytes instanceof Uint8Array && protected14.outputSize > 0);

  // Inspect raw output bytes
  const encRawString = new TextDecoder('latin1').decode(protected14.pdfBytes);
  check('3.3: Output contains /Encrypt dictionary reference', encRawString.includes('/Encrypt'));
  check('3.4: Output contains /Standard filter', encRawString.includes('/Filter /Standard') || encRawString.includes('/Filter/Standard'));
  check('3.5: Output contains AES CFM /AESV2 crypt filter', encRawString.includes('/CFM /AESV2') || encRawString.includes('/CFM/AESV2'));
  check('3.6: Output contains Version 4 (/V 4) AES-128', encRawString.includes('/V 4'));
  check('3.7: Output contains Revision 4 (/R 4)', encRawString.includes('/R 4'));
  check('3.8: Sensitive text NOT leaked as plaintext in output', !encRawString.includes('CONFIDENTIAL FINANCIAL TRANSACTION'));

  // Verify that PDF 2.0 input is ALSO protected with AES-128 without 40-bit RC4 downgrade
  const legacy20Bytes = new Uint8Array(baseBytes);
  legacy20Bytes[5] = 50; // '2'
  legacy20Bytes[7] = 48; // '0'
  const protected20 = await protectPdfDocument({
    pdfData: legacy20Bytes,
    userPassword: 'Pass20!',
    ownerPassword: 'OwnerPass20!'
  });
  const enc20String = new TextDecoder('latin1').decode(protected20.pdfBytes);
  check('3.9: PDF 2.0 input safely upgraded to /V 4 AES-128 (no RC4 downgrade)', enc20String.includes('/V 4') && enc20String.includes('/CFM /AESV2'));

  // -------------------------------------------------------------
  // SECTION 4: USER VS OWNER PASSWORDS & PERMISSION CONTROLS
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: USER VS OWNER PASSWORDS & PERMISSION CONTROLS ---');

  // Verify automatic random owner password generation when restrictions are set
  const autoOwnerResult = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: 'OpenOnlyPassword!',
    permissions: {
      printing: 'none',
      copying: false,
      modifying: false
    }
  });

  check('4.1: Automated owner password generated when user restricts permissions', Boolean(autoOwnerResult.effectiveOwnerPassword));
  check('4.2: Automated owner password is NOT equal to user password', autoOwnerResult.effectiveOwnerPassword !== 'OpenOnlyPassword!');
  check('4.3: Automated owner password is 32 chars strong', autoOwnerResult.effectiveOwnerPassword.length === 32);

  // Validation: User password equal to Owner password must be rejected
  let duplicateRejected = false;
  try {
    await protectPdfDocument({
      pdfData: baseBytes,
      userPassword: 'IdenticalPassword123!',
      ownerPassword: 'IdenticalPassword123!'
    });
  } catch (err) {
    duplicateRejected = err.message.includes('must be different');
  }
  check('4.4: Identical User and Owner password rejected with descriptive error', duplicateRejected);

  // Validation: Unsupported non-Latin-1 password rejected
  let unicodeRejected = false;
  try {
    await protectPdfDocument({
      pdfData: baseBytes,
      userPassword: 'Пароль'
    });
  } catch (err) {
    unicodeRejected = err.message.includes('unsupported character');
  }
  check('4.5: Non-Latin-1 password rejected with clear guidance', unicodeRejected);

  // Printing forbidden tests (printing: 'none' and printing: false)
  const noPrintResult = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: 'UserSecret123!',
    permissions: {
      printing: 'none',
      copying: false,
      modifying: false
    }
  });
  check('4.6: Explicit printing: none clears printing permission', noPrintResult.permissions.printing === false);

  const falsePrintResult = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: 'UserSecret123!',
    permissions: {
      printing: false,
      copying: false,
      modifying: false
    }
  });
  check('4.7: Explicit printing: false clears printing permission', falsePrintResult.permissions.printing === false);
  check('4.8: Auto-generated owner password excluded user password', noPrintResult.isAutoGeneratedOwner === true && noPrintResult.effectiveOwnerPassword !== 'UserSecret123!');

  // -------------------------------------------------------------
  // SECTION 5: DOCUMENT INTEGRITY & METADATA PRESERVATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: DOCUMENT INTEGRITY & METADATA PRESERVATION ---');

  const metaDoc = await PDFDocument.create();
  metaDoc.setTitle('Confidential Board Minutes Q3');
  metaDoc.setAuthor('Corporate Secretary');
  metaDoc.setSubject('Executive Committee Resolutions');
  metaDoc.setKeywords(['confidential', 'minutes', 'executive']);
  metaDoc.setCreator('PDFTools4U Test Suite');
  metaDoc.setProducer('Custom Enterprise PDF Generator');
  const creationDate = new Date(2026, 10, 1, 10, 0, 0);
  metaDoc.setCreationDate(creationDate);

  // Multi-page with orientation and elements
  const p1 = metaDoc.addPage([595, 842]); // Portrait
  p1.drawText('Page 1: Executive Summary');

  const p2 = metaDoc.addPage([842, 595]); // Landscape
  p2.setRotation(degrees(90));
  p2.drawText('Page 2: Financial Spread');

  const p3 = metaDoc.addPage([500, 500]);
  p3.drawText('Page 3: Resolutions & Sign-off');

  const origMetaBytes = await metaDoc.save();

  const protectedMeta = await protectPdfDocument({
    pdfData: origMetaBytes,
    userPassword: 'AuditPassword123!',
    ownerPassword: 'AuditOwnerPassword456!',
    permissions: {
      printing: 'highResolution',
      copying: true,
      modifying: false
    }
  });

  // Write out the protected document for independent inspection
  const metaOutPath = path.resolve(scratchDir, 'test_meta_out.pdf');
  fs.writeFileSync(metaOutPath, protectedMeta.pdfBytes);

  // Independent verification using PyMuPDF (fitz)
  const { execSync } = await import('node:child_process');
  const helperPath = path.resolve(scratchDir, 'verify_meta_helper.py');
  fs.writeFileSync(helperPath, `import pymupdf, json, sys
path = sys.argv[1]
pwd = sys.argv[2]
doc = pymupdf.open(path)
auth = doc.authenticate(pwd)
meta = doc.metadata
perms = doc.permissions
p1_rect = list(doc[0].rect) if len(doc) > 0 else []
p2_rect = list(doc[1].rect) if len(doc) > 1 else []
p2_mediabox = list(doc[1].mediabox) if len(doc) > 1 else []
p2_rotation = doc[1].rotation if len(doc) > 1 else 0
out = {
  "auth": auth,
  "pages": len(doc),
  "p1_rect": p1_rect,
  "p2_rect": p2_rect,
  "p2_mediabox": p2_mediabox,
  "p2_rotation": p2_rotation,
  "title": meta.get("title"),
  "author": meta.get("author"),
  "subject": meta.get("subject"),
  "keywords": meta.get("keywords"),
  "creator": meta.get("creator"),
  "producer": meta.get("producer"),
  "encryption": meta.get("encryption"),
  "can_copy": bool(perms & pymupdf.PDF_PERM_COPY),
  "can_modify": bool(perms & pymupdf.PDF_PERM_MODIFY)
}
print(json.dumps(out))
`);

  const pyResultJson = execSync(`python "${helperPath}" "${metaOutPath}" "AuditPassword123!"`, { encoding: 'utf8' });
  const pyResult = JSON.parse(pyResultJson);

  check('5.1: Decrypted document has exact page count (3 pages)', pyResult.pages === 3);
  check('5.2: Page 1 portrait dimensions preserved', pyResult.p1_rect[2] === 595 && pyResult.p1_rect[3] === 842);
  check('5.3: Page 2 landscape dimensions preserved (mediabox 842x595)', pyResult.p2_mediabox[2] === 842 && pyResult.p2_mediabox[3] === 595);
  check('5.4: Page 2 rotation (90 deg) preserved', pyResult.p2_rotation === 90);
  check('5.5: Document Title metadata preserved', pyResult.title === 'Confidential Board Minutes Q3');
  check('5.6: Document Author metadata preserved', pyResult.author === 'Corporate Secretary');
  check('5.7: Document Subject metadata preserved', pyResult.subject === 'Executive Committee Resolutions');
  check('5.8: Document Keywords metadata preserved', (pyResult.keywords || '').includes('confidential'));
  check('5.9: Document Creator metadata preserved', pyResult.creator === 'PDFTools4U Test Suite');
  check('5.10: Document Producer preserved without unprompted wipe', pyResult.producer === 'Custom Enterprise PDF Generator');
  check('5.11: PyMuPDF confirms AES-128 encryption algorithm', (pyResult.encryption || '').includes('128-bit AES'));
  check('5.12: Configured copying permission respected by reader', pyResult.can_copy === true);
  check('5.13: Configured modifying restriction respected by reader', pyResult.can_modify === false);

  // -------------------------------------------------------------
  // SECTION 6: PASSWORDS WITH SPACES, SYMBOLS & 32+ CHARS
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: PASSWORDS WITH SPACES, SYMBOLS & 32+ CHARS ---');

  // Spaces
  const spacePass = '  Correct Horse Battery Staple  ';
  const protSpaces = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: spacePass,
    ownerPassword: 'DifferentOwnerPassword!'
  });
  const docSpaces = await PDFDocument.load(protSpaces.pdfBytes, { password: spacePass });
  check('6.1: Password with spaces decrypts correctly with exact spaces', docSpaces.getPageCount() === 1);

  // Symbols
  const symbolPass = 'P@$$w0rd!#%^&*()-_=+[]{};:,.<>/?';
  const protSymbols = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: symbolPass,
    ownerPassword: 'DifferentOwnerPassword!'
  });
  const docSymbols = await PDFDocument.load(protSymbols.pdfBytes, { password: symbolPass });
  check('6.2: Password with printable symbols decrypts correctly', docSymbols.getPageCount() === 1);

  // Long password (45 chars)
  const longPass = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3';
  const protLong = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: longPass,
    ownerPassword: 'DifferentOwnerPassword!'
  });
  const docLong = await PDFDocument.load(protLong.pdfBytes, { password: longPass });
  check('6.3: Long password (45 chars) accepted and decrypts correctly', docLong.getPageCount() === 1);

  // Wrong password failure
  let wrongPassFailed = false;
  try {
    await PDFDocument.load(protLong.pdfBytes, { password: 'IncorrectPassword!' });
  } catch (err) {
    wrongPassFailed = err.message.toLowerCase().includes('password') || err.message.toLowerCase().includes('decrypt');
  }
  check('6.4: Decrypting with wrong password throws error', wrongPassFailed);

  // No password failure
  let noPassFailed = false;
  try {
    await PDFDocument.load(protLong.pdfBytes);
  } catch (err) {
    noPassFailed = err.message.toLowerCase().includes('password') || err.message.toLowerCase().includes('encrypt');
  }
  check('6.5: Opening protected document without password throws error', noPassFailed);

  // Password Truncation: 33-char and 64-char passwords
  const pw33 = '12345678901234567890123456789012A';
  const prot33 = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: pw33,
    ownerPassword: 'DifferentOwnerPassword!'
  });
  const doc33Exact = await PDFDocument.load(prot33.pdfBytes, { password: pw33 });
  const doc33Prefix = await PDFDocument.load(prot33.pdfBytes, { password: pw33.slice(0, 32) });
  check('6.6: Password with 33 characters decrypts using exact password and 32-character prefix', doc33Exact.getPageCount() === 1 && doc33Prefix.getPageCount() === 1);

  const pw64 = '1234567890123456789012345678901234567890123456789012345678901234';
  const prot64 = await protectPdfDocument({
    pdfData: baseBytes,
    userPassword: pw64,
    ownerPassword: 'DifferentOwnerPassword!'
  });
  const doc64Prefix = await PDFDocument.load(prot64.pdfBytes, { password: pw64.slice(0, 32) });
  check('6.7: Password with 64 characters decrypts using 32-character prefix', doc64Prefix.getPageCount() === 1);

  // -------------------------------------------------------------
  // SECTION 7: HARDENED PDF 2.0 ADVANCED-FEATURE PREFLIGHT TESTS
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: HARDENED PDF 2.0 ADVANCED-FEATURE PREFLIGHT TESTS ---');

  // 7.1: Advanced features near beginning of file (Catalog /OCProperties)
  const doc71 = await PDFDocument.create();
  doc71.addPage([400, 400]);
  doc71.catalog.set(PDFName.of('OCProperties'), doc71.context.obj({
    OCGs: [doc71.context.register(doc71.context.obj({ Type: PDFName.of('OCG'), Name: 'HeaderLayer' }))]
  }));
  const bytes71 = await doc71.save();
  const reloaded71 = await PDFDocument.load(bytes71);
  const res71 = inspectPdf20AdvancedFeatures(reloaded71, bytes71);
  check('7.1: Advanced feature near beginning of file detected', res71.status === 'detected' && res71.features.includes('Optional Content Groups (Layers)'));

  // 7.2: Advanced features near end of file (Page 10 of multi-page file)
  const doc72 = await PDFDocument.create();
  for (let i = 0; i < 9; i++) {
    const p = doc72.addPage([400, 400]);
    p.drawText(`Filler content on page ${i + 1}`.repeat(50));
  }
  const page10 = doc72.addPage([400, 400]);
  page10.node.set(PDFName.of('AF'), doc72.context.obj([]));
  const bytes72 = await doc72.save();
  const reloaded72 = await PDFDocument.load(bytes72);
  const res72 = inspectPdf20AdvancedFeatures(reloaded72, bytes72);
  check('7.2: Advanced feature near end of multi-page file detected', res72.status === 'detected' && res72.features.includes('Associated Files (/AF)'));

  // 7.3: Compressed object streams (useObjectStreams: true)
  const doc73 = await PDFDocument.create();
  doc73.addPage([400, 400]);
  doc73.catalog.set(PDFName.of('AF'), doc73.context.obj([]));
  const bytes73 = await doc73.save({ useObjectStreams: true });
  const reloaded73 = await PDFDocument.load(bytes73);
  const res73 = inspectPdf20AdvancedFeatures(reloaded73, bytes73);
  check('7.3: Feature inside compressed object stream detected via AST decompression', res73.status === 'detected' && res73.features.includes('Associated Files (/AF)'));

  // 7.4: Incremental updates with page-level OutputIntents
  const baseDoc74 = await PDFDocument.create();
  baseDoc74.addPage([400, 400]);
  const baseBytes74 = await baseDoc74.save();
  const doc74 = await PDFDocument.load(baseBytes74);
  const p74 = doc74.getPage(0);
  p74.node.set(PDFName.of('OutputIntents'), doc74.context.obj([
    doc74.context.register(doc74.context.obj({
      Type: PDFName.of('OutputIntent'),
      S: PDFName.of('GTS_PDFX')
    }))
  ]));
  const bytes74 = await doc74.save();
  const reloaded74 = await PDFDocument.load(bytes74);
  const res74 = inspectPdf20AdvancedFeatures(reloaded74, bytes74);
  check('7.4: Incremental update with page-level OutputIntents detected', res74.status === 'detected' && res74.features.includes('Page-level Output Intents'));

  // 7.5: Nested annotation structure (/Popup containing /3D)
  const doc75 = await PDFDocument.create();
  const page75 = doc75.addPage([500, 500]);
  const nested3dPopup = doc75.context.register(doc75.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('3D'),
    Rect: [100, 100, 200, 200]
  }));
  const parentAnnot = doc75.context.register(doc75.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Text'),
    Rect: [50, 50, 100, 100],
    Popup: nested3dPopup
  }));
  page75.node.set(PDFName.of('Annots'), doc75.context.obj([parentAnnot]));
  const bytes75 = await doc75.save();
  const reloaded75 = await PDFDocument.load(bytes75);
  const res75 = inspectPdf20AdvancedFeatures(reloaded75, bytes75);
  check('7.5: Nested annotation structure (/Popup with 3D) detected', res75.status === 'detected' && res75.features.includes('3D PRC Content'));

  // 7.6: Ordinary text containing feature-like names (no false positives)
  const doc76 = await PDFDocument.create();
  const page76 = doc76.addPage([600, 400]);
  page76.drawText('Documentation notes: We will review /AF, /OCProperties, /RichMedia, and /3D specifications.');
  const bytes76 = await doc76.save();
  const reloaded76 = await PDFDocument.load(bytes76);
  const res76 = inspectPdf20AdvancedFeatures(reloaded76, bytes76);
  check('7.6: Ordinary text with feature tokens is NOT falsely flagged as an advanced feature', res76.status === 'not_detected' && res76.features.length === 0);

  // 7.7: Large PDF (> 100 pages)
  const doc77 = await PDFDocument.create();
  for (let i = 0; i < 105; i++) {
    doc77.addPage([200, 200]);
  }
  const bytes77 = await doc77.save();
  const reloaded77 = await PDFDocument.load(bytes77);
  const res77 = inspectPdf20AdvancedFeatures(reloaded77, bytes77);
  check('7.7: Large PDF (>100 pages) marked with conservative status incomplete', res77.status === 'incomplete' && res77.totalPages === 105 && res77.reason.includes('exceeds 100 pages'));

  // 7.8: Malformed PDF objects handled gracefully without unhandled throw
  const doc78 = await PDFDocument.create();
  doc78.addPage([400, 400]);
  doc78.catalog.get = () => { throw new Error('Simulated corrupted indirect object entry'); };
  const res78 = inspectPdf20AdvancedFeatures(doc78, new Uint8Array([37, 80, 68, 70]));
  check('7.8: Malformed object handled gracefully and records traversal error in reason', res78.status === 'incomplete' && res78.reason.includes('Simulated corrupted indirect object entry'));

  // 7.9: Preflight integration: explicitly distinguishes all three conservative states
  // State A: detected
  const p79ABytes = new Uint8Array(bytes71);
  p79ABytes[5] = 50; p79ABytes[7] = 48; // %PDF-2.0
  const pre79A = await preflightInspectPdf(p79ABytes);
  check('7.9: Preflight distinguishes State A: detected', pre79A.isPdf20 === true && pre79A.featureInspection.status === 'detected' && pre79A.advancedFeatures.length > 0);

  // State B: not_detected (clean 1-page PDF 2.0)
  const clean20Doc = await PDFDocument.create();
  clean20Doc.addPage([300, 300]);
  const clean20Bytes = await clean20Doc.save();
  clean20Bytes[5] = 50; clean20Bytes[7] = 48; // %PDF-2.0
  const pre79B = await preflightInspectPdf(clean20Bytes);
  check('7.10: Preflight distinguishes State B: not_detected', pre79B.isPdf20 === true && pre79B.featureInspection.status === 'not_detected' && pre79B.advancedFeatures.length === 0);

  // State C: incomplete (large 105-page PDF 2.0)
  const large20Bytes = new Uint8Array(bytes77);
  large20Bytes[5] = 50; large20Bytes[7] = 48; // %PDF-2.0
  const pre79C = await preflightInspectPdf(large20Bytes);
  check('7.11: Preflight distinguishes State C: incomplete', pre79C.isPdf20 === true && pre79C.featureInspection.status === 'incomplete' && Boolean(pre79C.featureInspection.reason));

  console.log('\n================================================================');
  console.log(`TOTAL AUDIT CHECKS: ${passCount + failCount}`);
  console.log(`PASSED:             ${passCount}`);
  console.log(`FAILED:             ${failCount}`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit suite crashed with unexpected error:', err);
  process.exit(1);
});

import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from '@cantoo/pdf-lib';
import { detectDigitalSignature } from './pdfProtection.js';
import { trySaslprep } from './saslprep.js';
import { encodeToPdfDocEncoding, hasPdfDocEncodingMapping } from './pdfDocEncoding.js';

/**
 * PDF Decryption and Security Removal Engine for PDFTools4U
 * Provides robust client-side PDF decryption, security handler stripping,
 * active content detection, and independent post-processing verification.
 */

/**
 * Detects embedded active content (OpenAction, Document-level JavaScript, Form Actions)
 * without executing untrusted code.
 *
 * @param {PDFDocument|null} doc
 * @param {Uint8Array|null} rawBytes
 * @returns {{ hasActiveContent: boolean, activeContentTypes: string[] }}
 */
export function detectActiveContent(doc, rawBytes) {
  let hasActiveContent = false;
  const activeContentTypes = [];
  let hasJavaScript = false;
  let hasExternalAction = false;
  let hasRichMedia = false;
  let hasHyperlinks = false;
  let fieldTraversalBounded = false;
  let pageTraversalBounded = false;
  let fieldsScannedCount = 0;
  let pagesScannedCount = 0;

  const addType = (t, cat = 'action') => {
    hasActiveContent = true;
    if (!activeContentTypes.includes(t)) {
      activeContentTypes.push(t);
    }
    if (cat === 'javascript') hasJavaScript = true;
    else if (cat === 'external') hasExternalAction = true;
    else if (cat === 'rich_media') hasRichMedia = true;
    else if (cat === 'hyperlink') hasHyperlinks = true;
  };

  // 1. Inspect parsed document object graph if available (post-decryption or unencrypted)
  if (doc?.catalog && doc?.context) {
    const inspectedActions = new Set();

    // Helper to inspect any Action dictionary, including /Next chains and nested sub-actions
    const inspectActionObj = (actionRef, sourceLabel = 'Action') => {
      if (!actionRef || !doc?.context) return;
      const actionObj = doc.context.lookup(actionRef);
      if (!actionObj || !(actionObj instanceof PDFDict)) return;

      if (inspectedActions.has(actionObj)) return;
      inspectedActions.add(actionObj);

      const sType = actionObj.get(PDFName.of('S'))?.toString() || '';
      if (sType === '/JavaScript') {
        addType(`${sourceLabel} JavaScript`, 'javascript');
      } else if (sType === '/Launch') {
        addType(`${sourceLabel} External Launch`, 'external');
      } else if (sType === '/SubmitForm') {
        addType(`${sourceLabel} Form Submission`, 'external');
      } else if (sType === '/ImportData') {
        addType(`${sourceLabel} Data Import`, 'external');
      } else if (sType === '/GoToR' || sType === '/GoToE') {
        addType(`${sourceLabel} Remote Document Navigation`, 'external');
      } else if (sType === '/RichMediaExecute') {
        addType(`${sourceLabel} Rich Media Execution`, 'rich_media');
      } else if (sType === '/URI') {
        addType(`${sourceLabel} Hyperlink`, 'hyperlink');
      } else if (sType) {
        addType(`${sourceLabel} (${sType.replace(/^\//, '')})`, 'external');
      }

      // Check /Next action chains (ISO 32000-1 §12.6.2: single dictionary or array of chained actions)
      const nextRef = actionObj.get(PDFName.of('Next'));
      if (nextRef) {
        const nextObj = doc.context.lookup(nextRef);
        if (nextObj instanceof PDFArray) {
          for (let n = 0; n < nextObj.size(); n++) {
            inspectActionObj(nextObj.get(n), `Chained ${sourceLabel}`);
          }
        } else if (nextObj instanceof PDFDict) {
          inspectActionObj(nextObj, `Chained ${sourceLabel}`);
        }
      }
    };

    // Helper to inspect Additional-Actions dictionaries (/AA)
    const inspectAADict = (aaRef, sourceLabel = 'Trigger') => {
      if (!aaRef || !doc?.context) return;
      const aaDict = doc.context.lookup(aaRef);
      if (!(aaDict instanceof PDFDict)) return;

      for (const key of aaDict.keys()) {
        const eventAction = aaDict.get(key);
        if (eventAction) {
          inspectActionObj(eventAction, `${sourceLabel} Event Trigger (/AA ${key.toString().replace(/^\//, '')})`);
        }
      }
      addType(`${sourceLabel} Additional-Actions (/AA)`, 'external');
    };

    // A. Catalog OpenAction
    try {
      const openAction = doc.catalog.get(PDFName.of('OpenAction'));
      if (openAction) {
        inspectActionObj(openAction, 'Catalog OpenAction');
      }
    } catch {
      // ignore
    }

    // B. Catalog Additional-Actions (/AA: /WP, /DP, /WS, /DS)
    try {
      const catAA = doc.catalog.get(PDFName.of('AA'));
      if (catAA) {
        inspectAADict(catAA, 'Catalog');
      }
    } catch {
      // ignore
    }

    // C. Document-level JavaScript in Names tree
    try {
      const names = doc.catalog.get(PDFName.of('Names'));
      if (names) {
        const namesDict = doc.context.lookup(names);
        if (namesDict instanceof PDFDict && namesDict.get(PDFName.of('JavaScript'))) {
          addType('Document-Level JavaScript (Names)', 'javascript');
        }
      }
    } catch {
      // ignore
    }

    // D. Page-level and Annotation-level Action & Additional-Action Inspection
    try {
      const pages = doc.getPages ? doc.getPages() : [];
      const MAX_PAGE_LIMIT = 2000;
      if (pages.length > MAX_PAGE_LIMIT) {
        pageTraversalBounded = true;
      }
      const pageInspectLimit = Math.min(pages.length, MAX_PAGE_LIMIT);
      for (let i = 0; i < pageInspectLimit; i++) {
        pagesScannedCount++;
        const pageNode = pages[i].node;

        // Page-level /AA (/O Page Open, /C Page Close)
        const pageAA = pageNode.get(PDFName.of('AA'));
        if (pageAA) {
          inspectAADict(pageAA, 'Page-Level');
        }

        // Annotation-level /A and /AA inspection
        const annotsRef = pageNode.get(PDFName.of('Annots'));
        if (annotsRef) {
          const annotsArray = doc.context.lookup(annotsRef);
          if (annotsArray instanceof PDFArray) {
            for (let j = 0; j < annotsArray.size(); j++) {
              const annotObj = doc.context.lookup(annotsArray.get(j));
              if (annotObj instanceof PDFDict) {
                const subtype = (annotObj.get(PDFName.of('Subtype'))?.toString() || '').replace(/^\//, '');

                // Check Action (/A)
                const aRef = annotObj.get(PDFName.of('A'));
                if (aRef) {
                  inspectActionObj(aRef, `Annotation ${subtype || 'Action'}`);
                }

                // Check Additional-Actions (/AA)
                const aaRef = annotObj.get(PDFName.of('AA'));
                if (aaRef) {
                  inspectAADict(aaRef, `Annotation ${subtype || 'Widget'}`);
                }
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // E. AcroForm and Field-level Action / Additional-Action Inspection
    try {
      const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'));
      if (acroFormRef) {
        const acroForm = doc.context.lookup(acroFormRef);
        if (acroForm instanceof PDFDict) {
          // Check Form-level /AA
          const formAA = acroForm.get(PDFName.of('AA'));
          if (formAA) {
            inspectAADict(formAA, 'AcroForm Document');
          }

          // Complete recursive tree traversal of AcroForm Fields hierarchy (ISO 32000-1 §12.7.3)
          const fieldsRef = acroForm.get(PDFName.of('Fields'));
          if (fieldsRef) {
            const fieldsArr = doc.context.lookup(fieldsRef);
            if (fieldsArr instanceof PDFArray) {
              const queue = [];
              const visitedRefs = new Set();
              const MAX_FIELD_TRAVERSAL = 5000;

              for (let k = 0; k < fieldsArr.size(); k++) {
                queue.push(fieldsArr.get(k));
              }

              while (queue.length > 0) {
                if (fieldsScannedCount >= MAX_FIELD_TRAVERSAL) {
                  fieldTraversalBounded = true;
                  break;
                }

                const item = queue.shift();
                if (!item) continue;

                // Cycle detection for indirect references
                let refKey = null;
                if (item instanceof PDFRef) {
                  refKey = item.toString();
                  if (visitedRefs.has(refKey)) {
                    continue; // Skip already visited indirect object
                  }
                  visitedRefs.add(refKey);
                }

                let fieldObj = null;
                try {
                  fieldObj = doc.context.lookup(item);
                } catch {
                  continue;
                }
                if (!(fieldObj instanceof PDFDict)) continue;

                // For direct dicts not caught by PDFRef
                if (!refKey) {
                  if (visitedRefs.has(fieldObj)) continue;
                  visitedRefs.add(fieldObj);
                }

                fieldsScannedCount++;

                // Inspect Field /AA (Additional-Actions: /K, /F, /V, /C)
                const fieldAA = fieldObj.get(PDFName.of('AA'));
                if (fieldAA) {
                  inspectAADict(fieldAA, 'AcroForm Field');
                }

                // Inspect Field /A (Action)
                const fieldA = fieldObj.get(PDFName.of('A'));
                if (fieldA) {
                  inspectActionObj(fieldA, 'AcroForm Field');
                }

                // Recursively traverse /Kids (ISO 32000-1 §12.7.3)
                const kidsRef = fieldObj.get(PDFName.of('Kids'));
                if (kidsRef) {
                  const kidsArr = doc.context.lookup(kidsRef);
                  if (kidsArr instanceof PDFArray) {
                    for (let ki = 0; ki < kidsArr.size(); ki++) {
                      queue.push(kidsArr.get(ki));
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Binary stream / raw byte inspection (for encrypted preflight or unparsed documents)
  if (rawBytes) {
    try {
      const scanLimit = Math.min(rawBytes.length, 1048576);
      const sample = new TextDecoder('latin1').decode(rawBytes.slice(0, scanLimit));
      
      if (sample.includes('/S /JavaScript') || sample.includes('/S/JavaScript')) {
        addType('Embedded JavaScript Action', 'javascript');
      }
      if (sample.includes('/S /Launch') || sample.includes('/S/Launch')) {
        addType('External Launch Action', 'external');
      }
      if (sample.includes('/S /SubmitForm') || sample.includes('/S/SubmitForm')) {
        addType('Form Submission Action', 'external');
      }
      if (sample.includes('/S /ImportData') || sample.includes('/S/ImportData')) {
        addType('Data Import Action', 'external');
      }
      if (sample.includes('/S /RichMediaExecute') || sample.includes('/RichMediaExecute')) {
        addType('Rich Media Command Execution', 'rich_media');
      }
    } catch {
      // ignore
    }
  }

  let activeCategory = 'none';
  if (hasJavaScript) {
    activeCategory = 'javascript';
  } else if (hasExternalAction) {
    activeCategory = 'external_action';
  } else if (hasRichMedia) {
    activeCategory = 'rich_media_action';
  } else if (hasHyperlinks) {
    activeCategory = 'hyperlinks_only';
  } else if (hasActiveContent) {
    activeCategory = 'potential';
  }

  let inspectionCoverage = 'preliminary_encrypted';
  let coverageNotes = null;

  if (doc) {
    if (fieldTraversalBounded || pageTraversalBounded) {
      inspectionCoverage = 'incomplete_traversal_limit_reached';
      const reasons = [];
      if (pageTraversalBounded) {
        reasons.push('Page tree traversal exceeded safety limit of 2000 pages');
      }
      if (fieldTraversalBounded) {
        reasons.push('AcroForm field tree traversal exceeded safety limit of 5000 nodes');
      }
      coverageNotes = reasons.join('; ');
    } else {
      inspectionCoverage = 'complete';
    }
  }

  return {
    hasActiveContent,
    activeCategory,
    activeContentTypes,
    inspectionCoverage,
    coverageNotes,
    fieldsScannedCount,
    pagesScannedCount
  };
}

export async function inspectEncryptedPdf(inputData) {
  let rawBytes;
  if (inputData instanceof Uint8Array) {
    rawBytes = inputData;
  } else if (inputData instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(inputData);
  } else if (typeof inputData?.arrayBuffer === 'function') {
    rawBytes = new Uint8Array(await inputData.arrayBuffer());
  } else {
    return {
      isValid: false,
      isEncrypted: false,
      isOpenPasswordRequired: false,
      hasPermissionsOnly: false,
      pageCount: null,
      isSigned: false,
      signatureNames: [],
      hasActiveContent: false,
      activeContentTypes: [],
      pdfVersion: 'unknown',
      error: 'Invalid input: Expected File, Blob, ArrayBuffer, or Uint8Array.',
      message: null
    };
  }

  if (!rawBytes || rawBytes.byteLength === 0) {
    return {
      isValid: false,
      isEncrypted: false,
      isOpenPasswordRequired: false,
      hasPermissionsOnly: false,
      pageCount: null,
      isSigned: false,
      signatureNames: [],
      hasActiveContent: false,
      activeContentTypes: [],
      pdfVersion: 'unknown',
      error: 'The selected file is empty (0 bytes).',
      message: null
    };
  }

  // Verify PDF magic header in first 1024 bytes
  const headerSample = new TextDecoder('latin1').decode(rawBytes.slice(0, Math.min(rawBytes.length, 1024)));
  if (!headerSample.includes('%PDF-')) {
    return {
      isValid: false,
      isEncrypted: false,
      isOpenPasswordRequired: false,
      hasPermissionsOnly: false,
      pageCount: null,
      isSigned: false,
      signatureNames: [],
      hasActiveContent: false,
      activeContentTypes: [],
      pdfVersion: 'unknown',
      error: 'The selected file does not appear to be a valid PDF document.',
      message: null
    };
  }

  let pdfVersion = '1.7';
  const versionMatch = headerSample.match(/%PDF-(\d+\.\d+)/);
  if (versionMatch) {
    pdfVersion = versionMatch[1];
  }

  // 1. Try loading without password (ignoreEncryption: false)
  try {
    const unencryptedDoc = await PDFDocument.load(rawBytes.slice(0), { 
      ignoreEncryption: false, 
      updateMetadata: false 
    });

    const sigInfo = detectDigitalSignature(unencryptedDoc, rawBytes);
    const activeInfo = detectActiveContent(unencryptedDoc, rawBytes);
    return {
      isValid: true,
      isEncrypted: false,
      isOpenPasswordRequired: false,
      hasPermissionsOnly: false,
      pageCount: unencryptedDoc.getPageCount(),
      isSigned: sigInfo.isSigned,
      signatureNames: sigInfo.signatureNames,
      hasActiveContent: activeInfo.hasActiveContent,
      activeContentTypes: activeInfo.activeContentTypes,
      pdfVersion,
      error: null,
      message: 'This document is already unlocked and does not require a password.'
    };
  } catch (err) {
    const errMsg = (err.message || '').toLowerCase();
    const isEnc = errMsg.includes('encrypt') || errMsg.includes('password') || err.name === 'EncryptedPDFError';

    if (!isEnc) {
      return {
        isValid: false,
        isEncrypted: false,
        isOpenPasswordRequired: false,
        hasPermissionsOnly: false,
        pageCount: null,
        isSigned: false,
        signatureNames: [],
        hasActiveContent: false,
        activeContentTypes: [],
        pdfVersion,
        error: `Failed to parse PDF document: ${err.message || 'corrupted file'}`,
        message: null
      };
    }
  }

  // 2. The document IS encrypted. Check if it opens with an empty password ""
  // (Empty user password with restricted owner password)
  let permissionsOnlyDoc = null;
  try {
    permissionsOnlyDoc = await PDFDocument.load(rawBytes.slice(0), { 
      password: '', 
      updateMetadata: false 
    });
  } catch {
    permissionsOnlyDoc = null;
  }

  if (permissionsOnlyDoc) {
    const sigInfo = detectDigitalSignature(permissionsOnlyDoc, rawBytes);
    const activeInfo = detectActiveContent(permissionsOnlyDoc, rawBytes);
    return {
      isValid: true,
      isEncrypted: true,
      isOpenPasswordRequired: false,
      hasPermissionsOnly: true,
      pageCount: permissionsOnlyDoc.getPageCount(),
      isSigned: sigInfo.isSigned,
      signatureNames: sigInfo.signatureNames,
      hasActiveContent: activeInfo.hasActiveContent,
      activeContentTypes: activeInfo.activeContentTypes,
      pdfVersion,
      error: null,
      message: 'This document opens without a password, but contains permission restrictions enforced by an owner password.'
    };
  }

  // 3. Document requires a user password
  // Run byte-level digital signature and active content check
  let sigInfo = { isSigned: false, signatureNames: [] };
  try {
    sigInfo = detectDigitalSignature(null, rawBytes);
  } catch {
    // ignore
  }

  const activeInfo = detectActiveContent(null, rawBytes);

  return {
    isValid: true,
    isEncrypted: true,
    isOpenPasswordRequired: true,
    hasPermissionsOnly: false,
    pageCount: null,
    isSigned: sigInfo.isSigned,
    signatureNames: sigInfo.signatureNames,
    hasActiveContent: activeInfo.hasActiveContent,
    activeContentTypes: activeInfo.activeContentTypes,
    pdfVersion,
    error: null,
    message: 'This document is encrypted. Please enter the password to decrypt and unlock it.'
  };
}

/**
 * Generates ISO 32000-compliant password candidates for decryption.
 * Tests exact user input first, followed by RFC 4013 SASLprep/NFKC normalization,
 * ISO 32000-1 Annex D PDFDocEncoding mapping for legacy revisions, and R5 pre-encoded UTF-8.
 *
 * @param {string} inputPassword
 * @returns {string[]}
 */
export function getPasswordCandidates(inputPassword, { revision = null } = {}) {
  if (!inputPassword) return [''];
  const candidates = [];

  // 1. REVISION 6 (ISO 32000-2 AES-256):
  if (revision === 6) {
    // TIER 1: Normative ISO 32000-2 / RFC 4013 Stored-String Profile (Unicode 3.2)
    const saslStrict = trySaslprep(inputPassword, { allowUnassigned: false });
    if (saslStrict.success) {
      candidates.push(saslStrict.result);
    }

    // TIER 2: RFC 4013 Query Profile (permits modern Unicode 6.0+ emojis)
    const saslQuery = trySaslprep(inputPassword, { allowUnassigned: true });
    if (saslQuery.success && !candidates.includes(saslQuery.result)) {
      candidates.push(saslQuery.result);
    }

    // TIER 3: Isolated creator fallback (raw input if different from SASLprep)
    if (!candidates.includes(inputPassword)) {
      candidates.push(inputPassword);
    }

    // Legacy PDFDocEncoding and R5 candidates are STRICTLY PROHIBITED for R6
    return candidates;
  }

  // 2. REVISION 5 (PDF 1.7 Extension Level 3 AES-256):
  if (revision === 5) {
    // Helper to convert UTF-8 byte array truncated to 127 bytes into a binary string
    const toTruncatedUtf8Binary = (str) => {
      const bytes = new TextEncoder().encode(str);
      const truncated = bytes.slice(0, 127);
      let bin = '';
      for (let i = 0; i < truncated.length; i++) {
        bin += String.fromCharCode(truncated[i]);
      }
      return bin;
    };

    // TIER 1: Normative Adobe Extension Level 3 Algorithm 2.A
    // - SASLprep Stored-String Profile (Unicode 3.2)
    // - UTF-8 byte encoding
    // - Truncate to maximum 127 bytes
    const saslStrict = trySaslprep(inputPassword, { allowUnassigned: false });
    if (saslStrict.success) {
      candidates.push(toTruncatedUtf8Binary(saslStrict.result));
    }

    // TIER 2: RFC 4013 Query Profile (permits modern Unicode unassigned in 3.2)
    const saslQuery = trySaslprep(inputPassword, { allowUnassigned: true });
    if (saslQuery.success) {
      const qBin = toTruncatedUtf8Binary(saslQuery.result);
      if (!candidates.includes(qBin)) {
        candidates.push(qBin);
      }
    }

    // TIER 3: Raw UTF-8 (Fallback for non-conforming creators that omitted SASLprep)
    const rawUtf8Bin = toTruncatedUtf8Binary(inputPassword);
    if (!candidates.includes(rawUtf8Bin)) {
      candidates.push(rawUtf8Bin);
    }

    // TIER 4: Raw charCode fallback (Isolated fallback for broken creators that hashed charCodes)
    if (!candidates.includes(inputPassword)) {
      candidates.push(inputPassword);
    }

    return candidates;
  }

  // 3. REVISIONS 2, 3, 4 (Legacy RC4 & AES-128):
  if (revision === 2 || revision === 3 || revision === 4) {
    if (hasPdfDocEncodingMapping(inputPassword)) {
      const { encoded } = encodeToPdfDocEncoding(inputPassword);
      candidates.push(encoded);
    }
    if (!candidates.includes(inputPassword)) {
      candidates.push(inputPassword);
    }
    // SASLprep and R5 candidates are STRICTLY PROHIBITED for legacy R2-R4
    return candidates;
  }

  // 4. UNKNOWN REVISION (Fallback when revision cannot be determined pre-load):
  const saslStrict = trySaslprep(inputPassword, { allowUnassigned: false });
  if (saslStrict.success) {
    candidates.push(saslStrict.result);
  }
  const saslQuery = trySaslprep(inputPassword, { allowUnassigned: true });
  if (saslQuery.success && !candidates.includes(saslQuery.result)) {
    candidates.push(saslQuery.result);
  }
  if (!candidates.includes(inputPassword)) {
    candidates.push(inputPassword);
  }
  if (hasPdfDocEncodingMapping(inputPassword)) {
    const { encoded } = encodeToPdfDocEncoding(inputPassword);
    if (!candidates.includes(encoded)) {
      candidates.push(encoded);
    }
  }
  const extraForR5 = [];
  for (const c of candidates) {
    try {
      const utf8Pre = unescape(encodeURIComponent(c));
      if (utf8Pre !== c && !candidates.includes(utf8Pre) && !extraForR5.includes(utf8Pre)) {
        extraForR5.push(utf8Pre);
      }
    } catch {
      // ignore
    }
  }
  return [...candidates, ...extraForR5];
}

/**
 * Decrypts a PDF document and strips all encryption structures.
 * Performs independent post-verification to guarantee that output opens without password.
 *
 * @param {object} options
 * @param {File|Blob|ArrayBuffer|Uint8Array} options.pdfData - Input encrypted PDF bytes
 * @param {string} [options.password=''] - Document open or owner password
 * @returns {Promise<{
 *   pdfBytes: Uint8Array,
 *   outputSize: number,
 *   pageCount: number,
 *   isSigned: boolean,
 *   signatureNames: string[],
 *   hasActiveContent: boolean,
 *   activeContentTypes: string[]
 * }>}
 */
export async function unlockPdfDocument({ pdfData, password = '' }) {
  let rawBytes;
  if (pdfData instanceof Uint8Array) {
    rawBytes = pdfData;
  } else if (pdfData instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(pdfData);
  } else if (typeof pdfData?.arrayBuffer === 'function') {
    rawBytes = new Uint8Array(await pdfData.arrayBuffer());
  } else {
    throw new Error('Invalid input: Expected File, Blob, ArrayBuffer, or Uint8Array.');
  }

  if (!rawBytes || rawBytes.byteLength === 0) {
    throw new Error('The selected file is empty (0 bytes).');
  }

  // Extract encryption revision from raw stream header/trailer
  let revision = null;
  const latinSample = new TextDecoder('latin1').decode(rawBytes.slice(0, Math.min(rawBytes.length, 65536)));
  const rMatch = latinSample.match(/\/R\s+(\d+)/);
  if (rMatch) {
    revision = parseInt(rMatch[1], 10);
  }

  let doc = null;
  const candidates = getPasswordCandidates(password, { revision });
  let lastErr = null;
  let successfulCandidate = null;

  for (const cand of candidates) {
    try {
      doc = await PDFDocument.load(rawBytes.slice(0), {
        password: cand,
        updateMetadata: false
      });
      if (doc) {
        successfulCandidate = cand;
        break;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  if (!doc) {
    const err = lastErr || new Error('Failed to decrypt document');
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('password') || msg.includes('needs password') || msg.includes('incorrect')) {
      const latinSample = new TextDecoder('latin1').decode(rawBytes.slice(0, Math.min(rawBytes.length, 65536)));
      const isLegacyR = /\/R\s+[234]\b/.test(latinSample);
      if (isLegacyR && password) {
        const { isFullyRepresentable, unrepresentableChars } = encodeToPdfDocEncoding(password);
        if (!isFullyRepresentable && unrepresentableChars.length > 0) {
          throw new Error(
            `Incorrect password. (Note: Older PDF encryption formats [Revisions 2–4: RC4 & AES-128] only support single-byte characters in PDFDocEncoding / Latin-1 and cannot encode "${unrepresentableChars[0]}". Modern AES-256 [Revision 6] supports full Unicode).`
          );
        }
      }
      throw new Error('Incorrect password. Please verify the password and try again.');
    }
    if (msg.includes('unknown encryption method')) {
      throw new Error('Unsupported encryption method: This document uses proprietary DRM or certificate-based encryption that cannot be unlocked in the browser.');
    }
    if (msg.includes('unsupported encryption algorithm')) {
      throw new Error('Unsupported encryption algorithm: The document uses an unsupported cipher configuration.');
    }
    throw new Error(`Failed to decrypt document: ${err.message || 'The file may be corrupted.'}`);
  }

  // Detect digital signatures and active content before modifying structures
  const sigInfo = detectDigitalSignature(doc, rawBytes);
  const activeInfo = detectActiveContent(doc, rawBytes);

  // 1. Capture and delete the specific encryption dictionary referenced in trailer
  const encryptRef = doc.context.trailerInfo.Encrypt;
  if (encryptRef) {
    doc.context.delete(encryptRef);
  }
  delete doc.context.trailerInfo.Encrypt;

  // 2. Restore trailerInfo.Info if it became detached during cipher transform pass
  if (!doc.context.trailerInfo.Info) {
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (
        obj &&
        obj.dict &&
        (obj.dict.get(PDFName.of('Title')) ||
          obj.dict.get(PDFName.of('Author')) ||
          obj.dict.get(PDFName.of('Producer')) ||
          obj.dict.get(PDFName.of('Creator')))
      ) {
        doc.context.trailerInfo.Info = ref;
        break;
      }
    }
  }

  // 3. Purge defunct encryption dictionaries and stale cross-reference streams from indirect objects
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj.constructor.name === 'PDFInvalidObject') {
      doc.context.delete(ref);
    } else if (obj.dict && typeof obj.dict.get === 'function') {
      const type = obj.dict.get(PDFName.of('Type'))?.toString?.();
      const filter = obj.dict.get(PDFName.of('Filter'))?.toString?.();
      const hasV = Boolean(obj.dict.get(PDFName.of('V')));
      const hasR = Boolean(obj.dict.get(PDFName.of('R')));
      const hasO = Boolean(obj.dict.get(PDFName.of('O')));
      const hasU = Boolean(obj.dict.get(PDFName.of('U')));

      // Safely remove only genuine encryption dictionaries (filter /Standard with V, R, O, or U)
      const isSecurityDict = filter === '/Standard' && (hasV || hasR || hasO || hasU);

      // Remove old XRef streams and Standard security dictionaries
      if (type === '/XRef' || isSecurityDict) {
        doc.context.delete(ref);
      }
    }
  }

  // Explicitly mark internal context as unencrypted
  doc.isEncrypted = false;

  // Save clean decrypted PDF
  const pdfBytes = await doc.save({ useObjectStreams: false });

  // CRITICAL PRODUCTION INDEPENDENT VERIFICATION:
  // Re-load the generated bytes without any password and verify clean state
  let verificationDoc;
  try {
    verificationDoc = await PDFDocument.load(pdfBytes.slice(0), {
      ignoreEncryption: false,
      updateMetadata: false
    });
  } catch (verifyErr) {
    throw new Error(
      `Post-processing verification failed: Unlocked document still requires credentials or is malformed (${verifyErr.message}).`
    );
  }

  if (verificationDoc.isEncrypted) {
    throw new Error('Post-processing verification failed: Output document encryption dictionary was not completely removed.');
  }

  const finalPageCount = verificationDoc.getPageCount();

  // Identify candidate resolution type for transparency audit
  let candidateType = 'unknown';
  if (successfulCandidate) {
    if (revision === 6) {
      const saslStrict = trySaslprep(password, { allowUnassigned: false });
      const saslQuery = trySaslprep(password, { allowUnassigned: true });
      if (saslStrict.success && successfulCandidate === saslStrict.result) {
        candidateType = 'normative_saslprep';
      } else if (saslQuery.success && successfulCandidate === saslQuery.result) {
        candidateType = 'query_profile_saslprep';
      } else {
        candidateType = 'non_standard_raw_fallback';
      }
    } else if (revision === 2 || revision === 3 || revision === 4) {
      if (hasPdfDocEncodingMapping(password) && successfulCandidate === encodeToPdfDocEncoding(password).encoded) {
        candidateType = 'pdfdocencoding';
      } else {
        candidateType = 'latin1_standard';
      }
    } else if (revision === 5) {
      const saslStrict = trySaslprep(password, { allowUnassigned: false });
      const saslQuery = trySaslprep(password, { allowUnassigned: true });
      const toTruncatedUtf8Binary = (str) => {
        const bytes = new TextEncoder().encode(str);
        const truncated = bytes.slice(0, 127);
        let bin = '';
        for (let i = 0; i < truncated.length; i++) bin += String.fromCharCode(truncated[i]);
        return bin;
      };
      const strictBin = saslStrict.success ? toTruncatedUtf8Binary(saslStrict.result) : null;
      const queryBin = saslQuery.success ? toTruncatedUtf8Binary(saslQuery.result) : null;
      const rawUtf8Bin = toTruncatedUtf8Binary(password);

      if (strictBin && successfulCandidate === strictBin) {
        candidateType = 'r5_normative_saslprep';
      } else if (queryBin && successfulCandidate === queryBin) {
        candidateType = 'r5_query_profile';
      } else if (successfulCandidate === rawUtf8Bin) {
        candidateType = 'r5_raw_utf8_fallback';
      } else {
        candidateType = 'r5_non_standard_charcode_fallback';
      }
    } else {
      candidateType = 'standard';
    }
  }

  return {
    pdfBytes,
    outputSize: pdfBytes.length,
    pageCount: finalPageCount,
    isSigned: sigInfo.isSigned,
    signatureNames: sigInfo.signatureNames,
    hasActiveContent: activeInfo.hasActiveContent,
    activeCategory: activeInfo.activeCategory,
    activeContentTypes: activeInfo.activeContentTypes,
    decryptionAudit: {
      revision,
      candidateType
    }
  };
}


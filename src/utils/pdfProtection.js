import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHeader } from '@cantoo/pdf-lib';

/**
 * PDF Protection & Encryption Utilities for PDFTools4U
 * Implements ISO 32000-1 Standard Security Handler (V=4, R=4) AES-128 Encryption.
 */

/**
 * Evaluates password strength and character compatibility for PDF Standard Security Handler.
 * ISO 32000-1 Algorithm 2 requires Latin-1 (code points <= 255).
 * ISO 32000-1 Algorithm 2 uses up to 32 bytes for key derivation.
 *
 * @param {string} password
 * @returns {object} Evaluation results
 */
export function evaluatePassword(password = '') {
  if (typeof password !== 'string') {
    password = '';
  }

  const length = password.length;
  let hasUnsupportedUnicode = false;
  let unsupportedChar = null;

  for (let i = 0; i < length; i++) {
    const code = password.charCodeAt(i);
    if (code > 0xff) {
      hasUnsupportedUnicode = true;
      unsupportedChar = password[i];
      break;
    }
  }

  const hasSpaces = password.includes(' ');
  const hasLeadingOrTrailingSpaces = password.startsWith(' ') || password.endsWith(' ');
  const isLong = length > 32;

  // Calculate strength score (0 to 100)
  let score = 0;
  if (length >= 6) score += 20;
  if (length >= 10) score += 25;
  if (length >= 16) score += 15;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;

  let label = 'Weak';
  let color = 'text-red-500';
  let barColor = 'bg-red-500';

  if (score >= 80) {
    label = 'Strong';
    color = 'text-emerald-600';
    barColor = 'bg-emerald-500';
  } else if (score >= 50) {
    label = 'Good';
    color = 'text-blue-600';
    barColor = 'bg-blue-500';
  } else if (score >= 25) {
    label = 'Fair';
    color = 'text-amber-500';
    barColor = 'bg-amber-500';
  }

  return {
    length,
    score: Math.min(score, 100),
    label,
    color,
    barColor,
    hasUnsupportedUnicode,
    unsupportedChar,
    hasSpaces,
    hasLeadingOrTrailingSpaces,
    isLong,
    isValid: length > 0 && !hasUnsupportedUnicode
  };
}

/**
 * Generates a cryptographically strong, random 32-character owner password.
 * Uses a cryptographically secure random number generator (CSPRNG) with rejection
 * sampling to completely eliminate modulo bias.
 * Guarantees that the generated owner password is never equal to the user password.
 *
 * @param {number} [length=32]
 * @param {string} [excludePassword='']
 * @returns {string} 32-character high-entropy ASCII password
 */
export function generateRandomOwnerPassword(length = 32, excludePassword = '') {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues
      ? globalThis.crypto
      : (typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null);

  if (!cryptoObj) {
    throw new Error('Cryptographically secure random number generator (crypto.getRandomValues) is required but unavailable.');
  }

  // Modulo bias elimination via rejection sampling:
  // 256 % charset.length = 256 % 76 = 28.
  // We only accept random bytes strictly < (256 - 28) = 228.
  const maxValidByte = 256 - (256 % charset.length);

  let result = '';
  const buffer = new Uint8Array(1);

  while (result.length < length) {
    cryptoObj.getRandomValues(buffer);
    const byte = buffer[0];
    if (byte < maxValidByte) {
      result += charset[byte % charset.length];
    }
  }

  // Guarantee owner password is never identical to user password
  if (excludePassword && result === excludePassword) {
    return generateRandomOwnerPassword(length, excludePassword);
  }

  return result;
}

/**
 * Detects whether a PDF contains digital signatures (/ByteRange, /Sig).
 * Inspects AcroForm Fields recursively (including nested Kids), checks that the
 * field has an active signature value dictionary (/V), and performs backup byte
 * inspection scanning both file head and tail for authentic /ByteRange structures.
 */
export function detectDigitalSignature(doc, rawBytes) {
  let isSigned = false;
  const signatureNames = [];

  try {
    const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'));
    if (acroFormRef) {
      const acroForm = doc.context.lookup(acroFormRef);
      if (acroForm instanceof PDFDict) {
        const fields = acroForm.get(PDFName.of('Fields'));
        if (fields instanceof PDFArray) {
          // Traverse fields including any nested Kids
          const fieldQueue = [];
          for (let i = 0; i < fields.size(); i++) {
            fieldQueue.push(fields.get(i));
          }

          while (fieldQueue.length > 0) {
            const currentRef = fieldQueue.shift();
            const field = doc.context.lookup(currentRef);
            if (!field || !(field instanceof PDFDict)) continue;

            const kids = field.get(PDFName.of('Kids'));
            if (kids instanceof PDFArray) {
              for (let k = 0; k < kids.size(); k++) {
                fieldQueue.push(kids.get(k));
              }
            }

            if (field.get(PDFName.of('FT'))?.toString() === '/Sig') {
              const sigObjRef = field.get(PDFName.of('V'));
              if (sigObjRef) {
                const sigObj = doc.context.lookup(sigObjRef);
                if (sigObj instanceof PDFDict) {
                  isSigned = true;
                  const rawName = sigObj.get(PDFName.of('Name'))?.asString();
                  if (rawName) {
                    const decoded = rawName
                      .replace(/^\//, '')
                      .replace(/#([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
                    signatureNames.push(decoded);
                  } else {
                    const fieldName = field.get(PDFName.of('T'))?.asString() || 'Digitally Signed Field';
                    signatureNames.push(fieldName);
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // Gracefully fallback to byte scan
  }

  // Backup byte inspection: checks both head and tail (to catch incremental update revisions)
  // for authentic /ByteRange [n n n n] signature structures
  if (!isSigned && rawBytes) {
    try {
      const maxScan = 2 * 1024 * 1024;
      let text;
      if (rawBytes.length <= maxScan) {
        text = new TextDecoder('latin1').decode(rawBytes);
      } else {
        const head = new TextDecoder('latin1').decode(rawBytes.slice(0, 1048576));
        const tail = new TextDecoder('latin1').decode(rawBytes.slice(-1048576));
        text = head + '\n' + tail;
      }

      const hasByteRange = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\]/.test(text);
      const hasSigDict = text.includes('/Type /Sig') || text.includes('/Type/Sig') || text.includes('/SubFilter');
      if (hasByteRange && hasSigDict) {
        isSigned = true;
      }
    } catch {
      // ignore
    }
  }

  return { isSigned, signatureNames };
}

/**
 * Inspects an annotation dictionary and any linked annotations (e.g. /Popup).
 */
function inspectAnnotationDict(annotDict, detectedFeatures) {
  if (!annotDict || !(annotDict instanceof PDFDict)) return;

  const subtype = annotDict.get(PDFName.of('Subtype'))?.toString();
  if (subtype === '/3D') {
    detectedFeatures.add('3D PRC Content');
  } else if (subtype === '/RichMedia') {
    detectedFeatures.add('RichMedia Content');
  } else if (subtype === '/Projection') {
    detectedFeatures.add('Geospatial Projection Annotation');
  }

  if (annotDict.get(PDFName.of('AF'))) {
    detectedFeatures.add('Associated Files (/AF)');
  }

  // Nested /Popup annotation inspection
  try {
    const popupRef = annotDict.get(PDFName.of('Popup'));
    if (popupRef && annotDict.context) {
      const popup = annotDict.context.lookup(popupRef);
      if (popup instanceof PDFDict) {
        const pSubtype = popup.get(PDFName.of('Subtype'))?.toString();
        if (pSubtype === '/3D') detectedFeatures.add('3D PRC Content');
        if (pSubtype === '/RichMedia') detectedFeatures.add('RichMedia Content');
        if (pSubtype === '/Projection') detectedFeatures.add('Geospatial Projection Annotation');
      }
    }
  } catch {
    // ignore nested lookup error
  }
}

/**
 * Hardened PDF 2.0 advanced-feature inspection engine.
 * Inspects document catalog, page dictionaries, annotations, and embedded-file relationships.
 * Explicitly distinguishes between 'detected', 'not_detected', and 'incomplete'.
 *
 * @param {PDFDocument} doc - Parsed PDF document AST
 * @param {Uint8Array} [rawBytes] - Raw PDF binary bytes
 * @returns {{ status: 'detected'|'not_detected'|'incomplete', features: string[], inspectedPages: number, totalPages: number, reason: string|null }}
 */
export function inspectPdf20AdvancedFeatures(doc, rawBytes) {
  const detectedFeatures = new Set();
  let inspectionStatus = 'complete';
  let incompleteReason = null;
  let inspectedPages = 0;
  let totalPages = 0;

  try {
    if (doc && typeof doc.getPageCount === 'function') {
      totalPages = doc.getPageCount();
    }

    // 1. Inspect Document Catalog
    if (doc && doc.catalog) {
      // Associated Files (/AF) in Catalog
      if (doc.catalog.get(PDFName.of('AF'))) {
        detectedFeatures.add('Associated Files (/AF)');
      }

      // Optional Content Groups (/OCProperties / Layers) in Catalog
      if (doc.catalog.get(PDFName.of('OCProperties'))) {
        detectedFeatures.add('Optional Content Groups (Layers)');
      }

      // Catalog-level OutputIntents
      if (doc.catalog.get(PDFName.of('OutputIntents'))) {
        detectedFeatures.add('Catalog Output Intents');
      }

      // Document Part Structure (/DPartRoot) - PDF 2.0 ISO 32000-2 clause 14.12
      if (doc.catalog.get(PDFName.of('DPartRoot'))) {
        detectedFeatures.add('Document Part Structure (/DPartRoot)');
      }

      // Names -> EmbeddedFiles with /AFRelationship
      const namesRef = doc.catalog.get(PDFName.of('Names'));
      if (namesRef) {
        const names = doc.context.lookup(namesRef);
        if (names instanceof PDFDict) {
          const embFiles = names.get(PDFName.of('EmbeddedFiles'));
          if (embFiles) {
            const embDict = doc.context.lookup(embFiles);
            if (embDict instanceof PDFDict) {
              const namesArr = embDict.get(PDFName.of('Names'));
              if (namesArr instanceof PDFArray) {
                for (let i = 1; i < namesArr.size(); i += 2) {
                  const filespec = doc.context.lookup(namesArr.get(i));
                  if (filespec instanceof PDFDict && filespec.get(PDFName.of('AFRelationship'))) {
                    detectedFeatures.add('Associated Files (/AF)');
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Inspect Pages and Page-level Annotations
    if (doc && typeof doc.getPageCount === 'function') {
      const maxPagesToInspect = 100;
      const pagesToInspect = Math.min(totalPages, maxPagesToInspect);
      inspectedPages = pagesToInspect;

      for (let i = 0; i < pagesToInspect; i++) {
        const page = doc.getPage(i);
        if (!page || !page.node) continue;

        // Page-level Associated Files
        if (page.node.get(PDFName.of('AF'))) {
          detectedFeatures.add('Associated Files (/AF)');
        }

        // Page-level Output Intents (PDF 2.0 ISO 32000-2 clause 14.11.5)
        if (page.node.get(PDFName.of('OutputIntents'))) {
          detectedFeatures.add('Page-level Output Intents');
        }

        // Inspect Annotations on Page
        const annotsRef = page.node.get(PDFName.of('Annots'));
        if (annotsRef) {
          const annots = doc.context.lookup(annotsRef);
          if (annots instanceof PDFArray) {
            for (let a = 0; a < annots.size(); a++) {
              const annotRef = annots.get(a);
              const annot = doc.context.lookup(annotRef);
              if (annot instanceof PDFDict) {
                inspectAnnotationDict(annot, detectedFeatures);
              }
            }
          }
        }
      }

      if (totalPages > maxPagesToInspect) {
        inspectionStatus = 'incomplete';
        incompleteReason = `Document exceeds ${maxPagesToInspect} pages (inspected first ${maxPagesToInspect} of ${totalPages} pages). Advanced features may exist on uninspected pages.`;
      }
    }
  } catch (err) {
    inspectionStatus = 'incomplete';
    incompleteReason = `Structural inspection encountered unparseable or malformed object: ${err.message || 'traversal error'}`;
  }

  // 3. Fallback targeted syntax regex scan for unreferenced or trailing objects
  // Avoids simplistic substring search; requires authentic PDF dictionary/array syntax
  if (rawBytes && rawBytes.length > 0) {
    try {
      const maxScan = 4 * 1024 * 1024;
      let text;
      if (rawBytes.length <= maxScan) {
        text = new TextDecoder('latin1').decode(rawBytes);
      } else {
        const head = new TextDecoder('latin1').decode(rawBytes.slice(0, 1048576));
        const midStart = Math.floor(rawBytes.length / 2) - 524288;
        const mid = new TextDecoder('latin1').decode(rawBytes.slice(midStart, midStart + 1048576));
        const tail = new TextDecoder('latin1').decode(rawBytes.slice(-1048576));
        text = head + '\n' + mid + '\n' + tail;
      }

      // Syntax-specific checks:
      // Associated Files syntax: /AF [ ... ] or /AF \d+ \d+ R or /AFRelationship /...
      if (/(?:\/AF\s*\[|\/AF\s+\d+\s+\d+\s+R|\/AFRelationship\s*\/)/.test(text) && !detectedFeatures.has('Associated Files (/AF)')) {
        detectedFeatures.add('Associated Files (/AF)');
      }

      // Layers syntax: /OCProperties << or /OCProperties \d+ \d+ R or /Type /OCG or /OCGs [
      if (/(?:\/OCProperties\s*<<|\/OCProperties\s+\d+\s+\d+\s+R|\/Type\s*\/OCG\b|\/OCGs\s*\[)/.test(text) && !detectedFeatures.has('Optional Content Groups (Layers)')) {
        detectedFeatures.add('Optional Content Groups (Layers)');
      }

      // 3D Content: /Subtype /3D or /Type /3D
      if (/(?:\/Subtype\s*\/3D\b|\/Type\s*\/3D\b)/.test(text) && !detectedFeatures.has('3D PRC Content')) {
        detectedFeatures.add('3D PRC Content');
      }

      // RichMedia: /Subtype /RichMedia or /Type /RichMedia
      if (/(?:\/Subtype\s*\/RichMedia\b|\/Type\s*\/RichMedia\b)/.test(text) && !detectedFeatures.has('RichMedia Content')) {
        detectedFeatures.add('RichMedia Content');
      }

      // Projection: /Subtype /Projection
      if (/\/Subtype\s*\/Projection\b/.test(text) && !detectedFeatures.has('Geospatial Projection Annotation')) {
        detectedFeatures.add('Geospatial Projection Annotation');
      }

      // Output Intents: /OutputIntents [ or /OutputIntents \d+ \d+ R
      if (/(?:\/OutputIntents\s*\[|\/OutputIntents\s+\d+\s+\d+\s+R)/.test(text) && !detectedFeatures.has('Page-level Output Intents') && !detectedFeatures.has('Catalog Output Intents')) {
        detectedFeatures.add('Catalog Output Intents');
      }

      // Document Part: /DPartRoot << or /DPartRoot \d+ \d+ R
      if (/(?:\/DPartRoot\s*<<|\/DPartRoot\s+\d+\s+\d+\s+R)/.test(text) && !detectedFeatures.has('Document Part Structure (/DPartRoot)')) {
        detectedFeatures.add('Document Part Structure (/DPartRoot)');
      }
    } catch {
      // ignore byte scan errors
    }
  }

  const features = Array.from(detectedFeatures);
  let status;
  if (features.length > 0) {
    status = 'detected';
  } else if (inspectionStatus === 'incomplete') {
    status = 'incomplete';
  } else {
    status = 'not_detected';
  }

  return {
    status,
    features,
    inspectedPages,
    totalPages,
    reason: incompleteReason
  };
}

/**
 * Performs preflight inspection on an input PDF file or byte array.
 * Detects 0-byte files, non-PDFs, existing encryption, digital signatures, and page count.
 */
export async function preflightInspectPdf(inputData) {
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
      error: 'Invalid input: Expected File, Blob, ArrayBuffer, or Uint8Array.'
    };
  }

  if (!rawBytes || rawBytes.byteLength === 0) {
    return {
      isValid: false,
      isEncrypted: false,
      isSigned: false,
      error: 'The selected file is empty (0 bytes).'
    };
  }

  const headerSample = new TextDecoder('latin1').decode(rawBytes.slice(0, Math.min(rawBytes.length, 1024)));
  if (!headerSample.includes('%PDF-')) {
    return {
      isValid: false,
      isEncrypted: false,
      isSigned: false,
      error: 'The selected file does not appear to be a valid PDF document.'
    };
  }

  let doc;
  try {
    doc = await PDFDocument.load(rawBytes.slice(0), { ignoreEncryption: false });
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    const isEnc = msg.includes('encrypt') || msg.includes('password') || err.name === 'EncryptedPDFError';
    if (isEnc) {
      return {
        isValid: false,
        isEncrypted: true,
        isSigned: false,
        error: 'This document is already password-protected / encrypted. Please unlock it first using the Unlock PDF tool.'
      };
    }
    return {
      isValid: false,
      isEncrypted: false,
      isSigned: false,
      error: err.message || 'Failed to read PDF document.'
    };
  }

  const sigInfo = detectDigitalSignature(doc, rawBytes);
  const pageCount = doc.getPageCount();

  // Detect PDF Version from header and catalog
  let pdfVersion = '1.7';
  const versionMatch = headerSample.match(/%PDF-(\d+\.\d+)/);
  if (versionMatch) {
    pdfVersion = versionMatch[1];
  }
  try {
    const catalogVersion = doc.catalog.get(PDFName.of('Version'))?.toString();
    if (catalogVersion && catalogVersion.startsWith('/')) {
      pdfVersion = catalogVersion.slice(1);
    }
  } catch {
    // ignore
  }

  const isPdf20 = pdfVersion.startsWith('2.') || parseFloat(pdfVersion) >= 2.0;

  let featureInspection = {
    status: 'not_applicable',
    features: [],
    inspectedPages: 0,
    totalPages: pageCount,
    reason: null
  };

  if (isPdf20) {
    featureInspection = inspectPdf20AdvancedFeatures(doc, rawBytes);
  }

  const advancedFeatures = featureInspection.features || [];

  let warning = null;
  if (isPdf20) {
    if (featureInspection.status === 'detected') {
      warning = `PDF 2.0 Compatibility Notice: This document uses the PDF 2.0 specification. Standard in-browser encryption encapsulates the document in a PDF 1.7 container with AES-128 encryption. Unsupported advanced features detected: ${advancedFeatures.join(', ')}. These features cannot be preserved under PDF 1.7.`;
    } else if (featureInspection.status === 'incomplete') {
      warning = `PDF 2.0 Compatibility Notice: This document uses the PDF 2.0 specification. Preflight inspection was incomplete (${featureInspection.reason}). Unsupported features may be present and cannot be preserved under PDF 1.7.`;
    } else {
      warning = 'PDF 2.0 Compatibility Notice: This document uses the PDF 2.0 specification. Standard in-browser encryption encapsulates the document in a PDF 1.7 container with AES-128 encryption. Complete preflight inspection detected no known advanced features.';
    }
  }

  return {
    isValid: true,
    isEncrypted: false,
    isSigned: sigInfo.isSigned,
    signatureNames: sigInfo.signatureNames,
    isPdf20,
    pdfVersion,
    featureInspection,
    advancedFeatures,
    warning,
    pageCount
  };
}

/**
 * Core PDF Protection Engine.
 * Encrypts a PDF document with user and owner passwords, configurable permissions,
 * and upgrades the document context header to PDF 1.7 to guarantee AES-128 encryption.
 *
 * @param {object} options
 * @param {ArrayBuffer|Uint8Array} options.pdfData - Input PDF raw bytes
 * @param {string} options.userPassword - Document open password
 * @param {string} [options.ownerPassword] - Optional permissions/owner password
 * @param {object} [options.permissions] - Granular permission restrictions
 * @returns {Promise<{ pdfBytes: Uint8Array, outputSize: number, algorithm: string, permissions: object }>}
 */
export async function protectPdfDocument({
  pdfData,
  userPassword = '',
  ownerPassword = '',
  permissions = {
    printing: 'highResolution',
    modifying: false,
    copying: false,
    annotating: false,
    fillingForms: false,
    contentAccessibility: true,
    documentAssembly: false
  }
}) {
  let rawBytes;
  if (pdfData instanceof Uint8Array) {
    rawBytes = pdfData;
  } else if (pdfData instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(pdfData);
  } else if (typeof pdfData?.arrayBuffer === 'function') {
    rawBytes = new Uint8Array(await pdfData.arrayBuffer());
  } else {
    throw new Error('Invalid PDF data provided.');
  }

  if (!rawBytes || rawBytes.byteLength === 0) {
    throw new Error('PDF data is empty.');
  }

  // Preflight check
  const preflight = await preflightInspectPdf(rawBytes);
  if (!preflight.isValid) {
    throw new Error(preflight.error);
  }

  // Validate passwords against non-Latin-1 Unicode (> 0xFF)
  const userEval = evaluatePassword(userPassword);
  if (userPassword && userEval.hasUnsupportedUnicode) {
    throw new Error(`Password contains unsupported character "${userEval.unsupportedChar}". PDF standard security requires standard Latin-1 characters.`);
  }

  if (ownerPassword) {
    const ownerEval = evaluatePassword(ownerPassword);
    if (ownerEval.hasUnsupportedUnicode) {
      throw new Error(`Permissions password contains unsupported character "${ownerEval.unsupportedChar}". PDF standard security requires standard Latin-1 characters.`);
    }
    if (userPassword && ownerPassword === userPassword) {
      throw new Error('Permissions password must be different from the Document Open password.');
    }
  }

  const doc = await PDFDocument.load(rawBytes.slice(0), { 
    ignoreEncryption: false, 
    updateMetadata: false 
  });

  // Upgrade document header to 1.7 before encrypting.
  // @cantoo/pdf-lib derives algorithm version v from this.context.header.getVersionString().
  // Setting it to 1.7 guarantees AES-128 (V=4, R=4) instead of 40-bit or 128-bit RC4!
  doc.context.header = PDFHeader.forVersion(1, 7);

  // Determine effective printing permission:
  // If 'none' or false is selected, pass false to @cantoo/pdf-lib to clear both bit 3 and bit 12.
  // If 'lowResolution' is selected, pass 'lowResolution' (sets bit 3, clears bit 12).
  // Otherwise, default to 'highResolution' (sets both bit 3 and bit 12).
  const effectivePrinting =
    permissions.printing === false || permissions.printing === 'none'
      ? false
      : (permissions.printing === 'lowResolution' ? 'lowResolution' : 'highResolution');

  // Determine effective owner password:
  // If user restricted any permission (copying, modifying, printing, annotating, assembly),
  // and no custom owner password was specified, generate a random owner password.
  // This ensures opening with the user password does NOT match the owner password and bypass restrictions!
  let effectiveOwnerPassword = ownerPassword;
  const hasRestrictedPermissions =
    effectivePrinting === false ||
    effectivePrinting === 'lowResolution' ||
    permissions.copying === false ||
    permissions.modifying === false ||
    permissions.annotating === false ||
    permissions.fillingForms === false ||
    permissions.documentAssembly === false;

  let isAutoGeneratedOwner = false;
  if (!effectiveOwnerPassword) {
    if (hasRestrictedPermissions) {
      effectiveOwnerPassword = generateRandomOwnerPassword(32, userPassword);
      isAutoGeneratedOwner = true;
    } else {
      effectiveOwnerPassword = userPassword || generateRandomOwnerPassword(32, userPassword);
    }
  }

  // Encrypt the document
  doc.encrypt({
    userPassword: userPassword || '',
    ownerPassword: effectiveOwnerPassword,
    permissions: {
      printing: effectivePrinting,
      modifying: Boolean(permissions.modifying),
      copying: Boolean(permissions.copying),
      annotating: Boolean(permissions.annotating),
      fillingForms: Boolean(permissions.fillingForms),
      contentAccessibility: permissions.contentAccessibility !== false,
      documentAssembly: Boolean(permissions.documentAssembly)
    }
  });

  const pdfBytes = await doc.save();

  return {
    pdfBytes,
    outputSize: pdfBytes.length,
    algorithm: 'AES-128 (ISO 32000-1 Standard Security Handler V=4, R=4)',
    effectiveOwnerPassword,
    isAutoGeneratedOwner,
    wasDowngradedFrom20: Boolean(preflight.isPdf20),
    permissions: {
      ...permissions,
      printing: effectivePrinting
    }
  };
}

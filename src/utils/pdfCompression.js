import { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFArray, PDFDict } from 'pdf-lib';

/**
 * Production-grade In-Place Selective Stream Optimizer (IPSSO) for PDFs.
 * Optimizes embedded photographic raster images while preserving 100% of
 * selectable text, vector graphics, fonts, AcroForms, bookmarks, and links.
 */

export const COMPRESSION_PRESETS = {
  EXTREME_COMPRESSION: {
    id: 'extreme',
    label: 'Extreme Compression',
    shortLabel: 'Extreme',
    description: 'Smallest possible output with visibly greater photographic quality loss possible.',
    maxDimension: 800,
    quality: 0.40,
    minSavings: 0.02,
  },
  HIGH_COMPRESSION: {
    id: 'high',
    label: 'High Compression',
    shortLabel: 'High',
    description: 'Prioritizes smaller file size while retaining reasonable photographic quality.',
    maxDimension: 1000,
    quality: 0.55,
    minSavings: 0.04,
  },
  BALANCED: {
    id: 'balanced',
    label: 'Balanced (Recommended)',
    shortLabel: 'Balanced',
    isRecommended: true,
    description: 'Practical balance between file size and photographic image clarity.',
    maxDimension: 1400,
    quality: 0.68,
    minSavings: 0.05,
  },
  HIGH_QUALITY: {
    id: 'high-quality',
    label: 'High Quality',
    shortLabel: 'High Quality',
    description: 'Applies more conservative image optimization, preserving maximum fidelity.',
    maxDimension: 2000,
    quality: 0.82,
    minSavings: 0.08,
  },
};

/**
 * Identifies if a PDF contains digital signatures (/ByteRange, /Sig)
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
          for (let i = 0; i < fields.size(); i++) {
            const field = doc.context.lookup(fields.get(i));
            if (field && field.get(PDFName.of('FT'))?.toString() === '/Sig') {
              isSigned = true;
              const sigObjRef = field.get(PDFName.of('V'));
              if (sigObjRef) {
                const sigObj = doc.context.lookup(sigObjRef);
                const name = sigObj?.get(PDFName.of('Name'))?.asString();
                if (name) signatureNames.push(name);
              }
            }
          }
        }
      }
    }
  } catch {}

  // Fast string scan verification
  if (!isSigned && rawBytes) {
    try {
      const headerStr = new TextDecoder('latin1').decode(rawBytes.slice(0, Math.min(rawBytes.length, 1048576)));
      if (headerStr.includes('/ByteRange') && headerStr.includes('/SubFilter')) {
        isSigned = true;
      }
    } catch {}
  }

  return { isSigned, signatureNames };
}

/**
 * Fast read-only pre-flight inspection for UI workflows.
 * Inspects magic headers, encryption, digital signatures, and image counts.
 * Supports optional AbortSignal for immediate cancellation.
 */
export async function preflightInspectPdf(inputData, optionsOrSignal = {}) {
  const signal = optionsOrSignal instanceof AbortSignal ? optionsOrSignal : optionsOrSignal?.signal;

  if (signal?.aborted) {
    const err = new Error('Preflight inspection was cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  let rawBytes;
  if (inputData instanceof Uint8Array) {
    rawBytes = inputData;
  } else if (inputData instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(inputData);
  } else if (typeof inputData?.arrayBuffer === 'function') {
    rawBytes = new Uint8Array(await inputData.arrayBuffer());
  } else {
    throw new Error('Invalid input: Expected File, Blob, ArrayBuffer, or Uint8Array.');
  }

  if (signal?.aborted) {
    const err = new Error('Preflight inspection was cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  if (!rawBytes || rawBytes.byteLength === 0) {
    return {
      isValid: false,
      isEncrypted: false,
      isSigned: false,
      error: 'Invalid PDF: File is empty (0 bytes).'
    };
  }

  const headerCheck = new TextDecoder('latin1').decode(rawBytes.slice(0, Math.min(rawBytes.length, 1024)));
  if (!headerCheck.includes('%PDF-')) {
    return {
      isValid: false,
      isEncrypted: false,
      isSigned: false,
      error: 'Invalid PDF: File does not contain a valid %PDF header.'
    };
  }

  if (signal?.aborted) {
    const err = new Error('Preflight inspection was cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  let doc;
  try {
    doc = await PDFDocument.load(rawBytes.slice(0), { ignoreEncryption: false });
  } catch (err) {
    if (signal?.aborted) {
      const abortErr = new Error('Preflight inspection was cancelled by user.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    const msg = (err.message || '').toLowerCase();
    const isEnc = msg.includes('encrypt') || msg.includes('password') || err.name === 'EncryptedPDFError';
    if (isEnc) {
      const isAes128 = headerCheck.includes('/V 4') || headerCheck.includes('/R 4');
      return {
        isValid: false,
        isEncrypted: true,
        isAes128,
        error: isAes128
          ? 'Unsupported encryption: AES-128 (V=4, R=4). Please unlock the document first using Unlock PDF.'
          : 'Password-protected PDF. Document is encrypted and requires a password to open.'
      };
    }
    return {
      isValid: false,
      isEncrypted: false,
      isSigned: false,
      error: err.message || 'Failed to parse PDF document.'
    };
  }

  if (signal?.aborted) {
    const err = new Error('Preflight inspection was cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  const sigInfo = detectDigitalSignature(doc, rawBytes);

  let totalImages = 0;
  let eligibleCount = 0;
  let skippedCount = 0;

  try {
    const objects = doc.context.enumerateIndirectObjects();
    const seenRefs = new Set();
    for (const [ref, obj] of objects) {
      if (signal?.aborted) {
        const err = new Error('Preflight inspection was cancelled by user.');
        err.name = 'AbortError';
        throw err;
      }
      if (obj instanceof PDFRawStream) {
        const dict = obj.dict;
        if (dict.get(PDFName.of('Subtype'))?.toString() === '/Image') {
          const refStr = ref.toString();
          if (seenRefs.has(refStr)) continue;
          seenRefs.add(refStr);
          totalImages++;
          const c = classifyImageStream(dict, obj.contents.length);
          if (c.eligible) eligibleCount++;
          else skippedCount++;
        }
      }
    }
  } catch (loopErr) {
    if (loopErr.name === 'AbortError') throw loopErr;
  }

  if (signal?.aborted) {
    const err = new Error('Preflight inspection was cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  return {
    isValid: true,
    isEncrypted: false,
    isSigned: sigInfo.isSigned,
    signatureNames: sigInfo.signatureNames,
    totalImages,
    eligibleCount,
    skippedCount,
    pageCount: doc.getPageCount()
  };
}

/**
 * Conservative Image Stream Classifier
 * Determines whether a stream is eligible for recompression or must remain untouched.
 */
export function classifyImageStream(dict, _contentsLength) {
  const filterRaw = dict.get(PDFName.of('Filter'))?.toString() || 'None';
  const colorSpaceRaw = dict.get(PDFName.of('ColorSpace'))?.toString() || 'None';
  const width = dict.get(PDFName.of('Width'))?.asNumber() || 0;
  const height = dict.get(PDFName.of('Height'))?.asNumber() || 0;
  const bitsPerComponent = dict.get(PDFName.of('BitsPerComponent'))?.asNumber() || 8;
  const hasSMask = dict.has(PDFName.of('SMask'));
  const hasMask = dict.has(PDFName.of('Mask'));
  const isImageMask = dict.get(PDFName.of('ImageMask'))?.asBoolean() === true;
  const hasDecodeParms = dict.has(PDFName.of('DecodeParms'));
  const hasDecode = dict.has(PDFName.of('Decode'));

  const filter = filterRaw.replace('/', '');
  const colorSpace = colorSpaceRaw.replace('/', '');

  // 1. Transparency and Alpha Mask Guard
  if (hasSMask || hasMask || isImageMask) {
    return {
      eligible: false,
      reason: 'Contains /SMask, /Mask, or /ImageMask (alpha transparency). Converting to JPEG turns transparency black.',
      classification: 'Supported but must be skipped',
      filter,
      colorSpace
    };
  }

  // 2. Color Space Safeguards
  if (colorSpace.includes('DeviceCMYK') || colorSpace.includes('CMYK')) {
    return {
      eligible: false,
      reason: 'DeviceCMYK color space. Re-encoding in sRGB would distort or invert pre-press colors.',
      classification: 'Supported but must be skipped',
      filter,
      colorSpace
    };
  }

  if (colorSpace.includes('Indexed')) {
    return {
      eligible: false,
      reason: 'Indexed palette color space. Re-encoding would strip palette index references.',
      classification: 'Supported but must be skipped',
      filter,
      colorSpace
    };
  }

  if (colorSpace.includes('Separation') || colorSpace.includes('DeviceN')) {
    return {
      eligible: false,
      reason: 'Spot color space (/Separation or /DeviceN).',
      classification: 'Supported but must be skipped',
      filter,
      colorSpace
    };
  }

  // 3. Filter Compatibility Check
  if (filter.includes('CCITTFaxDecode') || filter.includes('CCITT')) {
    return {
      eligible: false,
      reason: '1-bit monochrome CCITTFaxDecode stream. Highly compressed; JPEG re-encoding would inflate size.',
      classification: 'Unsupported and must remain unchanged',
      filter,
      colorSpace
    };
  }

  if (filter.includes('JBIG2Decode') || filter.includes('JBIG2')) {
    return {
      eligible: false,
      reason: 'JBIG2Decode bi-level scan. Unsupported by browser canvas; already maximally compressed.',
      classification: 'Unsupported and must remain unchanged',
      filter,
      colorSpace
    };
  }

  if (filter.includes('JPXDecode') || filter.includes('JPX')) {
    return {
      eligible: false,
      reason: 'JPXDecode (JPEG 2000) wavelet stream. Unsupported in native canvas worker.',
      classification: 'Supported but must be skipped',
      filter,
      colorSpace
    };
  }

  // Multi-filter array checks
  if (filterRaw.startsWith('[') || filterRaw.includes(',')) {
    return {
      eligible: false,
      reason: `Compound filter array: ${filterRaw}.`,
      classification: 'Unsupported and must remain unchanged',
      filter,
      colorSpace
    };
  }

  // 4. Decode parameters check
  if (hasDecodeParms) {
    const parms = dict.get(PDFName.of('DecodeParms'));
    if (parms instanceof PDFDict) {
      const predictor = parms.get(PDFName.of('Predictor'))?.asNumber();
      if (typeof predictor === 'number' && predictor > 1) {
        return {
          eligible: false,
          reason: `Flate stream with predictor ${predictor}. Requires custom unfiltering before decoding.`,
          classification: 'Supported but must be skipped',
          filter,
          colorSpace
        };
      }
    }
  }

  // Custom Decode array check
  if (hasDecode) {
    return {
      eligible: false,
      reason: 'Custom /Decode range mapping array present.',
      classification: 'Supported but must be skipped',
      filter,
      colorSpace
    };
  }

  // 5. Bit depth check
  if (bitsPerComponent !== 8) {
    return {
      eligible: false,
      reason: `Non-standard bit depth (${bitsPerComponent} bpc).`,
      classification: 'Supported but must be skipped',
      filter,
      colorSpace
    };
  }

  // 6. Eligible Candidate: Standard 8-bit DCTDecode (JPEG) or FlateDecode RGB/Gray
  if (filter === 'DCTDecode' || filter === 'FlateDecode' || filter === 'None') {
    return {
      eligible: true,
      reason: `Eligible 8-bit ${filter} image (${width}x${height}, ${colorSpace}).`,
      classification: 'Supported for recompression',
      width,
      height,
      filter,
      colorSpace
    };
  }

  return {
    eligible: false,
    reason: `Unsupported stream filter: ${filter}`,
    classification: 'Unsupported and must remain unchanged',
    filter,
    colorSpace
  };
}

/**
 * Creates and manages a dedicated Web Worker for image recompression.
 */
class WorkerBridge {
  constructor() {
    this.worker = null;
    this.msgId = 0;
    this.pending = new Map();
  }

  async init() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return false;
    }

    try {
      this.worker = new Worker(
        new URL('../workers/pdfCompression.worker.js', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => {
        const { id, status, ...rest } = e.data || {};
        if (id && this.pending.has(id)) {
          const { resolve, reject } = this.pending.get(id);
          this.pending.delete(id);
          if (status === 'OK' || status === 'PONG') {
            resolve(rest);
          } else {
            reject(new Error(rest.error || `Worker status: ${status}`));
          }
        }
      };

      this.worker.onerror = (err) => {
        for (const [, { reject }] of this.pending) {
          reject(new Error(err.message || 'Web Worker execution error.'));
        }
        this.pending.clear();
      };

      // Ping test
      const pingRes = await this.send('PING', {});
      return pingRes?.supported === true;
    } catch {
      this.terminate();
      return false;
    }
  }

  send(type, payload, transferables = []) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        return reject(new Error('Web Worker not initialized.'));
      }
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, ...payload }, transferables);
    });
  }

  terminate() {
    if (this.worker) {
      try { this.worker.terminate(); } catch {}
      this.worker = null;
    }
    this.pending.clear();
  }
}

/**
 * Main Production PDF Compression Function
 * In-place optimization preserving text, vectors, fonts, forms, and bookmarks.
 */
export async function compressPdfDocument(inputData, options = {}, onProgress = () => {}) {
  let rawBytes;
  if (inputData instanceof Uint8Array) {
    rawBytes = inputData;
  } else if (inputData instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(inputData);
  } else if (typeof inputData?.arrayBuffer === 'function') {
    rawBytes = new Uint8Array(await inputData.arrayBuffer());
  } else {
    throw new Error('Invalid input: Expected File, Blob, ArrayBuffer, or Uint8Array.');
  }

  // 1. Basic validation
  if (!rawBytes || rawBytes.byteLength === 0) {
    throw new Error('Invalid PDF: File is empty (0 bytes).');
  }

  // Check PDF magic header
  const headerCheck = new TextDecoder('latin1').decode(rawBytes.slice(0, Math.min(rawBytes.length, 1024)));
  if (!headerCheck.includes('%PDF-')) {
    throw new Error('Invalid PDF: File does not contain a valid %PDF header.');
  }

  // 2. Encryption Detection
  let doc;
  try {
    doc = await PDFDocument.load(rawBytes.slice(0), { ignoreEncryption: false });
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('encrypt') || msg.includes('password') || err.name === 'EncryptedPDFError') {
      // Check if AES-128 (V=4, R=4)
      const isAes128 = headerCheck.includes('/V 4') || headerCheck.includes('/R 4');
      if (isAes128) {
        throw new Error('Unsupported encryption: AES-128 (V=4, R=4). Please unlock the document first using Unlock PDF.');
      }
      throw new Error('Password-protected PDF. Document is encrypted and requires a password to open.');
    }
    throw err;
  }

  // 3. Digital Signature Detection
  const sigInfo = detectDigitalSignature(doc, rawBytes);

  // 4. Resolve Preset Parameters
  let preset = COMPRESSION_PRESETS.BALANCED;
  if (typeof options.preset === 'string') {
    const key = options.preset.toUpperCase().replace('-', '_');
    if (COMPRESSION_PRESETS[key]) {
      preset = COMPRESSION_PRESETS[key];
    } else {
      const match = Object.values(COMPRESSION_PRESETS).find(p => p.id === options.preset.toLowerCase());
      if (match) preset = match;
    }
  } else if (options.preset && typeof options.preset === 'object') {
    preset = { ...preset, ...options.preset };
  }

  const maxDimension = options.maxDimension || preset.maxDimension;
  const quality = typeof options.quality === 'number' ? options.quality : preset.quality;
  const minSavings = typeof options.minSavings === 'number' ? options.minSavings : preset.minSavings;

  if (options.signal?.aborted) {
    const err = new Error('Compression operation was cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  options.onStatus?.('Scanning document streams...');
  onProgress(5);

  // 5. Enumerate Indirect Objects and Catalog Unique Image Streams
  const objects = doc.context.enumerateIndirectObjects();
  const eligibleImages = [];
  const skippedImages = [];
  const seenRefs = new Set();

  for (const [ref, obj] of objects) {
    if (obj instanceof PDFRawStream) {
      const dict = obj.dict;
      if (dict.get(PDFName.of('Subtype'))?.toString() === '/Image') {
        const refStr = ref.toString();
        if (seenRefs.has(refStr)) continue; // Ensure shared XObjects processed exactly once
        seenRefs.add(refStr);

        const classification = classifyImageStream(dict, obj.contents.length);
        if (classification.eligible) {
          eligibleImages.push({
            ref: refStr,
            refObj: ref,
            streamObj: obj,
            dict,
            classification,
            origSize: obj.contents.length
          });
        } else {
          skippedImages.push({
            ref: refStr,
            reason: classification.reason,
            classification: classification.classification,
            size: obj.contents.length
          });
        }
      }
    }
  }

  onProgress(15);

  // 6. Fast Path: If document contains zero eligible images, return original
  if (eligibleImages.length === 0) {
    onProgress(100);
    return {
      bytes: rawBytes,
      originalSize: rawBytes.length,
      outputSize: rawBytes.length,
      savedBytes: 0,
      savedPct: '0.00',
      isAlreadyOptimized: true,
      isOriginalBytesRetained: true,
      totalImagesFound: skippedImages.length,
      optimizedImagesCount: 0,
      skippedImagesCount: skippedImages.length,
      skippedImages,
      isSigned: sigInfo.isSigned,
      signatureNames: sigInfo.signatureNames
    };
  }

  // 7. Initialize Worker Bridge
  const workerBridge = new WorkerBridge();
  let workerActive = false;
  try {
    workerActive = await workerBridge.init();
  } catch {
    workerActive = false;
  }

  if (options.signal) {
    if (options.signal.aborted) {
      workerBridge.terminate();
      const err = new Error('Compression operation was cancelled by user.');
      err.name = 'AbortError';
      throw err;
    }
    options.signal.addEventListener('abort', () => {
      workerBridge.terminate();
    }, { once: true });
  }

  // If worker cannot be spawned in current context (e.g. Node tests), use caller-provided recompressor
  const recompressor = options.customRecompressor || options.imageRecompressor || (workerActive ? async (buffer, opts) => {
    const copyBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const res = await workerBridge.send('RECOMPRESS', {
      buffer: copyBuf,
      maxDimension: opts.maxDimension,
      quality: opts.quality
    }, [copyBuf]);
    return {
      bytes: new Uint8Array(res.buffer),
      width: res.width,
      height: res.height
    };
  } : null);

  let optimizedCount = 0;
  let netImageSavings = 0;
  const totalEligible = eligibleImages.length;

  try {
    for (let i = 0; i < totalEligible; i++) {
      const item = eligibleImages[i];
      const origBytes = item.streamObj.contents;

      if (options.signal?.aborted) {
        const err = new Error('Compression operation was cancelled by user.');
        err.name = 'AbortError';
        throw err;
      }

      options.onStatus?.(`Optimizing image ${i + 1} of ${totalEligible}...`);

      if (recompressor) {
        try {
          const res = await recompressor(origBytes, {
            maxDimension,
            quality,
            width: item.classification.width,
            height: item.classification.height,
            filter: item.classification.filter
          });

          // Check cancellation immediately after recompressor returns
          if (options.signal?.aborted) {
            const err = new Error('Compression operation was cancelled by user.');
            err.name = 'AbortError';
            throw err;
          }

          // Strict Image-Level Non-Inflation Check
          if (res?.bytes && res.bytes.length < origBytes.length * (1 - minSavings)) {
            const newLen = res.bytes.length;
            netImageSavings += (origBytes.length - newLen);
            optimizedCount++;

            // Mutate stream in-place!
            item.streamObj.contents = res.bytes;

            // Update Dictionary entries safely
            item.dict.set(PDFName.of('Length'), PDFNumber.of(newLen));
            item.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
            if (res.width && res.height) {
              item.dict.set(PDFName.of('Width'), PDFNumber.of(res.width));
              item.dict.set(PDFName.of('Height'), PDFNumber.of(res.height));
            }
            item.dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));

            // Clean up stale Flate decode entries
            item.dict.delete(PDFName.of('DecodeParms'));
            item.dict.delete(PDFName.of('Decode'));
          } else {
            // Discard recompression; keep original stream untouched
            skippedImages.push({
              ref: item.ref,
              reason: 'Recompression produced insufficient or negative savings; retained original.',
              classification: 'Skipped to prevent inflation',
              size: origBytes.length
            });
          }
        } catch (recompressErr) {
          if (recompressErr?.name === 'AbortError' || options.signal?.aborted) {
            const err = new Error('Compression operation was cancelled by user.');
            err.name = 'AbortError';
            throw err;
          }
          // Gracefully retain original on decode error
          skippedImages.push({
            ref: item.ref,
            reason: 'Image decoding failed; retained original stream.',
            classification: 'Skipped due to decode error',
            size: origBytes.length
          });
        }
      }

      const progressVal = 15 + Math.round(((i + 1) / totalEligible) * 75);
      onProgress(Math.min(90, progressVal));
    }
  } finally {
    workerBridge.terminate();
  }

  onProgress(92);
  options.onStatus?.('Assembling output PDF...');

  // Pre-serialization cancellation guard:
  // If cancelled before serialization begins, halt immediately and do not serialize.
  if (options.signal?.aborted) {
    const err = new Error('Compression operation was cancelled by user.');
    err.name = 'AbortError';
    throw err;
  }

  // Non-interruptible finalization stage:
  // Once serialization begins on the main thread, it executes synchronously to completion.
  // The operation is allowed to complete and return its result normally.
  onProgress(95);
  options.onStatus?.('Finalizing PDF (assembling streams)...');

  // Yield to event loop so browser paints the non-cancellable Finalizing state
  // and hides/disables Cancel button before synchronous doc.save() blocks the main thread
  await new Promise(resolve => setTimeout(resolve, 60));

  // 8. Serialize PDF Output with clean streams
  const finalBytes = await doc.save({ useObjectStreams: false });

  onProgress(100);

  const initialSize = rawBytes.length;
  const outputSize = finalBytes.length;

  // 9. Document-Level Non-Inflation Safeguard
  if (outputSize >= initialSize) {
    return {
      bytes: rawBytes, // Return original file bytes untouched
      originalSize: initialSize,
      outputSize: initialSize,
      savedBytes: 0,
      savedPct: '0.00',
      isAlreadyOptimized: true,
      isOriginalBytesRetained: true,
      totalImagesFound: seenRefs.size,
      optimizedImagesCount: 0,
      skippedImagesCount: seenRefs.size,
      skippedImages,
      isSigned: sigInfo.isSigned,
      signatureNames: sigInfo.signatureNames
    };
  }

  const savedBytes = initialSize - outputSize;
  const savedPct = ((savedBytes / initialSize) * 100).toFixed(2);

  return {
    bytes: finalBytes,
    originalSize: initialSize,
    outputSize: outputSize,
    savedBytes,
    savedPct,
    isAlreadyOptimized: false,
    isOriginalBytesRetained: false,
    totalImagesFound: seenRefs.size,
    optimizedImagesCount: optimizedCount,
    skippedImagesCount: seenRefs.size - optimizedCount,
    skippedImages,
    isSigned: sigInfo.isSigned,
    signatureNames: sigInfo.signatureNames
  };
}

/**
 * Backward compatibility wrapper for existing CompressPdf.jsx and CompressPanel.jsx
 */
export const compressPdfToTarget = async (file, targetSizeMB, onProgress = () => {}) => {
  if (!file) throw new Error('No file provided');
  if (!Number.isFinite(targetSizeMB) || targetSizeMB <= 0) {
    throw new Error('Target size must be a positive number');
  }

  const fileSizeMB = file.size / (1024 * 1024);
  const ratio = targetSizeMB / fileSizeMB;

  let preset = COMPRESSION_PRESETS.BALANCED;
  if (ratio >= 0.75) {
    preset = COMPRESSION_PRESETS.HIGH_QUALITY;
  } else if (ratio < 0.35) {
    preset = COMPRESSION_PRESETS.EXTREME_COMPRESSION;
  } else if (ratio < 0.55) {
    preset = COMPRESSION_PRESETS.HIGH_COMPRESSION;
  }

  const result = await compressPdfDocument(file, { preset }, onProgress);
  return result.bytes;
};

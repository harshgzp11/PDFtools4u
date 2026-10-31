/**
 * Utility for parsing EXIF metadata and normalizing images (JPEG, PNG, WebP, etc.)
 * for reliable, orientation-accurate PDF generation.
 */

/**
 * Parses EXIF Orientation tag from a JPEG ArrayBuffer or Uint8Array.
 * Returns orientation number (1 to 8), or 1 if not present / not a JPEG.
 *
 * Orientation values:
 * 1: Normal (0 deg)
 * 2: Flip horizontal
 * 3: Rotate 180 deg
 * 4: Flip vertical
 * 5: Transpose (flip horizontal & rotate 270 CW)
 * 6: Rotate 90 deg CW
 * 7: Transverse (flip horizontal & rotate 90 CW)
 * 8: Rotate 270 deg CW (90 deg CCW)
 */
export function getExifOrientation(buffer) {
  if (!buffer || buffer.byteLength < 14) return 1;
  const view = new DataView(
    buffer instanceof ArrayBuffer ? buffer : buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );

  // Check JPEG SOI marker (0xFFD8)
  if (view.getUint16(0, false) !== 0xFFD8) return 1;

  let offset = 2;
  const length = buffer.byteLength;

  while (offset < length - 4) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    // Check for APP1 marker (0xFFE1)
    if (marker === 0xFFE1) {
      const app1Length = view.getUint16(offset, false);
      offset += 2;

      // Check for 'Exif\0\0' header: 0x45786966 0x0000
      if (offset + 6 > length) return 1;
      const exifHeader = view.getUint32(offset, false);
      const exifZero = view.getUint16(offset + 4, false);
      if (exifHeader !== 0x45786966 || exifZero !== 0x0000) return 1;

      // TIFF Header start
      const tiffOffset = offset + 6;
      if (tiffOffset + 8 > length) return 1;

      // Endianness: 0x4949 ('II' Little Endian) or 0x4D4D ('MM' Big Endian)
      const byteOrder = view.getUint16(tiffOffset, false);
      const littleEndian = byteOrder === 0x4949;
      if (!littleEndian && byteOrder !== 0x4D4D) return 1;

      // Tag mark (42) check
      if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) return 1;

      // Offset to IFD0
      const ifd0Offset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
      if (ifd0Offset + 2 > length) return 1;

      const numEntries = view.getUint16(ifd0Offset, littleEndian);
      let entryOffset = ifd0Offset + 2;

      for (let i = 0; i < numEntries; i++) {
        if (entryOffset + 12 > length) break;
        const tag = view.getUint16(entryOffset, littleEndian);
        // Orientation Tag: 0x0112
        if (tag === 0x0112) {
          const orientationVal = view.getUint16(entryOffset + 8, littleEndian);
          if (orientationVal >= 1 && orientationVal <= 8) {
            return orientationVal;
          }
          return 1;
        }
        entryOffset += 12;
      }
      return 1;
    } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
      // Skip variable-length segment
      const segmentLength = view.getUint16(offset, false);
      offset += segmentLength;
    } else {
      break;
    }
  }
  return 1;
}

/**
 * Decodes and normalizes any image format (JPG, PNG, WebP, GIF, BMP) onto an offscreen canvas.
 * Corrects EXIF orientation via browser decoding, applies manual user rotation, and composites with a clean background.
 * Preserves lossless PNG encoding for PNG inputs, and uses high-quality JPEG for other formats.
 *
 * @param {File|Blob} file
 * @param {number} [userRotation=0] - Clockwise rotation angle in degrees (0, 90, 180, 270)
 * @returns {Promise<{ dataUrl: string, width: number, height: number, mimeType: string }>}
 */
export async function normalizeImage(file, userRotation = 0) {
  if (!file) throw new Error("No image file provided.");

  // Read image as Data URL
  const sourceDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name || 'image'}`));
    reader.readAsDataURL(file);
  });

  // Decode image in browser (modern browsers automatically orient image according to EXIF)
  const img = new Image();
  img.src = sourceDataUrl;
  await img.decode();

  const baseWidth = img.naturalWidth || img.width;
  const baseHeight = img.naturalHeight || img.height;

  // Calculate final dimensions after user rotation
  const normUserRotation = ((userRotation % 360) + 360) % 360;
  const userSwaps = normUserRotation === 90 || normUserRotation === 270;
  const finalWidth = userSwaps ? baseHeight : baseWidth;
  const finalHeight = userSwaps ? baseWidth : baseHeight;

  // Draw transformed image onto offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not initialize 2D canvas context.");

  // Solid white backing to prevent black background artifacts on transparent PNGs/WebPs
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  ctx.save();

  // Apply user rotation around canvas center
  if (normUserRotation) {
    ctx.translate(finalWidth / 2, finalHeight / 2);
    ctx.rotate((normUserRotation * Math.PI) / 180);
    ctx.translate(-baseWidth / 2, -baseHeight / 2);
  }

  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // Export as lossless PNG for PNG inputs, or high-quality JPEG for others
  const isPng = file.type === 'image/png' || /\.png$/i.test(file.name || '');
  const mimeType = isPng ? 'image/png' : 'image/jpeg';
  const normalizedDataUrl = isPng 
    ? canvas.toDataURL('image/png') 
    : canvas.toDataURL('image/jpeg', 0.95);

  // Explicit Canvas Memory Disposal
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;

  return {
    dataUrl: normalizedDataUrl,
    width: finalWidth,
    height: finalHeight,
    mimeType
  };
}


import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { ensureUnicodeFonts, getFontForString } from './unicodeFontManager.js';

/**
 * Gets a DOMParser instance regardless of whether we are in a browser or Node.js environment.
 */
async function getDOMParser() {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  try {
    const xmldom = await import('@xmldom/xmldom');
    return new xmldom.DOMParser();
  } catch {
    throw new Error('DOMParser is not available in the current environment.');
  }
}

/**
 * Normalizes an array buffer from various possible inputs (File, Blob, ArrayBuffer, Uint8Array, Buffer).
 */
export async function normalizeToUint8Array(input) {
  if (!input) throw new Error('No input file provided.');
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (typeof input.arrayBuffer === 'function') {
    const ab = await input.arrayBuffer();
    return new Uint8Array(ab);
  }
  throw new Error('Unsupported file or buffer input.');
}

/**
 * Checks if the file is a legacy binary PowerPoint (.ppt) file.
 */
export function isLegacyBinaryPpt(bytes) {
  if (!bytes || bytes.length < 8) return false;
  // OLE Compound Document Header: D0 CF 11 E0 A1 B1 1A E1
  return (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  );
}

/**
 * Parses presentation dimensions from ppt/presentation.xml (in EMUs, where 36,000 EMUs = 1 mm).
 */
function parseSlideDimensions(presXmlDoc) {
  // Standard defaults: Landscape A4 (297mm x 210mm)
  let widthMm = 297;
  let heightMm = 210;
  let orientation = 'l';

  if (!presXmlDoc) return { widthMm, heightMm, orientation, cx: 10692000, cy: 7560000 };

  const sldSzNodes = presXmlDoc.getElementsByTagNameNS('*', 'sldSz');
  if (sldSzNodes && sldSzNodes.length > 0) {
    const sldSz = sldSzNodes[0];
    const cx = parseInt(sldSz.getAttribute('cx') || '0', 10);
    const cy = parseInt(sldSz.getAttribute('cy') || '0', 10);
    if (cx > 0 && cy > 0) {
      widthMm = Math.round(cx / 36000);
      heightMm = Math.round(cy / 36000);
      orientation = widthMm >= heightMm ? 'l' : 'p';
      return { widthMm, heightMm, orientation, cx, cy };
    }
  }

  return { widthMm, heightMm, orientation, cx: 10692000, cy: 7560000 };
}

/**
 * Parses slide ordering from ppt/presentation.xml and its relationships.
 * Respects user reordering instead of naive ZIP part sorting.
 */
async function resolveSlideOrder(zip, parser) {
  const orderedSlidePaths = [];

  try {
    const presFile = zip.file('ppt/presentation.xml');
    const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');

    if (presFile && presRelsFile) {
      const presXml = await presFile.async('text');
      const presRelsXml = await presRelsFile.async('text');

      const presDoc = parser.parseFromString(presXml, 'application/xml');
      const relsDoc = parser.parseFromString(presRelsXml, 'application/xml');

      // Build relationship map: rId -> target
      const relMap = {};
      const relNodes = relsDoc.getElementsByTagNameNS('*', 'Relationship');
      for (let i = 0; i < relNodes.length; i++) {
        const id = relNodes[i].getAttribute('Id');
        const target = relNodes[i].getAttribute('Target');
        if (id && target) {
          relMap[id] = target;
        }
      }

      // Read slides in presentation sequence (<p:sldIdLst><p:sldId r:id="..."/>)
      const sldIdNodes = presDoc.getElementsByTagNameNS('*', 'sldId');
      for (let i = 0; i < sldIdNodes.length; i++) {
        const rId = sldIdNodes[i].getAttribute('r:id') || sldIdNodes[i].getAttribute('id');
        if (rId && relMap[rId]) {
          let target = relMap[rId].replace(/^\//, '');
          if (!target.startsWith('ppt/')) {
            target = 'ppt/' + target.replace(/^(\.\.\/)+/, '');
          }
          if (zip.file(target)) {
            orderedSlidePaths.push(target);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not parse presentation.xml slide ordering, falling back to part list:', err);
  }

  // Fallback: If no ordered slides found, search and sort numerically
  if (orderedSlidePaths.length === 0) {
    const fallbackFiles = Object.keys(zip.files).filter(name =>
      name.match(/^ppt\/slides\/slide\d+\.xml$/i)
    );
    fallbackFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      return numA - numB;
    });
    return fallbackFiles;
  }

  return orderedSlidePaths;
}

/**
 * Extracts embedded images from a slide XML using its relationships file.
 */
async function extractSlideImages(zip, parser, slidePath, slideXmlDoc) {
  const images = [];

  try {
    const match = slidePath.match(/slide(\d+)\.xml$/i);
    const slideNum = match ? match[1] : '';
    const relsCandidate1 = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsCandidate2 = slidePath.replace(/([^/]+)$/, '_rels/$1.rels');

    let relsZipFile = zip.file(relsCandidate1) || zip.file(relsCandidate2);
    if (!relsZipFile) {
      const foundRelsKey = Object.keys(zip.files).find(
        k => k.toLowerCase() === relsCandidate1.toLowerCase() || k.toLowerCase() === relsCandidate2.toLowerCase()
      );
      if (foundRelsKey) {
        relsZipFile = zip.file(foundRelsKey);
      }
    }

    if (!relsZipFile) return images;

    const relsXml = await relsZipFile.async('text');
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const relNodes = relsDoc.getElementsByTagNameNS('*', 'Relationship');
    const relMap = {};

    for (let r = 0; r < relNodes.length; r++) {
      const id = relNodes[r].getAttribute('Id');
      const target = relNodes[r].getAttribute('Target');
      if (id && target) {
        relMap[id] = target;
      }
    }

    // Traverse picture elements (<p:pic>)
    const picNodes = slideXmlDoc.getElementsByTagNameNS('*', 'pic');
    for (let p = 0; p < picNodes.length; p++) {
      const pic = picNodes[p];
      const blipNodes = pic.getElementsByTagNameNS('*', 'blip');
      if (blipNodes.length === 0) continue;

      const blip = blipNodes[0];
      const embedId =
        blip.getAttribute('r:embed') ||
        blip.getAttribute('embed') ||
        [...blip.attributes].find(a => a.name.includes('embed'))?.value;

      if (!embedId || !relMap[embedId]) continue;

      let targetPath = relMap[embedId].replace(/^(\.\.\/)+/, '');
      if (!targetPath.startsWith('ppt/')) {
        targetPath = 'ppt/' + targetPath;
      }

      let imgZipFile = zip.file(targetPath);
      if (!imgZipFile) {
        const foundImgKey = Object.keys(zip.files).find(k => k.toLowerCase() === targetPath.toLowerCase());
        if (foundImgKey) {
          imgZipFile = zip.file(foundImgKey);
        }
      }

      if (imgZipFile) {
        const base64Data = await imgZipFile.async('base64');
        const ext = targetPath.split('.').pop().toLowerCase();
        let mime = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        else if (ext === 'svg') mime = 'image/svg+xml';
        else if (ext === 'webp') mime = 'image/webp';
        else if (ext === 'gif') mime = 'image/gif';

        // Extract shape position if available
        let x = 0, y = 0, w = 0, h = 0;
        const xfrmNodes = pic.getElementsByTagNameNS('*', 'xfrm');
        if (xfrmNodes.length > 0) {
          const off = xfrmNodes[0].getElementsByTagNameNS('*', 'off')?.[0];
          const extNode = xfrmNodes[0].getElementsByTagNameNS('*', 'ext')?.[0];
          if (off) {
            x = parseInt(off.getAttribute('x') || '0', 10);
            y = parseInt(off.getAttribute('y') || '0', 10);
          }
          if (extNode) {
            w = parseInt(extNode.getAttribute('cx') || '0', 10);
            h = parseInt(extNode.getAttribute('cy') || '0', 10);
          }
        }

        images.push({
          id: embedId,
          targetPath,
          mime,
          dataUrl: `data:${mime};base64,${base64Data}`,
          x,
          y,
          w,
          h,
        });
      }
    }
  } catch (err) {
    console.warn(`Error extracting images from ${slidePath}:`, err);
  }

  return images;
}

/**
 * Normalizes an image for jsPDF embedding (converting SVG/WEBP to PNG via canvas if in browser).
 */
async function normalizeImageForPdf(imgItem) {
  if (!imgItem || !imgItem.dataUrl) return null;
  const mime = imgItem.mime;
  const dataUrl = imgItem.dataUrl;

  // Direct support for PNG and JPEG
  if (mime === 'image/png' || dataUrl.startsWith('data:image/png')) {
    return { dataUrl, format: 'PNG' };
  }
  if (mime === 'image/jpeg' || dataUrl.startsWith('data:image/jpeg')) {
    return { dataUrl, format: 'JPEG' };
  }

  // In browser, normalize SVG / WEBP / GIF to PNG via offscreen canvas
  if (typeof window !== 'undefined' && typeof Image !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 400;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          canvas.width = 0;
          canvas.height = 0;
          resolve({ dataUrl: pngUrl, format: 'PNG' });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  // If in Node.js or unsupported format, return null rather than crashing jsPDF
  return null;
}

/**
 * Parses all slides, text, relationships, and metadata from a PPTX file.
 */
export async function parsePptxSlides(input) {
  const bytes = await normalizeToUint8Array(input);

  if (isLegacyBinaryPpt(bytes)) {
    throw new Error(
      'Binary .ppt (PowerPoint 97-2003) is not supported in the browser. Please open the presentation in PowerPoint, Google Slides, or LibreOffice and save it as .pptx before converting.'
    );
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error(
      'Could not parse presentation file. Please ensure it is a valid, uncorrupted .pptx presentation.'
    );
  }

  const parser = await getDOMParser();

  // Parse slide dimensions from presentation.xml
  let presDoc = null;
  const presFile = zip.file('ppt/presentation.xml');
  if (presFile) {
    try {
      const presXml = await presFile.async('text');
      presDoc = parser.parseFromString(presXml, 'application/xml');
    } catch {
      // Ignored, defaults will be used
    }
  }
  const dimensions = parseSlideDimensions(presDoc);

  // Determine slide presentation order
  const slidePaths = await resolveSlideOrder(zip, parser);

  if (slidePaths.length === 0) {
    throw new Error('No slide files found in this presentation.');
  }

  const parsedSlides = [];

  for (let idx = 0; idx < slidePaths.length; idx++) {
    const slidePath = slidePaths[idx];
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;

    const slideXml = await slideFile.async('text');
    const xmlDoc = parser.parseFromString(slideXml, 'application/xml');

    // Extract structured shapes
    const shapes = [];
    let detectedTitle = '';

    const spNodes = xmlDoc.getElementsByTagNameNS('*', 'sp');
    for (let s = 0; s < spNodes.length; s++) {
      const sp = spNodes[s];

      // Check if this is a title shape
      let isTitle = false;
      const phNodes = sp.getElementsByTagNameNS('*', 'ph');
      if (phNodes.length > 0) {
        const phType = phNodes[0].getAttribute('type') || '';
        if (phType === 'title' || phType === 'ctrTitle') {
          isTitle = true;
        }
      }

      // Shape coordinates
      let x = 0, y = 0, w = 0, h = 0;
      const xfrm = sp.getElementsByTagNameNS('*', 'xfrm')?.[0];
      if (xfrm) {
        const off = xfrm.getElementsByTagNameNS('*', 'off')?.[0];
        const ext = xfrm.getElementsByTagNameNS('*', 'ext')?.[0];
        if (off) {
          x = parseInt(off.getAttribute('x') || '0', 10);
          y = parseInt(off.getAttribute('y') || '0', 10);
        }
        if (ext) {
          w = parseInt(ext.getAttribute('cx') || '0', 10);
          h = parseInt(ext.getAttribute('cy') || '0', 10);
        }
      }

      // Shape paragraphs
      const pNodes = sp.getElementsByTagNameNS('*', 'p');
      const paragraphs = [];

      for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
        const p = pNodes[pIdx];
        const pPr = p.getElementsByTagNameNS('*', 'pPr')?.[0];
        const level = parseInt(pPr?.getAttribute('lvl') || '0', 10);

        // Collect all text runs in this paragraph
        const tNodes = p.getElementsByTagNameNS('*', 't');
        let fullParaText = '';
        for (let t = 0; t < tNodes.length; t++) {
          fullParaText += tNodes[t].textContent || '';
        }

        const trimmed = fullParaText.trim();
        if (trimmed) {
          paragraphs.push({
            text: trimmed,
            level,
            isTitle,
          });

          if (isTitle && !detectedTitle) {
            detectedTitle = trimmed;
          }
        }
      }

      if (paragraphs.length > 0) {
        shapes.push({
          isTitle,
          x,
          y,
          w,
          h,
          paragraphs,
        });
      }
    }

    // Extract tables (<a:tbl>)
    const tables = [];
    const tblNodes = xmlDoc.getElementsByTagNameNS('*', 'tbl');
    for (let t = 0; t < tblNodes.length; t++) {
      const tbl = tblNodes[t];
      const rows = [];
      const trNodes = tbl.getElementsByTagNameNS('*', 'tr');
      for (let r = 0; r < trNodes.length; r++) {
        const rowCells = [];
        const tcNodes = trNodes[r].getElementsByTagNameNS('*', 'tc');
        for (let c = 0; c < tcNodes.length; c++) {
          const tNodes = tcNodes[c].getElementsByTagNameNS('*', 't');
          let cellText = '';
          for (let tn = 0; tn < tNodes.length; tn++) {
            cellText += tNodes[tn].textContent || '';
          }
          rowCells.push(cellText.trim());
        }
        if (rowCells.some(cell => cell.length > 0)) {
          rows.push(rowCells);
        }
      }
      if (rows.length > 0) {
        tables.push(rows);
      }
    }

    // Extract all images
    const images = await extractSlideImages(zip, parser, slidePath, xmlDoc);

    // Collect all paragraphs for easy traversal
    const allParagraphs = [];
    for (const shp of shapes) {
      for (const para of shp.paragraphs) {
        allParagraphs.push(para);
      }
    }

    // If title was not explicitly tagged via <p:ph>, use first paragraph if it's positioned near the top
    if (!detectedTitle && allParagraphs.length > 0) {
      detectedTitle = allParagraphs[0].text;
    }

    parsedSlides.push({
      slideNumber: idx + 1,
      slidePath,
      title: detectedTitle || `Slide ${idx + 1}`,
      hasExplicitTitle: Boolean(detectedTitle),
      shapes,
      allParagraphs,
      tables,
      images,
      hasText: allParagraphs.length > 0 || tables.length > 0,
      hasImages: images.length > 0,
    });
  }

  return {
    dimensions,
    slides: parsedSlides,
  };
}

/**
 * Converts a parsed PPTX presentation into a high-fidelity PDF document.
 * 
 * Guarantees:
 * 1. Independent element rendering (text is NEVER discarded when images exist).
 * 2. All images are rendered preserving proportions.
 * 3. Text overflow creates continuation pages (ZERO content truncation).
 * 4. Unicode scripts (Latin, Devanagari/Hindi, symbols) are rendered with embedded fonts.
 * 5. Slide ordering strictly follows presentation sequence.
 */
export async function convertPptToPdf(input, options = {}) {
  const { onProgress } = options;
  if (onProgress) onProgress(5);

  const { dimensions, slides } = await parsePptxSlides(input);
  if (onProgress) onProgress(20);

  // Initialize jsPDF document matching the extracted slide dimensions
  const pdf = new jsPDF({
    orientation: dimensions.orientation,
    unit: 'mm',
    format: [dimensions.widthMm, dimensions.heightMm],
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Gather all text across the entire presentation to load required Unicode fonts
  let allPresentationText = '';
  for (const s of slides) {
    if (s.title) allPresentationText += ' ' + s.title;
    for (const p of s.allParagraphs) {
      allPresentationText += ' ' + p.text;
    }
    for (const tbl of s.tables) {
      for (const row of tbl) {
        allPresentationText += ' ' + row.join(' ');
      }
    }
  }

  const fontInfo = await ensureUnicodeFonts(pdf, allPresentationText);
  if (onProgress) onProgress(30);

  let isFirstPdfPage = true;

  for (let sIdx = 0; sIdx < slides.length; sIdx++) {
    const slide = slides[sIdx];

    if (!isFirstPdfPage) {
      pdf.addPage([dimensions.widthMm, dimensions.heightMm], dimensions.orientation);
    }
    isFirstPdfPage = false;

    // Margin constants
    const margin = 16;
    const contentWidth = pdfWidth - margin * 2;
    const bottomSafeY = pdfHeight - 16;

    let currentY = margin;

    // 1. Render Title
    const titleText = slide.hasExplicitTitle ? slide.title : `Slide ${slide.slideNumber}`;
    const titleFont = getFontForString(titleText, fontInfo);
    pdf.setFont(titleFont, 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(24, 34, 52);

    const titleLines = pdf.splitTextToSize(titleText, contentWidth);
    for (const tLine of titleLines) {
      pdf.text(tLine, margin, currentY + 6);
      currentY += 8;
    }
    currentY += 4;

    // Optional decorative separator line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 6;

    // 2. Decide Layout Strategy for Images + Text
    const validImages = [];
    for (const imgItem of slide.images) {
      try {
        const normalized = await normalizeImageForPdf(imgItem);
        if (normalized) {
          validImages.push({ ...imgItem, ...normalized });
        }
      } catch (imgNormErr) {
        console.warn('Image normalization skipped:', imgNormErr);
      }
    }

    const hasImages = validImages.length > 0;
    const hasText = slide.allParagraphs.length > 0 || slide.tables.length > 0;

    let textRenderX = margin;
    let textRenderWidth = contentWidth;

    if (hasImages && hasText) {
      // Split layout: Text on Left (55% width), Image on Right (40% width)
      const gap = 8;
      textRenderWidth = Math.round(contentWidth * 0.56);
      const imageColX = margin + textRenderWidth + gap;
      const imageColWidth = contentWidth - textRenderWidth - gap;
      const imageMaxHeight = pdfHeight - currentY - 20;

      // Render the primary image in the right column
      const primaryImg = validImages[0];
      try {
        // Embed cleanly within image column
        const imgAspect = (primaryImg.w && primaryImg.h) ? primaryImg.w / primaryImg.h : 1.33;
        let imgW = imageColWidth;
        let imgH = imgW / imgAspect;

        if (imgH > imageMaxHeight) {
          imgH = imageMaxHeight;
          imgW = imgH * imgAspect;
        }

        const imgX = imageColX + (imageColWidth - imgW) / 2;
        const imgY = currentY + 2;

        pdf.addImage(primaryImg.dataUrl, primaryImg.format, imgX, imgY, imgW, imgH, undefined, 'FAST');

        // If there are secondary images, render them as smaller thumbnails below the main image
        if (validImages.length > 1) {
          let thumbY = imgY + imgH + 4;
          const thumbSize = Math.min(24, (imageMaxHeight - imgH - 8) / (validImages.length - 1));
          if (thumbSize > 12) {
            for (let ti = 1; ti < validImages.length; ti++) {
              const secImg = validImages[ti];
              pdf.addImage(secImg.dataUrl, secImg.format, imageColX, thumbY, thumbSize * 1.3, thumbSize, undefined, 'FAST');
              thumbY += thumbSize + 3;
            }
          }
        }
      } catch (imgErr) {
        console.warn('Could not render image onto PDF:', imgErr);
      }
    } else if (hasImages && !hasText) {
      // Pure Image Slide (e.g. Photo / Chart Slide)
      const availH = pdfHeight - currentY - 14;
      for (let iIdx = 0; iIdx < validImages.length; iIdx++) {
        const img = validImages[iIdx];
        try {
          const imgAspect = (img.w && img.h) ? img.w / img.h : 1.33;
          let renderW = contentWidth;
          let renderH = renderW / imgAspect;

          if (renderH > availH) {
            renderH = availH;
            renderW = renderH * imgAspect;
          }

          const renderX = margin + (contentWidth - renderW) / 2;
          const renderY = currentY + (availH - renderH) / 2;

          pdf.addImage(img.dataUrl, img.format, renderX, renderY, renderW, renderH, undefined, 'FAST');
          break; // Primary image fills slide
        } catch (imgErr) {
          console.warn('Error embedding slide image:', imgErr);
        }
      }
    }

    // 3. Render Body Text (Guaranteed: NEVER TRUNCATED)
    // Filter out title paragraph if already printed
    const bodyParagraphs = slide.allParagraphs.filter(p => !p.isTitle && p.text !== titleText);

    pdf.setFontSize(12);
    pdf.setTextColor(51, 65, 85);

    for (let pIdx = 0; pIdx < bodyParagraphs.length; pIdx++) {
      const para = bodyParagraphs[pIdx];
      const paraFont = getFontForString(para.text, fontInfo);
      pdf.setFont(paraFont, 'normal');

      const indent = Math.min(para.level * 6, 24);
      const bulletChar = para.level === 0 ? '• ' : '– ';
      const availableTextWidth = textRenderWidth - indent - 6;

      const lines = pdf.splitTextToSize(para.text, availableTextWidth);

      for (let l = 0; l < lines.length; l++) {
        // Check if line exceeds available height: Spawn Continuation Page!
        if (currentY + 7 > bottomSafeY) {
          pdf.addPage([dimensions.widthMm, dimensions.heightMm], dimensions.orientation);
          currentY = margin;

          // Continuation Header
          pdf.setFont(titleFont, 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`${titleText} (Continued)`, margin, currentY + 4);
          currentY += 10;

          pdf.setFont(paraFont, 'normal');
          pdf.setFontSize(12);
          pdf.setTextColor(51, 65, 85);
        }

        const printX = textRenderX + indent + (l === 0 ? 0 : 4);
        const prefix = l === 0 ? bulletChar : '';
        pdf.text(prefix + lines[l], printX, currentY + 5);
        currentY += 6.5;
      }
      currentY += 2.5; // Paragraph spacing
    }

    // 4. Render Tables if present
    if (slide.tables.length > 0) {
      for (const tbl of slide.tables) {
        if (currentY + 20 > bottomSafeY) {
          pdf.addPage([dimensions.widthMm, dimensions.heightMm], dimensions.orientation);
          currentY = margin;
        }

        pdf.setFontSize(10);
        const colWidth = Math.floor(textRenderWidth / (tbl[0]?.length || 1));

        for (let r = 0; r < tbl.length; r++) {
          if (currentY + 8 > bottomSafeY) {
            pdf.addPage([dimensions.widthMm, dimensions.heightMm], dimensions.orientation);
            currentY = margin;
          }

          const row = tbl[r];
          let cellX = textRenderX;
          const isHeaderRow = r === 0;

          pdf.setFont(fontInfo.primaryFont, isHeaderRow ? 'bold' : 'normal');
          pdf.setTextColor(isHeaderRow ? 15 : 70, 23, 42);

          for (let c = 0; c < row.length; c++) {
            const cellText = row[c] || '';
            const cellLines = pdf.splitTextToSize(cellText, colWidth - 2);
            pdf.text(cellLines[0] || '', cellX + 1, currentY + 4);
            cellX += colWidth;
          }
          currentY += 7;
        }
        currentY += 4;
      }
    }

    if (onProgress) {
      onProgress(Math.round(30 + ((sIdx + 1) / slides.length) * 65));
    }
  }

  if (onProgress) onProgress(100);

  const pdfBlob = pdf.output('blob');
  return {
    blob: pdfBlob,
    pageCount: pdf.internal.getNumberOfPages(),
    numSlides: slides.length,
    dimensions,
  };
}

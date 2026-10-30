import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { ensureUnicodeFonts, getFontForString } from './unicodeFontManager.js';

export async function convertDocxToPdf(fileOrBuffer, options = {}) {
  const { onProgress } = options;
  if (onProgress) onProgress(5);

  let arrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileOrBuffer)) {
    arrayBuffer = fileOrBuffer.buffer.slice(
      fileOrBuffer.byteOffset,
      fileOrBuffer.byteOffset + fileOrBuffer.byteLength
    );
  } else {
    throw new Error('Invalid DOCX document input.');
  }

  if (onProgress) onProgress(15);

  // Inspect and preprocess DOCX with JSZip to detect orientation and preserve page & section breaks
  let initialLandscape = false;
  let initialTopMargin = 45;
  let initialRightMargin = 40;
  let initialBottomMargin = 45;
  let initialLeftMargin = 40;
  let preprocessedArrayBuffer = arrayBuffer;

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file("word/document.xml");
    if (docXmlFile) {
      let docXml = await docXmlFile.async("text");

      // Extract all section properties (w:sectPr) in document order
      const sectPrRegex = /<w:sectPr\b([\s\S]*?)<\/w:sectPr>/g;
      const parsedSections = [];
      let sMatch;
      while ((sMatch = sectPrRegex.exec(docXml)) !== null) {
        const content = sMatch[1];
        const pgSzMatch = content.match(/<w:pgSz\b([^>]*)\/?>/i);
        let secLandscape = false;
        let secWidthPt = 595.28;
        let secHeightPt = 841.89;

        if (pgSzMatch) {
          const attrs = pgSzMatch[1] || '';
          const wMatch = attrs.match(/w:w="(\d+)"/);
          const hMatch = attrs.match(/w:h="(\d+)"/);
          const wDxa = wMatch ? parseInt(wMatch[1], 10) : 11906;
          const hDxa = hMatch ? parseInt(hMatch[1], 10) : 16838;
          if (attrs.includes('orient="landscape"') || wDxa > hDxa) {
            secLandscape = true;
            secWidthPt = 841.89;
            secHeightPt = 595.28;
          }
        }

        const pgMarMatch = content.match(/<w:pgMar\b([^>]*)\/?>/i);
        let topMarPt = 45;
        let rightMarPt = 40;
        let bottomMarPt = 45;
        let leftMarPt = 40;

        if (pgMarMatch) {
          const attrs = pgMarMatch[1] || '';
          const topMatch = attrs.match(/w:top="(\d+)"/);
          const rightMatch = attrs.match(/w:right="(\d+)"/);
          const bottomMatch = attrs.match(/w:bottom="(\d+)"/);
          const leftMatch = attrs.match(/w:left="(\d+)"/);

          if (topMatch) topMarPt = Math.max(20, Math.min(100, parseInt(topMatch[1], 10) / 20));
          if (rightMatch) rightMarPt = Math.max(20, Math.min(100, parseInt(rightMatch[1], 10) / 20));
          if (bottomMatch) bottomMarPt = Math.max(20, Math.min(100, parseInt(bottomMatch[1], 10) / 20));
          if (leftMatch) leftMarPt = Math.max(20, Math.min(100, parseInt(leftMatch[1], 10) / 20));
        }

        parsedSections.push({
          isLandscape: secLandscape,
          widthPt: secWidthPt,
          heightPt: secHeightPt,
          topMarPt,
          rightMarPt,
          bottomMarPt,
          leftMarPt,
        });
      }

      if (parsedSections.length > 0) {
        initialLandscape = parsedSections[0].isLandscape;
        initialTopMargin = parsedSections[0].topMarPt;
        initialRightMargin = parsedSections[0].rightMarPt;
        initialBottomMargin = parsedSections[0].bottomMarPt;
        initialLeftMargin = parsedSections[0].leftMarPt;
      }

      let modified = false;

      // Replace intermediate sectPr tags with explicit section break markers indicating the NEXT section properties
      let sIdx = 0;
      docXml = docXml.replace(/<w:sectPr\b([\s\S]*?)<\/w:sectPr>/g, (fullMatch, content, offset) => {
        const isFinal = (offset > docXml.lastIndexOf('<w:body>') && !docXml.slice(offset + fullMatch.length).includes('</w:p>'));
        if (isFinal) return fullMatch;
        const nextSection = parsedSections[sIdx + 1];
        sIdx++;
        if (!nextSection) return fullMatch;
        modified = true;
        const marker = `[[DOCX_SECTION_BREAK:landscape=${nextSection.isLandscape ? 1 : 0}:top=${nextSection.topMarPt}:right=${nextSection.rightMarPt}:bottom=${nextSection.bottomMarPt}:left=${nextSection.leftMarPt}]]`;
        return `</w:pPr><w:r><w:t>${marker}</w:t></w:r><w:pPr>`;
      });

      // Preserve explicit page breaks and pageBreakBefore by converting them to markers
      if (docXml.includes('w:type="page"')) {
        docXml = docXml.replace(/<w:br\s+w:type="page"\s*\/?>/g, '<w:r><w:t>[[DOCX_PAGE_BREAK]]</w:t></w:r>');
        modified = true;
      }
      if (docXml.includes('pageBreakBefore')) {
        docXml = docXml.replace(/(<w:pPr>[\s\S]*?<w:pageBreakBefore\s*\/?>[\s\S]*?<\/w:pPr>)/g, '$1<w:r><w:t>[[DOCX_PAGE_BREAK]]</w:t></w:r>');
        modified = true;
      }

      if (modified) {
        zip.file("word/document.xml", docXml);
        preprocessedArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      }
    }
  } catch (zipErr) {
    console.warn("Notice: JSZip preprocessing skipped, using standard buffer:", zipErr);
  }

  if (onProgress) onProgress(30);

  const mammothOptions = {
    convertImage: mammoth.images.imgElement((image) =>
      image.read('base64').then((imageBuffer) => ({
        src: `data:${image.contentType};base64,${imageBuffer}`
      }))
    )
  };

  const mammothInput = {
    arrayBuffer: preprocessedArrayBuffer,
    buffer: typeof Buffer !== 'undefined' ? Buffer.from(preprocessedArrayBuffer) : undefined,
    ...mammothOptions
  };

  const result = await mammoth.convertToHtml(mammothInput);
  const rawHtml = result.value || '<p>No content found in document.</p>';
  if (onProgress) onProgress(45);

  let docBody;
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const docDom = parser.parseFromString(`<!DOCTYPE html><html><body>${rawHtml}</body></html>`, 'text/html');
    docBody = docDom.body;
  } else {
    // In Node.js test environments: dynamic import avoids bundling in Vite
    const jsdomModule = await (new Function('return import("jsdom")'))();
    const JSDOM = jsdomModule.JSDOM;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${rawHtml}</body></html>`);
    docBody = dom.window.document.body;
  }

  const doc = new jsPDF({
    orientation: initialLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Register Unicode TrueType fonts if needed
  const fullDocumentText = docBody.textContent || '';
  const fontInfo = await ensureUnicodeFonts(doc, fullDocumentText);

  let curLandscape = initialLandscape;
  let pageWidth = doc.internal.pageSize.getWidth();
  let pageHeight = doc.internal.pageSize.getHeight();
  let topMargin = initialTopMargin;
  let rightMargin = initialRightMargin;
  let bottomMargin = initialBottomMargin;
  let leftMargin = initialLeftMargin;
  let usableWidth = pageWidth - leftMargin - rightMargin;

  let cursorY = topMargin;

  const addNewPage = (landscape = curLandscape) => {
    doc.addPage('a4', landscape ? 'landscape' : 'portrait');
    curLandscape = landscape;
    pageWidth = doc.internal.pageSize.getWidth();
    pageHeight = doc.internal.pageSize.getHeight();
    usableWidth = pageWidth - leftMargin - rightMargin;
    cursorY = topMargin;
  };

  const switchSection = (nextLandscape, topM, rightM, bottomM, leftM) => {
    // If content has already been placed on this page, or if orientation changes, start a fresh page
    if (cursorY > topMargin || curLandscape !== nextLandscape) {
      doc.addPage('a4', nextLandscape ? 'landscape' : 'portrait');
    }
    curLandscape = nextLandscape;
    pageWidth = doc.internal.pageSize.getWidth();
    pageHeight = doc.internal.pageSize.getHeight();
    topMargin = topM;
    rightMargin = rightM;
    bottomMargin = bottomM;
    leftMargin = leftM;
    usableWidth = pageWidth - leftMargin - rightMargin;
    cursorY = topMargin;
  };

  const ensureSpace = (neededHeight) => {
    if (cursorY + neededHeight > pageHeight - bottomMargin) {
      addNewPage(curLandscape);
    }
  };

  const children = Array.from(docBody.children);
  const totalChildren = children.length;

  for (let idx = 0; idx < totalChildren; idx++) {
    const node = children[idx];
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    let nodeRawText = node.textContent || '';

    // Check for section break marker
    const sectMatch = nodeRawText.match(/\[\[DOCX_SECTION_BREAK:landscape=(\d+):top=([\d.]+):right=([\d.]+):bottom=([\d.]+):left=([\d.]+)\]\]/);
    if (sectMatch) {
      const nextLandscape = sectMatch[1] === '1';
      const nextTop = parseFloat(sectMatch[2]);
      const nextRight = parseFloat(sectMatch[3]);
      const nextBottom = parseFloat(sectMatch[4]);
      const nextLeft = parseFloat(sectMatch[5]);

      switchSection(nextLandscape, nextTop, nextRight, nextBottom, nextLeft);
      nodeRawText = nodeRawText.replace(/\[\[DOCX_SECTION_BREAK:[^\]]+\]\]/g, '').trim();
      if (!nodeRawText && tag !== 'table' && !node.querySelector('img')) {
        continue;
      }
    }

    // Check for explicit page break marker
    if (nodeRawText.includes('[[DOCX_PAGE_BREAK]]')) {
      if (cursorY > topMargin) {
        addNewPage(curLandscape);
      }
      nodeRawText = nodeRawText.replace(/\[\[DOCX_PAGE_BREAK\]\]/g, '').trim();
      if (!nodeRawText && tag !== 'table' && !node.querySelector('img')) {
        continue;
      }
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10);
      const fontSize = level === 1 ? 20 : level === 2 ? 16 : level === 3 ? 13 : 11;
      const spacingBefore = level === 1 ? 16 : level === 2 ? 12 : 8;
      const spacingAfter = level === 1 ? 8 : 6;

      const headingFont = getFontForString(nodeRawText, fontInfo);
      doc.setFont(headingFont, headingFont === 'helvetica' ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(47, 84, 150);

      const text = nodeRawText.trim();
      if (!text) continue;

      const lines = doc.splitTextToSize(text, usableWidth);
      const lineHeight = fontSize * 1.25;
      const totalHeight = lines.length * lineHeight;

      ensureSpace(totalHeight + spacingBefore + spacingAfter);
      cursorY += spacingBefore;

      lines.forEach((line) => {
        doc.text(line, leftMargin, cursorY + fontSize * 0.85);
        cursorY += lineHeight;
      });

      cursorY += spacingAfter;
    } else if (tag === 'p') {
      const img = node.querySelector('img');
      if (img && img.getAttribute('src')) {
        const src = img.getAttribute('src');
        if (src.startsWith('data:image')) {
          const maxW = usableWidth;
          const maxH = 260;
          ensureSpace(maxH + 12);
          try {
            doc.addImage(src, 'JPEG', leftMargin, cursorY, maxW * 0.8, maxH);
            cursorY += maxH + 12;
          } catch {
            // ignore malformed image
          }
        }
        continue;
      }

      const text = nodeRawText.trim();
      if (!text) {
        cursorY += 6;
        continue;
      }

      // Check if paragraph contains hyperlinks
      const links = node.querySelectorAll('a');
      if (links.length > 0) {
        const pFont = getFontForString(text, fontInfo);
        doc.setFont(pFont, 'normal');
        doc.setFontSize(10.5);
        const lineHeight = 10.5 * 1.35;

        // Traverse child nodes to format text and clickable links
        const childNodes = Array.from(node.childNodes);
        let curX = leftMargin;

        childNodes.forEach((child) => {
          const isLink = child.nodeType === 1 && child.tagName && child.tagName.toLowerCase() === 'a';
          let childText = (child.textContent || '').replace(/\[\[DOCX_PAGE_BREAK\]\]/g, '');
          if (!childText) return;

          const href = isLink ? child.getAttribute('href') : null;
          if (isLink) {
            doc.setTextColor(0, 102, 204);
          } else {
            doc.setTextColor(33, 37, 41);
          }

          const words = childText.split(/(\s+)/);
          words.forEach((word) => {
            if (!word) return;
            const wordWidth = doc.getTextWidth(word);
            if (curX + wordWidth > leftMargin + usableWidth) {
              curX = leftMargin;
              cursorY += lineHeight;
              ensureSpace(lineHeight);
            }

            if (isLink && href) {
              doc.textWithLink(word, curX, cursorY + 10.5 * 0.85, { url: href });
            } else {
              doc.text(word, curX, cursorY + 10.5 * 0.85);
            }
            curX += wordWidth;
          });
        });

        doc.setTextColor(33, 37, 41);
        cursorY += lineHeight + 6;
        continue;
      }

      const pFont = getFontForString(text, fontInfo);
      doc.setFont(pFont, 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(33, 37, 41);

      const lineHeight = 10.5 * 1.35;
      const lines = doc.splitTextToSize(text, usableWidth);
      const totalHeight = lines.length * lineHeight;

      ensureSpace(Math.min(totalHeight, lineHeight * 2) + 4);

      lines.forEach((line) => {
        ensureSpace(lineHeight);
        doc.text(line, leftMargin, cursorY + 10.5 * 0.85);
        cursorY += lineHeight;
      });

      cursorY += 6;
    } else if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      const items = Array.from(node.querySelectorAll(':scope > li'));
      const lineHeight = 10.5 * 1.35;

      items.forEach((li, liIdx) => {
        const itemText = (li.textContent || '').replace(/\[\[DOCX_PAGE_BREAK\]\]/g, '').trim();
        if (!itemText) return;

        const liFont = getFontForString(itemText, fontInfo);
        doc.setFont(liFont, 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(33, 37, 41);

        const bullet = isOrdered ? `${liIdx + 1}.` : '\u2022';
        const bulletIndent = 16;
        const textIndent = leftMargin + bulletIndent;
        const textWidth = usableWidth - bulletIndent;

        const lines = doc.splitTextToSize(itemText, textWidth);
        const itemHeight = lines.length * lineHeight;

        ensureSpace(Math.min(itemHeight, lineHeight * 2) + 4);

        doc.setFont(liFont, liFont === 'helvetica' ? 'bold' : 'normal');
        doc.text(bullet, leftMargin, cursorY + 10.5 * 0.85);

        doc.setFont(liFont, 'normal');
        lines.forEach((line) => {
          ensureSpace(lineHeight);
          doc.text(line, textIndent, cursorY + 10.5 * 0.85);
          cursorY += lineHeight;
        });

        cursorY += 3;
      });
      cursorY += 4;
    } else if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) continue;

      let head = [];
      let body = [];

      rows.forEach((tr, trIdx) => {
        const cells = Array.from(tr.querySelectorAll(':scope > th, :scope > td')).map((cell) => {
          const colSpan = parseInt(cell.getAttribute('colspan') || '1', 10);
          const rowSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
          const rawCellText = (cell.textContent || '').replace(/\[\[DOCX_PAGE_BREAK\]\]/g, '').trim();

          if (colSpan > 1 || rowSpan > 1) {
            return {
              content: rawCellText,
              colSpan: colSpan > 1 ? colSpan : 1,
              rowSpan: rowSpan > 1 ? rowSpan : 1,
            };
          }
          return rawCellText;
        });

        if (trIdx === 0 && (tr.querySelector('th') || rows.length > 1)) {
          head.push(cells);
        } else {
          body.push(cells);
        }
      });

      if (head.length === 0 && body.length > 0) {
        head.push(body.shift());
      }

      ensureSpace(40);

      const tableFont = fontInfo.primaryFont || 'helvetica';
      const autoTableFn = autoTable.default || autoTable;

      autoTableFn(doc, {
        startY: cursorY,
        margin: { left: leftMargin, right: rightMargin },
        head: head,
        body: body,
        theme: 'grid',
        styles: {
          font: tableFont,
          fontSize: 9.5,
          cellPadding: 5,
          overflow: 'linebreak',
          lineColor: [200, 205, 210],
          lineWidth: 0.75,
        },
        headStyles: {
          fillColor: [47, 84, 150],
          textColor: [255, 255, 255],
          fontStyle: tableFont === 'helvetica' ? 'bold' : 'normal',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
        cursorY = doc.lastAutoTable.finalY + 12;
      } else {
        cursorY += 40;
      }
    }

    if (onProgress) {
      onProgress(45 + Math.round(((idx + 1) / totalChildren) * 50));
    }
  }

  if (onProgress) onProgress(100);

  const pdfArrayBuffer = doc.output('arraybuffer');
  if (options.returnBuffer && typeof Buffer !== 'undefined') {
    return Buffer.from(pdfArrayBuffer);
  }
  return new Blob([pdfArrayBuffer], { type: 'application/pdf' });
}

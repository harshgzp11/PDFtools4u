import React, { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, FileOutput, Columns, LayoutList, TableProperties, FileText, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import { trackEvent, trackError } from '../lib/analytics';

export default function ExcelToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  
  const [previewSheetData, setPreviewSheetData] = useState([]);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [orientation, setOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter'
  const [wideTableMode, setWideTableMode] = useState('paginate'); // 'paginate' | 'fit'

  // Resource lifecycle & parsed data cache
  const parsedSheetsCacheRef = useRef(new Map());
  const objectUrlRef = useRef(null);

  useEffect(() => {
    const objUrlRef = objectUrlRef;
    const cacheRef = parsedSheetsCacheRef;
    return () => {
      if (objUrlRef.current) {
        URL.revokeObjectURL(objUrlRef.current);
      }
      cacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (window.__sharedFile) {
      handleFile(window.__sharedFile);
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (!newFile) return;
    
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some(ext => newFile.name?.toLowerCase().endsWith(ext));
    const hasValidType = newFile.type && (
      newFile.type.includes('spreadsheet') ||
      newFile.type.includes('excel') ||
      newFile.type.includes('csv') ||
      newFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      newFile.type === 'application/vnd.ms-excel' ||
      newFile.type === 'text/csv'
    );
    
    if (newFile.size > 25 * 1024 * 1024) {
      toast.error("File is too large. Maximum supported size is 25MB for browser conversion.");
      return;
    }
    
    if (hasValidExt || hasValidType) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      parsedSheetsCacheRef.current.clear();
      setFile(newFile);
      setSuccessData(null);
      setIsParsing(true);
      setTimeout(() => {
        parseExcelFile(newFile);
      }, 50);
    } else {
      toast.error("Please upload a valid spreadsheet file (.xlsx, .xls, .csv).");
    }
  };

  const parseExcelFile = async (currentFile) => {
    try {
      parsedSheetsCacheRef.current.clear();
      const arrayBuffer = await currentFile.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        toast.error("This file contains no sheets.");
        resetTool();
        return;
      }
      
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      
      // Default to "All Sheets" if workbook has multiple sheets, otherwise first sheet
      const defaultSheet = wb.SheetNames.length > 1 ? '__ALL_SHEETS__' : wb.SheetNames[0];
      setActiveSheet(defaultSheet);
      loadSheetData(wb, defaultSheet);
    } catch (err) {
      trackError('Excel To Pdf', 'processing_error');
      console.error(err);
      toast.error("Failed to parse this file. It may be corrupted or unsupported.");
      resetTool();
    } finally {
      setIsParsing(false);
    }
  };

  // Parses raw sheet data into clean formatted strings, caching by sheetName to avoid redundant JSON transformations
  const extractFormattedSheetData = (ws, XLSX, sheetName = null) => {
    if (!ws) return { title: null, head: [], body: [], maxCols: 0, rawRows: [] };

    if (sheetName && parsedSheetsCacheRef.current.has(sheetName)) {
      return parsedSheetsCacheRef.current.get(sheetName);
    }

    const rawData = XLSX.utils.sheet_to_json(ws, { 
      header: 1, 
      raw: false, 
      dateNF: 'yyyy-mm-dd',
      defval: '' 
    });

    if (!rawData || rawData.length === 0) {
      const emptyResult = { title: null, head: [], body: [], maxCols: 0, rawRows: [] };
      if (sheetName) parsedSheetsCacheRef.current.set(sheetName, emptyResult);
      return emptyResult;
    }

    // Find maximum column count across all rows in the sheet
    const maxCols = Math.max(...rawData.map(r => (Array.isArray(r) ? r.length : 0)), 0);
    if (maxCols === 0) {
      const emptyResult = { title: null, head: [], body: [], maxCols: 0, rawRows: [] };
      if (sheetName) parsedSheetsCacheRef.current.set(sheetName, emptyResult);
      return emptyResult;
    }

    // Normalize rows to uniform length with clean strings
    const normalizedData = rawData.map(row => {
      const cleanRow = [];
      for (let i = 0; i < maxCols; i++) {
        const cell = Array.isArray(row) ? row[i] : '';
        cleanRow.push(cell !== undefined && cell !== null ? String(cell) : '');
      }
      return cleanRow;
    });

    // Detect leading Title / Subtitle / Banner rows preceding the table headers
    const titles = [];
    let headerRowIdx = 0;

    for (let r = 0; r < normalizedData.length; r++) {
      const populated = normalizedData[r].filter(c => c.trim().length > 0);
      if (populated.length === 0) continue;
      // If only 1 cell is populated while sheet has 3+ columns, it's a title/subtitle banner
      if (populated.length === 1 && maxCols >= 3) {
        titles.push(populated[0].trim());
      } else {
        headerRowIdx = r;
        break;
      }
    }

    const head = normalizedData[headerRowIdx] ? [normalizedData[headerRowIdx]] : [];
    const body = normalizedData.slice(headerRowIdx + 1).filter(r => r.some(c => c.trim().length > 0));
    const title = titles.length > 0 ? titles.join(' — ') : null;

    const result = {
      title,
      head,
      body,
      maxCols,
      rawRows: normalizedData
    };

    if (sheetName) {
      parsedSheetsCacheRef.current.set(sheetName, result);
    }
    return result;
  };

  const loadSheetData = async (wb, targetSheet) => {
    setActiveSheet(targetSheet);
    const sheetToPreview = targetSheet === '__ALL_SHEETS__' ? wb.SheetNames[0] : targetSheet;
    const ws = wb.Sheets[sheetToPreview];
    
    if (!ws) {
      setPreviewSheetData([]);
      setTotalRowCount(0);
      return;
    }

    const XLSX = await import('xlsx');
    const { rawRows } = extractFormattedSheetData(ws, XLSX, sheetToPreview);
    // Keep preview state lightweight by holding only first 25 rows
    setPreviewSheetData(rawRows.slice(0, 25));
    setTotalRowCount(rawRows.length);
  };

  const handleSheetChange = (e) => {
    const newSheet = e.target.value;
    if (workbook) {
      loadSheetData(workbook, newSheet);
    }
  };

  const convertToPdf = async () => {
    if (!workbook) {
      toast.error("No spreadsheet loaded.");
      return;
    }
    
    trackEvent('tool_executed', { 
      tool_name: 'Excel to PDF',
      sheet_mode: activeSheet === '__ALL_SHEETS__' ? 'all' : 'single',
      page_size: pageSize,
      orientation
    });
    setIsProcessing(true);
    
    try {
      const XLSX = await import('xlsx');
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const sheetsToProcess = activeSheet === '__ALL_SHEETS__'
        ? workbook.SheetNames
        : [activeSheet];

      // Determine initial orientation from the first sheet to be processed
      let firstSheetCols = 0;
      for (const name of sheetsToProcess) {
        const ws = workbook.Sheets[name];
        if (ws) {
          const { maxCols, head, body } = extractFormattedSheetData(ws, XLSX, name);
          if (head.length > 0 || body.length > 0) {
            firstSheetCols = maxCols;
            break;
          }
        }
      }

      const initialOrientation = orientation === 'auto'
        ? (firstSheetCols > 6 ? 'landscape' : 'portrait')
        : orientation;

      const doc = new jsPDF({
        orientation: initialOrientation,
        unit: 'pt',
        format: pageSize
      });

      let pagesRendered = 0;

      for (let sIdx = 0; sIdx < sheetsToProcess.length; sIdx++) {
        const sheetName = sheetsToProcess[sIdx];
        const ws = workbook.Sheets[sheetName];
        if (!ws) continue;

        const { title, head, body, maxCols } = extractFormattedSheetData(ws, XLSX, sheetName);
        if (head.length === 0 && body.length === 0) continue;

        const currentOrientation = orientation === 'auto'
          ? (maxCols > 6 ? 'landscape' : 'portrait')
          : orientation;

        const needsHorizontalSplit = wideTableMode === 'paginate' && maxCols > (currentOrientation === 'landscape' ? 12 : 8);
        const baseChunkCols = currentOrientation === 'landscape' ? 11 : 7;
        const maxChunkColsWithAnchor = currentOrientation === 'landscape' ? 12 : 8;

        const chunks = [];
        if (!needsHorizontalSplit || head[0].length <= baseChunkCols) {
          chunks.push({
            colIndices: head[0].map((_, i) => i),
            chunkTitle: null
          });
        } else {
          const totalCols = head[0].length;
          chunks.push({
            colIndices: Array.from({ length: Math.min(baseChunkCols, totalCols) }, (_, i) => i),
            chunkTitle: `Part 1 (Cols 1-${Math.min(baseChunkCols, totalCols)})`
          });
          let startCol = baseChunkCols;
          let partNum = 2;
          while (startCol < totalCols) {
            const remaining = totalCols - startCol;
            let takeCols = baseChunkCols - 1;
            // If remaining columns + Col 0 anchor fit within maxChunkColsWithAnchor, combine them
            // into this segment rather than creating an orphaned 1-2 column tail segment
            if (1 + remaining <= maxChunkColsWithAnchor) {
              takeCols = remaining;
            } else if (remaining - takeCols <= 1 && 1 + remaining <= maxChunkColsWithAnchor + 1) {
              takeCols = remaining;
            }

            const endCol = Math.min(startCol + takeCols, totalCols);
            // Col 0 anchor + remaining cols to maintain row identity
            const cols = [0];
            for (let c = startCol; c < endCol; c++) cols.push(c);
            chunks.push({
              colIndices: cols,
              chunkTitle: `Part ${partNum} (Cols 1 & ${startCol + 1}-${endCol})`
            });
            startCol = endCol;
            partNum++;
          }
        }

        for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
          const chunk = chunks[cIdx];
          if (pagesRendered > 0) {
            doc.addPage(pageSize, currentOrientation);
          }
          pagesRendered++;

          let startY = 25;

          // Render Sheet Title Banner
          if (activeSheet === '__ALL_SHEETS__' || title) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);

            const prefix = chunk.chunkTitle 
              ? `${sheetName} [${chunk.chunkTitle}]` 
              : (activeSheet === '__ALL_SHEETS__' ? `Worksheet: ${sheetName}` : sheetName);
            const bannerText = title ? `${prefix}: ${title}` : prefix;
            const pageWidth = doc.internal.pageSize.getWidth();
            const textLines = doc.splitTextToSize(bannerText, pageWidth - 40);

            doc.text(textLines, 20, startY);
            startY += textLines.length * 13 + 6;

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.75);
            doc.line(20, startY - 4, pageWidth - 20, startY - 4);
            startY += 6;
          }

          const chunkHead = [chunk.colIndices.map(i => head[0][i])];
          const chunkBody = body.map(row => chunk.colIndices.map(i => row[i] || ''));

          let dynamicFontSize = 8.5;
          let dynamicCellPadding = 4;

          if (wideTableMode === 'fit') {
            if (maxCols > 15) {
              dynamicFontSize = 6;
              dynamicCellPadding = 2;
            } else if (maxCols > 10) {
              dynamicFontSize = 7;
              dynamicCellPadding = 3;
            } else if (maxCols > 6) {
              dynamicFontSize = 8;
              dynamicCellPadding = 4;
            }
          } else if (chunk.colIndices.length > 11) {
            dynamicFontSize = 8.0;
            dynamicCellPadding = 3.5;
          }

          autoTable(doc, {
            head: chunkHead,
            body: chunkBody,
            showHead: 'everyPage',
            startY: startY,
            theme: 'grid',
            styles: {
              fontSize: dynamicFontSize,
              cellPadding: dynamicCellPadding,
              textColor: [30, 30, 30],
              overflow: 'linebreak',
              lineWidth: 0.5,
              lineColor: [211, 211, 211]
            },
            headStyles: {
              fillColor: [241, 245, 249],
              textColor: [15, 23, 42],
              fontStyle: 'bold',
              lineWidth: 0.5,
              lineColor: [203, 213, 225]
            },
            alternateRowStyles: {
              fillColor: [255, 255, 255]
            },
            tableLineWidth: 0.5,
            tableLineColor: [211, 211, 211],
            pageBreak: 'auto',
            rowPageBreak: 'avoid',
            margin: { top: 25, right: 20, bottom: 25, left: 20 }
          });
        }
      }

      if (pagesRendered === 0) {
        toast.error("No valid table data found across selected worksheets.");
        setIsProcessing(false);
        return;
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const outputFilename = activeSheet === '__ALL_SHEETS__'
        ? `${baseName}_All_Sheets.pdf`
        : `${baseName}_${activeSheet}.pdf`;

      setSuccessData({
        originalSize: file.size,
        outputSize: blob.size,
        url,
        filename: outputFilename,
        title: 'PDF Created Successfully!',
        subtitle: activeSheet === '__ALL_SHEETS__'
          ? `All worksheets in your workbook have been converted into a unified, paginated PDF.`
          : `Sheet "${activeSheet}" has been elegantly converted to PDF format with professional layout.`
      });
      toast.success("Conversion successful!");
    } catch (err) {
      trackError('Excel To Pdf', 'processing_error');
      console.error("ExcelToPdf conversion error:", err);
      const isMemory = err instanceof RangeError || 
        err.message?.toLowerCase().includes('memory') || 
        err.message?.toLowerCase().includes('call stack') ||
        err.message?.toLowerCase().includes('allocation');
      if (isMemory) {
        toast.error("Memory limit reached during PDF generation. Please try converting sheets individually or reducing row counts.");
      } else {
        toast.error("An error occurred while generating the PDF document.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    parsedSheetsCacheRef.current.clear();
    setFile(null);
    setSuccessData(null);
    setWorkbook(null);
    setSheetNames([]);
    setActiveSheet('');
    setPreviewSheetData([]);
    setTotalRowCount(0);
    setOrientation('auto');
    setIsProcessing(false);
    setIsParsing(false);
  };

  const customPreviewNode = (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
       <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
         <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
           <TableProperties className="w-4 h-4 text-green-600"/>
           <span>
             Data Preview: {activeSheet === '__ALL_SHEETS__' ? `${sheetNames[0]} (First Sheet)` : activeSheet}
           </span>
         </h4>
         {activeSheet === '__ALL_SHEETS__' && (
           <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-0.5 rounded-full">
             {sheetNames.length} Sheets Total
           </span>
         )}
       </div>
       
       <div className="flex-1 overflow-auto p-4 bg-slate-50 relative">
         {isParsing ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-500 font-medium">
             <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             Parsing spreadsheet, please wait...
           </div>
         ) : previewSheetData.length > 0 ? (
           <table className="excel-pdf-table w-full border-collapse bg-white shadow-sm text-xs text-left">
             <thead>
               <tr>
                 <th className="border border-gray-300 bg-gray-100 p-2 text-gray-500 font-semibold w-10 text-center select-none sticky top-0 left-0 z-30 shadow-[1px_1px_0_0_#d1d5db]"></th>
                 {previewSheetData[0].map((headerText, i) => (
                   <th key={i} className="border border-gray-300 bg-gray-100 p-2 text-gray-700 font-bold whitespace-nowrap sticky top-0 z-20 shadow-[0_1px_0_0_#d1d5db]">
                     {headerText !== undefined && headerText !== null ? String(headerText) : ''}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {previewSheetData.slice(1, 21).map((row, rowIndex) => (
                 <tr key={rowIndex} className="hover:bg-green-50/50 transition-colors">
                   <td className="border border-gray-300 bg-gray-50 p-2 text-gray-400 font-semibold text-center select-none sticky left-0 z-10 shadow-[1px_0_0_0_#d1d5db]">
                     {rowIndex + 1}
                   </td>
                   {row.map((cellText, cellIndex) => (
                     <td key={cellIndex} className="border border-gray-200 p-2 text-gray-600 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                       {cellText !== undefined && cellText !== null ? String(cellText) : ''}
                     </td>
                   ))}
                 </tr>
               ))}
             </tbody>
           </table>
         ) : (
           <div className="h-full flex items-center justify-center text-gray-400 italic">
             No preview data available for this sheet.
           </div>
         )}
         
         {totalRowCount > 21 && (
           <div className="text-center py-4 text-xs font-medium text-gray-400 border-t border-dashed border-gray-300 mt-4">
             Showing first 20 rows of {totalRowCount - 1} rows...
           </div>
         )}
       </div>
    </div>
  );

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={convertToPdf} 
        disabled={isProcessing || !file || previewSheetData.length === 0}
        className="w-full px-6 py-4 bg-green-600 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1"
      >
        {isProcessing ? 'Converting...' : (
          <><FileOutput className="w-6 h-6"/> Convert to PDF</>
        )}
      </button>
    </div>
  );

  return (
    <ToolPreviewLayout
      title="Excel to PDF"
      description="Convert spreadsheets into beautifully formatted, paginated PDF documents."
      icon={FileSpreadsheet}
      file={file}
      onFileSelect={handleFile}
      onReset={resetTool}
      isProcessing={isProcessing}
      successData={successData}
      processButton={processButton}
      accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
      customPreviewNode={file && !successData ? customPreviewNode : null}
    >
      <div className="space-y-5">
        
        {/* Sheet Selection */}
        {sheetNames.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-green-600" />
              Sheets to Convert
            </label>
            <select
              value={activeSheet}
              onChange={handleSheetChange}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow text-gray-700 font-medium cursor-pointer"
            >
              {sheetNames.length > 1 && (
                <option value="__ALL_SHEETS__">All Sheets ({sheetNames.length} Sheets)</option>
              )}
              {sheetNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Orientation Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
            <Columns className="w-4 h-4 text-green-600" />
            Page Orientation
          </label>
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setOrientation('auto')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                orientation === 'auto' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Auto (Smart)
            </button>
            <button
              onClick={() => setOrientation('portrait')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                orientation === 'portrait' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Portrait
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                orientation === 'landscape' 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* Page Size & Layout Toggles */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-green-600" />
              Page Size
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-xs font-semibold text-gray-700"
            >
              <option value="a4">A4 (Standard)</option>
              <option value="letter">US Letter</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <Minimize2 className="w-3.5 h-3.5 text-green-600" />
              Wide Tables
            </label>
            <button
              type="button"
              onClick={() => setWideTableMode(wideTableMode === 'paginate' ? 'fit' : 'paginate')}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all ${
                wideTableMode === 'paginate' 
                  ? 'bg-green-50 border-green-300 text-green-800' 
                  : 'bg-gray-50 border-gray-300 text-gray-600'
              }`}
            >
              {wideTableMode === 'paginate' ? 'Split (Readable)' : 'Fit to Width'}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between font-medium">
            <span>Repeated Headers:</span>
            <span className="text-green-700 font-bold">Every Page</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Formatting:</span>
            <span className="text-green-700 font-bold">Preserved (Dates/Numbers)</span>
          </div>
        </div>

      </div>
    </ToolPreviewLayout>
  );
}

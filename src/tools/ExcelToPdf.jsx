import { trackEvent } from '../lib/analytics';
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileOutput, Columns, LayoutList, TableProperties } from 'lucide-react';
import { toast } from 'sonner';
import ToolPreviewLayout from '../components/ui/ToolPreviewLayout';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { trackError } from '../lib/analytics';

export default function ExcelToPdf() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  
  const [sheetData, setSheetData] = useState([]);
  const [orientation, setOrientation] = useState('auto');

  useEffect(() => {
    if (window.__sharedFile) {
      handleFile(window.__sharedFile);
      window.__sharedFile = null;
    }
  }, []);

  const handleFile = async (newFile) => {
    if (!newFile) return;
    
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    
    const hasValidExt = validExtensions.some(ext => newFile.name.toLowerCase().endsWith(ext));
    
    if (newFile.size > 25 * 1024 * 1024) {
      toast.error("File is too large. Maximum supported size is 25MB for browser conversion.");
      return;
    }
    
    if (validTypes.includes(newFile.type) || hasValidExt) {
      setFile(newFile);
      setSuccessData(null);
      setIsParsing(true);
      setTimeout(() => {
        parseExcelFile(newFile);
      }, 100);
    } else {
      toast.error("Please upload a valid Excel or CSV file (.xlsx, .xls, .csv).");
    }
  };

  const parseExcelFile = async (currentFile) => {
    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        toast.error("This file contains no sheets.");
        resetTool();
        return;
      }
      
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      loadSheetData(wb, wb.SheetNames[0]);
    } catch (err) {
      trackError('Excel To Pdf', 'processing_error');
      console.error(err);
      toast.error("Failed to parse this file. It may be corrupted or unsupported.");
      resetTool();
    } finally {
      setIsParsing(false);
    }
  };

  const loadSheetData = (wb, sheetName) => {
    setActiveSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      setSheetData([]);
      return;
    }
    
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    
    if (!rawData || rawData.length === 0) {
       toast.error(`Sheet "${sheetName}" is empty.`);
       setSheetData([]);
       return;
    }

    // Find maximum column count across all rows in the sheet
    const maxCols = Math.max(...rawData.map(r => (Array.isArray(r) ? r.length : 0)), 0);

    if (maxCols === 0) {
       toast.error(`Sheet "${sheetName}" is empty.`);
       setSheetData([]);
       return;
    }

    // Normalize all rows to a uniform length of maxCols with safe string cell values
    const normalizedData = rawData.map(row => {
      const cleanRow = [];
      for (let i = 0; i < maxCols; i++) {
        const cell = Array.isArray(row) ? row[i] : '';
        cleanRow.push(cell !== undefined && cell !== null ? String(cell) : '');
      }
      return cleanRow;
    });

    setSheetData(normalizedData);
  };

  const handleSheetChange = (e) => {
    const newSheet = e.target.value;
    if (workbook) {
      loadSheetData(workbook, newSheet);
    }
  };

  const convertToPdf = () => {
    if (sheetData.length === 0) {
      toast.error("No valid data to convert in this sheet.");
      return;
    }
    
    trackEvent('tool_executed', { tool_name: 'Excel to PDF' });
    setIsProcessing(true);
    
    try {
      const maxCols = sheetData.length > 0 ? sheetData[0].length : 0;
      const targetOrientation = orientation === 'auto'
        ? (maxCols > 6 ? 'landscape' : 'portrait')
        : orientation;

      const doc = new jsPDF({
        orientation: targetOrientation,
        unit: 'pt',
        format: 'a4'
      });
      
      const head = sheetData.length > 0 ? [sheetData[0]] : [];
      const body = sheetData.length > 1 ? sheetData.slice(1) : [];

      autoTable(doc, {
        head: head,
        body: body,
        showHead: 'firstPage',
        startY: 20,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 6,
          textColor: [30, 30, 30],
          overflow: 'linebreak',
          lineWidth: 0.75,
          lineColor: [211, 211, 211] // #d3d3d3 Standard Excel grey gridlines
        },
        headStyles: {
          fillColor: [243, 244, 246], // Excel header grey
          textColor: [31, 41, 55],
          fontStyle: 'bold',
          lineWidth: 0.75,
          lineColor: [211, 211, 211]
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        tableLineWidth: 0.75,
        tableLineColor: [211, 211, 211],
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { top: 20, right: 20, bottom: 20, left: 20 }
      });
      
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      
      setSuccessData({
        originalSize: (typeof file !== 'undefined' && file?.size) || (typeof selectedFile !== 'undefined' && selectedFile?.size) || (typeof currentFile !== 'undefined' && currentFile?.size) || 0,
        outputSize: (typeof newPdfBytes !== 'undefined' && newPdfBytes?.length) || (typeof pdfBytes !== 'undefined' && pdfBytes?.length) || (typeof blob !== 'undefined' && blob?.size) || (typeof outputBlob !== 'undefined' && outputBlob?.size) || 0,
        url,
        filename: `${file.name.replace(/\.[^/.]+$/, "")}_${activeSheet}.pdf`,
        title: 'PDF Created Successfully!',
        subtitle: 'Your spreadsheet has been elegantly converted to PDF format with professional page layout.'
      });
      toast.success("Conversion successful!");
    } catch (err) {
      trackError('Excel To Pdf', 'processing_error');
      console.error("ExcelToPdf conversion error:", err);
      toast.error("An error occurred while generating the PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setSuccessData(null);
    setWorkbook(null);
    setSheetNames([]);
    setActiveSheet('');
    setSheetData([]);
    setOrientation('auto');
    setIsProcessing(false);
    setIsParsing(false);
  };

  const customPreviewNode = (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
       <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
         <h4 className="font-bold text-gray-700 flex items-center gap-2">
           <TableProperties className="w-5 h-5 text-green-600"/>
           Data Preview (First 20 Rows)
         </h4>
       </div>
       
       <div className="flex-1 overflow-auto p-4 bg-slate-50 relative">
         {isParsing ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-500 font-medium">
             <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             Parsing spreadsheet, please wait...
           </div>
         ) : sheetData.length > 0 ? (
           <table className="excel-pdf-table w-full border-collapse bg-white shadow-sm text-sm text-left">
             <thead>
               <tr>
                 <th className="border border-gray-300 bg-gray-100 p-2 text-gray-500 font-semibold w-10 text-center select-none sticky top-0 left-0 z-30 shadow-[1px_1px_0_0_#d1d5db]"></th>
                 
                 {sheetData[0].map((headerText, i) => (
                   <th key={i} className="border border-gray-300 bg-gray-100 p-2 text-gray-700 font-bold whitespace-nowrap sticky top-0 z-20 shadow-[0_1px_0_0_#d1d5db]">
                     {headerText !== undefined && headerText !== null ? String(headerText) : ''}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               {sheetData.slice(1, 21).map((row, rowIndex) => {
                 const maxCols = sheetData[0].length;
                 const cells = [];
                 for(let i=0; i<maxCols; i++){
                    cells.push(row[i]);
                 }

                 return (
                   <tr key={rowIndex} className="hover:bg-green-50/50 transition-colors">
                     <td className="border border-gray-300 bg-gray-50 p-2 text-gray-400 font-semibold text-center select-none sticky left-0 z-10 shadow-[1px_0_0_0_#d1d5db]">
                       {rowIndex + 1}
                     </td>
                     
                     {cells.map((cellText, cellIndex) => (
                       <td key={cellIndex} className="border border-gray-200 p-2 text-gray-600 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                         {cellText !== undefined && cellText !== null ? String(cellText) : ''}
                       </td>
                     ))}
                   </tr>
                 );
               })}
             </tbody>
           </table>
         ) : (
           <div className="h-full flex items-center justify-center text-gray-400 italic">
             No data to preview in this sheet.
           </div>
         )}
         
         {sheetData.length > 21 && (
           <div className="text-center py-4 text-sm font-medium text-gray-400 border-t border-dashed border-gray-300 mt-4">
             Showing 20 of {sheetData.length - 1} rows...
           </div>
         )}
       </div>
    </div>
  );

  const processButton = (
    <div className="space-y-3">
      <button 
        onClick={convertToPdf} 
        disabled={isProcessing || !file || sheetData.length === 0}
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
      <div className="space-y-6">
        
        {sheetNames.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-green-600" />
              Select Sheet
            </label>
            <select
              value={activeSheet}
              onChange={handleSheetChange}
              className="w-full p-3 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow text-gray-700 font-medium cursor-pointer"
            >
              {sheetNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
            <Columns className="w-4 h-4 text-green-600" />
            PDF Page Orientation
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
          <p className="text-xs text-gray-500 ml-1">
            * Auto mode dynamically chooses Landscape for tables with &gt; 6 columns to prevent text clipping.
          </p>
        </div>

      </div>
    </ToolPreviewLayout>
  );
}

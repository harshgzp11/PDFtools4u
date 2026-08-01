import React from 'react';
import { Trash2, Copy, RotateCw, Plus, FileArchive, ArrowLeftRight, Files, Edit3, PenTool, Sparkles } from 'lucide-react';
import { generateId } from './utils';
import { toast } from 'sonner';

export default function Sidebar({ pages, setPages, activePageIndex, setActivePageIndex, pushHistory, onTogglePanel, setViewMode, viewMode }) {
  const navigate = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(fromIndex) || fromIndex === index) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(index, 0, moved);
    setPages(newPages);
    
    if (activePageIndex === fromIndex) {
      setActivePageIndex(index);
    } else if (activePageIndex > fromIndex && activePageIndex <= index) {
      setActivePageIndex(activePageIndex - 1);
    } else if (activePageIndex < fromIndex && activePageIndex >= index) {
      setActivePageIndex(activePageIndex + 1);
    }
    
    pushHistory();
  };

  const handleDelete = (e, index) => {
    e.stopPropagation();
    if (pages.length <= 1) {
      toast.error('Cannot delete the last page.');
      return;
    }
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    if (activePageIndex >= newPages.length) {
      setActivePageIndex(newPages.length - 1);
    }
    pushHistory();
  };

  const handleDuplicate = (e, index) => {
    e.stopPropagation();
    const pageToCopy = pages[index];
    const newPages = [...pages];
    newPages.splice(index + 1, 0, { ...pageToCopy, id: generateId() });
    setPages(newPages);
    setActivePageIndex(index + 1);
    pushHistory();
  };

  const handleRotate = (e, index) => {
    e.stopPropagation();
    const newPages = [...pages];
    newPages[index] = { ...newPages[index], rotation: (newPages[index].rotation + 90) % 360 };
    setPages(newPages);
    pushHistory();
  };

  return (
    <div className="flex h-full shrink-0 relative z-10">
      {/* Global Navigation Strip */}
      <div className="w-16 bg-[#0f172a] h-full flex flex-col items-center py-4 gap-6 z-20 shadow-xl hidden md:flex">
         <button onClick={() => onTogglePanel('compress')} className="text-gray-400 hover:text-white transition-colors" title="Compress"><FileArchive className="w-5 h-5" /></button>
         <button onClick={() => onTogglePanel('convert')} className="text-gray-400 hover:text-white transition-colors" title="Convert"><ArrowLeftRight className="w-5 h-5" /></button>
         <button onClick={() => { setViewMode('grid'); onTogglePanel(null); }} className={`hover:text-white transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-gray-400'}`} title="Organize"><Files className="w-5 h-5" /></button>
         <button onClick={() => { setViewMode('edit'); onTogglePanel(null); }} className={`hover:text-blue-300 transition-colors ${viewMode === 'edit' ? 'text-blue-400' : 'text-gray-400'}`} title="Edit"><Edit3 className="w-5 h-5" /></button>
         <button onClick={() => onTogglePanel('sign')} className="text-gray-400 hover:text-white transition-colors" title="Sign"><PenTool className="w-5 h-5" /></button>
         <div className="flex-1"></div>
         <button onClick={() => onTogglePanel('ai')} className="text-purple-400 hover:text-purple-300 transition-colors" title="AI Tools"><Sparkles className="w-5 h-5" /></button>
      </div>

      {/* Pages Sidebar - Only visible in edit mode */}
      {viewMode === 'edit' && (
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 h-12">
            <span className="font-semibold text-gray-700 text-sm">Pages</span>
            <span className="text-xs font-medium bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{pages.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#f9fafb]">
            {pages.map((page, idx) => (
              <React.Fragment key={page.id}>
                <div 
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => setActivePageIndex(idx)}
                  className={`relative mb-4 group cursor-pointer transition-all ${
                    idx === activePageIndex 
                      ? 'ring-2 ring-blue-500 rounded-lg shadow-md bg-white' 
                      : 'hover:ring-2 hover:ring-gray-300 rounded-lg bg-gray-50'
                  }`}
                >
                  <div className="absolute top-2 left-2 bg-white/90 text-gray-700 text-xs font-bold px-2 py-0.5 rounded shadow-sm z-10 pointer-events-none">
                    {idx + 1}
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                      onClick={(e) => handleRotate(e, idx)}
                      className="p-1 bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded shadow-sm border border-gray-200 transition-colors"
                      title="Rotate Page"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDuplicate(e, idx)}
                      className="p-1 bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded shadow-sm border border-gray-200 transition-colors"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, idx)}
                      className="p-1 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 rounded shadow-sm border border-gray-200 transition-colors"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
  
                <div className="aspect-[1/1.4] w-full flex items-center justify-center overflow-hidden rounded-lg p-1">
                  <img 
                    src={page.thumbUrl} 
                    alt={`Page ${idx + 1}`} 
                    className="max-w-full max-h-full object-contain pointer-events-none"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                  />
                </div>
              </div>

              {/* Inline Add Page Button */}
              <div 
                onClick={() => toast.info('Importing external pages will be added in a future update!')}
                className="flex items-center justify-center h-6 my-1 group/add cursor-pointer relative"
              >
                 <div className="w-full h-[2px] bg-blue-400 opacity-0 group-hover/add:opacity-100 transition-opacity" />
                 <div className="absolute bg-white border-2 border-blue-400 text-blue-600 rounded-full p-0.5 opacity-0 group-hover/add:opacity-100 transition-opacity shadow-sm hover:bg-blue-50">
                    <Plus className="w-3.5 h-3.5" />
                 </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}

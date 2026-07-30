import React, { useRef } from 'react';
import { Trash2, Copy, RotateCw, Plus } from 'lucide-react';
import { generateId } from './utils';
import { toast } from 'sonner';

export default function Sidebar({ pages, setPages, activePageIndex, setActivePageIndex, pushHistory }) {
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
    
    // Update active page index to follow the moved page or adjust correctly
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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 relative z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <span className="font-semibold text-gray-700 text-sm">Pages</span>
        <span className="text-xs font-medium bg-gray-200 px-2 py-1 rounded-full text-gray-600">{pages.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pages.map((page, idx) => (
          <div 
            key={page.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, idx)}
            onClick={() => setActivePageIndex(idx)}
            className={`relative cursor-pointer rounded-xl border-2 transition-all group ${activePageIndex === idx ? 'border-blue-500 shadow-md shadow-blue-500/20' : 'border-transparent hover:border-gray-300'}`}
          >
            {/* Page Number */}
            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 rounded backdrop-blur-sm z-10">
              {idx + 1}
            </div>
            
            {/* Thumbnail Image (with rotation applied visually) */}
            <div className="overflow-hidden rounded-lg bg-white border border-gray-200/50 w-full flex items-center justify-center min-h-[140px]">
                <img 
                    src={page.thumbUrl} 
                    alt={`Page ${idx + 1}`} 
                    className="w-full block object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                />
            </div>

            {/* Hover Actions Menu */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900/90 backdrop-blur-md rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <button onClick={(e) => handleRotate(e, idx)} className="p-1.5 hover:bg-white/20 rounded-md text-white transition-colors" title="Rotate">
                    <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => handleDuplicate(e, idx)} className="p-1.5 hover:bg-white/20 rounded-md text-white transition-colors" title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => handleDelete(e, idx)} className="p-1.5 hover:bg-red-500 rounded-md text-white transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={() => toast.info('Importing external pages will be added in a future update!')} className="w-full py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 shadow-sm">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Pages
          </button>
      </div>
    </div>
  );
}

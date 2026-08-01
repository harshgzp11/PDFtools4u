import React from 'react';
import { Pencil, Trash2, Copy, RotateCw } from 'lucide-react';
import { generateId } from './utils';
import { toast } from 'sonner';

export default function GridView({ 
  pages, setPages, 
  setActivePageIndex, setViewMode, 
  pushHistory, viewMode 
}) {
  const handleEdit = (idx) => {
    setActivePageIndex(idx);
    setViewMode('edit');
  };

  const handleDuplicate = (e, index) => {
    e.stopPropagation();
    const pageToCopy = pages[index];
    const newPages = [...pages];
    newPages.splice(index + 1, 0, { ...pageToCopy, id: generateId() });
    setPages(newPages);
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
    <div className="flex-1 bg-[#f9fafb] p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          {viewMode === 'thumbnail' ? 'Document Overview' : 'Grid View'}
        </h2>
        
        <div className={`grid gap-6 ${viewMode === 'thumbnail' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
          {pages.map((page, idx) => (
            <div 
              key={page.id}
              onDoubleClick={() => handleEdit(idx)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow group relative cursor-pointer"
            >
              <div className="absolute top-2 left-2 bg-gray-900/60 text-white text-xs font-bold px-2 py-0.5 rounded z-10 backdrop-blur-sm">
                {idx + 1}
              </div>
              
              <div className="aspect-[1/1.4] flex items-center justify-center overflow-hidden bg-gray-50 rounded-lg border border-gray-100">
                <img 
                    src={page.thumbUrl} 
                    alt={`Page ${idx + 1}`} 
                    className="w-full h-full object-contain pointer-events-none"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gray-900/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                 <button onClick={() => handleEdit(idx)} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2">
                   <Pencil className="w-4 h-4" />
                   Edit
                 </button>
              </div>

              {/* Quick Actions at Bottom */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-30">
                  <button onClick={(e) => handleRotate(e, idx)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors" title="Rotate">
                      <RotateCw className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDuplicate(e, idx)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors" title="Duplicate">
                      <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDelete(e, idx)} className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-600 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

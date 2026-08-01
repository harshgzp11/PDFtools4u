import React from 'react';
import { FolderOpen, Undo2, Redo2 } from 'lucide-react';

export default function Sidebar({ 
  onCloseImage, 
  onUndo, 
  onRedo,
  canUndo,
  canRedo
}) {
  return (
    <div className="w-16 bg-[#0f172a] h-full flex flex-col items-center py-4 gap-6 shrink-0 relative z-20 shadow-xl hidden md:flex">
         
         <button 
           onClick={onCloseImage}
           className="text-gray-400 hover:text-white transition-colors" 
           title="Open New Image"
         >
           <FolderOpen className="w-5 h-5" />
         </button>
         
         <div className="w-8 h-px bg-gray-700 rounded"></div>

         <button 
           onClick={onUndo}
           disabled={!canUndo}
           className={`transition-colors ${canUndo ? 'text-gray-400 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`} 
           title="Undo"
         >
           <Undo2 className="w-5 h-5" />
         </button>

         <button 
           onClick={onRedo}
           disabled={!canRedo}
           className={`transition-colors ${canRedo ? 'text-gray-400 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`} 
           title="Redo"
         >
           <Redo2 className="w-5 h-5" />
         </button>

    </div>
  );
}

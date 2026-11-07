import React from 'react';
import { RotateCw, RotateCcw, ArrowLeft, ArrowRight, Check } from 'lucide-react';

/**
 * Standardized Accessible Page Selection & Action Card
 * Used across DeletePdfPages, ExtractPdfPages, RotatePdf, and OrganizePdf.
 * 
 * Complies with WCAG 2.1.1 (Keyboard) and WCAG 4.1.2 (Name, Role, Value).
 * Keeps action controls (rotate, reorder) isolated from selection semantics.
 */
export default function PageSelectionCard({
  id,
  index,
  dataUrl,
  isSelected = false,
  onToggle,
  selectable = true,
  variant = 'default', // 'default' (blue) | 'delete' (red) | 'extract' (purple)
  selectedIcon: SelectedIcon,
  rotation = 0,
  onRotateCw,
  onRotateCcw,
  onMoveEarlier,
  onMoveLater,
  canMoveEarlier = true,
  canMoveLater = true,
  className = ''
}) {
  const pageNum = index + 1;

  // Variant color mapping for borders, overlays, and badges
  const variantStyles = {
    delete: {
      selectedBorder: 'border-red-500 bg-red-50/40',
      badgeSelected: 'bg-red-500 text-white border-red-600',
      iconColor: 'text-red-500',
      focusRing: 'focus-visible:ring-red-500',
      cardFocusRing: 'has-[:focus-visible]:ring-red-500'
    },
    extract: {
      selectedBorder: 'border-purple-500 bg-purple-50/40',
      badgeSelected: 'bg-purple-500 text-white border-purple-600',
      iconColor: 'text-purple-600',
      focusRing: 'focus-visible:ring-purple-500',
      cardFocusRing: 'has-[:focus-visible]:ring-purple-500'
    },
    default: {
      selectedBorder: 'border-blue-500 bg-blue-50/40',
      badgeSelected: 'bg-blue-600 text-white border-blue-700',
      iconColor: 'text-blue-600',
      focusRing: 'focus-visible:ring-blue-500',
      cardFocusRing: 'has-[:focus-visible]:ring-blue-500'
    }
  }[variant] || {
    selectedBorder: 'border-blue-500 bg-blue-50/40',
    badgeSelected: 'bg-blue-600 text-white border-blue-700',
    iconColor: 'text-blue-600',
    focusRing: 'focus-visible:ring-blue-500',
    cardFocusRing: 'has-[:focus-visible]:ring-blue-500'
  };

  const hasActions = Boolean(onRotateCw || onRotateCcw || onMoveEarlier || onMoveLater);

  const handleCardClick = () => {
    if (selectable && onToggle) {
      onToggle(index);
    }
  };

  return (
    <div
      className={`group relative aspect-[1/1.4] rounded-xl shadow-sm border-4 overflow-hidden flex flex-col transition-all bg-white has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-offset-1 ${variantStyles.cardFocusRing} ${
        isSelected 
          ? `${variantStyles.selectedBorder} shadow-md` 
          : 'border-transparent hover:border-slate-300 hover:shadow-md'
      } ${className}`}
    >
      {/* 1. Underlying Thumbnail Image */}
      <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden pointer-events-none">
        <img
          src={dataUrl}
          alt={`Page ${pageNum} thumbnail`}
          className={`w-full h-full object-contain transition-transform duration-300 ${
            isSelected ? 'opacity-40' : 'opacity-100 group-hover:opacity-95'
          }`}
          style={{ transform: `rotate(${rotation}deg)` }}
          loading="lazy"
        />
      </div>

      {/* 2. Selected Center Watermark / Icon Overlay */}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {SelectedIcon ? (
            <SelectedIcon className={`w-14 h-14 ${variantStyles.iconColor} drop-shadow-md`} />
          ) : (
            <div className={`p-3 rounded-full bg-white/90 shadow-lg ${variantStyles.iconColor}`}>
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
          )}
        </div>
      )}

      {/* 3. Primary Card Toggling Target (Clickable for mouse/touch, excluded from keyboard tab stops to prevent duplicate navigation) */}
      {selectable && (
        <span
          onClick={handleCardClick}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full cursor-pointer z-10 bg-transparent rounded-lg"
        />
      )}

      {/* 4. Top-Left Accessible Native Checkbox Control (Single primary keyboard-accessible selection control) */}
      {selectable && (
        <div 
          className="absolute top-2 left-2 z-20 flex items-center justify-center pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            id={`page-checkbox-${index}`}
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle?.(index)}
            aria-label={`Select page ${pageNum}`}
            className={`w-5 h-5 rounded border-slate-300 text-blue-600 focus:outline-none focus-visible:ring-2 ${variantStyles.focusRing} cursor-pointer shadow-sm bg-white/95`}
          />
        </div>
      )}

      {/* 5. Top-Right Page Number Badge */}
      <div
        className={`absolute top-2 right-2 p-1.5 rounded-full border text-xs font-bold w-8 h-8 flex items-center justify-center transition-colors shadow-xs z-20 pointer-events-none ${
          isSelected 
            ? variantStyles.badgeSelected 
            : 'bg-white/90 border-slate-300 text-slate-700'
        }`}
        aria-hidden="true"
      >
        {pageNum}
      </div>

      {/* 6. Bottom Contextual Action Toolbar (Separate from selection semantics) */}
      {hasActions && (
        <div 
          className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-900/70 via-slate-900/40 to-transparent flex items-center justify-center gap-2 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {onMoveEarlier && (
            <button
              type="button"
              onClick={() => onMoveEarlier(index)}
              disabled={!canMoveEarlier}
              className="p-2 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-full shadow-md hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={`Move page ${pageNum} earlier`}
              title="Move earlier"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {onRotateCcw && (
            <button
              type="button"
              onClick={() => onRotateCcw(id, index)}
              className="p-2 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-full shadow-md hover:scale-105 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={`Rotate page ${pageNum} 90 degrees counter-clockwise`}
              title="Rotate 90° Left"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onRotateCw && (
            <button
              type="button"
              onClick={() => onRotateCw(id, index)}
              className="p-2 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-full shadow-md hover:scale-105 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={`Rotate page ${pageNum} 90 degrees clockwise`}
              title="Rotate 90° Right"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {onMoveLater && (
            <button
              type="button"
              onClick={() => onMoveLater(index)}
              disabled={!canMoveLater}
              className="p-2 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-full shadow-md hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={`Move page ${pageNum} later`}
              title="Move later"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}


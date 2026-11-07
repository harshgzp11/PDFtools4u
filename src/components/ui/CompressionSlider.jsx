import React, { useId } from 'react';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { interpolateCompression, PRESET_ANCHORS } from '../../utils/compressionMath';

/**
 * CompressionSlider: Reusable slider providing continuous piecewise interpolation
 * across the four canonical compression presets.
 */
export default function CompressionSlider({
  value = 66, // Default to Balanced (s = 66)
  onChange,
  disabled = false,
  className = ''
}) {
  const sliderId = useId();
  const current = interpolateCompression(value);

  const handleSliderChange = (e) => {
    const nextVal = parseInt(e.target.value, 10);
    const interpolated = interpolateCompression(nextVal);
    onChange?.(interpolated);
  };

  const handlePresetClick = (presetValue) => {
    if (disabled) return;
    const interpolated = interpolateCompression(presetValue);
    onChange?.(interpolated);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header and Telemetry Pill */}
      <div className="flex items-center justify-between">
        <label htmlFor={sliderId} className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
          <span>Compression Level</span>
        </label>
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-100">
          {current.activePresetId === 'balanced' && <Sparkles className="w-3 h-3 text-blue-600" />}
          <span>{current.activePresetLabel}</span>
        </div>
      </div>

      {/* Preset Anchor Selector Buttons */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl" role="group" aria-label="Compression presets">
        {PRESET_ANCHORS.map((p) => {
          const isActive = current.activePresetId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetClick(p.value)}
              disabled={disabled}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all text-center truncate ${
                isActive
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-pressed={isActive}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Continuous Range Slider */}
      <div className="space-y-1 pt-1">
        <input
          id={sliderId}
          type="range"
          min="0"
          max="100"
          step="1"
          value={current.sliderValue}
          onChange={handleSliderChange}
          disabled={disabled}
          aria-label="Compression level adjustment"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={current.sliderValue}
          aria-valuetext={`${current.activePresetLabel}, Quality ${Math.round(current.quality * 100)}%, Resolution ${current.maxDimension}px`}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-[11px] text-gray-500 px-0.5">
          <span>Max Size Reduction</span>
          <span>Max Image Quality</span>
        </div>
      </div>

      {/* Live Parameter Telemetry */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Quality</p>
          <p className="text-sm font-extrabold text-gray-800">{Math.round(current.quality * 100)}%</p>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Max Resolution</p>
          <p className="text-sm font-extrabold text-gray-800">{current.maxDimension}px</p>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Min Savings</p>
          <p className="text-sm font-extrabold text-gray-800">{(current.minSavings * 100).toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
}

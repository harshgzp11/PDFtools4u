/**
 * Exact Piecewise Linear Interpolation Formula for PDF and Image Compression Parameters.
 * 
 * Preserves the four canonical compression preset anchors:
 *  - s = 0:   Extreme      (quality: 0.40, maxDimension: 800,  minSavings: 0.02)
 *  - s = 33:  High         (quality: 0.55, maxDimension: 1000, minSavings: 0.04)
 *  - s = 66:  Balanced     (quality: 0.68, maxDimension: 1400, minSavings: 0.05) [Default]
 *  - s = 100: High Quality (quality: 0.82, maxDimension: 2000, minSavings: 0.08)
 */

export const PRESET_ANCHORS = [
  { id: 'extreme', value: 0, label: 'Extreme', fullLabel: 'Extreme Compression', desc: 'Smallest file size, lower image fidelity' },
  { id: 'high', value: 33, label: 'High', fullLabel: 'High Compression', desc: 'Prioritizes small size while keeping reasonable quality' },
  { id: 'balanced', value: 66, label: 'Balanced', fullLabel: 'Balanced', desc: 'Recommended balance of size and photographic clarity', isRecommended: true },
  { id: 'high-quality', value: 100, label: 'High Quality', fullLabel: 'High Quality', desc: 'Maximum image preservation with modest reduction' },
];

export function interpolateCompression(s) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(s) || 0)));
  let quality;
  let maxDimension;
  let minSavings;
  let activePresetId;
  let activePresetLabel;

  if (clamped <= 33) {
    const t = clamped / 33;
    quality = 0.40 + t * 0.15;
    maxDimension = Math.round(800 + t * 200);
    minSavings = 0.02 + t * 0.02;
  } else if (clamped <= 66) {
    const t = (clamped - 33) / 33;
    quality = 0.55 + t * 0.13;
    maxDimension = Math.round(1000 + t * 400);
    minSavings = 0.04 + t * 0.01;
  } else {
    const t = (clamped - 66) / 34;
    quality = 0.68 + t * 0.14;
    maxDimension = Math.round(1400 + t * 600);
    minSavings = 0.05 + t * 0.03;
  }

  if (clamped <= 16) {
    activePresetId = 'extreme';
    activePresetLabel = 'Extreme Compression';
  } else if (clamped <= 49) {
    activePresetId = 'high';
    activePresetLabel = 'High Compression';
  } else if (clamped <= 82) {
    activePresetId = 'balanced';
    activePresetLabel = 'Balanced (Recommended)';
  } else {
    activePresetId = 'high-quality';
    activePresetLabel = 'High Quality';
  }

  return {
    sliderValue: clamped,
    quality: Number(quality.toFixed(4)),
    maxDimension,
    minSavings: Number(minSavings.toFixed(4)),
    activePresetId,
    activePresetLabel,
    isPresetAnchor: [0, 33, 66, 100].includes(clamped)
  };
}


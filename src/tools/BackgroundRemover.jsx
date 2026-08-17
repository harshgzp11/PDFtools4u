import { trackEvent } from '../lib/analytics';
import React, { useState, useRef, useCallback } from 'react';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';
import { Download, Loader2, Sparkles, Zap, Gem, RotateCcw, Eye, Grid3X3, SlidersHorizontal } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';
import { trackError } from '../lib/analytics';
import {
  blobToImageData,
  imageDataToBlob,
  canvasToObjectURL,
  fillInteriorHoles,
  softEdgeFeather,
  addContactShadow,
  upscaleMask,
  applyAlphaMask,
} from '../utils/backgroundUtils';

// ─── Quality Mode Constants ──────────────────────────────────────────
const MODE_FAST = 'fast';
const MODE_HQ = 'hq';

export default function BackgroundRemover() {
  // ─── Core State ──────────────────────────────────────────────────
  const [imageSrc, setImageSrc] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [resultSrc, setResultSrc] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // ─── Settings ────────────────────────────────────────────────────
  const [qualityMode, setQualityMode] = useState(MODE_FAST);
  const [featherRadius, setFeatherRadius] = useState(2);
  const [fillHoles, setFillHoles] = useState(false);
  const [contactShadow, setContactShadow] = useState(false);
  const [previewBg, setPreviewBg] = useState('checker');  // checker | white | black

  // ─── Comparison Slider ───────────────────────────────────────────
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef(null);
  const isDragging = useRef(false);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleImageUpload = (file) => {
    if (!file.type.startsWith('image/')) return;
    setFileName(file.name.split('.')[0]);
    setOriginalFile(file);
    setResultSrc(null);
    setProgress(0);
    setStatusText('');
    setSliderPos(50);

    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  const resetTool = () => {
    setImageSrc(null);
    setOriginalFile(null);
    setResultSrc(null);
    setFileName('');
    setLoading(false);
    setProgress(0);
    setStatusText('');
    setSliderPos(50);
  };

  // ─── Inference: Fast Mode (ISNet via @imgly) ─────────────────────
  const runFastInference = async () => {
    setStatusText('Loading AI model...');
    setProgress(5);

    const config = {
      device: 'gpu',
      model: 'isnet_fp16',
      output: {
        format: 'image/png',
        quality: 1.0,
        type: 'foreground',
      },
      progress: (key, current, total) => {
        if (total) {
          const pct = Math.round((current / total) * 100);
          setProgress(Math.min(pct, 50)); // Reserve 50-100% for post-processing
          if (pct < 30) setStatusText('Downloading model...');
          else if (pct < 80) setStatusText('Processing...');
          else setStatusText('Generating mask...');
        }
      },
    };

    const blob = await imglyRemoveBackground(imageSrc, config);
    return blob;
  };

  // ─── Inference: High Quality Mode (ISNet Full Precision via @imgly) ──
  const runHQInference = async () => {
    setStatusText('Loading High Quality model...');
    setProgress(5);

    const config = {
      device: 'gpu',
      model: 'isnet', // Full precision for higher quality
      output: {
        format: 'image/png',
        quality: 1.0,
        type: 'foreground',
      },
      progress: (key, current, total) => {
        if (total) {
          const pct = Math.round((current / total) * 100);
          setProgress(Math.min(pct, 50));
          if (pct < 30) setStatusText('Downloading HQ model...');
          else if (pct < 80) setStatusText('Processing...');
          else setStatusText('Generating mask...');
        }
      },
    };

    const blob = await imglyRemoveBackground(imageSrc, config);
    return blob;
  };

  // ─── Full Pipeline ───────────────────────────────────────────────
  const removeBackground = async () => {
    if (!imageSrc) return;
    trackEvent('tool_executed', { tool_name: 'AI Background Remover' });
    setLoading(true);
    setProgress(0);
    setResultSrc(null);

    try {
      // Step 1: Inference
      let blob;
      if (qualityMode === MODE_HQ) {
        blob = await runHQInference();
      } else {
        blob = await runFastInference();
      }

      setStatusText('Post-processing...');
      setProgress(55);

      // Step 2: Convert to ImageData for post-processing
      let { imageData, canvas } = await blobToImageData(blob);

      // Step 3: Fill interior holes (if enabled)
      if (fillHoles) {
        setStatusText('Filling interior holes...');
        setProgress(65);
        imageData = fillInteriorHoles(imageData);
      }

      // Step 4: Edge feathering (at native resolution)
      if (featherRadius > 0) {
        setStatusText('Softening edges...');
        setProgress(75);
        imageData = softEdgeFeather(imageData, featherRadius);
      }

      setProgress(85);

      // Step 5: Write processed ImageData back to canvas
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);

      // Step 6: Contact shadow (if enabled)
      if (contactShadow) {
        setStatusText('Adding contact shadow...');
        setProgress(90);
        canvas = addContactShadow(canvas, 20, 0.25, 8);
      }

      // Step 7: Generate final URL
      setStatusText('Finalizing...');
      setProgress(95);
      const url = await canvasToObjectURL(canvas);
      setResultSrc(url);
      setProgress(100);
      setStatusText('Done!');
    } catch (err) {
      trackError('Background Remover', 'processing_error');
      console.error(err);
      let errorType = 'background_removal_failed';
      if (err.message?.toLowerCase().includes('memory') || err.message?.toLowerCase().includes('too large')) {
         errorType = 'file_too_large';
      }
      trackError('Background Remover', errorType);
      alert(`Failed to remove background: ${err.message || 'Unknown error'}. Try a different image or mode.`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Comparison Slider Logic ─────────────────────────────────────
  const handleSliderInteraction = useCallback((clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onPointerDown = useCallback((e) => {
    isDragging.current = true;
    handleSliderInteraction(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [handleSliderInteraction]);

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    handleSliderInteraction(e.clientX);
  }, [handleSliderInteraction]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ─── Background CSS ─────────────────────────────────────────────
  const getBgStyle = () => {
    if (previewBg === 'white') return { backgroundColor: '#ffffff' };
    if (previewBg === 'black') return { backgroundColor: '#1a1a1a' };
    // Checkerboard
    return {
      backgroundImage:
        'linear-gradient(45deg, #d0d0d0 25%, transparent 25%), ' +
        'linear-gradient(135deg, #d0d0d0 25%, transparent 25%), ' +
        'linear-gradient(45deg, transparent 75%, #d0d0d0 75%), ' +
        'linear-gradient(135deg, transparent 75%, #d0d0d0 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 10px 0, 10px -10px, 0px 10px',
      backgroundColor: '#f0f0f0',
    };
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden animate-in fade-in">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-gray-100 bg-white">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">AI Background Remover</h2>
        <p className="text-gray-500 text-sm">Remove image backgrounds with AI, running 100% locally in your browser.</p>
        <p className="text-xs text-orange-600 font-medium mt-1">Note: A one-time AI model download (~40MB to 80MB) is required on the first use.</p>
      </div>

      {/* Main Content — two-column, each scrollable */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-100">
        
        {/* ── Left Column: Upload & Settings ── */}
        <div className="overflow-y-auto custom-scrollbar p-6 space-y-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Upload Image</label>
          {!imageSrc ? (
            <DragDropZone
              accept="image/*"
              onFileSelect={handleImageUpload}
              label="Drag & drop an image here"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/* File info bar */}
              <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div className="p-2 bg-white text-indigo-600 rounded shadow-sm flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <h3 className="text-sm font-bold text-gray-900 truncate" title={originalFile?.name}>{originalFile?.name}</h3>
                  <p className="text-xs text-gray-500">{(originalFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={resetTool} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded border border-indigo-200">
                  Change
                </button>
              </div>

              {/* Settings panel */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Processing Settings</h3>
                
                {/* Quality Mode */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Quality Mode</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${qualityMode === MODE_FAST ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="quality" value={MODE_FAST} checked={qualityMode === MODE_FAST} onChange={() => setQualityMode(MODE_FAST)} className="mt-0.5 w-4 h-4 text-yellow-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold text-gray-900 text-sm">Fast</span>
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">ISNet</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">~40MB model. Good for standard subjects.</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${qualityMode === MODE_HQ ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="quality" value={MODE_HQ} checked={qualityMode === MODE_HQ} onChange={() => setQualityMode(MODE_HQ)} className="mt-0.5 w-4 h-4 text-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Gem className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-gray-900 text-sm">High Quality</span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">ISNet FP32</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">~170MB model. Superior detail preservation (fur/hair) with full precision.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Edge Feathering */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Edge Softness</label>
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{featherRadius}px</span>
                  </div>
                  <input
                    type="range" min="0" max="10" step="1"
                    value={featherRadius}
                    onChange={(e) => setFeatherRadius(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input type="checkbox" checked={fillHoles} onChange={(e) => setFillHoles(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <span className="text-sm font-bold text-gray-800">Fill mesh / cage holes</span>
                      <p className="text-xs text-gray-500 mt-0.5">Prevents interior regions from being cut out.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input type="checkbox" checked={contactShadow} onChange={(e) => setContactShadow(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <span className="text-sm font-bold text-gray-800">Add contact shadow</span>
                      <p className="text-xs text-gray-500 mt-0.5">Places a soft shadow beneath the subject.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Process Button — always visible */}
              <button
                onClick={removeBackground}
                disabled={loading}
                className="w-full px-6 py-3.5 bg-indigo-600 border border-transparent rounded-xl shadow-sm text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all relative overflow-hidden"
              >
                {loading && (
                  <div className="absolute left-0 top-0 bottom-0 bg-indigo-500/30 transition-all duration-300" style={{ width: `${progress}%` }} />
                )}
                {loading ? (
                  <span className="relative z-10 inline-flex items-center gap-2 text-sm font-bold">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="truncate max-w-[180px]">{statusText}</span>
                    <span className="whitespace-nowrap">{progress}%</span>
                  </span>
                ) : resultSrc ? (
                  <span className="relative z-10 inline-flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" /> Re-process Settings
                  </span>
                ) : (
                  <span className="relative z-10 inline-flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Remove Background
                  </span>
                )}
              </button>
              
              <div className="flex items-start gap-2 text-[11px] leading-tight text-gray-500">
                <Eye className="w-4 h-4 flex-shrink-0 text-green-500 mt-0.5" />
                <span><strong>100% Private:</strong> Processing runs locally in your browser.</span>
              </div>
            </div>
          )}
        </div>
        
        {/* ── Right Column: Preview ── */}
        <div className="overflow-y-auto custom-scrollbar p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-shrink-0">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Result Preview</label>
            {resultSrc && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Bg:</span>
                {[
                  { id: 'checker', title: 'Transparent', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
                  { id: 'white', title: 'White', color: '#fff' },
                  { id: 'black', title: 'Black', color: '#1a1a1a' },
                ].map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => setPreviewBg(bg.id)}
                    title={bg.title}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                      previewBg === bg.id ? 'border-indigo-500 ring-1 ring-indigo-500 scale-110' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={bg.color ? { backgroundColor: bg.color } : {
                      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 4px 0, 4px -4px, 0px 4px',
                    }}
                  >
                    {bg.icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div 
            className="flex-1 min-h-[300px] border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden p-4 relative"
            style={resultSrc ? getBgStyle() : {}}
          >
            {resultSrc ? (
              <img src={resultSrc} alt="Result" className="max-w-full max-h-full object-contain drop-shadow-xl" />
            ) : imageSrc ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img src={imageSrc} alt="Original" className="max-w-full max-h-full object-contain opacity-40 rounded" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm text-sm font-medium text-gray-700 border border-gray-200">Click "Remove Background" to process</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Sparkles className="w-8 h-8 opacity-30" />
                <span className="font-medium text-sm">No image selected</span>
              </div>
            )}
          </div>
          
          {resultSrc && (
            <div className="flex justify-end flex-shrink-0">
              <a 
                href={resultSrc}
                download={`${fileName}_nobg.png`}
                className="px-6 py-3 bg-green-600 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white hover:bg-green-700 flex items-center gap-2 transition-transform hover:-translate-y-0.5"
              >
                <Download className="w-5 h-5"/> Download Transparent PNG
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

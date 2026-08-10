import React, { useState, useRef } from 'react';
import { safeHtml2Canvas } from '../utils/canvasUtils';
import { Download, Play } from 'lucide-react';
import { trackError } from '../lib/analytics';

export default function HtmlToImage() {
  const [htmlContent, setHtmlContent] = useState('<div style="padding: 40px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-align: center; font-family: sans-serif; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">\n  <h1 style="margin: 0; font-size: 32px;">Hello World!</h1>\n  <p style="margin-top: 10px; opacity: 0.9;">Edit this HTML to generate a beautiful image.</p>\n</div>');
  const [imageResult, setImageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const renderRef = useRef(null);

  const generateImage = async () => {
    if (!renderRef.current) return;
    setLoading(true);
    
    try {
      const canvas = await safeHtml2Canvas(renderRef.current, {
        backgroundColor: null, // transparent
        scale: 2 // High resolution
      });
      
      setImageResult(canvas.toDataURL('image/png'));
    } catch (err) {
      trackError('Html To Image', 'processing_error');
      console.error(err);
      alert("Failed to render HTML to image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">HTML/CSS to Image</h2>
        <p className="text-gray-500">Render custom HTML/CSS into a high-quality downloadable PNG image.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">HTML Code</label>
          <textarea 
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm resize-none bg-gray-900 text-green-400"
            spellCheck="false"
          />
          
          <button 
            onClick={generateImage} 
            disabled={!htmlContent || loading}
            className="w-full px-4 py-3 bg-teal-600 border border-transparent rounded-lg shadow-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Rendering...' : <><Play className="w-5 h-5"/> Render to Image</>}
          </button>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Preview & Result</label>
          
          <div className="w-full border border-gray-300 rounded-lg bg-gray-50 overflow-hidden flex flex-col">
            {/* Live Render Area (hidden from direct view, used for html2canvas) */}
            <div className="p-4 flex items-center justify-center min-h-[200px]">
                <div ref={renderRef} dangerouslySetInnerHTML={{ __html: htmlContent }} className="inline-block" />
            </div>

            {/* Generated Image Preview */}
            {imageResult && (
              <div className="border-t border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Generated Image</p>
                <img src={imageResult} alt="Generated" className="max-w-full drop-shadow-md border border-gray-100 rounded" />
                
                <div className="mt-4 flex justify-end">
                   <a 
                    href={imageResult}
                    download="rendered_html.png"
                    className="px-4 py-2 bg-gray-800 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-900 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4"/> Download PNG
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

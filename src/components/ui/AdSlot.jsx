import React from 'react';

export default function AdSlot({ orientation = "horizontal", className = "" }) {
  const isHorizontal = orientation === "horizontal";
  return (
    <div className={`bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative ${isHorizontal ? 'w-full h-24' : 'w-64 min-h-[300px]'} ${className}`}>
      <span className="text-gray-400 text-sm font-medium uppercase tracking-widest">Advertisement</span>
      {/* 
        Google AdSense integration point:
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot="XXXXXXXXXX"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      */}
    </div>
  );
}
